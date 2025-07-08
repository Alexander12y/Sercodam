/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Corregir la función fn_generar_nota_pano para consultar correctamente las tablas de tipos de red
    await knex.raw(`
        CREATE OR REPLACE FUNCTION fn_generar_nota_pano(
            p_id_item INTEGER,
            p_cantidad NUMERIC,
            p_tipo_dimension TEXT
        ) RETURNS TEXT AS $$
        DECLARE
            v_nota TEXT;
            v_pano RECORD;
            v_red_producto RECORD;
            v_nylon RECORD;
            v_polipropileno RECORD;
            v_lona RECORD;
            v_malla_sombra RECORD;
        BEGIN
            -- Obtener información del paño y red_producto
            SELECT p.*, rp.tipo_red, rp.marca, rp.descripcion
            INTO v_pano
            FROM pano p
            JOIN red_producto rp ON p.id_mcr = rp.id_mcr
            WHERE p.id_item = p_id_item;
            
            IF NOT FOUND THEN
                RETURN 'Paño no encontrado';
            END IF;
            
            -- Inicializar nota con cantidad y tipo de dimensión
            v_nota := p_cantidad || ' m de ' || p_tipo_dimension || ' red ' || v_pano.tipo_red;
            
            -- Agregar información específica según el tipo de red
            CASE LOWER(v_pano.tipo_red)
                WHEN 'nylon' THEN
                    SELECT * INTO v_nylon FROM nylon WHERE id_mcr = v_pano.id_mcr;
                    IF FOUND THEN
                        IF v_nylon.calibre IS NOT NULL AND v_nylon.calibre != '' THEN
                            v_nota := v_nota || ' calibre ' || v_nylon.calibre;
                        END IF;
                        IF v_nylon.torsion IS NOT NULL AND v_nylon.torsion != '' THEN
                            v_nota := v_nota || ' ' || v_nylon.torsion;
                        END IF;
                        IF v_nylon.refuerzo IS NOT NULL THEN
                            IF v_nylon.refuerzo THEN
                                v_nota := v_nota || ' con refuerzo';
                            ELSE
                                v_nota := v_nota || ' sin refuerzo';
                            END IF;
                        END IF;
                    END IF;
                    
                WHEN 'polipropileno' THEN
                    SELECT * INTO v_polipropileno FROM polipropileno WHERE id_mcr = v_pano.id_mcr;
                    IF FOUND THEN
                        IF v_polipropileno.grosor IS NOT NULL AND v_polipropileno.grosor != '' THEN
                            v_nota := v_nota || ' grosor ' || v_polipropileno.grosor;
                        END IF;
                        IF v_polipropileno.cuadro IS NOT NULL AND v_polipropileno.cuadro != '' THEN
                            v_nota := v_nota || ' cuadro ' || v_polipropileno.cuadro;
                        END IF;
                    END IF;
                    
                WHEN 'lona' THEN
                    SELECT * INTO v_lona FROM lona WHERE id_mcr = v_pano.id_mcr;
                    IF FOUND THEN
                        IF v_lona.color IS NOT NULL AND v_lona.color != '' THEN
                            v_nota := v_nota || ' color ' || v_lona.color;
                        END IF;
                        IF v_lona.presentacion IS NOT NULL AND v_lona.presentacion != '' THEN
                            v_nota := v_nota || ' ' || v_lona.presentacion;
                        END IF;
                    END IF;
                    
                WHEN 'malla sombra' THEN
                    SELECT * INTO v_malla_sombra FROM malla_sombra WHERE id_mcr = v_pano.id_mcr;
                    IF FOUND THEN
                        IF v_malla_sombra.color_tipo_red IS NOT NULL AND v_malla_sombra.color_tipo_red != '' THEN
                            v_nota := v_nota || ' ' || v_malla_sombra.color_tipo_red;
                        END IF;
                        IF v_malla_sombra.presentacion IS NOT NULL AND v_malla_sombra.presentacion != '' THEN
                            v_nota := v_nota || ' ' || v_malla_sombra.presentacion;
                        END IF;
                    END IF;
            END CASE;
            
            -- Agregar marca si existe
            IF v_pano.marca IS NOT NULL AND v_pano.marca != '' THEN
                v_nota := v_nota || ' marca ' || v_pano.marca;
            END IF;
            
            RETURN v_nota;
        END;
        $$ LANGUAGE plpgsql;
    `);

    // Crear función para generar nota de material extra
    await knex.raw(`
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
    `);

    // Verificar que las funciones se crearon correctamente
    await knex.raw(`
        SELECT routine_name, routine_type 
        FROM information_schema.routines 
        WHERE routine_name IN (
            'fn_generar_nota_pano',
            'fn_generar_nota_material_extra'
        )
        AND routine_schema = 'catalogo_1'
        ORDER BY routine_name;
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    // Eliminar las funciones corregidas
    await knex.raw('DROP FUNCTION IF EXISTS fn_generar_nota_pano(INTEGER, NUMERIC, TEXT);');
    await knex.raw('DROP FUNCTION IF EXISTS fn_generar_nota_material_extra(INTEGER, NUMERIC);');
}; 