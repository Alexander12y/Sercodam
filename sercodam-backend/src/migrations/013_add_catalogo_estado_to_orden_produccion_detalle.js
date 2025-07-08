/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Verificar si las columnas ya existen antes de agregarlas
    const hasCatalogo = await knex.schema.hasColumn('orden_produccion_detalle', 'catalogo');
    const hasEstado = await knex.schema.hasColumn('orden_produccion_detalle', 'estado');
    
    await knex.schema.alterTable('orden_produccion_detalle', (table) => {
        // Agregar campo catalogo solo si no existe
        if (!hasCatalogo) {
            table.text('catalogo').defaultTo('CATALOGO_1');
        }
        
        // Agregar campo estado solo si no existe
        if (!hasEstado) {
            table.string('estado', 20).notNullable().defaultTo('en_proceso');
        }
        
        // Agregar índices solo si las columnas se agregaron
        if (!hasCatalogo) {
            table.index(['catalogo']);
        }
        if (!hasEstado) {
            table.index(['estado']);
        }
    });
    
    // Agregar constraints solo si las columnas se agregaron
    if (!hasCatalogo) {
        await knex.raw(`
            ALTER TABLE orden_produccion_detalle 
            ADD CONSTRAINT orden_produccion_detalle_catalogo_check 
            CHECK (catalogo = ANY(ARRAY['CATALOGO_1'::text, 'CATALOGO_2'::text, 'CATALOGO_3'::text]))
        `);
    }
    
    if (!hasEstado) {
        // Verificar si existe la tabla estado_catalogo antes de agregar foreign key
        const hasEstadoCatalogo = await knex.schema.hasTable('estado_catalogo');
        if (hasEstadoCatalogo) {
            await knex.raw(`
                ALTER TABLE orden_produccion_detalle 
                ADD CONSTRAINT fk_opdet_estado_lookup 
                FOREIGN KEY (estado) REFERENCES estado_catalogo(estado)
            `);
        }
        
        // Agregar foreign key compuesta para id_op y estado
        await knex.raw(`
            ALTER TABLE orden_produccion_detalle 
            ADD CONSTRAINT fk_opdet_to_op 
            FOREIGN KEY (id_op, estado) REFERENCES orden_produccion(id_op, estado)
        `);
    }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    const hasCatalogo = await knex.schema.hasColumn('orden_produccion_detalle', 'catalogo');
    const hasEstado = await knex.schema.hasColumn('orden_produccion_detalle', 'estado');
    
    await knex.schema.alterTable('orden_produccion_detalle', (table) => {
        // Remover foreign keys solo si existen
        if (hasEstado) {
            try {
                table.dropForeign(['id_op', 'estado']);
            } catch (error) {
                // Ignorar error si no existe
            }
            try {
                table.dropForeign(['estado']);
            } catch (error) {
                // Ignorar error si no existe
            }
        }
        
        // Remover constraint solo si existe
        if (hasCatalogo) {
            try {
                table.dropCheck('orden_produccion_detalle_catalogo_check');
            } catch (error) {
                // Ignorar error si no existe
            }
        }
        
        // Remover índices solo si existen
        if (hasCatalogo) {
            try {
                table.dropIndex(['catalogo']);
            } catch (error) {
                // Ignorar error si no existe
            }
        }
        if (hasEstado) {
            try {
                table.dropIndex(['estado']);
            } catch (error) {
                // Ignorar error si no existe
            }
        }
        
        // Remover columnas solo si existen
        if (hasEstado) {
            table.dropColumn('estado');
        }
        if (hasCatalogo) {
            table.dropColumn('catalogo');
        }
    });
}; 