-- Script para corregir la foreign key constraint que impide cambiar el estado de órdenes

-- 1. Eliminar la constraint problemática
ALTER TABLE orden_produccion_detalle DROP CONSTRAINT IF EXISTS fk_opdet_to_op;

-- 2. Crear la constraint con ON UPDATE CASCADE
ALTER TABLE orden_produccion_detalle 
ADD CONSTRAINT fk_opdet_to_op 
FOREIGN KEY (id_op, estado) 
REFERENCES orden_produccion(id_op, estado) 
ON UPDATE CASCADE ON DELETE CASCADE;

-- 3. Verificar que la constraint se creó correctamente
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'orden_produccion_detalle'
  AND tc.constraint_name = 'fk_opdet_to_op'; 