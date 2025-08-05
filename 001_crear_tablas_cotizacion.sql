-- =====================================================
-- SCRIPT SQL PARA CREAR SISTEMA DE COTIZACIONES
-- Compatible con la base de datos sercodam_db
-- =====================================================

-- 1. CREAR TABLA PRINCIPAL DE COTIZACIONES
-- =====================================================
CREATE TABLE catalogo_1.cotizacion (
    id_cotizacion SERIAL PRIMARY KEY,
    numero_cotizacion VARCHAR(50) UNIQUE,
    id_cliente INTEGER REFERENCES catalogo_1.cliente(id_cliente),
    
    -- Información básica
    titulo_proyecto VARCHAR(255),
    tipo_proyecto VARCHAR(100), -- 'red_deportiva', 'sistema_proteccion', 'red_industrial', etc.
    incluye_instalacion BOOLEAN DEFAULT false,
    
    -- Datos del cliente (copia para histórico)
    nombre_cliente VARCHAR(255),
    empresa_cliente VARCHAR(255),
    email_cliente VARCHAR(255),
    telefono_cliente VARCHAR(50),
    
    -- Totales
    subtotal DECIMAL(15,2) DEFAULT 0,
    iva DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    
    -- Condiciones
    condiciones_pago TEXT,
    condiciones_envio TEXT,
    tiempo_entrega VARCHAR(100),
    tiempo_instalacion VARCHAR(100),
    dias_validez INTEGER DEFAULT 15,
    valido_hasta TIMESTAMP,
    
    -- Secciones opcionales
    incluye_garantia BOOLEAN DEFAULT false,
    incluye_instalacion_seccion BOOLEAN DEFAULT false,
    observaciones TEXT,
    no_incluye TEXT,
    notas TEXT,
    conceptos_extra TEXT,
    
    -- Cláusula personalizada
    titulo_clausula_personalizada VARCHAR(255),
    descripcion_clausula_personalizada TEXT,
    
    -- Estado (similar a orden_produccion)
    estado VARCHAR(20) DEFAULT 'por aprobar',
    
    -- Fechas (solo fecha_creacion)
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    
    -- Usuario
    id_usuario_creador INTEGER REFERENCES catalogo_1.usuario(id),
    
    -- Constraint para estados válidos
    CONSTRAINT cotizacion_estado_check CHECK (estado IN ('por aprobar', 'aprobada', 'no aprobada', 'enviada', 'convertida', 'rechazada'))
);

-- Comentario en la tabla
COMMENT ON TABLE catalogo_1.cotizacion IS 'Tabla principal para almacenar cotizaciones de Sercodam';

-- 2. CREAR TABLA DE DETALLE DE COTIZACIÓN
-- =====================================================
CREATE TABLE catalogo_1.cotizacion_detalle (
    id_detalle SERIAL PRIMARY KEY,
    id_cotizacion INTEGER REFERENCES catalogo_1.cotizacion(id_cotizacion) ON DELETE CASCADE,
    id_item INTEGER REFERENCES catalogo_1.inventario_item(id_item),
    
    -- Cantidades y precios
    cantidad DECIMAL(10,2) NOT NULL,
    precio_unitario DECIMAL(15,2) NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    
    -- Especificaciones (similar a notas en orden_produccion_detalle)
    notas TEXT, -- Aquí van las especificaciones como en orden_produccion_detalle
    caracteristicas TEXT, -- Descripción adicional del producto
    
    -- Identificación de partida
    partida VARCHAR(10), -- 'A', 'B', 'C', etc.
    orden_index INTEGER, -- Para mantener el orden
    
    -- Campos de catálogo (consistente con orden_produccion_detalle)
    catalogo TEXT NOT NULL, -- CATALOGO_1, CATALOGO_2, CATALOGO_3
    tipo_item VARCHAR(20) NOT NULL, -- PANO, EXTRA, HERRAMIENTA
    estado VARCHAR(20) NOT NULL, -- estado del catálogo
    
    -- Metadatos para flexibilidad
    metadata JSON,
    
    -- Constraints (similares a orden_produccion_detalle)
    CONSTRAINT cotizacion_detalle_catalogo_check CHECK (catalogo = ANY (ARRAY['CATALOGO_1'::text, 'CATALOGO_2'::text, 'CATALOGO_3'::text]))
);

