-- Script SQL para agregar campo de precio a conceptos extra
-- Ejecutar para agregar el campo conceptos_extra_precio a la tabla cotizacion

-- Agregar campo para precio de conceptos extra
ALTER TABLE cotizacion 
ADD COLUMN conceptos_extra_precio DECIMAL(15, 2) DEFAULT 0;

-- Comentario explicativo
COMMENT ON COLUMN cotizacion.conceptos_extra_precio IS 'Precio por concepto extra (sin IVA). Se mostrará como: $XX,XXX.XX + IVA (16%)';

-- Ejemplo de actualización para cotizaciones existentes que tienen conceptos extra
-- UPDATE cotizacion 
-- SET conceptos_extra_precio = 50000.00 
-- WHERE conceptos_extra IS NOT NULL AND conceptos_extra != '' AND conceptos_extra_precio = 0;