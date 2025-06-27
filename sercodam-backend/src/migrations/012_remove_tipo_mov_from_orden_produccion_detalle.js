/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    const exists = await knex.schema.hasColumn('orden_produccion_detalle', 'tipo_mov');
    if (exists) {
        await knex.schema.alterTable('orden_produccion_detalle', (table) => {
            table.dropColumn('tipo_mov');
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    const exists = await knex.schema.hasColumn('orden_produccion_detalle', 'tipo_mov');
    if (!exists) {
        await knex.schema.alterTable('orden_produccion_detalle', (table) => {
            table.string('tipo_mov', 20);
        });
    }
}; 