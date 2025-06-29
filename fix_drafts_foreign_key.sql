-- Script para arreglar la foreign key constraint en ordenes_draft

-- 1. Verificar si ya existe la foreign key
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='ordenes_draft' 
    AND kcu.column_name='id_usuario';

-- 2. Agregar la foreign key constraint si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'ordenes_draft' 
        AND constraint_name LIKE '%id_usuario%'
    ) THEN
        ALTER TABLE ordenes_draft 
        ADD CONSTRAINT ordenes_draft_id_usuario_fkey 
        FOREIGN KEY (id_usuario) REFERENCES usuario(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint agregada correctamente';
    ELSE
        RAISE NOTICE 'Foreign key constraint ya existe';
    END IF;
END $$;

-- 3. Verificar que la constraint se agregó correctamente
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='ordenes_draft' 
    AND kcu.column_name='id_usuario';

-- 4. Verificar que no hay datos huérfanos
SELECT COUNT(*) as drafts_sin_usuario
FROM ordenes_draft od
LEFT JOIN usuario u ON od.id_usuario = u.id
WHERE u.id IS NULL;

-- 5. Mostrar la estructura final de la tabla
\d ordenes_draft; 