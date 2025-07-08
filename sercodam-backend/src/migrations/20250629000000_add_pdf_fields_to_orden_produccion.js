/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('orden_produccion', function(table) {
        // Campos para tracking de PDF generado
        table.boolean('pdf_generado').defaultTo(false);
        table.string('pdf_filename', 255).nullable();
        table.timestamp('pdf_generado_at').nullable();
        
        // Índices para optimizar consultas
        table.index(['pdf_generado']);
        table.index(['pdf_generado_at']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.table('orden_produccion', function(table) {
        table.dropIndex(['pdf_generado']);
        table.dropIndex(['pdf_generado_at']);
        table.dropColumn('pdf_generado');
        table.dropColumn('pdf_filename');
        table.dropColumn('pdf_generado_at');
    });
}; 