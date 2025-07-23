-- Migración para agregar campo modo_corte a la tabla trabajo_corte
-- Ejecutar manualmente en PostgreSQL

-- Agregar campo modo_corte para identificar si son cortes individuales o simples
ALTER TABLE trabajo_corte 
ADD COLUMN modo_corte VARCHAR(20) DEFAULT 'simple';

-- Agregar comentario al campo
COMMENT ON COLUMN trabajo_corte.modo_corte IS 'simple o individuales';

-- Crear índice para mejorar consultas por modo de corte
CREATE INDEX idx_trabajo_corte_modo_corte ON trabajo_corte(modo_corte);

-- Verificar que se aplicó correctamente
SELECT column_name, data_type, column_default, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trabajo_corte' AND column_name = 'modo_corte'; 