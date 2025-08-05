-- =====================================================
-- SCRIPT SQL PARA AGREGAR RELACIÓN COTIZACIÓN → ORDEN_PRODUCCIÓN
-- =====================================================

-- Agregar campo id_cotizacion a la tabla orden_produccion
ALTER TABLE catalogo_1.orden_produccion 
ADD COLUMN id_cotizacion INTEGER;

-- Agregar foreign key con cotizacion (opcional, pueden existir órdenes sin cotización)
ALTER TABLE catalogo_1.orden_produccion 
ADD CONSTRAINT fk_orden_produccion_cotizacion 
FOREIGN KEY (id_cotizacion) REFERENCES catalogo_1.cotizacion(id_cotizacion);

-- Crear índice para consultas rápidas
CREATE INDEX idx_orden_produccion_cotizacion ON catalogo_1.orden_produccion(id_cotizacion);

-- Agregar comentario
COMMENT ON COLUMN catalogo_1.orden_produccion.id_cotizacion IS 'Relación con cotización - una OP puede originarse de una cotización';

-- =====================================================
-- SCRIPT COMPLETADO
-- =====================================================

-- Verificar que el campo se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'catalogo_1' 
AND table_name = 'orden_produccion' 
AND column_name = 'id_cotizacion';

PRINT 'Campo id_cotizacion agregado exitosamente a orden_produccion!'; 