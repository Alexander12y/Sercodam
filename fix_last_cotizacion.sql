-- Corregir la última cotización con título inválido
UPDATE catalogo_1.cotizacion 
SET titulo_proyecto = 'Redes Antica¡da'
WHERE numero_cotizacion = 'TEST-SIMPLE';

-- Verificar el resultado
SELECT 
    c.id_cotizacion,
    c.numero_cotizacion,
    c.titulo_proyecto,
    tp.foto_titulo,
    tpro.foto_tipo,
    CASE 
        WHEN tp.titulo_proyecto IS NOT NULL THEN '✅ VÁLIDO'
        ELSE '❌ INVÁLIDO'
    END as estado
FROM catalogo_1.cotizacion c
LEFT JOIN catalogo_1.titulo_proyecto tp ON c.titulo_proyecto = tp.titulo_proyecto
LEFT JOIN catalogo_1.tipo_proyecto tpro ON c.tipo_proyecto = tpro.tipo_proyecto
ORDER BY c.fecha_creacion DESC; 