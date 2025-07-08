/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    console.log('🔧 Iniciando migración: fix_orden_produccion_detalle_structure');
    
    // 1. Verificar si las columnas existen antes de eliminarlas
    const columnExists = await knex.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'orden_produccion_detalle' 
        AND table_schema = 'catalogo_1' 
        AND column_name IN ('largo_tomar', 'ancho_tomar', 'area_tomar')
    `);
    
    if (columnExists.rows.length > 0) {
        console.log('🗑️  Eliminando columnas innecesarias...');
        await knex.schema.alterTable('orden_produccion_detalle', (table) => {
            table.dropColumn('largo_tomar');
            table.dropColumn('ancho_tomar');
            table.dropColumn('area_tomar');
        });
        console.log('✅ Columnas eliminadas correctamente');
    } else {
        console.log('ℹ️  Las columnas ya fueron eliminadas anteriormente');
    }

    // 2. Crear función para autogenerar el campo catalogo
    await knex.raw(`
        CREATE OR REPLACE FUNCTION fn_autogenerar_catalogo()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Autogenerar catalogo basado en tipo_item
            CASE NEW.tipo_item
                WHEN 'PANO' THEN
                    NEW.catalogo := 'CATALOGO_1';
                WHEN 'EXTRA' THEN
                    NEW.catalogo := 'CATALOGO_2';
                WHEN 'HERRAMIENTA' THEN
                    NEW.catalogo := 'CATALOGO_3';
                ELSE
                    NEW.catalogo := 'CATALOGO_1'; -- Default
            END CASE;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Función fn_autogenerar_catalogo creada/actualizada');

    // 3. Verificar si el trigger ya existe antes de crearlo
    const triggerExists = await knex.raw(`
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE trigger_name = 'trg_autogenerar_catalogo' 
        AND event_object_table = 'orden_produccion_detalle'
        AND trigger_schema = 'catalogo_1'
    `);
    
    if (triggerExists.rows.length === 0) {
        await knex.raw(`
            CREATE TRIGGER trg_autogenerar_catalogo
            BEFORE INSERT OR UPDATE ON orden_produccion_detalle
            FOR EACH ROW
            EXECUTE FUNCTION fn_autogenerar_catalogo();
        `);
        console.log('✅ Trigger trg_autogenerar_catalogo creado');
    } else {
        console.log('ℹ️  Trigger trg_autogenerar_catalogo ya existe');
    }

    // 4. Actualizar registros existentes con catalogo correcto
    const updateResult = await knex.raw(`
        UPDATE orden_produccion_detalle 
        SET catalogo = CASE 
            WHEN tipo_item = 'PANO' THEN 'CATALOGO_1'
            WHEN tipo_item = 'EXTRA' THEN 'CATALOGO_2'
            WHEN tipo_item = 'HERRAMIENTA' THEN 'CATALOGO_3'
            ELSE 'CATALOGO_1'
        END
        WHERE catalogo IS NULL OR catalogo = '';
    `);
    console.log(`✅ Registros actualizados: ${updateResult.rowCount}`);

    // 5. Verificar si el campo catalogo ya es NOT NULL
    const columnInfo = await knex.raw(`
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'orden_produccion_detalle' 
        AND table_schema = 'catalogo_1' 
        AND column_name = 'catalogo'
    `);
    
    if (columnInfo.rows[0] && columnInfo.rows[0].is_nullable === 'YES') {
        await knex.schema.alterTable('orden_produccion_detalle', (table) => {
            table.text('catalogo').notNullable().alter();
        });
        console.log('✅ Campo catalogo hecho NOT NULL');
    } else {
        console.log('ℹ️  Campo catalogo ya es NOT NULL');
    }

    // 6. Verificar si el constraint ya existe antes de agregarlo
    const constraintExists = await knex.raw(`
        SELECT constraint_name 
        FROM information_schema.check_constraints 
        WHERE constraint_name = 'orden_produccion_detalle_catalogo_check'
        AND constraint_schema = 'catalogo_1'
    `);
    
    if (constraintExists.rows.length === 0) {
        await knex.raw(`
            ALTER TABLE orden_produccion_detalle 
            ADD CONSTRAINT orden_produccion_detalle_catalogo_check 
            CHECK (catalogo IN ('CATALOGO_1', 'CATALOGO_2', 'CATALOGO_3'));
        `);
        console.log('✅ Constraint orden_produccion_detalle_catalogo_check agregado');
    } else {
        console.log('ℹ️  Constraint orden_produccion_detalle_catalogo_check ya existe');
    }

    // 7. Verificar si el índice ya existe antes de crearlo
    const indexExists = await knex.raw(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'orden_produccion_detalle' 
        AND schemaname = 'catalogo_1' 
        AND indexname LIKE '%catalogo%'
    `);
    
    if (indexExists.rows.length === 0) {
        await knex.schema.alterTable('orden_produccion_detalle', (table) => {
            table.index(['catalogo']);
        });
        console.log('✅ Índice en catalogo creado');
    } else {
        console.log('ℹ️  Índice en catalogo ya existe');
    }
    
    console.log('🎉 Migración completada exitosamente');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
    // 1. Eliminar trigger y función
    await knex.raw('DROP TRIGGER IF EXISTS trg_autogenerar_catalogo ON orden_produccion_detalle;');
    await knex.raw('DROP FUNCTION IF EXISTS fn_autogenerar_catalogo();');

    // 2. Eliminar constraint e índice
    await knex.raw('ALTER TABLE orden_produccion_detalle DROP CONSTRAINT IF EXISTS orden_produccion_detalle_catalogo_check;');
    await knex.schema.alterTable('orden_produccion_detalle', (table) => {
        table.dropIndex(['catalogo']);
    });

    // 3. Hacer catalogo nullable nuevamente
    await knex.schema.alterTable('orden_produccion_detalle', (table) => {
        table.text('catalogo').nullable().alter();
    });

    // 4. Restaurar columnas eliminadas
    await knex.schema.alterTable('orden_produccion_detalle', (table) => {
        table.decimal('largo_tomar', 10, 3).nullable();
        table.decimal('ancho_tomar', 10, 3).nullable();
        table.decimal('area_tomar', 10, 3).nullable();
    });
}; 