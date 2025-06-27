/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema
        .table('orden_produccion', (table) => {
            // Agregar campos que faltan en la tabla orden_produccion
            table.integer('created_by').references('id').inTable('usuario');
            table.integer('updated_by').references('id').inTable('usuario');
            table.timestamp('created_at').defaultTo(knex.fn.now());
            table.timestamp('updated_at').defaultTo(knex.fn.now());
            table.timestamp('fecha_completada');
            table.timestamp('fecha_cancelada');
            table.text('motivo_cancelacion');
            
            // Índices para mejorar performance
            table.index(['estado']);
            table.index(['cliente']);
            table.index(['fecha_op']);
            table.index(['created_by']);
            table.index(['created_at']);
        })
        .then(() => {
            // Agregar campo id_usuario a movimiento_inventario si no existe
            return knex.schema.table('movimiento_inventario', (table) => {
                table.integer('id_usuario').references('id').inTable('usuario');
                table.index(['id_usuario']);
                table.index(['fecha']);
                table.index(['tipo_mov']);
            });
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema
        .table('orden_produccion', (table) => {
            table.dropColumn('created_by');
            table.dropColumn('updated_by');
            table.dropColumn('created_at');
            table.dropColumn('updated_at');
            table.dropColumn('fecha_completada');
            table.dropColumn('fecha_cancelada');
            table.dropColumn('motivo_cancelacion');
        })
        .then(() => {
            return knex.schema.table('movimiento_inventario', (table) => {
                table.dropColumn('id_usuario');
            });
        });
}; 