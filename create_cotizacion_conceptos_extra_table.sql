-- Script SQL para crear tabla de conceptos extra individuales
-- Permite múltiples conceptos extra, cada uno con su precio específico

-- Crear nueva tabla para conceptos extra
CREATE TABLE cotizacion_conceptos_extra (
  id_concepto_extra SERIAL PRIMARY KEY,
  id_cotizacion INTEGER NOT NULL REFERENCES cotizacion(id_cotizacion) ON DELETE CASCADE,
  concepto TEXT NOT NULL,
  precio DECIMAL(15, 2) NOT NULL DEFAULT 0,
  orden_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para mejor performance
CREATE INDEX idx_cotizacion_conceptos_extra_cotizacion ON cotizacion_conceptos_extra(id_cotizacion);
CREATE INDEX idx_cotizacion_conceptos_extra_orden ON cotizacion_conceptos_extra(id_cotizacion, orden_index);

-- Comentarios explicativos
COMMENT ON TABLE cotizacion_conceptos_extra IS 'Conceptos extra individuales para cotizaciones, cada uno con su precio específico';
COMMENT ON COLUMN cotizacion_conceptos_extra.concepto IS 'Descripción del concepto extra';
COMMENT ON COLUMN cotizacion_conceptos_extra.precio IS 'Precio del concepto sin IVA';
COMMENT ON COLUMN cotizacion_conceptos_extra.orden_index IS 'Orden de visualización en el PDF';

-- Migrar datos existentes (si existen)
-- Insertar conceptos extra existentes como registros individuales
INSERT INTO cotizacion_conceptos_extra (id_cotizacion, concepto, precio, orden_index)
SELECT 
  id_cotizacion,
  TRIM(concepto_linea) as concepto,
  COALESCE(conceptos_extra_precio, 0) as precio,
  ROW_NUMBER() OVER (PARTITION BY id_cotizacion ORDER BY id_cotizacion) as orden_index
FROM (
  SELECT 
    id_cotizacion,
    conceptos_extra_precio,
    UNNEST(string_to_array(conceptos_extra, E'\n')) as concepto_linea
  FROM cotizacion 
  WHERE conceptos_extra IS NOT NULL 
    AND conceptos_extra != '' 
    AND TRIM(conceptos_extra) != ''
) as conceptos_split
WHERE TRIM(concepto_linea) != '';

-- Opcional: Remover campos antiguos después de verificar la migración
-- ALTER TABLE cotizacion DROP COLUMN conceptos_extra;
-- ALTER TABLE cotizacion DROP COLUMN conceptos_extra_precio;