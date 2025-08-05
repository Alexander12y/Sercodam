-- Script de reparación para corregir la migración de conceptos extra
-- Este script asegura que la tabla cotizacion tenga la estructura correcta

-- 1. Verificar que el campo conceptos_extra_list existe
ALTER TABLE cotizacion 
ADD COLUMN IF NOT EXISTS conceptos_extra_list JSON;

-- 2. Migrar datos existentes de conceptos_extra a conceptos_extra_list (si existe el campo conceptos_extra)
-- Solo si la tabla aún tiene el campo conceptos_extra
DO $$
BEGIN
  -- Verificar si la columna conceptos_extra existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cotizacion' 
    AND column_name = 'conceptos_extra'
  ) THEN
    -- Migrar datos de conceptos_extra a conceptos_extra_list
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
  END IF;
END $$;

-- 3. Comentario explicativo del nuevo campo
COMMENT ON COLUMN cotizacion.conceptos_extra_list IS 'Lista JSON de conceptos extra con formato: [{"concepto":"texto", "precio":numero, "id":timestamp}]';

-- 4. Mostrar el estado actual de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cotizacion' 
AND column_name LIKE '%concepto%'
ORDER BY column_name;