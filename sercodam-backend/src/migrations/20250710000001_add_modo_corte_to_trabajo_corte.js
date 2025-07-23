/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.alterTable('orden_produccion', (table) => {
        // Agregar campo modo_corte para identificar si son cortes individuales o simples
        table.string('modo_corte', 20).defaultTo('simple').comment('simple o individuales - determina el tipo de corte para todos los paños de la orden');
        
        // Índice para mejorar consultas por modo de corte
        table.index(['modo_corte']);
        
        // Constraint para validar valores permitidos
        table.check('modo_corte IN (?, ?)', ['simple', 'individuales']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.alterTable('orden_produccion', (table) => {
        table.dropIndex(['modo_corte']);
        table.dropColumn('modo_corte');
    });
}; 