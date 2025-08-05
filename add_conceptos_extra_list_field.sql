-- Script SQL para agregar campo JSON de conceptos extra
-- Permite almacenar lista dinámica de conceptos con precios individuales

-- Agregar campo JSON para lista de conceptos extra
ALTER TABLE cotizacion 
ADD COLUMN conceptos_extra_list JSON;

-- Comentario explicativo
COMMENT ON COLUMN cotizacion.conceptos_extra_list IS 'Lista JSON de conceptos extra con formato: [{"concepto":"texto", "precio":0, "id":123}]';

-- Opcional: Migrar datos existentes a formato JSON (si hay conceptos_extra)
-- Esto convertirá conceptos separados por líneas al nuevo formato JSON
UPDATE cotizacion 
SET conceptos_extra_list = (
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'concepto', TRIM(concepto_linea),
      'precio', COALESCE(conceptos_extra_precio, 0),
      'id', EXTRACT(EPOCH FROM NOW()) * 1000 + ROW_NUMBER() OVER()
    )
  )
  FROM (
    SELECT UNNEST(string_to_array(conceptos_extra, E'\n')) as concepto_linea
    FROM cotizacion c2 
    WHERE c2.id_cotizacion = cotizacion.id_cotizacion
  ) conceptos_split
  WHERE TRIM(concepto_linea) != ''
)
WHERE conceptos_extra IS NOT NULL 
  AND conceptos_extra != '' 
  AND TRIM(conceptos_extra) != ''
  AND conceptos_extra_list IS NULL;