-- Comentario en la tabla
COMMENT ON TABLE catalogo_1.cotizacion_detalle IS 'Detalle de items de cada cotización - similar a orden_produccion_detalle';

-- 3. CREAR ÍNDICES
-- =====================================================

-- Índices para cotizacion
CREATE INDEX idx_cotizacion_cliente ON catalogo_1.cotizacion(id_cliente);
CREATE INDEX idx_cotizacion_estado ON catalogo_1.cotizacion(estado);
CREATE INDEX idx_cotizacion_fecha_creacion ON catalogo_1.cotizacion(fecha_creacion);
CREATE INDEX idx_cotizacion_numero ON catalogo_1.cotizacion(numero_cotizacion);

-- Índices para cotizacion_detalle (consistente con orden_produccion_detalle)
CREATE INDEX idx_cotizacion_detalle_cotizacion ON catalogo_1.cotizacion_detalle(id_cotizacion);
CREATE INDEX idx_cotizacion_detalle_catalogo ON catalogo_1.cotizacion_detalle(catalogo);
CREATE INDEX idx_cotizacion_detalle_tipo_item ON catalogo_1.cotizacion_detalle(tipo_item);
CREATE INDEX idx_cotizacion_detalle_orden ON catalogo_1.cotizacion_detalle(orden_index);

-- 4. AGREGAR FOREIGN KEYS
-- =====================================================

-- Foreign key de cotizacion con estado_catalogo (igual que orden_produccion)
ALTER TABLE catalogo_1.cotizacion 
ADD CONSTRAINT fk_cotizacion_estado 
FOREIGN KEY (estado) REFERENCES catalogo_1.estado_catalogo(estado);

-- Foreign key de cotizacion_detalle con estado_catalogo
ALTER TABLE catalogo_1.cotizacion_detalle 
ADD CONSTRAINT fk_cotizacion_detalle_estado 
FOREIGN KEY (estado) REFERENCES catalogo_1.estado_catalogo(estado);

-- Foreign key compuesta con cotizacion (similar a orden_produccion_detalle)
ALTER TABLE catalogo_1.cotizacion_detalle 
ADD CONSTRAINT fk_cotizacion_detalle_to_cotizacion 
FOREIGN KEY (id_cotizacion, estado) REFERENCES catalogo_1.cotizacion(id_cotizacion, estado) 
ON UPDATE CASCADE ON DELETE CASCADE;

-- 5. CREAR FUNCIÓN Y TRIGGER PARA AUTOGENERAR CATÁLOGO
-- =====================================================

-- Función para autogenerar catálogo (similar a orden_produccion_detalle)
CREATE OR REPLACE FUNCTION catalogo_1.fn_autogenerar_catalogo_cotizacion()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo autogenerar si no se especifica catálogo
  IF NEW.catalogo IS NULL OR NEW.catalogo = '' THEN
    -- Determinar catálogo basado en tipo_item (lógica similar a orden_produccion_detalle)
    CASE NEW.tipo_item
      WHEN 'PANO' THEN
        NEW.catalogo := 'CATALOGO_1';
      WHEN 'EXTRA' THEN
        NEW.catalogo := 'CATALOGO_2';
      WHEN 'HERRAMIENTA' THEN
        NEW.catalogo := 'CATALOGO_3';
      ELSE
        NEW.catalogo := 'CATALOGO_1';
    END CASE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para autogenerar catálogo
CREATE TRIGGER trg_autogenerar_catalogo_cotizacion
  BEFORE INSERT OR UPDATE ON catalogo_1.cotizacion_detalle
  FOR EACH ROW EXECUTE FUNCTION catalogo_1.fn_autogenerar_catalogo_cotizacion();

-- =====================================================
-- SCRIPT COMPLETADO
-- =====================================================

-- Verificar que las tablas se crearon correctamente
SELECT 'cotizacion' as tabla, count(*) as registros FROM catalogo_1.cotizacion
UNION ALL
SELECT 'cotizacion_detalle' as tabla, count(*) as registros FROM catalogo_1.cotizacion_detalle;

PRINT 'Tablas de cotización creadas exitosamente!'; 