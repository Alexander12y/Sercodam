/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // 1. Eliminar la tabla pdf_ordenes si existe
    await knex.schema.dropTableIfExists('pdf_ordenes');
    
    // 2. Eliminar las funciones relacionadas con pdf_ordenes
    await knex.raw('DROP FUNCTION IF EXISTS fn_save_pdf_info(INTEGER, TEXT);');
    await knex.raw('DROP FUNCTION IF EXISTS fn_get_pdf_info(INTEGER);');
    
    // 3. Crear función simplificada para verificar si existe un PDF
    await knex.raw(`
        CREATE OR REPLACE FUNCTION fn_check_pdf_exists(p_id_op INTEGER)
        RETURNS TEXT AS $$
        DECLARE
            v_filename TEXT;
            v_filepath TEXT;
        BEGIN
            -- Generar nombre de archivo basado en el ID de la orden
            v_filename := 'orden_produccion_OP_' || p_id_op || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '.pdf';
            v_filepath := '/app/temp/' || v_filename;
            
            -- Verificar si el archivo existe (esto se hace en el código, no en la BD)
            -- Esta función solo retorna el nombre de archivo esperado
            RETURN v_filename;
        END;
        $$ LANGUAGE plpgsql;
    `);
    
    // 4. Crear función para limpiar PDFs antiguos
    await knex.raw(`
        CREATE OR REPLACE FUNCTION fn_cleanup_old_pdfs()
        RETURNS INTEGER AS $$
        DECLARE
            v_count INTEGER := 0;
        BEGIN
            -- Esta función se puede usar para limpiar PDFs antiguos
            -- La implementación real se hace en el código del servidor
            RETURN v_count;
        END;
        $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Tabla pdf_ordenes eliminada y funciones simplificadas creadas');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    // Recrear la tabla pdf_ordenes si es necesario hacer rollback
    await knex.schema.createTable('pdf_ordenes', (table) => {
        table.increments('id').primary();
        table.integer('id_op').references('id_op').inTable('orden_produccion').onDelete('CASCADE');
        table.string('filename', 255).notNullable();
        table.boolean('generado').defaultTo(false);
        table.timestamp('generado_at').defaultTo(knex.fn.now());
        table.timestamp('descargado_at').nullable();
        table.index(['id_op']);
        table.index(['generado']);
    });
    
    // Recrear las funciones
    await knex.raw(`
        CREATE OR REPLACE FUNCTION fn_save_pdf_info(p_id_op INTEGER, p_filename TEXT)
        RETURNS VOID AS $$
        BEGIN
            INSERT INTO pdf_ordenes (id_op, filename, generado, generado_at)
            VALUES (p_id_op, p_filename, true, NOW())
            ON CONFLICT (id_op) DO UPDATE SET
                filename = EXCLUDED.filename,
                generado = true,
                generado_at = NOW();
        END;
        $$ LANGUAGE plpgsql;
    `);
    
    await knex.raw(`
        CREATE OR REPLACE FUNCTION fn_get_pdf_info(p_id_op INTEGER)
        RETURNS TABLE(id INTEGER, filename TEXT, generado BOOLEAN, generado_at TIMESTAMP) AS $$
        BEGIN
            RETURN QUERY
            SELECT po.id, po.filename, po.generado, po.generado_at
            FROM pdf_ordenes po
            WHERE po.id_op = p_id_op;
        END;
        $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Rollback completado - tabla pdf_ordenes recreada');
}; 