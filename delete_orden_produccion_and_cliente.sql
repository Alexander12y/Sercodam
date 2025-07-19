-- Script para borrar orden_produccion y luego cliente
-- En el orden correcto para evitar violaciones de foreign key

-- 1. Primero borrar orden_produccion (que referencian a cliente)
DELETE FROM catalogo_1.orden_produccion;

-- 2. Verificar que se borraron
SELECT 'Registros en orden_produccion después del borrado:' as info;
SELECT COUNT(*) as total_registros FROM catalogo_1.orden_produccion;

-- 3. Ahora borrar cliente (ya no hay referencias)
DELETE FROM catalogo_1.cliente;

-- 4. Verificar que se borraron
SELECT 'Registros en cliente después del borrado:' as info;
SELECT COUNT(*) as total_registros FROM catalogo_1.cliente;

-- 5. Resetear las secuencias correspondientes
SELECT setval('catalogo_1.orden_produccion_id_op_seq', 0);
SELECT setval('catalogo_1.cliente_id_cliente_seq', 0);

-- 6. Verificar el estado final
SELECT 'Estado final de las secuencias:' as info;
SELECT 
    'orden_produccion' as tabla,
    currval('catalogo_1.orden_produccion_id_op_seq') as valor_actual
UNION ALL
SELECT 
    'cliente' as tabla,
    currval('catalogo_1.cliente_id_cliente_seq') as valor_actual; 