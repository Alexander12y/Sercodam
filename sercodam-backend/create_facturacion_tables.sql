-- Script para crear las tablas del módulo de Facturación
-- Ejecutar en el esquema catalogo_1

-- Tabla principal de facturas
CREATE TABLE IF NOT EXISTS factura (
    id_factura SERIAL PRIMARY KEY,
    numero_factura VARCHAR(50) UNIQUE NOT NULL,
    id_cliente INTEGER NOT NULL,
    id_cotizacion INTEGER NULL, -- Opcional: puede generarse desde una cotización
    fecha_emision TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_vencimiento TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
    iva NUMERIC(15,2) NOT NULL DEFAULT 0,
    total NUMERIC(15,2) NOT NULL DEFAULT 0,
    estado VARCHAR(50) NOT NULL DEFAULT 'borrador',
    metodo_pago VARCHAR(100) NULL,
    condiciones_pago TEXT NULL,
    notas TEXT NULL,
    fecha_creacion TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Datos del cliente (copia para referencia histórica)
    nombre_cliente VARCHAR(255) NOT NULL,
    empresa_cliente VARCHAR(255) NULL,
    email_cliente VARCHAR(255) NULL,
    telefono_cliente VARCHAR(50) NULL,
    
    -- Datos fiscales
    rfc_cliente VARCHAR(20) NULL,
    direccion_fiscal TEXT NULL,
    
    -- Relaciones
    CONSTRAINT fk_factura_cliente FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
    CONSTRAINT fk_factura_cotizacion FOREIGN KEY (id_cotizacion) REFERENCES cotizacion(id_cotizacion),
    CONSTRAINT fk_factura_estado FOREIGN KEY (estado) REFERENCES estado_catalogo(estado)
);

-- Tabla de detalles de factura
CREATE TABLE IF NOT EXISTS factura_detalle (
    id_detalle SERIAL PRIMARY KEY,
    id_factura INTEGER NOT NULL,
    descripcion TEXT NOT NULL,
    cantidad NUMERIC(10,2) NOT NULL,
    precio_unitario NUMERIC(15,2) NOT NULL,
    subtotal NUMERIC(15,2) NOT NULL,
    iva_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 16.00,
    iva_monto NUMERIC(15,2) NOT NULL DEFAULT 0,
    total_linea NUMERIC(15,2) NOT NULL,
    orden_index INTEGER NOT NULL DEFAULT 0,
    notas TEXT NULL,
    catalogo VARCHAR(100) NULL, -- Para identificar el tipo de producto
    tipo_item VARCHAR(50) NULL, -- Para identificar el tipo de item
    
    -- Relaciones
    CONSTRAINT fk_factura_detalle_factura FOREIGN KEY (id_factura) REFERENCES factura(id_factura) ON DELETE CASCADE
);

-- Tabla de pagos recibidos
CREATE TABLE IF NOT EXISTS pago (
    id_pago SERIAL PRIMARY KEY,
    id_factura INTEGER NOT NULL,
    monto NUMERIC(15,2) NOT NULL,
    fecha_pago TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    metodo_pago VARCHAR(100) NOT NULL,
    referencia_pago VARCHAR(255) NULL, -- Número de referencia, cheque, etc.
    notas TEXT NULL,
    fecha_registro TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Relaciones
    CONSTRAINT fk_pago_factura FOREIGN KEY (id_factura) REFERENCES factura(id_factura) ON DELETE CASCADE
);

-- Tabla de borradores de facturas
CREATE TABLE IF NOT EXISTS facturas_draft (
    id_draft SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    id_factura INTEGER NULL, -- NULL para drafts sin factura creada
    datos_formulario JSONB NOT NULL,
    detalle_productos JSONB NOT NULL DEFAULT '[]'::jsonb,
    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + '15 days'::interval),
    activo BOOLEAN NOT NULL DEFAULT true,
    seccion_actual INTEGER NOT NULL DEFAULT 1,
    
    -- Relaciones
    CONSTRAINT fk_facturas_draft_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id),
    CONSTRAINT fk_facturas_draft_factura FOREIGN KEY (id_factura) REFERENCES factura(id_factura)
);

-- Agregar comentarios a las tablas
COMMENT ON TABLE factura IS 'Tabla principal para almacenar facturas de Sercodam';
COMMENT ON TABLE factura_detalle IS 'Detalle de items de cada factura';
COMMENT ON TABLE pago IS 'Registro de pagos recibidos por factura';
COMMENT ON TABLE facturas_draft IS 'Borradores de facturas en proceso de creación';

-- Agregar comentarios a columnas importantes
COMMENT ON COLUMN factura.numero_factura IS 'Número único de factura (formato: FAC-YYYY-XXXX)';
COMMENT ON COLUMN factura.estado IS 'Estado de la factura: borrador, emitida, pagada, cancelada, vencida';
COMMENT ON COLUMN factura.fecha_vencimiento IS 'Fecha límite para el pago de la factura';
COMMENT ON COLUMN factura.rfc_cliente IS 'RFC del cliente para facturación fiscal';
COMMENT ON COLUMN factura.direccion_fiscal IS 'Dirección fiscal del cliente';

