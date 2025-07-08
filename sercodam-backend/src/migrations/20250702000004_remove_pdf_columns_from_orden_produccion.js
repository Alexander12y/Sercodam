/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    console.log('🔧 Iniciando migración: remove_pdf_columns_from_orden_produccion');
    
    // 1. Verificar si las columnas PDF existen antes de eliminarlas
    const columnExists = await knex.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orden_produccion' 
        AND table_schema = 'catalogo_1'
        AND column_name IN ('pdf_generado', 'pdf_filename', 'pdf_generado_at')
        ORDER BY column_name;
    `);
    
    if (columnExists.rows.length > 0) {
        console.log('🗑️  Eliminando columnas PDF...');
        console.log(`   Columnas encontradas: ${columnExists.rows.map(r => r.column_name).join(', ')}`);
        
        await knex.schema.alterTable('orden_produccion', (table) => {
            table.dropColumn('pdf_generado');
            table.dropColumn('pdf_filename');
            table.dropColumn('pdf_generado_at');
        });
        console.log('✅ Columnas PDF eliminadas correctamente');
    } else {
        console.log('ℹ️  Las columnas PDF ya fueron eliminadas anteriormente');
    }

    // 2. Eliminar índices relacionados con PDF si existen
    const indexExists = await knex.raw(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'orden_produccion' 
        AND schemaname = 'catalogo_1' 
        AND indexname LIKE '%pdf%'
    `);
    
    if (indexExists.rows.length > 0) {
        console.log('🗑️  Eliminando índices PDF...');
        for (const index of indexExists.rows) {
            await knex.raw(`DROP INDEX IF EXISTS ${index.indexname};`);
            console.log(`   Índice eliminado: ${index.indexname}`);
        }
    } else {
        console.log('ℹ️  No se encontraron índices PDF para eliminar');
    }

    // 3. Verificar que las columnas se eliminaron correctamente
    const remainingColumns = await knex.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orden_produccion' 
        AND table_schema = 'catalogo_1'
        AND column_name IN ('pdf_generado', 'pdf_filename', 'pdf_generado_at')
        ORDER BY column_name;
    `);
    
    if (remainingColumns.rows.length === 0) {
        console.log('✅ Verificación exitosa: todas las columnas PDF fueron eliminadas');
    } else {
        console.log('⚠️  Advertencia: algunas columnas PDF aún existen:', remainingColumns.rows.map(r => r.column_name));
    }
    
    console.log('🎉 Migración completada exitosamente');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    // Restaurar columnas PDF
    await knex.schema.alterTable('orden_produccion', (table) => {
        table.boolean('pdf_generado').defaultTo(false);
        table.string('pdf_filename', 255).nullable();
        table.timestamp('pdf_generado_at').nullable();
    });

    // Restaurar índices
    await knex.schema.alterTable('orden_produccion', (table) => {
        table.index(['pdf_generado']);
        table.index(['pdf_generado_at']);
    });
}; 