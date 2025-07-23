-- Script para corregir registros existentes en trabajo_corte
-- Actualiza modo_corte a 'individuales' para trabajos que tienen cortes individuales

-- Verificar estado actual antes de la corrección
SELECT 
    'ESTADO ACTUAL' as estado,
    modo_corte,
    COUNT(*) as cantidad
FROM trabajo_corte 
GROUP BY modo_corte
ORDER BY modo_corte;

-- Mostrar trabajos que tienen cortes individuales pero modo_corte = 'simple'
SELECT 
    'TRABAJOS A CORREGIR' as tipo,
    tc.job_id,
    tc.modo_corte as modo_actual,
    COUNT(ci.id) as cortes_individuales_count
FROM trabajo_corte tc
LEFT JOIN cortes_individuales ci ON tc.job_id = ci.job_id
WHERE tc.modo_corte = 'simple' 
    AND ci.job_id IS NOT NULL
GROUP BY tc.job_id, tc.modo_corte
ORDER BY tc.job_id;

-- Actualizar trabajos que tienen cortes individuales pero modo_corte = 'simple'
UPDATE trabajo_corte 
SET modo_corte = 'individuales'
WHERE job_id IN (
    SELECT DISTINCT tc.job_id
    FROM trabajo_corte tc
    INNER JOIN cortes_individuales ci ON tc.job_id = ci.job_id
    WHERE tc.modo_corte = 'simple'
);

-- Verificar estado después de la corrección
SELECT 
    'ESTADO DESPUÉS DE CORRECCIÓN' as estado,
    modo_corte,
    COUNT(*) as cantidad
FROM trabajo_corte 
GROUP BY modo_corte
ORDER BY modo_corte;

-- Mostrar resumen de cambios
SELECT 
    'RESUMEN DE CAMBIOS' as tipo,
    COUNT(*) as trabajos_corregidos
FROM trabajo_corte 
WHERE modo_corte = 'individuales'
    AND job_id IN (
        SELECT DISTINCT tc.job_id
        FROM trabajo_corte tc
        INNER JOIN cortes_individuales ci ON tc.job_id = ci.job_id
    );

-- Verificar que todos los trabajos con cortes individuales tengan modo_corte = 'individuales'
SELECT 
    'VERIFICACIÓN FINAL' as tipo,
    CASE 
        WHEN tc.modo_corte = 'individuales' THEN '✅ CORRECTO'
        ELSE '❌ INCORRECTO'
    END as estado,
    tc.job_id,
    tc.modo_corte,
    COUNT(ci.id) as cortes_individuales_count
FROM trabajo_corte tc
LEFT JOIN cortes_individuales ci ON tc.job_id = ci.job_id
WHERE ci.job_id IS NOT NULL
GROUP BY tc.job_id, tc.modo_corte
ORDER BY tc.job_id; 