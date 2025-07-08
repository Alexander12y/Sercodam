/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // 1. Eliminar el trigger problemático
    await knex.raw('DROP TRIGGER IF EXISTS after_insert_detalle_consumo ON orden_produccion_detalle;');
    await knex.raw('DROP FUNCTION IF EXISTS trg_consumo_desde_detalle();');

    // 2. Crear nueva función para procesar paños (crear dos registros: largo y ancho)
    await knex.raw(`
        CREATE OR REPLACE FUNCTION fn_procesar_pano_orden(
            p_id_op INTEGER,
            p_id_item INTEGER,
            p_largo_tomar NUMERIC,
            p_ancho_tomar NUMERIC,
            p_cantidad NUMERIC DEFAULT 1
        ) RETURNS VOID AS $$
        DECLARE
            v_nota_largo TEXT;
            v_nota_ancho TEXT;
            v_id_detalle_largo INTEGER;
            v_id_detalle_ancho INTEGER;
        BEGIN
            -- Generar notas para largo y ancho
            v_nota_largo := fn_generar_nota_pano(p_id_item, p_largo_tomar, 'largo');
            v_nota_ancho := fn_generar_nota_pano(p_id_item, p_ancho_tomar, 'ancho');
            
            -- Insertar registro para largo
            INSERT INTO orden_produccion_detalle (
                id_op, id_item, tipo_item, cantidad, notas, catalogo, estado
            ) VALUES (
                p_id_op, p_id_item, 'PANO', p_largo_tomar, v_nota_largo, 'CATALOGO_1', 'en_proceso'
            ) RETURNING id_detalle INTO v_id_detalle_largo;
            
            -- Insertar registro para ancho
            INSERT INTO orden_produccion_detalle (
                id_op, id_item, tipo_item, cantidad, notas, catalogo, estado
            ) VALUES (
                p_id_op, p_id_item, 'PANO', p_ancho_tomar, v_nota_ancho, 'CATALOGO_1', 'en_proceso'
            ) RETURNING id_detalle INTO v_id_detalle_ancho;
            
            -- Descontar dimensiones del paño original
            UPDATE pano 
            SET 
                largo_m = GREATEST(0, largo_m - p_largo_tomar),
                ancho_m = GREATEST(0, ancho_m - p_ancho_tomar),
                updated_at = CURRENT_TIMESTAMP
            WHERE id_item = p_id_item;
            
            -- Registrar movimientos de inventario
            INSERT INTO movimiento_inventario (
                id_item, tipo_mov, cantidad, unidad, id_op, notas, fecha, id_usuario
            ) VALUES 
            (p_id_item, 'CONSUMO', p_largo_tomar, 'm', p_id_op, 
             'Consumo de largo: ' || v_nota_largo, CURRENT_TIMESTAMP, 1),
            (p_id_item, 'CONSUMO', p_ancho_tomar, 'm', p_id_op, 
             'Consumo de ancho: ' || v_nota_ancho, CURRENT_TIMESTAMP, 1);
        END;
        $$ LANGUAGE plpgsql;
    `);

    // 3. Crear función para procesar material extra
    await knex.raw(`
        CREATE OR REPLACE FUNCTION fn_procesar_material_extra_orden(
            p_id_op INTEGER,
            p_id_item INTEGER,
            p_cantidad NUMERIC
        ) RETURNS VOID AS $$
        DECLARE
            v_nota TEXT;
            v_id_detalle INTEGER;
        BEGIN
            -- Generar nota para el material
            v_nota := fn_generar_nota_material_extra(p_id_item, p_cantidad);
            
            -- Insertar registro del material
            INSERT INTO orden_produccion_detalle (
                id_op, id_item, tipo_item, cantidad, notas, catalogo, estado
            ) VALUES (
                p_id_op, p_id_item, 'EXTRA', p_cantidad, v_nota, 'CATALOGO_2', 'en_proceso'
            ) RETURNING id_detalle INTO v_id_detalle;
            
            -- Descontar cantidad del material
            UPDATE materiales_extras 
            SET 
                cantidad_disponible = GREATEST(0, cantidad_disponible - p_cantidad),
                ultima_modificacion = CURRENT_TIMESTAMP
            WHERE id_item = p_id_item;
            
            -- Registrar movimiento de inventario
            INSERT INTO movimiento_inventario (
                id_item, tipo_mov, cantidad, unidad, id_op, notas, fecha, id_usuario
            ) VALUES (
                p_id_item, 'CONSUMO', p_cantidad, 
                (SELECT unidad FROM materiales_extras WHERE id_item = p_id_item), 
                p_id_op, 'Consumo de material: ' || v_nota, CURRENT_TIMESTAMP, 1
            );
        END;
        $$ LANGUAGE plpgsql;
    `);

    // 4. Actualizar función de restauración de inventario para incluir materiales extras
    await knex.raw(`
        CREATE OR REPLACE FUNCTION fn_restaurar_inventario_completo_cancelada(
            p_id_op INTEGER
        ) RETURNS VOID AS $$
        BEGIN
            -- Restaurar inventario de paños
            PERFORM fn_restaurar_inventario_panos_cancelada(p_id_op);
            
            -- Restaurar inventario de materiales extras
            PERFORM fn_restaurar_inventario_materiales_cancelada(p_id_op);
        END;
        $$ LANGUAGE plpgsql;
    `);

    // 5. Actualizar el trigger de cancelación para usar la función completa
    await knex.raw(`
        CREATE OR REPLACE FUNCTION trg_restaurar_inventario_cancelacion() 
        RETURNS TRIGGER AS $$
        BEGIN
            -- Si el estado cambió a cancelada
            IF NEW.estado = 'cancelada' AND OLD.estado != 'cancelada' THEN
                -- Restaurar todo el inventario (paños + materiales)
                PERFORM fn_restaurar_inventario_completo_cancelada(NEW.id_op);
            END IF;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);

    // 6. Verificar que las funciones se crearon correctamente
    await knex.raw(`
        SELECT routine_name, routine_type 
        FROM information_schema.routines 
        WHERE routine_name IN (
            'fn_procesar_pano_orden',
            'fn_procesar_material_extra_orden',
            'fn_restaurar_inventario_completo_cancelada',
            'trg_restaurar_inventario_cancelacion'
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
    // Eliminar las nuevas funciones
    await knex.raw('DROP FUNCTION IF EXISTS fn_procesar_pano_orden(INTEGER, INTEGER, NUMERIC, NUMERIC, NUMERIC);');
    await knex.raw('DROP FUNCTION IF EXISTS fn_procesar_material_extra_orden(INTEGER, INTEGER, NUMERIC);');
    await knex.raw('DROP FUNCTION IF EXISTS fn_restaurar_inventario_completo_cancelada(INTEGER);');
    await knex.raw('DROP FUNCTION IF EXISTS trg_restaurar_inventario_cancelacion();');

    // Restaurar el trigger original (si existe)
    // Nota: No podemos restaurar el trigger original porque no sabemos su definición exacta
}; 