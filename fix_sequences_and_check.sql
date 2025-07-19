-- ===============================
-- RE-SYNC DE SECUENCIAS IMPORTANTES
-- ===============================

-- Ajusta la secuencia de inventario_item
SELECT setval(
  pg_get_serial_sequence('inventario_item', 'id_item'),
  COALESCE((SELECT MAX(id_item) FROM inventario_item), 0) + 1,
  false
);

-- Ajusta la secuencia de pano
SELECT setval(
  pg_get_serial_sequence('pano', 'id_item'),
  COALESCE((SELECT MAX(id_item) FROM pano), 0) + 1,
  false
);

-- Ajusta la secuencia de materiales_extras (si aplica)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='materiales_extras' AND column_name='id_item') THEN
    EXECUTE format('SELECT setval(pg_get_serial_sequence(''materiales_extras'', ''id_item''), COALESCE((SELECT MAX(id_item) FROM materiales_extras), 0) + 1, false);');
  END IF;
END$$;

-- Ajusta la secuencia de herramientas (si aplica)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='herramientas' AND column_name='id_item') THEN
    EXECUTE format('SELECT setval(pg_get_serial_sequence(''herramientas'', ''id_item''), COALESCE((SELECT MAX(id_item) FROM herramientas), 0) + 1, false);');
  END IF;
END$$;

-- ===============================
-- CHEQUEO DE TRIGGERS
-- ===============================

-- Lista de triggers por tabla clave
SELECT event_object_table AS tabla, trigger_name, event_manipulation AS evento, action_timing AS momento
FROM information_schema.triggers
WHERE event_object_table IN ('inventario_item', 'pano', 'materiales_extras', 'herramientas')
ORDER BY tabla, trigger_name;

-- ===============================
-- CHEQUEO DE SECUENCIAS
-- ===============================

SELECT sequence_name, last_value, is_called
FROM information_schema.sequences
WHERE sequence_name LIKE '%inventario%' OR sequence_name LIKE '%pano%' OR sequence_name LIKE '%material%' OR sequence_name LIKE '%herramienta%'
ORDER BY sequence_name;

-- ===============================
-- CHEQUEO DE ESTADO DE TABLAS CLAVE
-- ===============================

SELECT 'inventario_item' as tabla, COUNT(*) as total FROM inventario_item
UNION ALL
SELECT 'pano', COUNT(*) FROM pano
UNION ALL
SELECT 'materiales_extras', COUNT(*) FROM materiales_extras
UNION ALL
SELECT 'herramientas', COUNT(*) FROM herramientas
ORDER BY tabla;

-- ===============================
-- CHEQUEO DE ÚLTIMOS IDS
-- ===============================

SELECT 'inventario_item' as tabla, MAX(id_item) as max_id FROM inventario_item
UNION ALL
SELECT 'pano', MAX(id_item) FROM pano
UNION ALL
SELECT 'materiales_extras', MAX(id_item) FROM materiales_extras
UNION ALL
SELECT 'herramientas', MAX(id_item) FROM herramientas
ORDER BY tabla; 