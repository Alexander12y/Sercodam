/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.table('orden_produccion', (table) => {
        table.string('numero_op', 50).unique().notNullable().defaultTo('TEMP');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.table('orden_produccion', (table) => {
        table.dropColumn('numero_op');
    });
}; 