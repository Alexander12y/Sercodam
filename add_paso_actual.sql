-- Agregar campo paso_actual a la tabla ordenes_draft
ALTER TABLE ordenes_draft ADD COLUMN IF NOT EXISTS paso_actual INTEGER DEFAULT 1;

-- Verificar que se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'ordenes_draft' AND column_name = 'paso_actual'; 