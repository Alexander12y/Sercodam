-- Script para configurar la limpieza automática de drafts de cotizaciones
-- Replicando el sistema de ordenes_draft

-- 1. Función para limpiar drafts expirados (ya creada en create_cotizaciones_draft_table.sql)
-- Esta función marca como inactivos los drafts que han expirado

-- 2. Configurar una tarea de limpieza automática usando pg_cron (si está disponible)
-- Nota: pg_cron debe estar instalado y configurado en PostgreSQL

-- Verificar si pg_cron está disponible
DO $$
BEGIN
    -- Intentar crear un job de limpieza que se ejecute cada día a las 2:00 AM
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Programar limpieza diaria de drafts de cotizaciones expirados
        PERFORM cron.schedule(
            'cleanup-cotizaciones-drafts', 
            '0 2 * * *',  -- Cada día a las 2:00 AM
            'SELECT limpiar_cotizaciones_drafts_expirados();'
        );
        
        RAISE NOTICE 'Job de limpieza automática de drafts de cotizaciones programado exitosamente';
    ELSE
        RAISE NOTICE 'pg_cron no está disponible. La limpieza debe ejecutarse manualmente o mediante cron del sistema operativo';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'No se pudo programar la limpieza automática: %', SQLERRM;
END $$;

-- 3. Script manual para ejecutar limpieza (para usar sin pg_cron)
-- Ejecutar este comando manualmente o desde un cron del sistema operativo:
-- psql -d nombre_base_datos -c "SELECT limpiar_cotizaciones_drafts_expirados();"

-- 4. Ver estadísticas de drafts
CREATE OR REPLACE VIEW vista_estadisticas_cotizaciones_drafts AS
SELECT 
    COUNT(*) FILTER (WHERE activo = true) as drafts_activos,
    COUNT(*) FILTER (WHERE activo = false) as drafts_eliminados,
    COUNT(*) FILTER (WHERE fecha_expiracion < NOW() AND activo = true) as drafts_expirados,
    COUNT(*) FILTER (WHERE fecha_actualizacion > NOW() - INTERVAL '1 day' AND activo = true) as drafts_recientes,
    AVG(EXTRACT(EPOCH FROM (fecha_actualizacion - fecha_creacion))/3600) as promedio_horas_edicion
FROM cotizaciones_draft;

-- 5. Función para obtener estadísticas detalladas
CREATE OR REPLACE FUNCTION obtener_estadisticas_cotizaciones_drafts()
RETURNS TABLE(
    total_drafts INTEGER,
    drafts_activos INTEGER,
    drafts_expirados INTEGER,
    drafts_eliminados INTEGER,
    usuarios_con_drafts INTEGER,
    promedio_seccion NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_drafts,
        COUNT(*) FILTER (WHERE activo = true)::INTEGER as drafts_activos,
        COUNT(*) FILTER (WHERE fecha_expiracion < NOW() AND activo = true)::INTEGER as drafts_expirados,
        COUNT(*) FILTER (WHERE activo = false)::INTEGER as drafts_eliminados,
        COUNT(DISTINCT id_usuario) FILTER (WHERE activo = true)::INTEGER as usuarios_con_drafts,
        AVG(seccion_actual) FILTER (WHERE activo = true) as promedio_seccion
    FROM cotizaciones_draft;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger adicional para limpiar drafts cuando se completa una cotización
-- (Ya está creado en create_cotizaciones_draft_table.sql)

-- 7. Índices adicionales para optimizar consultas de limpieza
CREATE INDEX IF NOT EXISTS idx_cotizaciones_draft_fecha_expiracion_activo 
ON cotizaciones_draft(fecha_expiracion, activo) 
WHERE activo = true;

-- 8. Política de retención: eliminar físicamente drafts muy antiguos (6 meses)
CREATE OR REPLACE FUNCTION limpiar_cotizaciones_drafts_antiguos()
RETURNS INTEGER AS $$
DECLARE
    drafts_eliminados INTEGER;
BEGIN
    -- Eliminar físicamente drafts inactivos de más de 6 meses
    DELETE FROM cotizaciones_draft 
    WHERE activo = FALSE 
      AND fecha_actualizacion < NOW() - INTERVAL '6 months';
    
    GET DIAGNOSTICS drafts_eliminados = ROW_COUNT;
    
    RETURN drafts_eliminados;
END;
$$ LANGUAGE plpgsql;

-- Mostrar estadísticas actuales
SELECT * FROM vista_estadisticas_cotizaciones_drafts;
SELECT * FROM obtener_estadisticas_cotizaciones_drafts();