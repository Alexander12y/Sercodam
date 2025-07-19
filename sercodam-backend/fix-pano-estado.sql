-- Actualizar el estado_trabajo del paño existente
UPDATE pano 
SET estado_trabajo = 'Libre' 
WHERE estado_trabajo IS NULL;
 
-- Verificar el resultado
SELECT id_item, largo_m, ancho_m, area_m2, estado_trabajo 
FROM pano; 