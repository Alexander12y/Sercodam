-- ===============================
-- INVESTIGACIÓN DE CONTAMINACIÓN DE CATÁLOGOS
-- ===============================
-- Este script investiga si hay IDs de paños individuales en las tablas de catálogo

-- 1. VERIFICAR SI HAY IDS DE PAÑOS EN TABLAS DE CATÁLOGO
-- ===============================

-- Verificar nylon
SELECT 'Nylon' as tabla, COUNT(*) as total_registros,
       COUNT(CASE WHEN id_mcr LIKE 'RED_%' THEN 1 END) as ids_de_panos
FROM nylon;

-- Verificar lona
SELECT 'Lona' as tabla, COUNT(*) as total_registros,
       COUNT(CASE WHEN id_mcr LIKE 'RED_%' THEN 1 END) as ids_de_panos
FROM lona;

-- Verificar polipropileno
SELECT 'Polipropileno' as tabla, COUNT(*) as total_registros,
       COUNT(CASE WHEN id_mcr LIKE 'RED_%' THEN 1 END) as ids_de_panos
FROM polipropileno;

-- Verificar malla_sombra
SELECT 'Malla Sombra' as tabla, COUNT(*) as total_registros,
       COUNT(CASE WHEN id_mcr LIKE 'RED_%' THEN 1 END) as ids_de_panos
FROM malla_sombra;

-- 2. MOSTRAR EJEMPLOS DE IDS CONTAMINADOS
-- ===============================

-- IDs de paños en nylon
SELECT 'Nylon contaminado:' as info;
SELECT id_mcr, calibre, cuadro, torsion, refuerzo
FROM nylon 
WHERE id_mcr LIKE 'RED_%'
LIMIT 10;

-- IDs de paños en lona
SELECT 'Lona contaminada:' as info;
SELECT id_mcr, color, presentacion
FROM lona 
WHERE id_mcr LIKE 'RED_%'
LIMIT 10;

-- IDs de paños en polipropileno
SELECT 'Polipropileno contaminado:' as info;
SELECT id_mcr, grosor, cuadro
FROM polipropileno 
WHERE id_mcr LIKE 'RED_%'
LIMIT 10;

-- IDs de paños en malla_sombra
SELECT 'Malla Sombra contaminada:' as info;
SELECT id_mcr, color_tipo_red, presentacion
FROM malla_sombra 
WHERE id_mcr LIKE 'RED_%'
LIMIT 10;

-- 3. VERIFICAR PAÑOS QUE REFERENCIAN IDS DE CATÁLOGO VÁLIDOS
-- ===============================

-- Paños que usan IDs de catálogo válidos (no RED_)
SELECT 'Paños con IDs de catálogo válidos:' as info;
SELECT p.id_item, p.id_mcr, rp.tipo_red, rp.descripcion
FROM pano p
JOIN red_producto rp ON p.id_mcr = rp.id_mcr
WHERE p.id_mcr NOT LIKE 'RED_%'
LIMIT 10;

-- Paños que usan IDs generados (RED_)
SELECT 'Paños con IDs generados (problemáticos):' as info;
SELECT p.id_item, p.id_mcr, rp.tipo_red, rp.descripcion
FROM pano p
JOIN red_producto rp ON p.id_mcr = rp.id_mcr
WHERE p.id_mcr LIKE 'RED_%'
LIMIT 10;

-- 4. ESTADÍSTICAS GENERALES
-- ===============================

-- Total de paños por tipo de ID
SELECT 'Estadísticas de IDs de paños:' as info;
SELECT 
    CASE 
        WHEN p.id_mcr LIKE 'RED_%' THEN 'Generados (problemáticos)'
        ELSE 'De catálogo (correctos)'
    END as tipo_id,
    COUNT(*) as cantidad
FROM pano p
GROUP BY 
    CASE 
        WHEN p.id_mcr LIKE 'RED_%' THEN 'Generados (problemáticos)'
        ELSE 'De catálogo (correctos)'
    END;

-- 5. VERIFICAR INTEGRIDAD REFERENCIAL
-- ===============================

-- Paños sin referencia en red_producto
SELECT 'Paños sin referencia en red_producto:' as info;
SELECT p.id_item, p.id_mcr
FROM pano p
LEFT JOIN red_producto rp ON p.id_mcr = rp.id_mcr
WHERE rp.id_mcr IS NULL;

-- IDs en red_producto que no están en tablas de catálogo
SELECT 'IDs en red_producto sin catálogo específico:' as info;
SELECT rp.id_mcr, rp.tipo_red, rp.descripcion
FROM red_producto rp
LEFT JOIN nylon n ON rp.id_mcr = n.id_mcr
LEFT JOIN lona l ON rp.id_mcr = l.id_mcr
LEFT JOIN polipropileno pp ON rp.id_mcr = pp.id_mcr
LEFT JOIN malla_sombra ms ON rp.id_mcr = ms.id_mcr
WHERE n.id_mcr IS NULL 
  AND l.id_mcr IS NULL 
  AND pp.id_mcr IS NULL 
  AND ms.id_mcr IS NULL
LIMIT 10; 