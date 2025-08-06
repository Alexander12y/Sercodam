-- Script corregido para actualizar las fotos de los tipos de proyecto
-- Asociar cada tipo de proyecto con su foto correspondiente

UPDATE catalogo_1.titulo_proyecto 
SET foto = 'Industrial.png' 
WHERE tipo_proyecto = 'Redes Industriales';

UPDATE catalogo_1.titulo_proyecto 
SET foto = 'construccion.png' 
WHERE tipo_proyecto = 'Redes de Construcción';

UPDATE catalogo_1.titulo_proyecto 
SET foto = 'deportivo.png' 
WHERE tipo_proyecto = 'Redes Deportivas';

UPDATE catalogo_1.titulo_proyecto 
SET foto = 'deportivo.png' 
WHERE tipo_proyecto = 'Artículos Deportivos';

-- Verificar los cambios
SELECT titulo_proyecto, foto, tipo_proyecto 
FROM catalogo_1.titulo_proyecto 
ORDER BY tipo_proyecto, titulo_proyecto; 