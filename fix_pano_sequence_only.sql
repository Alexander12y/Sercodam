-- ===============================
-- RE-SYNC SECUENCIA DE PANO SOLO
-- ===============================

-- Verificar el estado actual
SELECT 'Estado actual de la tabla pano:' as info;
SELECT COUNT(*) as total_panos FROM pano;
SELECT MAX(id_item) as max_id FROM pano;

-- Verificar la secuencia actual
SELECT 'Secuencia actual de pano:' as info;
SELECT sequence_name, last_value, is_called
FROM information_schema.sequences
WHERE sequence_name LIKE '%pano%';

-- Re-sincronizar la secuencia de pano
SELECT 'Re-sincronizando secuencia de pano...' as info;
SELECT setval(
  pg_get_serial_sequence('pano', 'id_item'),
  COALESCE((SELECT MAX(id_item) FROM pano), 0) + 1,
  false
) as nueva_secuencia;

-- Verificar el resultado
SELECT 'Secuencia después del re-sync:' as info;
SELECT sequence_name, last_value, is_called
FROM information_schema.sequences
WHERE sequence_name LIKE '%pano%';

-- Verificar que se puede insertar un nuevo paño
SELECT 'Prueba de inserción (solo verificación):' as info;
SELECT 'La secuencia está lista para el próximo paño con ID: ' || 
       (SELECT last_value + 1 FROM information_schema.sequences 
        WHERE sequence_name LIKE '%pano%') as proximo_id; 