-- Script mejorado para corregir los títulos de proyecto en cotizaciones
-- Evitando problemas de codificación de caracteres

-- 1. Primero, verificar el estado actual
SELECT 
    c.id_cotizacion,
    c.numero_cotizacion,
    c.titulo_proyecto,
    c.tipo_proyecto,
    CASE 
        WHEN tp.titulo_proyecto IS NOT NULL THEN 'OK'
        ELSE 'NO MATCH'
    END as estado
FROM catalogo_1.cotizacion c
LEFT JOIN catalogo_1.titulo_proyecto tp ON c.titulo_proyecto = tp.titulo_proyecto
ORDER BY c.fecha_creacion DESC;

-- 2. Corregir títulos usando LIKE para evitar problemas de codificación
UPDATE catalogo_1.cotizacion 
SET titulo_proyecto = 'Redes Anticaída'
WHERE titulo_proyecto LIKE '%Redes Antica%da%';

UPDATE catalogo_1.cotizacion 
SET titulo_proyecto = 'Redes para Fútbol'
WHERE titulo_proyecto LIKE '%Redes para F%tbol%';

-- 3. Corregir títulos de prueba
UPDATE catalogo_1.cotizacion 
SET titulo_proyecto = 'Redes Anticaída'
WHERE titulo_proyecto = 'Test Project Simple' 
   AND tipo_proyecto = 'Redes Industriales';

-- 4. Verificar el resultado
SELECT 
    c.id_cotizacion,
    c.numero_cotizacion,
    c.titulo_proyecto,
    c.tipo_proyecto,
    tp.foto_titulo,
    tpro.foto_tipo,
    CASE 
        WHEN tp.titulo_proyecto IS NOT NULL THEN 'OK'
        ELSE 'NO MATCH'
    END as estado
FROM catalogo_1.cotizacion c
LEFT JOIN catalogo_1.titulo_proyecto tp ON c.titulo_proyecto = tp.titulo_proyecto
LEFT JOIN catalogo_1.tipo_proyecto tpro ON c.tipo_proyecto = tpro.tipo_proyecto
ORDER BY c.fecha_creacion DESC; 