-- Función para eliminar cortes individuales cuando el estado cambie a "Confirmado"
CREATE OR REPLACE FUNCTION cleanup_cortes_individuales_on_confirm()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el estado cambió a "Confirmado", eliminar los cortes individuales asociados
    IF NEW.estado = 'Confirmado' AND (OLD.estado IS NULL OR OLD.estado != 'Confirmado') THEN
        DELETE FROM cortes_individuales WHERE job_id = NEW.job_id;
        
        -- Log para debugging (opcional)
        RAISE NOTICE 'Cortes individuales eliminados para job_id: %', NEW.job_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger
DROP TRIGGER IF EXISTS trg_cleanup_cortes_individuales ON trabajo_corte;
CREATE TRIGGER trg_cleanup_cortes_individuales
    AFTER UPDATE ON trabajo_corte
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_cortes_individuales_on_confirm();

-- Verificar que el trigger se creó correctamente
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trg_cleanup_cortes_individuales'; 