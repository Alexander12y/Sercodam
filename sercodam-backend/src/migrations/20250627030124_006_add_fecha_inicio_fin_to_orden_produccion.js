/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Agregar columnas solo si no existen
  const hasFechaInicio = await knex.schema.hasColumn('orden_produccion', 'fecha_inicio');
  const hasFechaFin = await knex.schema.hasColumn('orden_produccion', 'fecha_fin');
  await knex.schema.table('orden_produccion', function(table) {
    if (!hasFechaInicio) table.timestamp('fecha_inicio');
    if (!hasFechaFin) table.timestamp('fecha_fin');
  });
  // Agregar índices
  await knex.schema.table('orden_produccion', function(table) {
    table.index(['fecha_inicio']);
    table.index(['fecha_fin']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.table('orden_produccion', function(table) {
    table.dropIndex(['fecha_inicio']);
    table.dropIndex(['fecha_fin']);
    table.dropColumn('fecha_inicio');
    table.dropColumn('fecha_fin');
  });
};
