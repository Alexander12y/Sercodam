-- Corregir el estado actual después de la cancelación fallida
-- El trabajo de corte tiene completed_at, por lo que se completó antes de cancelar

-- 1. Crear el paño objetivo que falta (3.0m x 4.5m = 13.5m²)
INSERT INTO pano (
    id_mcr, 
    largo_m, 
    ancho_m, 
    estado, 
    ubicacion, 
    precio_x_unidad, 
    stock_minimo, 
    estado_trabajo,
    created_at,
    updated_at
)
SELECT 
    p.id_mcr,
    3.000 as largo_m,  -- altura_req del trabajo
    4.500 as ancho_m,  -- ancho_req del trabajo
    p.estado,
    p.ubicacion,
    p.precio_x_unidad,
    p.stock_minimo,
    'Libre' as estado_trabajo,
    NOW() as created_at,
    NOW() as updated_at
FROM pano p
WHERE p.id_item = 567;

-- 2. Marcar el paño padre como consumido
UPDATE pano 
SET estado_trabajo = 'Consumido' 
WHERE id_item = 567;

-- 3. Verificar el resultado
SELECT id_item, largo_m, ancho_m, area_m2, estado_trabajo 
FROM pano 
ORDER BY id_item; 