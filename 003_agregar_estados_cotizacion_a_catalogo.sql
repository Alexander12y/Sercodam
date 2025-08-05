-- =====================================================
-- SCRIPT SQL PARA AGREGAR ESTADOS DE COTIZACIÓN A ESTADO_CATALOGO
-- =====================================================

-- Primero verificar qué estados ya existen
SELECT estado FROM catalogo_1.estado_catalogo ORDER BY estado;

-- Insertar los nuevos estados para cotizaciones
-- (Si ya existen algunos, PostgreSQL los ignorará por el ON CONFLICT)

INSERT INTO catalogo_1.estado_catalogo (estado) VALUES 
('por aprobar'),
('aprobada'),
('no aprobada'),
('enviada'),
('convertida'),
('rechazada')
ON CONFLICT (estado) DO NOTHING;

-- =====================================================
-- SCRIPT COMPLETADO
-- =====================================================

-- Verificar que los estados se agregaron correctamente
SELECT estado 
FROM catalogo_1.estado_catalogo 
WHERE estado IN ('por aprobar', 'aprobada', 'no aprobada', 'enviada', 'convertida', 'rechazada')
ORDER BY estado;

PRINT 'Estados de cotización agregados exitosamente a estado_catalogo!'; 