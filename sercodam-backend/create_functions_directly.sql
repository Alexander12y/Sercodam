-- Script para crear las funciones de paños directamente

-- 1. Función para generar notas de paños
CREATE OR REPLACE FUNCTION fn_generar_nota_pano(
    p_id_item INTEGER,
    p_cantidad NUMERIC,
    p_tipo_dimension TEXT
) RETURNS TEXT AS $$
DECLARE
    v_nota TEXT;
    v_pano RECORD;
    v_red_producto RECORD;
    v_nylon RECORD;
    v_polipropileno RECORD;
    v_lona RECORD;
    v_malla_sombra RECORD;
BEGIN
    -- Obtener información del paño
    SELECT p.*, rp.tipo_red, rp.marca, rp.descripcion
    INTO v_pano
    FROM pano p
    JOIN red_producto rp ON p.id_mcr = rp.id_mcr
    WHERE p.id_item = p_id_item;
    
    IF NOT FOUND THEN
        RETURN 'Paño no encontrado';
    END IF;
    
    -- Inicializar nota con cantidad y tipo de dimensión
    v_nota := p_cantidad || ' m de ' || p_tipo_dimension || ' red ' || v_pano.tipo_red;
    
    -- Agregar información específica según el tipo de red
    CASE v_pano.tipo_red
        WHEN 'nylon' THEN
            SELECT * INTO v_nylon FROM nylon WHERE id_mcr = v_pano.id_mcr;
            IF FOUND THEN
                IF v_nylon.calibre IS NOT NULL THEN
                    v_nota := v_nota || ' calibre ' || v_nylon.calibre;
                END IF;
                IF v_nylon.torsion IS NOT NULL THEN
                    v_nota := v_nota || ' ' || v_nylon.torsion;
                END IF;
                IF v_nylon.refuerzo IS NOT NULL THEN
                    IF v_nylon.refuerzo THEN
                        v_nota := v_nota || ' con refuerzo';
                    ELSE
                        v_nota := v_nota || ' sin refuerzo';
                    END IF;
                END IF;
            END IF;
            
        WHEN 'polipropileno' THEN
            SELECT * INTO v_polipropileno FROM polipropileno WHERE id_mcr = v_pano.id_mcr;
            IF FOUND THEN
                IF v_polipropileno.grosor IS NOT NULL THEN
                    v_nota := v_nota || ' grosor ' || v_polipropileno.grosor;
                END IF;
                IF v_polipropileno.cuadro IS NOT NULL THEN
                    v_nota := v_nota || ' cuadro ' || v_polipropileno.cuadro;
                END IF;
            END IF;
            
        WHEN 'lona' THEN
            SELECT * INTO v_lona FROM lona WHERE id_mcr = v_pano.id_mcr;
            IF FOUND THEN
                IF v_lona.color IS NOT NULL THEN
                    v_nota := v_nota || ' color ' || v_lona.color;
                END IF;
                IF v_lona.presentacion IS NOT NULL THEN
                    v_nota := v_nota || ' ' || v_lona.presentacion;
                END IF;
            END IF;
            
        WHEN 'malla sombra' THEN
            SELECT * INTO v_malla_sombra FROM malla_sombra WHERE id_mcr = v_pano.id_mcr;
            IF FOUND THEN
                IF v_malla_sombra.color_tipo_red IS NOT NULL THEN
                    v_nota := v_nota || ' ' || v_malla_sombra.color_tipo_red;
                END IF;
                IF v_malla_sombra.presentacion IS NOT NULL THEN
                    v_nota := v_nota || ' ' || v_malla_sombra.presentacion;
                END IF;
            END IF;
    END CASE;
    
    RETURN v_nota;
END;
$$ LANGUAGE plpgsql;

-- 2. Función para restaurar inventario de paños cuando se cancela una orden
CREATE OR REPLACE FUNCTION fn_restaurar_inventario_panos_cancelada(
    p_id_op INTEGER
) RETURNS VOID AS $$
DECLARE
    v_detalle RECORD;
    v_cantidad_restaurar NUMERIC;
    v_tipo_dimension TEXT;
BEGIN
    -- Procesar cada registro de detalle de paños para esta orden
    FOR v_detalle IN 
        SELECT id_item, cantidad, notas
        FROM orden_produccion_detalle 
        WHERE id_op = p_id_op 
        AND tipo_item = 'PANO'
        AND catalogo = 'CATALOGO_1'
    LOOP
        v_cantidad_restaurar := v_detalle.cantidad;
        
        -- Determinar si es largo o ancho basado en las notas
        IF v_detalle.notas LIKE '%largo%' THEN
            v_tipo_dimension := 'largo';
            -- Restaurar largo al paño
            UPDATE pano 
            SET 
                largo_m = largo_m + v_cantidad_restaurar,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_item = v_detalle.id_item;
        ELSIF v_detalle.notas LIKE '%ancho%' THEN
            v_tipo_dimension := 'ancho';
            -- Restaurar ancho al paño
            UPDATE pano 
            SET 
                ancho_m = ancho_m + v_cantidad_restaurar,
                updated_at = CURRENT_TIMESTAMP
            WHERE id_item = v_detalle.id_item;
        ELSE
            v_tipo_dimension := 'desconocido';
        END IF;
        
        -- Registrar movimiento de inventario para cada restauración
        IF v_tipo_dimension IN ('largo', 'ancho') THEN
            INSERT INTO movimiento_inventario (
                id_item, tipo_mov, cantidad, 
                unidad, id_op, 
                notas, fecha, id_usuario
            ) VALUES (
                v_detalle.id_item, 'AJUSTE_IN', 
                v_cantidad_restaurar,
                'm', p_id_op,
                'Restauración automática de inventario por cancelación de orden: ' || 
                v_cantidad_restaurar || 'm ' || v_tipo_dimension,
                CURRENT_TIMESTAMP,
                1
            );
        END IF;
    END LOOP;
    
    -- Eliminar registros de detalle de la orden cancelada
    DELETE FROM orden_produccion_detalle 
    WHERE id_op = p_id_op 
    AND tipo_item = 'PANO'
    AND catalogo = 'CATALOGO_1';
END;
$$ LANGUAGE plpgsql;

-- 3. Función para limpiar registros de detalle después de 3 días (completadas)
CREATE OR REPLACE FUNCTION fn_limpiar_detalle_completadas() RETURNS VOID AS $$
BEGIN
    DELETE FROM orden_produccion_detalle 
    WHERE tipo_item = 'PANO' 
    AND catalogo = 'CATALOGO_1'
    AND id_op IN (
        SELECT id_op 
        FROM orden_produccion 
        WHERE estado = 'completada' 
        AND fecha_creacion < CURRENT_TIMESTAMP - INTERVAL '3 days'
    );
END;
$$ LANGUAGE plpgsql;

-- 4. Función para cambiar estado a cancelada después de 30 días (en_proceso/pausada)
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
        PERFORM fn_restaurar_inventario_panos_cancelada(v_orden.id_op);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Verificar que las funciones se crearon correctamente
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN (
    'fn_generar_nota_pano',
    'fn_restaurar_inventario_panos_cancelada',
    'fn_limpiar_detalle_completadas',
    'fn_cancelar_ordenes_30_dias'
)
AND routine_schema = 'catalogo_1'
ORDER BY routine_name; 