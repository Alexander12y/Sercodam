-- ===============================
-- SCRIPT COMPLETO DE RE-SYNC DE SECUENCIAS
-- Basado en la exploración de la base de datos
-- ===============================

-- 1. RE-SYNC DE SECUENCIAS PRINCIPALES
-- ===============================

-- inventario_item (max_id: 559)
SELECT setval('inventario_item_id_item_seq', 559, true);

-- pano (max_id: NULL, pero la secuencia debe estar en 1)
SELECT setval('pano_id_pano_seq', 1, false);

-- usuario (usando la secuencia usuario_id_seq)
SELECT setval('usuario_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM usuario), 1), true);

-- orden_produccion (usando la secuencia orden_produccion_id_op_seq)
SELECT setval('orden_produccion_id_op_seq', GREATEST((SELECT COALESCE(MAX(id_op), 0) FROM orden_produccion), 1), true);

-- orden_produccion_detalle (usando la secuencia orden_produccion_detalle_id_detalle_seq)
SELECT setval('orden_produccion_detalle_id_detalle_seq', GREATEST((SELECT COALESCE(MAX(id_detalle), 0) FROM orden_produccion_detalle), 1), true);

-- cliente (usando la secuencia cliente_id_cliente_seq)
SELECT setval('cliente_id_cliente_seq', GREATEST((SELECT COALESCE(MAX(id_cliente), 0) FROM cliente), 1), true);

-- trabajo_corte (usando la secuencia trabajo_corte_job_id_seq)
SELECT setval('trabajo_corte_job_id_seq', GREATEST((SELECT COALESCE(MAX(job_id), 0) FROM trabajo_corte), 1), true);

-- panos_sobrantes (usando la secuencia panos_sobrantes_id_remnant_seq)
SELECT setval('panos_sobrantes_id_remnant_seq', GREATEST((SELECT COALESCE(MAX(id_remnant), 0) FROM panos_sobrantes), 1), true);

-- ===============================
-- 2. VERIFICACIÓN DE SECUENCIAS
-- ===============================

-- Mostrar el estado actual de las secuencias principales
SELECT 
    'inventario_item_id_item_seq' as secuencia,
    last_value,
    is_called
FROM inventario_item_id_item_seq
UNION ALL
SELECT 
    'pano_id_pano_seq' as secuencia,
    last_value,
    is_called
FROM pano_id_pano_seq
UNION ALL
SELECT 
    'usuario_id_seq' as secuencia,
    last_value,
    is_called
FROM usuario_id_seq
ORDER BY secuencia;

-- ===============================
-- 3. VERIFICACIÓN DE TRIGGERS
-- ===============================

-- Mostrar triggers activos en tablas clave
SELECT 
    event_object_table AS tabla,
    trigger_name,
    event_manipulation AS evento,
    action_timing AS momento
FROM information_schema.triggers
WHERE event_object_table IN ('inventario_item', 'pano', 'materiales_extras', 'herramientas')
ORDER BY tabla, trigger_name;

-- ===============================
-- 4. ESTADO FINAL DE TABLAS
-- ===============================

-- Conteo de registros en tablas clave
SELECT 'inventario_item' as tabla, COUNT(*) as total FROM inventario_item
UNION ALL
SELECT 'pano', COUNT(*) FROM pano
UNION ALL
SELECT 'materiales_extras', COUNT(*) FROM materiales_extras
UNION ALL
SELECT 'herramientas', COUNT(*) FROM herramientas
UNION ALL
SELECT 'usuario', COUNT(*) FROM usuario
UNION ALL
SELECT 'orden_produccion', COUNT(*) FROM orden_produccion
ORDER BY tabla;

-- Últimos IDs en tablas clave
SELECT 'inventario_item' as tabla, MAX(id_item) as max_id FROM inventario_item
UNION ALL
SELECT 'pano', MAX(id_item) FROM pano
UNION ALL
SELECT 'materiales_extras', MAX(id_item) FROM materiales_extras
UNION ALL
SELECT 'herramientas', MAX(id_item) FROM herramientas
UNION ALL
SELECT 'usuario', MAX(id) FROM usuario
UNION ALL
SELECT 'orden_produccion', MAX(id_op) FROM orden_produccion
ORDER BY tabla;

-- ===============================
-- 5. MENSAJE DE CONFIRMACIÓN
-- ===============================

SELECT '✅ Secuencias resincronizadas correctamente' as mensaje; 