/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    const exists = await knex.schema.hasColumn('orden_produccion', 'estado');
    if (!exists) {
        await knex.schema.alterTable('orden_produccion', (table) => {
            table.enu('estado', ['pendiente', 'en_proceso', 'completada', 'cancelada', 'pausada'])
                .defaultTo('pendiente')
                .notNullable();
            table.index(['estado']);
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    const exists = await knex.schema.hasColumn('orden_produccion', 'estado');
    if (exists) {
        await knex.schema.alterTable('orden_produccion', (table) => {
            table.dropIndex(['estado']);
            table.dropColumn('estado');
        });
    }
}; 