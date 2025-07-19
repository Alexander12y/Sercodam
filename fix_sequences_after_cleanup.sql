-- Script para arreglar todas las secuencias después de la limpieza
-- Este script resincroniza las secuencias con los valores máximos actuales

-- Función para resetear una secuencia
CREATE OR REPLACE FUNCTION reset_sequence(seq_name text, table_name text, id_column text)
RETURNS void AS $$
DECLARE
    max_id bigint;
    next_val bigint;
BEGIN
    -- Obtener el valor máximo actual de la tabla
    EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', id_column, table_name) INTO max_id;
    
    -- Si no hay registros, resetear a 1, sino al siguiente valor
    IF max_id = 0 THEN
        next_val := 1;
    ELSE
        next_val := max_id + 1;
    END IF;
    
    -- Resetear la secuencia
    EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seq_name, next_val);
    
    RAISE NOTICE 'Secuencia % reseteada a % (max_id: %)', seq_name, next_val, max_id;
END;
$$ LANGUAGE plpgsql;

-- Resetear secuencias de tablas principales
SELECT reset_sequence('catalogo_1.orden_produccion_id_op_seq', 'catalogo_1.orden_produccion', 'id_op');
SELECT reset_sequence('catalogo_1.orden_produccion_detalle_id_detalle_seq', 'catalogo_1.orden_produccion_detalle', 'id_detalle');
SELECT reset_sequence('catalogo_1.pano_id_pano_seq', 'catalogo_1.pano', 'id_pano');
SELECT reset_sequence('catalogo_1.panos_sobrantes_id_remnant_seq', 'catalogo_1.panos_sobrantes', 'id_remnant');
SELECT reset_sequence('catalogo_1.trabajo_corte_job_id_seq', 'catalogo_1.trabajo_corte', 'job_id');
SELECT reset_sequence('catalogo_1.real_corte_pieza_id_pieza_seq', 'catalogo_1.real_corte_pieza', 'id_pieza');
SELECT reset_sequence('catalogo_1.movimiento_inventario_id_movimiento_seq', 'catalogo_1.movimiento_inventario', 'id_movimiento');
SELECT reset_sequence('catalogo_1.herramienta_ordenada_id_orden_seq', 'catalogo_1.herramienta_ordenada', 'id_orden');
SELECT reset_sequence('catalogo_1.cliente_id_cliente_seq', 'catalogo_1.cliente', 'id_cliente');
SELECT reset_sequence('catalogo_1.cliente_log_id_log_seq', 'catalogo_1.cliente_log', 'id_log');
SELECT reset_sequence('catalogo_1.ordenes_draft_id_draft_seq', 'catalogo_1.ordenes_draft', 'id_draft');
SELECT reset_sequence('catalogo_1.reporte_variacion_var_id_seq', 'catalogo_1.reporte_variacion', 'var_id');

-- Para inventario_item, usar el valor máximo actual + 1
SELECT reset_sequence('catalogo_1.inventario_item_id_item_seq', 'catalogo_1.inventario_item', 'id_item');

-- Verificar el estado de las secuencias
SELECT 
    schemaname,
    sequencename,
    last_value,
    start_value,
    increment_by,
    max_value,
    min_value,
    cache_value,
    is_cycled,
    is_called
FROM pg_sequences 
WHERE schemaname = 'catalogo_1'
ORDER BY sequencename;

-- Mostrar el siguiente valor que se usará para cada secuencia
SELECT 
    'inventario_item' as tabla,
    nextval('catalogo_1.inventario_item_id_item_seq') as siguiente_valor
UNION ALL
SELECT 
    'orden_produccion' as tabla,
    nextval('catalogo_1.orden_produccion_id_op_seq') as siguiente_valor
UNION ALL
SELECT 
    'pano' as tabla,
    nextval('catalogo_1.pano_id_pano_seq') as siguiente_valor
UNION ALL
SELECT 
    'trabajo_corte' as tabla,
    nextval('catalogo_1.trabajo_corte_job_id_seq') as siguiente_valor
UNION ALL
SELECT 
    'movimiento_inventario' as tabla,
    nextval('catalogo_1.movimiento_inventario_id_movimiento_seq') as siguiente_valor;

-- Revertir los valores de prueba
SELECT setval('catalogo_1.inventario_item_id_item_seq', currval('catalogo_1.inventario_item_id_item_seq') - 1);
SELECT setval('catalogo_1.orden_produccion_id_op_seq', currval('catalogo_1.orden_produccion_id_op_seq') - 1);
SELECT setval('catalogo_1.pano_id_pano_seq', currval('catalogo_1.pano_id_pano_seq') - 1);
SELECT setval('catalogo_1.trabajo_corte_job_id_seq', currval('catalogo_1.trabajo_corte_job_id_seq') - 1);
SELECT setval('catalogo_1.movimiento_inventario_id_movimiento_seq', currval('catalogo_1.movimiento_inventario_id_movimiento_seq') - 1);

-- Limpiar la función temporal
DROP FUNCTION reset_sequence(text, text, text); 