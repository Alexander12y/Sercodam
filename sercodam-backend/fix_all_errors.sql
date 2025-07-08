-- Script para corregir todos los errores identificados

-- 1. Corregir la función fn_generar_nota_material_extra (eliminar referencia a ii.descripcion)
CREATE OR REPLACE FUNCTION fn_generar_nota_material_extra(
    p_id_item INTEGER,
    p_cantidad NUMERIC
) RETURNS TEXT AS $$
DECLARE
    v_nota TEXT;
    v_material RECORD;
BEGIN
    -- Obtener información del material extra
    SELECT me.*
    INTO v_material
    FROM materiales_extras me
    WHERE me.id_item = p_id_item;
    
    IF NOT FOUND THEN
        RETURN 'Material extra no encontrado';
    END IF;
    
    -- Construir nota con información relevante
    v_nota := p_cantidad || ' ' || COALESCE(v_material.unidad, 'unidad') || ' de ' || 
              COALESCE(v_material.descripcion, v_material.id_material_extra);
    
    -- Agregar información adicional relevante
    IF v_material.marca IS NOT NULL AND v_material.marca != '' THEN
        v_nota := v_nota || ' marca ' || v_material.marca;
    END IF;
    
    IF v_material.presentacion IS NOT NULL AND v_material.presentacion != '' THEN
        v_nota := v_nota || ' ' || v_material.presentacion;
    END IF;
    
    IF v_material.categoria IS NOT NULL AND v_material.categoria != '' THEN
        v_nota := v_nota || ' (' || v_material.categoria || ')';
    END IF;
    
    RETURN v_nota;
END;
$$ LANGUAGE plpgsql;

-- 2. Verificar que todas las funciones existen
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name IN (
    'fn_generar_nota_material_extra',
    'fn_restaurar_inventario_materiales_cancelada',
    'fn_restaurar_inventario_panos_cancelada',
    'fn_restaurar_inventario_completo_cancelada',
    'fn_limpiar_detalle_completadas',
    'fn_cancelar_ordenes_30_dias',
    'trg_restaurar_inventario_cancelacion'
)
AND routine_schema = 'catalogo_1'
ORDER BY routine_name;

-- 3. Verificar que el trigger existe
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers 
WHERE trigger_name = 'trg_orden_cancelada'
AND trigger_schema = 'catalogo_1';

-- 4. Probar la función de generación de notas
SELECT fn_generar_nota_material_extra(1, 5) as nota_ejemplo; 