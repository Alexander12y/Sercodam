-- =====================================================
-- SCRIPT PARA AGREGAR COLUMNA EMPRESA A LA TABLA CLIENTE
-- Compatible con la base de datos sercodam_db
-- =====================================================

-- Agregar solo la columna empresa que falta en la tabla cliente
ALTER TABLE catalogo_1.cliente 
ADD COLUMN IF NOT EXISTS empresa VARCHAR(255);

-- Crear índice para la nueva columna
CREATE INDEX IF NOT EXISTS idx_cliente_empresa ON catalogo_1.cliente(empresa);

-- Comentario en la columna
COMMENT ON COLUMN catalogo_1.cliente.empresa IS 'Nombre de la empresa del cliente';

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'catalogo_1' 
AND table_name = 'cliente' 
AND column_name = 'empresa'; 