COMMENT ON COLUMN factura_detalle.iva_porcentaje IS 'Porcentaje de IVA aplicado a la línea (por defecto 16%)';
COMMENT ON COLUMN factura_detalle.catalogo IS 'Catálogo del producto (panos, materiales, herramientas)';
COMMENT ON COLUMN factura_detalle.tipo_item IS 'Tipo de item (red, material, herramienta, servicio)';

COMMENT ON COLUMN pago.metodo_pago IS 'Método de pago: efectivo, transferencia, cheque, tarjeta, etc.';
COMMENT ON COLUMN pago.referencia_pago IS 'Número de referencia del pago (transferencia, cheque, etc.)';

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_factura_cliente ON factura(id_cliente);
CREATE INDEX IF NOT EXISTS idx_factura_estado ON factura(estado);
CREATE INDEX IF NOT EXISTS idx_factura_fecha_emision ON factura(fecha_emision);
CREATE INDEX IF NOT EXISTS idx_factura_numero ON factura(numero_factura);
CREATE INDEX IF NOT EXISTS idx_factura_cotizacion ON factura(id_cotizacion);

CREATE INDEX IF NOT EXISTS idx_factura_detalle_factura ON factura_detalle(id_factura);

CREATE INDEX IF NOT EXISTS idx_pago_factura ON pago(id_factura);
CREATE INDEX IF NOT EXISTS idx_pago_fecha ON pago(fecha_pago);

CREATE INDEX IF NOT EXISTS idx_facturas_draft_usuario ON facturas_draft(id_usuario);
CREATE INDEX IF NOT EXISTS idx_facturas_draft_activo ON facturas_draft(activo);

-- Insertar estados necesarios para facturación en el catálogo
INSERT INTO estado_catalogo (estado) VALUES 
    ('borrador'),
    ('emitida'),
    ('pagada'),
    ('cancelada'),
    ('vencida'),
    ('parcialmente_pagada')
ON CONFLICT (estado) DO NOTHING;

-- Crear secuencia para números de factura
CREATE SEQUENCE IF NOT EXISTS factura_numero_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 999999
    CACHE 1;

-- Función para generar número de factura automáticamente
CREATE OR REPLACE FUNCTION generar_numero_factura()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.numero_factura IS NULL OR NEW.numero_factura = '' THEN
        NEW.numero_factura := 'FAC-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
                             LPAD(nextval('factura_numero_seq')::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar número de factura automáticamente
CREATE TRIGGER trigger_generar_numero_factura
    BEFORE INSERT ON factura
    FOR EACH ROW
    EXECUTE FUNCTION generar_numero_factura();

-- Función para actualizar totales de factura
CREATE OR REPLACE FUNCTION actualizar_totales_factura()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar subtotal, IVA y total de la factura
    UPDATE factura 
    SET 
        subtotal = (
            SELECT COALESCE(SUM(subtotal), 0) 
            FROM factura_detalle 
            WHERE id_factura = NEW.id_factura
        ),
        iva = (
            SELECT COALESCE(SUM(iva_monto), 0) 
            FROM factura_detalle 
            WHERE id_factura = NEW.id_factura
        ),
        total = (
            SELECT COALESCE(SUM(total_linea), 0) 
            FROM factura_detalle 
            WHERE id_factura = NEW.id_factura
        ),
        fecha_actualizacion = NOW()
    WHERE id_factura = NEW.id_factura;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar totales cuando se modifica el detalle
CREATE TRIGGER trigger_actualizar_totales_factura
    AFTER INSERT OR UPDATE OR DELETE ON factura_detalle
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_totales_factura();

-- Función para actualizar estado de factura basado en pagos
CREATE OR REPLACE FUNCTION actualizar_estado_factura()
RETURNS TRIGGER AS $$
DECLARE
    total_factura NUMERIC;
    total_pagado NUMERIC;
BEGIN
    -- Obtener total de la factura
    SELECT total INTO total_factura
    FROM factura
    WHERE id_factura = NEW.id_factura;
    
    -- Obtener total pagado
    SELECT COALESCE(SUM(monto), 0) INTO total_pagado
    FROM pago
    WHERE id_factura = NEW.id_factura;
    
    -- Actualizar estado según el monto pagado
    IF total_pagado >= total_factura THEN
        UPDATE factura SET estado = 'pagada' WHERE id_factura = NEW.id_factura;
    ELSIF total_pagado > 0 THEN
        UPDATE factura SET estado = 'parcialmente_pagada' WHERE id_factura = NEW.id_factura;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar estado cuando se registra un pago
CREATE TRIGGER trigger_actualizar_estado_factura
    AFTER INSERT OR UPDATE ON pago
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_estado_factura();
