-- Agregar campo sistema_tipo a la tabla cotizaciones
-- Este campo permitirá especificar si es Sistema T o Sistema U

ALTER TABLE cotizaciones 
ADD COLUMN sistema_tipo VARCHAR(1) DEFAULT 'T' CHECK (sistema_tipo IN ('T', 'U'));

-- Agregar comentario para documentar el campo
COMMENT ON COLUMN cotizaciones.sistema_tipo IS 'Tipo de sistema: T (Tradicional) o U (Universal)';

-- Actualizar cotizaciones existentes para que tengan un valor por defecto
UPDATE cotizaciones SET sistema_tipo = 'T' WHERE sistema_tipo IS NULL;

-- Crear índice para mejorar consultas por tipo de sistema
CREATE INDEX idx_cotizaciones_sistema_tipo ON cotizaciones(sistema_tipo);

-- Verificar que se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'cotizaciones' AND column_name = 'sistema_tipo'; 