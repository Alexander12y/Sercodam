/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // 1. Corregir función para procesar material extra con validación de stock
    await knex.raw(`
        CREATE OR REPLACE FUNCTION fn_procesar_material_extra_orden(
            p_id_op INTEGER,
            p_id_item INTEGER,
            p_cantidad NUMERIC
        ) RETURNS VOID AS $$
        DECLARE
            v_nota TEXT;
            v_id_detalle INTEGER;
            v_stock_disponible NUMERIC;
        BEGIN
            -- Verificar stock disponible
            SELECT cantidad_disponible INTO v_stock_disponible
            FROM materiales_extras 
            WHERE id_item = p_id_item;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Material extra con ID % no encontrado', p_id_item;
            END IF;
            
            IF v_stock_disponible < p_cantidad THEN
                RAISE EXCEPTION 'Stock insuficiente para material %: disponible %, solicitado %', 
                    p_id_item, v_stock_disponible, p_cantidad;
            END IF;
            
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
                cantidad_disponible = cantidad_disponible - p_cantidad,
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

    // 2. Corregir función para procesar paño con validación de stock
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
            v_largo_disponible NUMERIC;
            v_ancho_disponible NUMERIC;
        BEGIN
            -- Verificar stock disponible del paño
            SELECT largo_m, ancho_m INTO v_largo_disponible, v_ancho_disponible
            FROM pano 
            WHERE id_item = p_id_item;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Paño con ID % no encontrado', p_id_item;
            END IF;
            
            IF v_largo_disponible < p_largo_tomar THEN
                RAISE EXCEPTION 'Largo insuficiente para paño %: disponible %, solicitado %', 
                    p_id_item, v_largo_disponible, p_largo_tomar;
            END IF;
            
            IF v_ancho_disponible < p_ancho_tomar THEN
                RAISE EXCEPTION 'Ancho insuficiente para paño %: disponible %, solicitado %', 
                    p_id_item, v_ancho_disponible, p_ancho_tomar;
            END IF;
            
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
                p_id_op, p_id_item, 'PANO', p_ancho_tomar, v_nota_ancho, 'CATALOGO_2', 'en_proceso'
            ) RETURNING id_detalle INTO v_id_detalle_ancho;
            
            -- Descontar dimensiones del paño original
            UPDATE pano 
            SET 
                largo_m = largo_m - p_largo_tomar,
                ancho_m = ancho_m - p_ancho_tomar,
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

    // 3. Verificar que las funciones se actualizaron correctamente
    await knex.raw(`
        SELECT routine_name, routine_type 
        FROM information_schema.routines 
        WHERE routine_name IN (
            'fn_procesar_pano_orden',
            'fn_procesar_material_extra_orden'
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
    // No es necesario hacer rollback ya que solo mejoramos las funciones
    // Las funciones seguirán funcionando, solo con menos validaciones
}; 