-- Verificar la estructura de la tabla usuario
\d usuario;

-- Verificar las columnas disponibles
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'usuario' 
ORDER BY ordinal_position; 