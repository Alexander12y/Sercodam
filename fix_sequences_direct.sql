-- Script directo y simple para arreglar secuencias
-- Sin funciones complejas, solo comandos directos

-- 1. inventario_item (el más importante)
SELECT setval('catalogo_1.inventario_item_id_item_seq', 560);

-- 2. orden_produccion
SELECT setval('catalogo_1.orden_produccion_id_op_seq', 7);

-- 3. pano
SELECT setval('catalogo_1.pano_id_pano_seq', 0);

-- 4. trabajo_corte
SELECT setval('catalogo_1.trabajo_corte_job_id_seq', 0);

-- 5. movimiento_inventario
SELECT setval('catalogo_1.movimiento_inventario_id_movimiento_seq', 0);

-- 6. orden_produccion_detalle
SELECT setval('catalogo_1.orden_produccion_detalle_id_detalle_seq', 0);

-- 7. panos_sobrantes
SELECT setval('catalogo_1.panos_sobrantes_id_remnant_seq', 0);

-- 8. real_corte_pieza
SELECT setval('catalogo_1.real_corte_pieza_id_pieza_seq', 0);

-- 9. herramienta_ordenada
SELECT setval('catalogo_1.herramienta_ordenada_id_orden_seq', 0);

-- 10. cliente
SELECT setval('catalogo_1.cliente_id_cliente_seq', 9);

-- 11. cliente_log
SELECT setval('catalogo_1.cliente_log_id_log_seq', 0);

-- 12. ordenes_draft
SELECT setval('catalogo_1.ordenes_draft_id_draft_seq', 0);

-- 13. reporte_variacion
SELECT setval('catalogo_1.reporte_variacion_var_id_seq', 0);

-- Verificar el estado final
SELECT 'Secuencias reseteadas exitosamente' as resultado;

-- Mostrar información básica de las secuencias
SELECT 
    schemaname,
    sequencename,
    last_value,
    start_value,
    increment_by
FROM pg_sequences 
WHERE schemaname = 'catalogo_1'
ORDER BY sequencename; 