-- Script para actualizar las fotos restantes que están NULL o vacías

UPDATE catalogo_1.titulo_proyecto 
SET foto = 'deportivo.png' 
WHERE tipo_proyecto = 'Artículos Deportivos' AND (foto IS NULL OR foto = '');

UPDATE catalogo_1.titulo_proyecto 
SET foto = 'construccion.png' 
WHERE tipo_proyecto = 'Redes de Construcción' AND (foto IS NULL OR foto = '');

-- Verificar que todos los registros tengan foto
SELECT titulo_proyecto, foto, tipo_proyecto 
FROM catalogo_1.titulo_proyecto 
ORDER BY tipo_proyecto, titulo_proyecto; 