-- Script para corregir los títulos de proyecto en cotizaciones
-- para que coincidan exactamente con los registros en titulo_proyecto

-- 1. Verificar cotizaciones con títulos que no coinciden
SELECT 
    c.id_cotizacion,
    c.numero_cotizacion,
    c.titulo_proyecto as titulo_actual,
    tp.titulo_proyecto as titulo_correcto,
    tp.foto_titulo,
    tpro.foto_tipo
FROM catalogo_1.cotizacion c
LEFT JOIN catalogo_1.titulo_proyecto tp ON c.titulo_proyecto = tp.titulo_proyecto
LEFT JOIN catalogo_1.tipo_proyecto tpro ON c.tipo_proyecto = tpro.tipo_proyecto
WHERE tp.titulo_proyecto IS NULL 
   OR c.titulo_proyecto != tp.titulo_proyecto
ORDER BY c.fecha_creacion DESC;

-- 2. Corregir títulos específicos que tienen caracteres especiales diferentes
UPDATE catalogo_1.cotizacion 
SET titulo_proyecto = 'Redes Anticaída'
WHERE titulo_proyecto = 'Redes Antica¡da';

UPDATE catalogo_1.cotizacion 
SET titulo_proyecto = 'Redes para Fútbol'
WHERE titulo_proyecto = 'Redes para F£tbol';

-- 3. Para títulos que no existen en titulo_proyecto, asignar el más cercano según el tipo
UPDATE catalogo_1.cotizacion 
SET titulo_proyecto = 'Redes Anticaída'
WHERE titulo_proyecto = 'Test Project Simple' 
   AND tipo_proyecto = 'Redes Industriales';

-- 4. Verificar que todas las cotizaciones tengan un título válido
SELECT 
    c.id_cotizacion,
    c.numero_cotizacion,
    c.titulo_proyecto,
    c.tipo_proyecto,
    tp.foto_titulo,
    tpro.foto_tipo,
    CASE 
        WHEN tp.titulo_proyecto IS NOT NULL THEN '✅ Coincide'
        ELSE '❌ No coincide'
    END as estado
FROM catalogo_1.cotizacion c
LEFT JOIN catalogo_1.titulo_proyecto tp ON c.titulo_proyecto = tp.titulo_proyecto
LEFT JOIN catalogo_1.tipo_proyecto tpro ON c.tipo_proyecto = tpro.tipo_proyecto
ORDER BY c.fecha_creacion DESC;

-- 5. Mostrar resumen final
SELECT 
    COUNT(*) as total_cotizaciones,
    COUNT(tp.titulo_proyecto) as con_titulo_valido,
    COUNT(*) - COUNT(tp.titulo_proyecto) as sin_titulo_valido
FROM catalogo_1.cotizacion c
LEFT JOIN catalogo_1.titulo_proyecto tp ON c.titulo_proyecto = tp.titulo_proyecto; 