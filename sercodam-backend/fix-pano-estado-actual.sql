-- Corregir el estado actual de los paños después de la cancelación
-- El paño padre (ID 564) debería estar como 'Consumido' ya que se convirtió en remanentes

-- Marcar el paño padre como consumido
UPDATE pano 
SET estado_trabajo = 'Consumido' 
WHERE id_item = 564;

-- Verificar el estado actual
SELECT id_item, largo_m, ancho_m, area_m2, estado_trabajo 
FROM pano 
ORDER BY id_item; 