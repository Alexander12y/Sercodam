-- =====================================================
-- SCRIPT PARA AGREGAR DETECCIÓN DE CLIENTES EXISTENTES
-- =====================================================
-- Este script implementa la funcionalidad para identificar
-- si un nuevo lead corresponde a un cliente ya existente
-- =====================================================

-- 1. Agregar columnas a la tabla leads
ALTER TABLE catalogo_1.leads
  ADD COLUMN id_cliente INTEGER NULL,
  ADD COLUMN match_por VARCHAR(50) NULL,
  ADD CONSTRAINT leads_cliente_fkey
    FOREIGN KEY (id_cliente)
    REFERENCES catalogo_1.cliente(id_cliente)
    ON DELETE SET NULL;

-- 2. Agregar índice para mejorar performance en búsquedas
CREATE INDEX idx_leads_id_cliente ON catalogo_1.leads(id_cliente);

-- 3. Agregar comentarios para documentación
COMMENT ON COLUMN catalogo_1.leads.id_cliente IS 'Referencia al cliente existente si el lead corresponde a un cliente ya registrado';
COMMENT ON COLUMN catalogo_1.leads.match_por IS 'Campo que indica por qué criterio se hizo match con cliente existente (email, telefono, empresa)';

-- 4. Actualizar la función convertir_lead_a_cliente para manejar clientes existentes
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
    v_cliente_existente RECORD;
BEGIN
    -- Obtener datos del lead
    SELECT * INTO v_lead_data
    FROM leads
    WHERE id_lead = p_id_lead;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead con ID % no encontrado', p_id_lead;
    END IF;
    
    -- Si ya hay un cliente asociado, usar ese
    IF v_lead_data.id_cliente IS NOT NULL THEN
        v_id_cliente := v_lead_data.id_cliente;
        
        -- Actualizar datos del cliente si hay información nueva
        UPDATE cliente SET
            telefono_cliente = COALESCE(v_lead_data.telefono, telefono_cliente),
            empresa_cliente = COALESCE(v_lead_data.empresa, empresa_cliente),
            requerimientos = COALESCE(v_lead_data.requerimientos, requerimientos),
            presupuesto_estimado = COALESCE(v_lead_data.presupuesto_estimado, presupuesto_estimado),
            notas = COALESCE(notas, '') || E'\n\nNuevo proyecto - ' || NOW()::text || ': ' || COALESCE(v_lead_data.requerimientos, 'Sin requerimientos específicos'),
            actualizado_en = NOW()
        WHERE id_cliente = v_id_cliente;
        
    ELSE
        -- Crear nuevo cliente
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
    END IF;
    
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

-- 5. Verificar que la tabla logs_operaciones existe, si no, crearla
CREATE TABLE IF NOT EXISTS logs_operaciones (
    id SERIAL PRIMARY KEY,
    tabla_afectada VARCHAR(100) NOT NULL,
    operacion VARCHAR(100) NOT NULL,
    id_registro INTEGER,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    usuario_id INTEGER,
    fecha_operacion TIMESTAMP DEFAULT NOW()
);

-- 6. Agregar comentarios a la función
COMMENT ON FUNCTION convertir_lead_a_cliente(INTEGER, INTEGER) IS 
'Convierte un lead a cliente. Si el lead ya tiene un cliente asociado, actualiza los datos del cliente existente. Si no, crea un nuevo cliente.';

-- =====================================================
-- VERIFICACIÓN DE LA IMPLEMENTACIÓN
-- =====================================================

-- Verificar que las columnas se agregaron correctamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'catalogo_1' 
    AND table_name = 'leads' 
    AND column_name IN ('id_cliente', 'match_por')
ORDER BY column_name;

-- Verificar que el índice se creó correctamente
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'leads' 
    AND indexname = 'idx_leads_id_cliente';

-- Verificar que la función se actualizó correctamente
SELECT 
    proname, 
    prosrc 
FROM pg_proc 
WHERE proname = 'convertir_lead_a_cliente';

-- =====================================================
-- EJEMPLO DE USO
-- =====================================================

/*
-- Ejemplo de cómo funcionará el sistema:

-- 1. Cuando llegue un email de un cliente existente:
-- El sistema automáticamente:
-- - Buscará en la tabla cliente por email, teléfono o empresa
-- - Si encuentra coincidencia, establecerá id_cliente y match_por
-- - El estado será 'nuevo_proyecto' en lugar de 'nuevo'

-- 2. Al convertir el lead:
-- - Si id_cliente IS NOT NULL: actualizará el cliente existente
-- - Si id_cliente IS NULL: creará un nuevo cliente

-- 3. En el frontend:
-- - Se mostrará información del cliente asociado
-- - Los botones y mensajes serán más específicos
-- - Se podrá distinguir entre nuevos clientes y nuevos proyectos
*/ 