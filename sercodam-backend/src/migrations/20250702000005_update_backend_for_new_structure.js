/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Esta migración documenta los cambios necesarios en el backend
    // Los cambios reales se harán en los archivos de código
    
    // 1. Enfoque simplificado: No necesitamos tabla pdf_ordenes
    // Los PDFs se manejan directamente en el sistema de archivos
    console.log('✅ Enfoque simplificado: PDFs se manejan directamente en sistema de archivos');
    
    // 2. Crear función para generar nombres de archivo PDF
    await knex.raw(`
        CREATE OR REPLACE FUNCTION fn_generate_pdf_filename(p_id_op INTEGER)
        RETURNS TEXT AS $$
        BEGIN
            -- Generar nombre de archivo basado en el ID de la orden
            RETURN 'orden_produccion_OP_' || p_id_op || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '.pdf';
        END;
        $$ LANGUAGE plpgsql;
    `);

    // 3. Verificar que la función se creó correctamente
    await knex.raw(`
        SELECT routine_name, routine_type 
        FROM information_schema.routines 
        WHERE routine_name = 'fn_generate_pdf_filename'
        AND routine_schema = 'catalogo_1';
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    // Eliminar función
    await knex.raw('DROP FUNCTION IF EXISTS fn_generate_pdf_filename(INTEGER);');
    
    console.log('✅ Rollback completado - función fn_generate_pdf_filename eliminada');
}; 