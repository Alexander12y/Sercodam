-- Agregar columna fecha_creacion a la tabla orden_produccion
ALTER TABLE orden_produccion 
ADD COLUMN fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Actualizar registros existentes para que fecha_creacion sea igual a fecha_op
UPDATE orden_produccion 
SET fecha_creacion = fecha_op 
WHERE fecha_creacion IS NULL;

-- Hacer la columna NOT NULL después de actualizar los datos
ALTER TABLE orden_produccion 
ALTER COLUMN fecha_creacion SET NOT NULL;

-- Crear índice para mejorar el rendimiento de consultas por fecha de creación
CREATE INDEX idx_orden_produccion_fecha_creacion ON orden_produccion(fecha_creacion);

-- Comentario para documentar el cambio
COMMENT ON COLUMN orden_produccion.fecha_creacion IS 'Fecha y hora de creación de la orden de producción'; 