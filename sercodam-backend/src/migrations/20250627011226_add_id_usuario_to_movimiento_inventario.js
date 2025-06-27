/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('movimiento_inventario', function(table) {
    table.integer('id_usuario').references('id').inTable('usuario');
    table.index(['id_usuario']);
    table.index(['fecha']);
    table.index(['tipo_mov']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('movimiento_inventario', function(table) {
    table.dropColumn('id_usuario');
  });
};
