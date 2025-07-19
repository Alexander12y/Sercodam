-- Script robusto para arreglar secuencias
-- Maneja errores específicos encontrados

-- Función para verificar si una columna existe
CREATE OR REPLACE FUNCTION column_exists(table_name text, column_name text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'catalogo_1' 
        AND table_name = $1 
        AND column_name = $2
    );
END;
$$ LANGUAGE plpgsql;

-- Función para resetear secuencia de forma segura
CREATE OR REPLACE FUNCTION safe_reset_sequence(seq_name text, table_name text, id_column text)
RETURNS void AS $$
DECLARE
    max_id bigint;
    next_val bigint;
    col_exists boolean;
BEGIN
    -- Verificar si la columna existe
    SELECT column_exists(table_name, id_column) INTO col_exists;
    
    IF NOT col_exists THEN
        RAISE NOTICE 'Columna % no existe en tabla %, saltando secuencia %', id_column, table_name, seq_name;
        RETURN;
    END IF;
    
    -- Obtener el valor máximo actual de la tabla
    EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM catalogo_1.%I', id_column, table_name) INTO max_id;
    
    -- Si no hay registros, resetear a 1, sino al siguiente valor
    IF max_id = 0 THEN
        next_val := 1;
    ELSE
        next_val := max_id + 1;
    END IF;
    
    -- Resetear la secuencia
    EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seq_name, next_val);
    
    RAISE NOTICE 'Secuencia % reseteada a % (max_id: %)', seq_name, next_val, max_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error reseteando secuencia %: %', seq_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Resetear secuencias de forma segura
SELECT safe_reset_sequence('catalogo_1.inventario_item_id_item_seq', 'inventario_item', 'id_item');
SELECT safe_reset_sequence('catalogo_1.orden_produccion_id_op_seq', 'orden_produccion', 'id_op');
SELECT safe_reset_sequence('catalogo_1.pano_id_pano_seq', 'pano', 'id_pano');
SELECT safe_reset_sequence('catalogo_1.trabajo_corte_job_id_seq', 'trabajo_corte', 'job_id');
SELECT safe_reset_sequence('catalogo_1.movimiento_inventario_id_movimiento_seq', 'movimiento_inventario', 'id_movimiento');
SELECT safe_reset_sequence('catalogo_1.orden_produccion_detalle_id_detalle_seq', 'orden_produccion_detalle', 'id_detalle');
SELECT safe_reset_sequence('catalogo_1.panos_sobrantes_id_remnant_seq', 'panos_sobrantes', 'id_remnant');
SELECT safe_reset_sequence('catalogo_1.real_corte_pieza_id_pieza_seq', 'real_corte_pieza', 'id_pieza');
SELECT safe_reset_sequence('catalogo_1.herramienta_ordenada_id_orden_seq', 'herramienta_ordenada', 'id_orden');
SELECT safe_reset_sequence('catalogo_1.cliente_id_cliente_seq', 'cliente', 'id_cliente');
SELECT safe_reset_sequence('catalogo_1.cliente_log_id_log_seq', 'cliente_log', 'id_log');
SELECT safe_reset_sequence('catalogo_1.ordenes_draft_id_draft_seq', 'ordenes_draft', 'id_draft');
SELECT safe_reset_sequence('catalogo_1.reporte_variacion_var_id_seq', 'reporte_variacion', 'var_id');

-- Limpiar funciones temporales
DROP FUNCTION safe_reset_sequence(text, text, text);
DROP FUNCTION column_exists(text, text);

-- Verificar el estado final de las secuencias principales
SELECT 
    'inventario_item' as tabla,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'inventario_item_id_item_seq') 
        THEN currval('catalogo_1.inventario_item_id_item_seq')::text
        ELSE 'No disponible'
    END as valor_actual
UNION ALL
SELECT 
    'orden_produccion' as tabla,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'orden_produccion_id_op_seq') 
        THEN currval('catalogo_1.orden_produccion_id_op_seq')::text
        ELSE 'No disponible'
    END as valor_actual
UNION ALL
SELECT 
    'pano' as tabla,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'pano_id_pano_seq') 
        THEN currval('catalogo_1.pano_id_pano_seq')::text
        ELSE 'No disponible'
    END as valor_actual
UNION ALL
SELECT 
    'trabajo_corte' as tabla,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'trabajo_corte_job_id_seq') 
        THEN currval('catalogo_1.trabajo_corte_job_id_seq')::text
        ELSE 'No disponible'
    END as valor_actual
UNION ALL
SELECT 
    'movimiento_inventario' as tabla,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'movimiento_inventario_id_movimiento_seq') 
        THEN currval('catalogo_1.movimiento_inventario_id_movimiento_seq')::text
        ELSE 'No disponible'
    END as valor_actual;

-- Mostrar información de las secuencias
SELECT 
    schemaname,
    sequencename,
    last_value,
    start_value,
    increment_by,
    max_value,
    min_value,
    is_cycled,
    is_called
FROM pg_sequences 
WHERE schemaname = 'catalogo_1'
ORDER BY sequencename; 