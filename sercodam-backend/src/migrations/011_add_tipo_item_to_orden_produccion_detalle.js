/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    const exists = await knex.schema.hasColumn('orden_produccion_detalle', 'tipo_item');
    if (!exists) {
        await knex.schema.alterTable('orden_produccion_detalle', (table) => {
            table.string('tipo_item', 20).notNullable(); // PANO, MATERIAL, HERRAMIENTA
            table.index(['tipo_item']);
        });
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    const exists = await knex.schema.hasColumn('orden_produccion_detalle', 'tipo_item');
    if (exists) {
        await knex.schema.alterTable('orden_produccion_detalle', (table) => {
            table.dropIndex(['tipo_item']);
            table.dropColumn('tipo_item');
        });
    }
}; 