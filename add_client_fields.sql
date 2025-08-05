-- Agregar campos a la tabla cliente para que coincida con la tabla leads
-- y agregar campos de relación con cotizaciones y órdenes

-- 1. Agregar campos que faltan en cliente para que coincida con leads
ALTER TABLE cliente 
ADD COLUMN IF NOT EXISTS telefono_cliente VARCHAR(50),
ADD COLUMN IF NOT EXISTS empresa_cliente VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_cliente VARCHAR(255),
ADD COLUMN IF NOT EXISTS requerimientos TEXT,
ADD COLUMN IF NOT EXISTS presupuesto_estimado NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS fuente VARCHAR(100) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS notas TEXT,
ADD COLUMN IF NOT EXISTS fecha_contacto TIMESTAMP WITHOUT TIME ZONE,
ADD COLUMN IF NOT EXISTS fecha_conversion TIMESTAMP WITHOUT TIME ZONE;

-- 2. Agregar campos de relación con cotizaciones y órdenes
ALTER TABLE cliente 
ADD COLUMN IF NOT EXISTS id_cotizacion INTEGER,
ADD COLUMN IF NOT EXISTS id_op INTEGER;

-- 3. Agregar índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_cliente_email_cliente ON cliente(email_cliente);
CREATE INDEX IF NOT EXISTS idx_cliente_telefono_cliente ON cliente(telefono_cliente);
CREATE INDEX IF NOT EXISTS idx_cliente_empresa_cliente ON cliente(empresa_cliente);
CREATE INDEX IF NOT EXISTS idx_cliente_id_cotizacion ON cliente(id_cotizacion);
CREATE INDEX IF NOT EXISTS idx_cliente_id_op ON cliente(id_op);

-- 4. Agregar comentarios para documentar los nuevos campos
COMMENT ON COLUMN cliente.telefono_cliente IS 'Teléfono del cliente (coincide con leads.telefono)';
COMMENT ON COLUMN cliente.empresa_cliente IS 'Empresa del cliente (coincide con leads.empresa)';
COMMENT ON COLUMN cliente.email_cliente IS 'Email del cliente (coincide con leads.email_remitente)';
COMMENT ON COLUMN cliente.requerimientos IS 'Requerimientos del cliente (coincide con leads.requerimientos)';
COMMENT ON COLUMN cliente.presupuesto_estimado IS 'Presupuesto estimado del cliente (coincide con leads.presupuesto_estimado)';
COMMENT ON COLUMN cliente.fuente IS 'Fuente del cliente (manual, email, web, etc.)';
COMMENT ON COLUMN cliente.notas IS 'Notas adicionales sobre el cliente';
COMMENT ON COLUMN cliente.fecha_contacto IS 'Fecha del primer contacto con el cliente';
COMMENT ON COLUMN cliente.fecha_conversion IS 'Fecha cuando el lead se convirtió en cliente';
COMMENT ON COLUMN cliente.id_cotizacion IS 'ID de la cotización asociada al cliente';
COMMENT ON COLUMN cliente.id_op IS 'ID de la orden de producción asociada al cliente';

-- 5. Migrar datos existentes (si es necesario)
-- Actualizar email_cliente con el valor de email si está vacío
UPDATE cliente 
SET email_cliente = email 
WHERE email_cliente IS NULL AND email IS NOT NULL;

-- Actualizar empresa_cliente con el valor de empresa si está vacío
UPDATE cliente 
SET empresa_cliente = empresa 
WHERE empresa_cliente IS NULL AND empresa IS NOT NULL;

-- 6. Crear función para convertir lead a cliente
CREATE OR REPLACE FUNCTION convertir_lead_a_cliente(
    p_id_lead INTEGER,
    p_id_usuario INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_lead_data RECORD;
    v_id_cliente INTEGER;
BEGIN
    -- Obtener datos del lead
    SELECT * INTO v_lead_data
    FROM leads
    WHERE id_lead = p_id_lead;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead con ID % no encontrado', p_id_lead;
    END IF;
    
    -- Insertar en la tabla cliente
    INSERT INTO cliente (
        nombre_cliente,
        email_cliente,
        telefono_cliente,
        empresa_cliente,
        requerimientos,
        presupuesto_estimado,
        fuente,
        notas,
        fecha_contacto,
        fecha_conversion,
        fecha_registro
    ) VALUES (
        COALESCE(v_lead_data.nombre_remitente, 'Cliente sin nombre'),
        v_lead_data.email_remitente,
        v_lead_data.telefono,
        v_lead_data.empresa,
        v_lead_data.requerimientos,
        v_lead_data.presupuesto_estimado,
        COALESCE(v_lead_data.fuente, 'email'),
        v_lead_data.notas,
        v_lead_data.fecha_contacto,
        NOW(), -- fecha_conversion
        NOW()  -- fecha_registro
    ) RETURNING id_cliente INTO v_id_cliente;
    
    -- Actualizar el estado del lead a 'convertido'
    UPDATE leads 
    SET 
        estado = 'convertido',
        fecha_conversion = NOW(),
        actualizado_en = NOW()
    WHERE id_lead = p_id_lead;
    
    -- Registrar en el log
    INSERT INTO logs_operaciones (
        tabla_afectada,
        operacion,
        id_registro,
        datos_anteriores,
        datos_nuevos,
        usuario_id,
        fecha_operacion
    ) VALUES (
        'leads',
        'convertir_a_cliente',
        p_id_lead,
        jsonb_build_object('estado', v_lead_data.estado),
        jsonb_build_object('estado', 'convertido', 'id_cliente_creado', v_id_cliente),
        p_id_usuario,
        NOW()
    );
    
    RETURN v_id_cliente;
END;
$$;

-- 7. Crear tabla de logs si no existe (para auditoría)
CREATE TABLE IF NOT EXISTS logs_operaciones (
    id SERIAL PRIMARY KEY,
    tabla_afectada VARCHAR(50) NOT NULL,
    operacion VARCHAR(100) NOT NULL,
    id_registro INTEGER,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    usuario_id INTEGER,
    fecha_operacion TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 8. Crear índice para la tabla de logs
CREATE INDEX IF NOT EXISTS idx_logs_operaciones_fecha ON logs_operaciones(fecha_operacion);
CREATE INDEX IF NOT EXISTS idx_logs_operaciones_tabla ON logs_operaciones(tabla_afectada);

-- 9. Verificar que los cambios se aplicaron correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cliente' 
AND table_schema = 'catalogo_1'
ORDER BY ordinal_position; 