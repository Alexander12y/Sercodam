-- Script simple para arreglar secuencias
-- Sin funciones complejas, solo comandos directos

-- Resetear secuencias basándose en los valores máximos actuales

-- 1. inventario_item (el más importante)
SELECT setval('catalogo_1.inventario_item_id_item_seq', COALESCE((SELECT MAX(id_item) FROM catalogo_1.inventario_item), 0) + 1);

-- 2. orden_produccion
SELECT setval('catalogo_1.orden_produccion_id_op_seq', COALESCE((SELECT MAX(id_op) FROM catalogo_1.orden_produccion), 0) + 1);

-- 3. pano
SELECT setval('catalogo_1.pano_id_pano_seq', COALESCE((SELECT MAX(id_pano) FROM catalogo_1.pano), 0) + 1);

-- 4. trabajo_corte
SELECT setval('catalogo_1.trabajo_corte_job_id_seq', COALESCE((SELECT MAX(job_id) FROM catalogo_1.trabajo_corte), 0) + 1);

-- 5. movimiento_inventario
SELECT setval('catalogo_1.movimiento_inventario_id_movimiento_seq', COALESCE((SELECT MAX(id_movimiento) FROM catalogo_1.movimiento_inventario), 0) + 1);

-- 6. orden_produccion_detalle
SELECT setval('catalogo_1.orden_produccion_detalle_id_detalle_seq', COALESCE((SELECT MAX(id_detalle) FROM catalogo_1.orden_produccion_detalle), 0) + 1);

-- 7. panos_sobrantes
SELECT setval('catalogo_1.panos_sobrantes_id_remnant_seq', COALESCE((SELECT MAX(id_remnant) FROM catalogo_1.panos_sobrantes), 0) + 1);

-- 8. real_corte_pieza
SELECT setval('catalogo_1.real_corte_pieza_id_pieza_seq', COALESCE((SELECT MAX(id_pieza) FROM catalogo_1.real_corte_pieza), 0) + 1);

-- 9. herramienta_ordenada
SELECT setval('catalogo_1.herramienta_ordenada_id_orden_seq', COALESCE((SELECT MAX(id_orden) FROM catalogo_1.herramienta_ordenada), 0) + 1);

-- 10. cliente
SELECT setval('catalogo_1.cliente_id_cliente_seq', COALESCE((SELECT MAX(id_cliente) FROM catalogo_1.cliente), 0) + 1);

-- 11. cliente_log
SELECT setval('catalogo_1.cliente_log_id_log_seq', COALESCE((SELECT MAX(id_log) FROM catalogo_1.cliente_log), 0) + 1);

-- 12. ordenes_draft
SELECT setval('catalogo_1.ordenes_draft_id_draft_seq', COALESCE((SELECT MAX(id_draft) FROM catalogo_1.ordenes_draft), 0) + 1);

-- 13. reporte_variacion
SELECT setval('catalogo_1.reporte_variacion_var_id_seq', COALESCE((SELECT MAX(var_id) FROM catalogo_1.reporte_variacion), 0) + 1);

-- Verificar el estado final de las secuencias principales
SELECT 
    'inventario_item' as tabla,
    currval('catalogo_1.inventario_item_id_item_seq') as valor_actual
UNION ALL
SELECT 
    'orden_produccion' as tabla,
    currval('catalogo_1.orden_produccion_id_op_seq') as valor_actual
UNION ALL
SELECT 
    'pano' as tabla,
    currval('catalogo_1.pano_id_pano_seq') as valor_actual
UNION ALL
SELECT 
    'trabajo_corte' as tabla,
    currval('catalogo_1.trabajo_corte_job_id_seq') as valor_actual
UNION ALL
SELECT 
    'movimiento_inventario' as tabla,
    currval('catalogo_1.movimiento_inventario_id_movimiento_seq') as valor_actual;

-- Mostrar el siguiente valor que se usará
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