/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
    return knex.schema
        .alterTable('orden_produccion', (table) => {
            // Agregar campo modo_corte a orden_produccion
            table.string('modo_corte', 20).defaultTo('simple').comment('simple o individuales - modo de corte para todos los paños de esta orden');
            
            // Índice para mejorar consultas por modo de corte
            table.index(['modo_corte']);
        })
        .then(() => {
            // Verificar si existe el campo modo_corte en trabajo_corte antes de removerlo
            return knex.raw(`
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'trabajo_corte' 
                        AND column_name = 'modo_corte'
                    ) THEN
                        -- Remover índice si existe
                        DROP INDEX IF EXISTS idx_trabajo_corte_modo_corte;
                        
                        -- Remover columna
                        ALTER TABLE trabajo_corte DROP COLUMN modo_corte;
                        
                        RAISE NOTICE 'Campo modo_corte removido de trabajo_corte';
                    ELSE
                        RAISE NOTICE 'Campo modo_corte no existe en trabajo_corte, continuando...';
                    END IF;
                END $$;
            `);
        })
        .then(() => {
            // Actualizar órdenes existentes para que tengan modo_corte = 'simple' por defecto
            return knex('orden_produccion')
                .whereNull('modo_corte')
                .update({ modo_corte: 'simple' });
        });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
    return knex.schema
        .alterTable('trabajo_corte', (table) => {
            // Restaurar campo modo_corte en trabajo_corte
            table.string('modo_corte', 20).defaultTo('simple').comment('simple o individuales');
            
            // Índice para mejorar consultas por modo de corte
            table.index(['modo_corte']);
        })
        .then(() => {
            // Remover campo modo_corte de orden_produccion
            return knex.schema.alterTable('orden_produccion', (table) => {
                table.dropIndex(['modo_corte']);
                table.dropColumn('modo_corte');
            });
        });
}; 