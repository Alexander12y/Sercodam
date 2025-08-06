-- Agregar campo id_mcr a la tabla cotizacion_detalle
-- Este campo permitirá guardar el id_mcr de las redes del catálogo red_producto

ALTER TABLE catalogo_1.cotizacion_detalle 
ADD COLUMN id_mcr TEXT;

-- Agregar índice para mejorar el rendimiento de consultas
CREATE INDEX idx_cotizacion_detalle_id_mcr ON catalogo_1.cotizacion_detalle(id_mcr);

-- Agregar comentario explicativo
COMMENT ON COLUMN catalogo_1.cotizacion_detalle.id_mcr IS 'ID de la red del catálogo red_producto para productos que tienen ficha técnica e imagen';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'catalogo_1' 
  AND table_name = 'cotizacion_detalle' 
  AND column_name = 'id_mcr'; 