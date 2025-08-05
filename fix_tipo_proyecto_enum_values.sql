-- Script SQL para actualizar valores de tipo_proyecto a los nuevos valores del enum
-- Ejecutar para migrar datos existentes al nuevo formato de enum

-- Actualizar valores antiguos al nuevo formato del enum
UPDATE cotizacion 
SET tipo_proyecto = CASE 
    WHEN tipo_proyecto = 'REDES_INDUSTRIALES' THEN 'Redes Industriales'
    WHEN tipo_proyecto = 'REDES_CONSTRUCCION' THEN 'Redes de Construcción'  
    WHEN tipo_proyecto = 'REDES_DEPORTIVAS' THEN 'Redes Deportivas'
    WHEN tipo_proyecto = 'ARTICULOS_DEPORTIVOS' THEN 'Artículos Deportivos'
    WHEN tipo_proyecto = 'red_deportiva' THEN 'Redes Deportivas'
    WHEN tipo_proyecto = 'red_proteccion' THEN 'Redes Industriales'
    WHEN tipo_proyecto = 'red_industrial' THEN 'Redes Industriales' 
    WHEN tipo_proyecto = 'sistema_proteccion' THEN 'Redes de Construcción'
    ELSE tipo_proyecto
END
WHERE tipo_proyecto NOT IN ('Redes Industriales', 'Redes de Construcción', 'Redes Deportivas', 'Artículos Deportivos');

-- Verificar el resultado de la actualización
SELECT tipo_proyecto, COUNT(*) as cantidad 
FROM cotizacion 
GROUP BY tipo_proyecto 
ORDER BY cantidad DESC;

-- Comentario sobre los valores válidos del enum
-- Los únicos valores válidos para tipo_proyecto_enum son:
-- 'Redes Industriales'
-- 'Redes de Construcción'  
-- 'Redes Deportivas'
-- 'Artículos Deportivos'