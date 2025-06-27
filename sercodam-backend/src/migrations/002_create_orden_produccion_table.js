/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema.createTable('orden_produccion', (table) => {
        // Identificador principal
        table.increments('id_op').primary();
        
        // Información básica de la orden
        table.string('numero_op', 50).unique().notNullable();
        table.string('cliente', 200).notNullable();
        table.text('descripcion_trabajo');
        table.text('observaciones');
        
        // Fechas importantes
        table.timestamp('fecha_op').defaultTo(knex.fn.now()).notNullable();
        table.timestamp('fecha_entrega_estimada');
        table.timestamp('fecha_inicio_real');
        table.timestamp('fecha_fin_real');
        
        // Estado y prioridad
        table.enum('estado', ['pendiente', 'en_proceso', 'completada', 'cancelada', 'pausada'])
            .defaultTo('pendiente')
            .notNullable();
        table.enum('prioridad', ['baja', 'media', 'alta', 'urgente'])
            .defaultTo('media')
            .notNullable();
        
        // Información de instalación
        table.string('direccion_instalacion', 500);
        table.string('contacto_cliente', 100);
        table.string('telefono_cliente', 20);
        
        // Campos de auditoría (se agregarán en la siguiente migración)
        // table.integer('created_by').references('id').inTable('usuario');
        // table.integer('updated_by').references('id').inTable('usuario');
        // table.timestamp('created_at').defaultTo(knex.fn.now());
        // table.timestamp('updated_at').defaultTo(knex.fn.now());
        // table.timestamp('fecha_completada');
        // table.timestamp('fecha_cancelada');
        // table.text('motivo_cancelacion');
        
        // Índices básicos
        table.index(['numero_op']);
        table.index(['cliente']);
        table.index(['estado']);
        table.index(['fecha_op']);
        table.index(['prioridad']);
        
        // Comentarios
        table.comment('Tabla principal de órdenes de producción');
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema.dropTableIfExists('orden_produccion');
}; 