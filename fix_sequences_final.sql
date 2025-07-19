-- Script final para arreglar las secuencias
-- Establecer en 1 en lugar de 0 para evitar errores de bounds

-- Resetear secuencias a 1 (valor válido)
SELECT setval('catalogo_1.orden_produccion_id_op_seq', 1);
SELECT setval('catalogo_1.cliente_id_cliente_seq', 1);

-- Verificar el estado final
SELECT 'Estado final de las secuencias:' as info;
SELECT 
    'orden_produccion' as tabla,
    currval('catalogo_1.orden_produccion_id_op_seq') as valor_actual
UNION ALL
SELECT 
    'cliente' as tabla,
    currval('catalogo_1.cliente_id_cliente_seq') as valor_actual;

-- Mostrar el siguiente valor que se usará
SELECT 'Próximos valores de secuencia:' as info;
SELECT 
    'orden_produccion' as tabla,
    nextval('catalogo_1.orden_produccion_id_op_seq') as siguiente_valor
UNION ALL
SELECT 
    'cliente' as tabla,
    nextval('catalogo_1.cliente_id_cliente_seq') as siguiente_valor;

-- Revertir los valores de prueba
SELECT setval('catalogo_1.orden_produccion_id_op_seq', currval('catalogo_1.orden_produccion_id_op_seq') - 1);
SELECT setval('catalogo_1.cliente_id_cliente_seq', currval('catalogo_1.cliente_id_cliente_seq') - 1);

-- Verificación final
SELECT '¡Limpieza completada exitosamente!' as resultado; 