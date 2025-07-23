-- Migración para agregar campo modo_corte a la tabla orden_produccion
-- y removerlo de trabajo_corte para simplificar la lógica

-- 1. Agregar campo modo_corte a orden_produccion
ALTER TABLE orden_produccion 
ADD COLUMN modo_corte VARCHAR(20) DEFAULT 'simple';

-- Agregar comentario al campo
COMMENT ON COLUMN orden_produccion.modo_corte IS 'simple o individuales - modo de corte para todos los paños de esta orden';

-- Crear índice para mejorar consultas por modo de corte
CREATE INDEX idx_orden_produccion_modo_corte ON orden_produccion(modo_corte);

-- 2. Remover campo modo_corte de trabajo_corte (si existe)
-- Primero verificar si existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trabajo_corte' 
        AND column_name = 'modo_corte'
    ) THEN
        -- Remover índice si existe
        DROP INDEX IF EXISTS idx_trabajo_corte_modo_corte;
        
        -- Remover columna
        ALTER TABLE trabajo_corte DROP COLUMN modo_corte;
        
        RAISE NOTICE 'Campo modo_corte removido de trabajo_corte';
    ELSE
        RAISE NOTICE 'Campo modo_corte no existe en trabajo_corte, continuando...';
    END IF;
END $$;

-- 3. Verificar que se aplicó correctamente
SELECT 
    'orden_produccion' as tabla,
    column_name, 
    data_type, 
    column_default, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orden_produccion' 
AND column_name = 'modo_corte'

UNION ALL

SELECT 
    'trabajo_corte' as tabla,
    column_name, 
    data_type, 
    column_default, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trabajo_corte' 
AND column_name = 'modo_corte';

-- 4. Actualizar órdenes existentes para que tengan modo_corte = 'simple' por defecto
UPDATE orden_produccion 
SET modo_corte = 'simple' 
WHERE modo_corte IS NULL;

-- 5. Verificar la distribución actual
SELECT 
    modo_corte,
    COUNT(*) as cantidad_ordenes
FROM orden_produccion 
GROUP BY modo_corte; 