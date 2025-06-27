/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    const exists = await knex.schema.hasColumn('orden_produccion', 'prioridad');
    if (!exists) {
        await knex.schema.alterTable('orden_produccion', (table) => {
            table.enu('prioridad', ['baja', 'media', 'alta', 'urgente'])
                .defaultTo('media')
                .notNullable();
            table.index(['prioridad']);
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    const exists = await knex.schema.hasColumn('orden_produccion', 'prioridad');
    if (exists) {
        await knex.schema.alterTable('orden_produccion', (table) => {
            table.dropIndex(['prioridad']);
            table.dropColumn('prioridad');
        });
    }
}; 