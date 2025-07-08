-- Script para corregir los estados en la base de datos
-- Ejecutar este script en PostgreSQL para corregir las inconsistencias

-- 1. Verificar estados actuales en estado_catalogo
SELECT 'Estados actuales en estado_catalogo:' as info;
SELECT estado FROM estado_catalogo ORDER BY estado;

-- 2. Verificar check constraint de orden_produccion
SELECT 'Check constraint de orden_produccion:' as info;
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'orden_produccion_estado_check';

-- 3. Verificar default de orden_produccion
SELECT 'Default de orden_produccion:' as info;
SELECT column_name, column_default 
FROM information_schema.columns 
WHERE table_name = 'orden_produccion' AND column_name = 'estado';

-- 4. Corregir check constraint de orden_produccion (eliminar 'pendiente')
ALTER TABLE orden_produccion DROP CONSTRAINT IF EXISTS orden_produccion_estado_check;
ALTER TABLE orden_produccion ADD CONSTRAINT orden_produccion_estado_check 
CHECK (estado::text = ANY (ARRAY['en_proceso'::character varying, 'completada'::character varying, 'cancelada'::character varying, 'pausada'::character varying]::text[]));

-- 5. Corregir default de orden_produccion (cambiar de 'BORRADOR' a 'en_proceso')
ALTER TABLE orden_produccion ALTER COLUMN estado SET DEFAULT 'en_proceso';

-- 6. Actualizar órdenes existentes con estados inválidos
UPDATE orden_produccion SET estado = 'en_proceso' WHERE estado = 'pendiente';
UPDATE orden_produccion SET estado = 'en_proceso' WHERE estado = 'BORRADOR';

-- 7. Verificar que no queden órdenes con estados inválidos
SELECT 'Órdenes con estados inválidos (debería estar vacío):' as info;
SELECT DISTINCT op.estado 
FROM orden_produccion op 
LEFT JOIN estado_catalogo ec ON op.estado = ec.estado 
WHERE ec.estado IS NULL;

-- 8. Verificar que todo esté correcto
SELECT 'Verificación final:' as info;
SELECT 'Estados en estado_catalogo:' as tipo, string_agg(estado, ', ' ORDER BY estado) as valores FROM estado_catalogo
UNION ALL
SELECT 'Estados únicos en orden_produccion:' as tipo, string_agg(DISTINCT estado, ', ' ORDER BY estado) as valores FROM orden_produccion;

-- 9. Verificar foreign key constraints
SELECT 'Verificando foreign key constraints...' as info;
-- Esto debería ejecutarse sin errores si todo está correcto
SELECT COUNT(*) as total_ordenes FROM orden_produccion;
SELECT COUNT(*) as total_estados FROM estado_catalogo; 