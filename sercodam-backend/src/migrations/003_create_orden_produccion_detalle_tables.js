/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema
        // Tabla de detalle de materiales por orden
        .createTable('orden_produccion_detalle', (table) => {
            table.increments('id').primary();
            table.integer('id_op').references('id_op').inTable('orden_produccion').onDelete('CASCADE');
            table.integer('id_item').notNullable();
            table.string('tipo_item', 20).notNullable(); // PANO, MATERIAL, HERRAMIENTA
            table.decimal('cantidad', 10, 2).notNullable();
            table.string('unidad_medida', 20).defaultTo('unidad');
            table.decimal('costo_unitario', 10, 2).defaultTo(0);
            table.decimal('costo_total', 10, 2).defaultTo(0);
            table.text('notas');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            
            // Índices
            table.index(['id_op']);
            table.index(['id_item']);
            table.index(['tipo_item']);
        })
        
        // Tabla de historial de cambios de estado
        .createTable('orden_produccion_historial', (table) => {
            table.increments('id').primary();
            table.integer('id_op').references('id_op').inTable('orden_produccion').onDelete('CASCADE');
            table.string('estado_anterior', 20);
            table.string('estado_nuevo', 20).notNullable();
            table.text('comentario');
            table.timestamp('fecha_cambio').defaultTo(knex.fn.now());
            
            // Índices
            table.index(['id_op']);
            table.index(['estado_nuevo']);
            table.index(['fecha_cambio']);
        })
        
        // Tabla de movimiento de inventario (si no existe)
        .createTable('movimiento_inventario', (table) => {
            table.increments('id').primary();
            table.integer('id_item').notNullable();
            table.string('tipo_item', 20).notNullable();
            table.string('tipo_mov', 20).notNullable(); // ENTRADA, SALIDA, AJUSTE
            table.decimal('cantidad', 10, 2).notNullable();
            table.decimal('cantidad_anterior', 10, 2);
            table.decimal('cantidad_nueva', 10, 2);
            table.integer('id_op').references('id_op').inTable('orden_produccion').onDelete('SET NULL');
            table.text('motivo');
            table.text('notas');
            table.timestamp('fecha').defaultTo(knex.fn.now());
            
            // Índices
            table.index(['id_item']);
            table.index(['tipo_mov']);
            table.index(['fecha']);
            table.index(['id_op']);
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema
        .dropTableIfExists('movimiento_inventario')
        .dropTableIfExists('orden_produccion_historial')
        .dropTableIfExists('orden_produccion_detalle');
}; 