-- Implementar funcionalidad completa para materiales extras
-- Similar a la implementación de paños

-- 1. Función para generar notas de materiales extras
CREATE OR REPLACE FUNCTION fn_generar_nota_material_extra(
    p_id_item INTEGER,
    p_cantidad NUMERIC
) RETURNS TEXT AS $$
DECLARE
    v_nota TEXT;
    v_material RECORD;
BEGIN
    -- Obtener información del material extra
    SELECT me.*
    INTO v_material
    FROM materiales_extras me
    WHERE me.id_item = p_id_item;
    
    IF NOT FOUND THEN
        RETURN 'Material extra no encontrado';
    END IF;
    
    -- Construir nota con información relevante
    v_nota := p_cantidad || ' ' || COALESCE(v_material.unidad, 'unidad') || ' de ' || 
              COALESCE(v_material.descripcion, v_material.id_material_extra);
    
    -- Agregar información adicional relevante
    IF v_material.marca IS NOT NULL AND v_material.marca != '' THEN
        v_nota := v_nota || ' marca ' || v_material.marca;
    END IF;
    
    IF v_material.presentacion IS NOT NULL AND v_material.presentacion != '' THEN
        v_nota := v_nota || ' ' || v_material.presentacion;
    END IF;
    
    IF v_material.categoria IS NOT NULL AND v_material.categoria != '' THEN
        v_nota := v_nota || ' (' || v_material.categoria || ')';
    END IF;
    
    RETURN v_nota;
END;
$$ LANGUAGE plpgsql;

-- 2. Función para restaurar inventario de materiales extras cuando se cancela una orden
CREATE OR REPLACE FUNCTION fn_restaurar_inventario_materiales_cancelada(
    p_id_op INTEGER
) RETURNS VOID AS $$
DECLARE
    v_detalle RECORD;
    v_cantidad_restaurar NUMERIC;
    v_material RECORD;
BEGIN
    -- Procesar cada registro de detalle de materiales extras para esta orden
    FOR v_detalle IN 
        SELECT id_item, cantidad, notas
        FROM orden_produccion_detalle 
        WHERE id_op = p_id_op 
        AND tipo_item = 'EXTRA'
        AND catalogo = 'CATALOGO_2'
    LOOP
        v_cantidad_restaurar := v_detalle.cantidad;
        
        -- Obtener información del material
        SELECT * INTO v_material
        FROM materiales_extras
        WHERE id_item = v_detalle.id_item;
        
        IF FOUND THEN
            -- Restaurar cantidad al material extra
            UPDATE materiales_extras 
            SET 
                cantidad_disponible = cantidad_disponible + v_cantidad_restaurar,
                ultima_modificacion = CURRENT_TIMESTAMP
            WHERE id_item = v_detalle.id_item;
            
            -- Registrar movimiento de inventario
            INSERT INTO movimiento_inventario (
                id_item, tipo_mov, cantidad, 
                unidad, id_op, 
                notas, fecha, id_usuario
            ) VALUES (
                v_detalle.id_item, 'AJUSTE_IN', 
                v_cantidad_restaurar,
                COALESCE(v_material.unidad, 'unidad'), p_id_op,
                'Restauración automática de material extra por cancelación de orden: ' || 
                v_cantidad_restaurar || ' ' || COALESCE(v_material.unidad, 'unidad') || ' de ' ||
                COALESCE(v_material.descripcion, v_material.id_material_extra),
                CURRENT_TIMESTAMP,
                1
            );
        END IF;
    END LOOP;
    
    -- Eliminar registros de detalle de materiales extras de la orden cancelada
    DELETE FROM orden_produccion_detalle 
    WHERE id_op = p_id_op 
    AND tipo_item = 'EXTRA'
    AND catalogo = 'CATALOGO_2';
END;
$$ LANGUAGE plpgsql;

-- 3. Función para limpiar registros de detalle después de 3 días (completadas) - INCLUYE MATERIALES EXTRAS
CREATE OR REPLACE FUNCTION fn_limpiar_detalle_completadas() RETURNS VOID AS $$
BEGIN
    -- Limpiar paños
    DELETE FROM orden_produccion_detalle 
    WHERE tipo_item = 'PANO' 
    AND catalogo = 'CATALOGO_1'
    AND id_op IN (
        SELECT id_op 
        FROM orden_produccion 
        WHERE estado = 'completada' 
        AND fecha_creacion < CURRENT_TIMESTAMP - INTERVAL '3 days'
    );
    
    -- Limpiar materiales extras
    DELETE FROM orden_produccion_detalle 
    WHERE tipo_item = 'EXTRA' 
    AND catalogo = 'CATALOGO_2'
    AND id_op IN (
        SELECT id_op 
        FROM orden_produccion 
        WHERE estado = 'completada' 
        AND fecha_creacion < CURRENT_TIMESTAMP - INTERVAL '3 days'
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Función para cambiar estado a cancelada después de 30 días (en_proceso/pausada) - INCLUYE MATERIALES EXTRAS
CREATE OR REPLACE FUNCTION fn_cancelar_ordenes_30_dias() RETURNS VOID AS $$
DECLARE
    v_orden RECORD;
BEGIN
    FOR v_orden IN 
        SELECT id_op 
        FROM orden_produccion 
        WHERE estado IN ('en_proceso', 'pausada')
        AND fecha_creacion < CURRENT_TIMESTAMP - INTERVAL '30 days'
    LOOP
        -- Cambiar estado a cancelada
        UPDATE orden_produccion 
        SET estado = 'cancelada' 
        WHERE id_op = v_orden.id_op;
        
        -- Esto activará automáticamente la restauración de inventario
        -- a través del trigger que maneja el cambio de estado
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Actualizar el trigger para restaurar inventario cuando se cancela una orden - INCLUYE MATERIALES EXTRAS
CREATE OR REPLACE FUNCTION trg_restaurar_inventario_cancelacion() 
RETURNS TRIGGER AS $$
BEGIN
    -- Si el estado cambió a cancelada
    IF NEW.estado = 'cancelada' AND OLD.estado != 'cancelada' THEN
        -- Restaurar inventario de paños
        PERFORM fn_restaurar_inventario_panos_cancelada(NEW.id_op);
        
        -- Restaurar inventario de materiales extras
        PERFORM fn_restaurar_inventario_materiales_cancelada(NEW.id_op);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Función combinada para restaurar todo el inventario (paños + materiales extras)
CREATE OR REPLACE FUNCTION fn_restaurar_inventario_completo_cancelada(
    p_id_op INTEGER
) RETURNS VOID AS $$
BEGIN
    -- Restaurar inventario de paños
    PERFORM fn_restaurar_inventario_panos_cancelada(p_id_op);
    
    -- Restaurar inventario de materiales extras
    PERFORM fn_restaurar_inventario_materiales_cancelada(p_id_op);
END;
$$ LANGUAGE plpgsql;

-- Verificar que las funciones se crearon correctamente
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN (
    'fn_generar_nota_material_extra',
    'fn_restaurar_inventario_materiales_cancelada',
    'fn_limpiar_detalle_completadas',
    'fn_cancelar_ordenes_30_dias',
    'trg_restaurar_inventario_cancelacion',
    'fn_restaurar_inventario_completo_cancelada'
)
AND routine_schema = 'catalogo_1'
ORDER BY routine_name; 