/**
 * Migración para agregar relación de cotización a orden_produccion
 * Una orden de producción puede originarse de una cotización
 */

exports.up = function(knex) {
  return knex.schema.alterTable('orden_produccion', (table) => {
    // Agregar referencia a cotización (opcional, ya que pueden existir órdenes sin cotización)
    table.integer('id_cotizacion').references('id_cotizacion').inTable('cotizacion');
    
    // Índice para consultas rápidas
    table.index(['id_cotizacion']);
    
    table.comment('Relación con cotización - una OP puede originarse de una cotización');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('orden_produccion', (table) => {
    table.dropIndex(['id_cotizacion']);
    table.dropColumn('id_cotizacion');
  });
}; 