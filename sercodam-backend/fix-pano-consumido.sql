-- Corregir el estado del paño padre que debería estar "Consumido"
-- Buscar paños en "En progreso" que tienen remanentes generados
UPDATE pano 
SET estado_trabajo = 'Consumido' 
WHERE id_item IN (
    SELECT DISTINCT p.id_item 
    FROM pano p 
    JOIN panos_sobrantes ps ON p.id_item = ps.id_item_padre 
    WHERE p.estado_trabajo = 'En progreso'
);

-- Verificar el resultado
SELECT id_item, largo_m, ancho_m, area_m2, estado_trabajo 
FROM pano 
ORDER BY id_item; 