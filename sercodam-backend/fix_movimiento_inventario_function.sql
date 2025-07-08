-- Corregir la función fn_restaurar_inventario_panos_cancelada para usar las columnas correctas
-- de la tabla movimiento_inventario y restaurar exactamente las cantidades de cada registro

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

-- Verificar que la función se creó correctamente
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'fn_restaurar_inventario_panos_cancelada'
AND routine_schema = 'catalogo_1'; 