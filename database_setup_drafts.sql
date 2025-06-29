-- Crear tabla para drafts de órdenes de producción
CREATE TABLE ordenes_draft (
  id_draft SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL,
  id_op VARCHAR NULL
    REFERENCES orden_produccion(id_op)
    ON UPDATE CASCADE,
  datos_formulario JSONB NOT NULL,
  panos_seleccionados JSONB NOT NULL DEFAULT '[]'::jsonb,
  materiales_seleccionados JSONB NOT NULL DEFAULT '[]'::jsonb,
  herramientas_seleccionadas JSONB NOT NULL DEFAULT '[]'::jsonb,
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '15 days'),
  activo BOOLEAN NOT NULL DEFAULT true
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_ordenes_draft_id_usuario ON ordenes_draft(id_usuario);
CREATE INDEX IF NOT EXISTS idx_ordenes_draft_fecha_expiracion ON ordenes_draft(fecha_expiracion);
CREATE INDEX IF NOT EXISTS idx_ordenes_draft_activo ON ordenes_draft(activo);
CREATE INDEX IF NOT EXISTS idx_ordenes_draft_id_op ON ordenes_draft(id_op);

-- Función para limpiar drafts expirados
CREATE OR REPLACE FUNCTION limpiar_drafts_expirados()
RETURNS void AS $$
BEGIN
    DELETE FROM ordenes_draft 
    WHERE fecha_expiracion < CURRENT_TIMESTAMP AND activo = true;
END;
$$ LANGUAGE plpgsql;

-- Función para eliminar draft cuando se completa la orden
CREATE OR REPLACE FUNCTION eliminar_draft_al_completar_orden()
RETURNS TRIGGER AS $$
BEGIN
    -- Si se está insertando una nueva orden y tiene un id_op
    IF TG_OP = 'INSERT' AND NEW.id_op IS NOT NULL THEN
        -- Buscar y eliminar el draft correspondiente
        DELETE FROM ordenes_draft 
        WHERE id_op = NEW.id_op;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para eliminar draft cuando se completa la orden
DROP TRIGGER IF EXISTS trigger_eliminar_draft_orden ON orden_produccion;
CREATE TRIGGER trigger_eliminar_draft_orden
    AFTER INSERT ON orden_produccion
    FOR EACH ROW
    EXECUTE FUNCTION eliminar_draft_al_completar_orden();

-- Función para actualizar fecha_actualizacion automáticamente
CREATE OR REPLACE FUNCTION actualizar_fecha_draft()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    NEW.fecha_expiracion = CURRENT_TIMESTAMP + INTERVAL '15 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar fecha_actualizacion
DROP TRIGGER IF EXISTS trigger_actualizar_fecha_draft ON ordenes_draft;
CREATE TRIGGER trigger_actualizar_fecha_draft
    BEFORE UPDATE ON ordenes_draft
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_draft();

--Crear job para limpiar drafts expirados (opcional - requiere pg_cron)
--SELECT cron.schedule('limpiar-drafts-expirados', '0 2 * * *', 'SELECT limpiar_drafts_expirados();');

-- Comentarios sobre la estructura
COMMENT ON TABLE ordenes_draft IS 'Tabla para almacenar borradores de órdenes de producción';
COMMENT ON COLUMN ordenes_draft.datos_formulario IS 'JSON con los datos del formulario principal (cliente, prioridad, fechas, etc.)';
COMMENT ON COLUMN ordenes_draft.panos_seleccionados IS 'Array JSON con los paños seleccionados y sus dimensiones';
COMMENT ON COLUMN ordenes_draft.materiales_seleccionados IS 'Array JSON con los materiales seleccionados';
COMMENT ON COLUMN ordenes_draft.herramientas_seleccionadas IS 'Array JSON con las herramientas seleccionadas';
COMMENT ON COLUMN ordenes_draft.id_op IS 'ID de la orden de producción (NULL para drafts sin orden creada)'; 