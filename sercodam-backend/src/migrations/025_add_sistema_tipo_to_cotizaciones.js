/**
 * Migración para agregar campo sistema_tipo a cotizaciones
 * Permite especificar si es Sistema T o Sistema U
 */

exports.up = function(knex) {
  return knex.schema.alterTable('cotizaciones', function(table) {
    // Agregar campo sistema_tipo con validación
    table.string('sistema_tipo', 1).defaultTo('T').notNullable();
    
    // Agregar constraint para validar valores permitidos
    table.check('sistema_tipo IN (\'T\', \'U\')', 'sistema_tipo_check');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('cotizaciones', function(table) {
    // Remover constraint primero
    table.dropCheck('sistema_tipo_check');
    
    // Remover columna
    table.dropColumn('sistema_tipo');
  });
}; 