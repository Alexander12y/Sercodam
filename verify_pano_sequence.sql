-- Verificar estado final de la secuencia de pano
SELECT 'Estado final de la tabla pano:' as info;
SELECT COUNT(*) as total_panos FROM pano;
SELECT MAX(id_item) as max_id FROM pano;

-- Verificar la secuencia
SELECT 'Secuencia de pano:' as info;
SELECT sequence_name 
FROM information_schema.sequences 
WHERE sequence_name LIKE '%pano%';

-- Probar inserción de un paño de prueba
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
) VALUES (
    'TEST_' || EXTRACT(EPOCH FROM NOW()) || '_' || SUBSTRING(MD5(RANDOM()::TEXT), 1, 8),
    1.0,
    1.0,
    'bueno',
    'Test',
    10.00,
    0.00,
    'Libre',
    NOW(),
    NOW()
) RETURNING id_item;

-- Verificar que se insertó correctamente
SELECT 'Paño de prueba insertado con ID:' as info;
SELECT MAX(id_item) as ultimo_id FROM pano;

-- Eliminar el paño de prueba
DELETE FROM pano WHERE id_mcr LIKE 'TEST_%';

-- Verificar estado final
SELECT 'Estado después de limpiar:' as info;
SELECT COUNT(*) as total_panos FROM pano; 