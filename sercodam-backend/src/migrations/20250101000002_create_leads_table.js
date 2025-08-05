exports.up = function(knex) {
  return knex.schema.createTable('leads', (table) => {
    table.increments('id_lead').primary();
    table.string('email_remitente', 255).notNullable();
    table.string('nombre_remitente', 255);
    table.string('asunto_email', 500);
    table.text('contenido_email');
    table.text('contenido_interpretado'); // Información extraída por Make.com
    table.json('datos_estructurados'); // JSON con datos parseados
    table.enum('estado', ['nuevo', 'en_revision', 'contactado', 'convertido', 'descartado'])
      .defaultTo('nuevo')
      .notNullable();
    table.string('telefono', 50);
    table.string('empresa', 255);
    table.text('requerimientos');
    table.decimal('presupuesto_estimado', 15, 2);
    table.string('fuente', 100).defaultTo('email'); // email, landing, referral, etc.
    table.boolean('leido').defaultTo(false);
    table.integer('asignado_a').references('id').inTable('usuario').onDelete('SET NULL');
    table.text('notas');
    table.timestamp('fecha_recepcion').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('fecha_contacto');
    table.timestamp('fecha_conversion');
    table.timestamp('creado_en').defaultTo(knex.fn.now());
    table.timestamp('actualizado_en').defaultTo(knex.fn.now());
    
    // Índices para búsquedas eficientes
    table.index(['estado']);
    table.index(['fecha_recepcion']);
    table.index(['email_remitente']);
    table.index(['leido']);
    table.index(['asignado_a']);
    
    table.comment('Tabla para almacenar leads de ventas recibidos por email');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('leads');
}; 