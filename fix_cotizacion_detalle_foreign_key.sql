-- =====================================================
-- SCRIPT PARA FIXEAR LA FOREIGN KEY DE COTIZACION_DETALLE
-- =====================================================

-- 1. ELIMINAR LA FOREIGN KEY EXISTENTE QUE NO PERMITE NULL
-- =====================================================
ALTER TABLE catalogo_1.cotizacion_detalle 
DROP CONSTRAINT IF EXISTS cotizacion_detalle_id_item_fkey;

-- 2. CREAR UNA NUEVA FOREIGN KEY QUE PERMITA NULL
-- =====================================================
ALTER TABLE catalogo_1.cotizacion_detalle 
ADD CONSTRAINT cotizacion_detalle_id_item_fkey 
FOREIGN KEY (id_item) REFERENCES catalogo_1.inventario_item(id_item) 
ON DELETE SET NULL;

-- 3. VERIFICAR QUE LA TABLA PERMITE NULL EN id_item
-- =====================================================
-- Esto debería mostrar que id_item permite NULL
SELECT column_name, is_nullable, data_type 
FROM information_schema.columns 
WHERE table_schema = 'catalogo_1' 
AND table_name = 'cotizacion_detalle' 
AND column_name = 'id_item';

-- 4. VERIFICAR LAS CONSTRAINTS EXISTENTES
-- =====================================================
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
AND tc.table_name = 'cotizacion_detalle'
AND tc.table_schema = 'catalogo_1';

-- =====================================================
-- SCRIPT COMPLETADO
-- ===================================================== 