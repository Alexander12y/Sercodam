exports.up = function(knex) {
  return knex.schema.table('usuario', function(table) {
    table.string('twofa_secret', 255);
    table.boolean('twofa_enabled').defaultTo(false);
  });
};

exports.down = function(knex) {
  return knex.schema.table('usuario', function(table) {
    table.dropColumn('twofa_secret');
    table.dropColumn('twofa_enabled');
  });
}; 