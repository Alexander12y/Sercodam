-- Script SQL para crear tabla de drafts de cotizaciones
-- Replicando exactamente la estructura de ordenes_draft

-- Crear tabla cotizaciones_draft
CREATE TABLE cotizaciones_draft (
    id_draft SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    id_cotizacion INTEGER REFERENCES cotizacion(id_cotizacion) ON UPDATE CASCADE,
    datos_formulario JSONB NOT NULL,
    detalle_productos JSONB DEFAULT '[]'::jsonb NOT NULL,
    conceptos_extra_list JSONB DEFAULT '[]'::jsonb NOT NULL,
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fecha_expiracion TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + '15 days'::interval) NOT NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL,
    seccion_actual INTEGER DEFAULT 1
);

-- Índices para optimizar consultas (igual que ordenes_draft)
CREATE INDEX idx_cotizaciones_draft_activo ON cotizaciones_draft(activo);
CREATE INDEX idx_cotizaciones_draft_fecha_expiracion ON cotizaciones_draft(fecha_expiracion);
CREATE INDEX idx_cotizaciones_draft_id_cotizacion ON cotizaciones_draft(id_cotizacion);
CREATE INDEX idx_cotizaciones_draft_id_usuario ON cotizaciones_draft(id_usuario);

-- Función para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION actualizar_fecha_cotizacion_draft()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar fecha_actualizacion (igual que ordenes_draft)
CREATE TRIGGER trigger_actualizar_fecha_cotizacion_draft
    BEFORE UPDATE ON cotizaciones_draft
    FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_cotizacion_draft();

-- Función para limpiar drafts expirados de cotizaciones
CREATE OR REPLACE FUNCTION limpiar_cotizaciones_drafts_expirados()
RETURNS INTEGER AS $$
DECLARE
    drafts_eliminados INTEGER;
BEGIN
    UPDATE cotizaciones_draft 
    SET activo = FALSE 
    WHERE activo = TRUE 
      AND fecha_expiracion < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS drafts_eliminados = ROW_COUNT;
    
    RETURN drafts_eliminados;
END;
$$ LANGUAGE plpgsql;

-- Trigger para eliminar drafts al crear cotización (igual que ordenes_draft)
CREATE OR REPLACE FUNCTION eliminar_draft_al_completar_cotizacion()
RETURNS TRIGGER AS $$
BEGIN
    -- Marcar como inactivos los drafts del usuario cuando se crea una cotización
    UPDATE cotizaciones_draft 
    SET activo = FALSE 
    WHERE id_usuario = NEW.id_usuario_creador 
      AND activo = TRUE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cotizacion_eliminar_draft
    AFTER INSERT ON cotizacion
    FOR EACH ROW EXECUTE FUNCTION eliminar_draft_al_completar_cotizacion();

-- Comentarios explicativos
COMMENT ON TABLE cotizaciones_draft IS 'Tabla para almacenar borradores de cotizaciones';
COMMENT ON COLUMN cotizaciones_draft.id_cotizacion IS 'ID de la cotización (NULL para drafts sin cotización creada)';
COMMENT ON COLUMN cotizaciones_draft.datos_formulario IS 'JSON con los datos del formulario principal (cliente, proyecto, condiciones, etc.)';
COMMENT ON COLUMN cotizaciones_draft.detalle_productos IS 'Array JSON con los productos/servicios de la cotización';
COMMENT ON COLUMN cotizaciones_draft.conceptos_extra_list IS 'Array JSON con los conceptos extra opcionales';
COMMENT ON COLUMN cotizaciones_draft.seccion_actual IS 'Número de la sección actual del formulario (1-5)';

-- Mostrar estructura creada
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'cotizaciones_draft' 
ORDER BY ordinal_position;