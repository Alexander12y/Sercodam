/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Primero verificamos si la secuencia existe
    const sequenceExists = await knex.raw(`
        SELECT EXISTS (
            SELECT 1 FROM information_schema.sequences 
            WHERE sequence_name = 'orden_produccion_id_op_seq'
        );
    `);
    
    if (sequenceExists.rows[0].exists) {
        // Resetear la secuencia de id_op para que funcione el autoincrement
        await knex.raw(`
            SELECT setval(
                'orden_produccion_id_op_seq', 
                COALESCE((SELECT MAX(CAST(id_op AS INTEGER)) FROM orden_produccion), 0) + 1, 
                false
            );
        `);
    } else {
        // Si no existe la secuencia, la creamos
        await knex.raw(`
            CREATE SEQUENCE IF NOT EXISTS orden_produccion_id_op_seq;
            ALTER TABLE orden_produccion ALTER COLUMN id_op SET DEFAULT nextval('orden_produccion_id_op_seq');
            ALTER SEQUENCE orden_produccion_id_op_seq OWNED BY orden_produccion.id_op;
        `);
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    // No hay rollback necesario para este fix
    return Promise.resolve();
}; 