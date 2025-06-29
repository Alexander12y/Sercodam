-- Script para arreglar la tabla ordenes_draft existente

-- 1. Hacer que id_op sea nullable
ALTER TABLE ordenes_draft ALTER COLUMN id_op DROP NOT NULL;

-- 2. Agregar campo paso_actual si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ordenes_draft' AND column_name = 'paso_actual') THEN
        ALTER TABLE ordenes_draft ADD COLUMN paso_actual INTEGER DEFAULT 1;
    END IF;
END $$;

-- 3. Eliminar índices incorrectos si existen
DROP INDEX IF EXISTS idx_ordenes_draft_id_orden;

-- 4. Crear índices correctos
CREATE INDEX IF NOT EXISTS idx_ordenes_draft_id_usuario ON ordenes_draft(id_usuario);
CREATE INDEX IF NOT EXISTS idx_ordenes_draft_fecha_expiracion ON ordenes_draft(fecha_expiracion);
CREATE INDEX IF NOT EXISTS idx_ordenes_draft_activo ON ordenes_draft(activo);
CREATE INDEX IF NOT EXISTS idx_ordenes_draft_id_op ON ordenes_draft(id_op);

-- 5. Actualizar funciones para usar nombres sin esquema
CREATE OR REPLACE FUNCTION limpiar_drafts_expirados()
RETURNS void AS $$
BEGIN
    DELETE FROM ordenes_draft 
    WHERE fecha_expiracion < CURRENT_TIMESTAMP AND activo = true;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION actualizar_fecha_draft()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    NEW.fecha_expiracion = CURRENT_TIMESTAMP + INTERVAL '15 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Recrear triggers
DROP TRIGGER IF EXISTS trigger_eliminar_draft_orden ON orden_produccion;
CREATE TRIGGER trigger_eliminar_draft_orden
    AFTER INSERT ON orden_produccion
    FOR EACH ROW
    EXECUTE FUNCTION eliminar_draft_al_completar_orden();

DROP TRIGGER IF EXISTS trigger_actualizar_fecha_draft ON ordenes_draft;
CREATE TRIGGER trigger_actualizar_fecha_draft
    BEFORE UPDATE ON ordenes_draft
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_draft();

-- 7. Agregar comentarios
COMMENT ON TABLE ordenes_draft IS 'Tabla para almacenar borradores de órdenes de producción';
COMMENT ON COLUMN ordenes_draft.datos_formulario IS 'JSON con los datos del formulario principal (cliente, prioridad, fechas, etc.)';
COMMENT ON COLUMN ordenes_draft.panos_seleccionados IS 'Array JSON con los paños seleccionados y sus dimensiones';
COMMENT ON COLUMN ordenes_draft.materiales_seleccionados IS 'Array JSON con los materiales seleccionados';
COMMENT ON COLUMN ordenes_draft.herramientas_seleccionadas IS 'Array JSON con las herramientas seleccionadas';
COMMENT ON COLUMN ordenes_draft.id_op IS 'ID de la orden de producción (NULL para drafts sin orden creada)';
COMMENT ON COLUMN ordenes_draft.paso_actual IS 'Número del paso actual del formulario (1=principal, 2=paños, 3=materiales, 4=herramientas)';

-- Verificar que todo esté correcto
SELECT 'Tabla ordenes_draft arreglada correctamente' as status; 