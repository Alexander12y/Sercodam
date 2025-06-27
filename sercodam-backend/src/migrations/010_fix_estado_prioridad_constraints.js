/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Eliminar restricciones existentes si existen
    await knex.raw(`
        ALTER TABLE orden_produccion DROP CONSTRAINT IF EXISTS orden_produccion_estado_check;
        ALTER TABLE orden_produccion DROP CONSTRAINT IF EXISTS orden_produccion_prioridad_check;
    `);
    
    // Crear nuevas restricciones con los valores correctos
    await knex.raw(`
        ALTER TABLE orden_produccion ADD CONSTRAINT orden_produccion_estado_check 
        CHECK (estado IN ('pendiente', 'en_proceso', 'completada', 'cancelada', 'pausada'));
        
        ALTER TABLE orden_produccion ADD CONSTRAINT orden_produccion_prioridad_check 
        CHECK (prioridad IN ('baja', 'media', 'alta', 'urgente'));
    `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    // Eliminar las restricciones que creamos
    await knex.raw(`
        ALTER TABLE orden_produccion DROP CONSTRAINT IF EXISTS orden_produccion_estado_check;
        ALTER TABLE orden_produccion DROP CONSTRAINT IF EXISTS orden_produccion_prioridad_check;
    `);
}; 