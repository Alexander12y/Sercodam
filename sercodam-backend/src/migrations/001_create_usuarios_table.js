/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('usuario', (table) => {
        // Identificadores
        table.increments('id').primary();
        table.string('username', 50).unique().notNullable();
        table.string('email', 255).unique();
        
        // Información personal
        table.string('nombre', 100).notNullable();
        table.string('apellido', 100);
        
        // Autenticación
        table.string('password', 255).notNullable();
        table.string('rol', 20).defaultTo('usuario').notNullable();
        table.boolean('activo').defaultTo(true).notNullable();
        
        // Tokens y sesiones
        table.string('reset_token', 255);
        table.timestamp('reset_token_expires');
        table.string('verification_token', 255);
        table.boolean('email_verificado').defaultTo(false);
        
        // Auditoría
        table.timestamp('ultimo_login');
        table.timestamp('ultima_actividad');
        table.timestamp('creado_en').defaultTo(knex.fn.now());
        table.timestamp('actualizado_en').defaultTo(knex.fn.now());
        
        // Índices
        table.index(['username']);
        table.index(['email']);
        table.index(['rol']);
        table.index(['activo']);
        table.index(['ultimo_login']);
        
        // Comentarios
        table.comment('Tabla de usuarios del sistema');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTableIfExists('usuario');
}; 