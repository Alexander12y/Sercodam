-- ===============================
-- LIMPIEZA DE CONTAMINACIÓN DE CATÁLOGOS
-- ===============================
-- Este script elimina los IDs de paños individuales de las tablas de catálogo

-- ADVERTENCIA: Este script elimina datos. Ejecutar con precaución.
-- Hacer backup antes de ejecutar.

BEGIN;

-- 1. ELIMINAR IDS DE PAÑOS DE TABLAS DE CATÁLOGO
-- ===============================

-- Eliminar de nylon
DELETE FROM nylon 
WHERE id_mcr LIKE 'RED_%';

-- Eliminar de lona
DELETE FROM lona 
WHERE id_mcr LIKE 'RED_%';

-- Eliminar de polipropileno
DELETE FROM polipropileno 
WHERE id_mcr LIKE 'RED_%';

-- Eliminar de malla_sombra
DELETE FROM malla_sombra 
WHERE id_mcr LIKE 'RED_%';

-- 2. VERIFICAR QUE SE ELIMINARON
-- ===============================

-- Verificar nylon
SELECT 'Nylon después de limpieza:' as info;
SELECT COUNT(*) as total_registros,
       COUNT(CASE WHEN id_mcr LIKE 'RED_%' THEN 1 END) as ids_de_panos_restantes
FROM nylon;

-- Verificar lona
SELECT 'Lona después de limpieza:' as info;
SELECT COUNT(*) as total_registros,
       COUNT(CASE WHEN id_mcr LIKE 'RED_%' THEN 1 END) as ids_de_panos_restantes
FROM lona;

-- Verificar polipropileno
SELECT 'Polipropileno después de limpieza:' as info;
SELECT COUNT(*) as total_registros,
       COUNT(CASE WHEN id_mcr LIKE 'RED_%' THEN 1 END) as ids_de_panos_restantes
FROM polipropileno;

-- Verificar malla_sombra
SELECT 'Malla Sombra después de limpieza:' as info;
SELECT COUNT(*) as total_registros,
       COUNT(CASE WHEN id_mcr LIKE 'RED_%' THEN 1 END) as ids_de_panos_restantes
FROM malla_sombra;

-- 3. VERIFICAR QUE LOS PAÑOS SIGUEN FUNCIONANDO
-- ===============================

-- Los paños con IDs generados seguirán funcionando porque tienen su registro en red_producto
SELECT 'Paños que siguen funcionando:' as info;
SELECT COUNT(*) as total_panos
FROM pano p
JOIN red_producto rp ON p.id_mcr = rp.id_mcr;

-- 4. MOSTRAR ESTADO FINAL
-- ===============================

SELECT 'Estado final de catálogos:' as info;
SELECT 'nylon' as tabla, COUNT(*) as registros FROM nylon
UNION ALL
SELECT 'lona' as tabla, COUNT(*) as registros FROM lona
UNION ALL
SELECT 'polipropileno' as tabla, COUNT(*) as registros FROM polipropileno
UNION ALL
SELECT 'malla_sombra' as tabla, COUNT(*) as registros FROM malla_sombra;

COMMIT;

-- ===============================
-- NOTAS IMPORTANTES
-- ===============================
-- 
-- 1. Los paños individuales con IDs generados (RED_*) seguirán funcionando
--    porque tienen su registro en red_producto
-- 
-- 2. Para futuros paños, el sistema debería:
--    - Permitir seleccionar un tipo de red existente del catálogo
--    - Usar el id_mcr del catálogo seleccionado
--    - NO crear nuevos registros en las tablas de catálogo
-- 
-- 3. Los catálogos ahora solo contienen tipos de redes válidos
--    que pueden ser seleccionados al crear nuevos paños 