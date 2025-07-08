const db = require('./src/config/database');

async function resetMigrations() {
    try {
        console.log('🔄 Limpiando estado de migraciones...');
        
        // 1. Verificar si las migraciones ya se ejecutaron
        const migrationsTable = await db.raw(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'knex_migrations' 
            AND table_schema = 'catalogo_1'
        `);
        
        if (migrationsTable.rows.length > 0) {
            // 2. Eliminar registros de las migraciones problemáticas
            await db.raw(`
                DELETE FROM knex_migrations 
                WHERE name IN (
                    '20250702000001_fix_orden_produccion_detalle_structure.js',
                    '20250702000002_fix_generar_nota_pano_function.js',
                    '20250702000003_remove_problematic_trigger_and_create_new_logic.js',
                    '20250702000004_remove_pdf_columns_from_orden_produccion.js',
                    '20250702000005_update_backend_for_new_structure.js',
                    '20250702000006_simplify_pdf_handling.js'
                )
            `);
            
            console.log('✅ Registros de migraciones eliminados');
        } else {
            console.log('ℹ️  Tabla knex_migrations no encontrada');
        }
        
        // 3. Verificar estado actual de las tablas
        console.log('\n📋 Estado actual de las tablas:');
        
        // Verificar columnas en orden_produccion_detalle
        const detalleColumns = await db.raw(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'orden_produccion_detalle' 
            AND table_schema = 'catalogo_1'
            ORDER BY ordinal_position
        `);
        console.log('\norden_produccion_detalle:');
        detalleColumns.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
        
        // Verificar columnas en orden_produccion
        const ordenColumns = await db.raw(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'orden_produccion' 
            AND table_schema = 'catalogo_1'
            AND column_name LIKE '%pdf%'
            ORDER BY column_name
        `);
        console.log('\norden_produccion (columnas PDF):');
        if (ordenColumns.rows.length > 0) {
            ordenColumns.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
            });
        } else {
            console.log('  - No se encontraron columnas PDF');
        }
        
        // Verificar constraints
        const constraints = await db.raw(`
            SELECT constraint_name, constraint_type 
            FROM information_schema.table_constraints 
            WHERE table_name = 'orden_produccion_detalle' 
            AND table_schema = 'catalogo_1'
            AND constraint_type = 'CHECK'
        `);
        console.log('\nConstraints en orden_produccion_detalle:');
        constraints.rows.forEach(constraint => {
            console.log(`  - ${constraint.constraint_name}: ${constraint.constraint_type}`);
        });
        
        // Verificar triggers
        const triggers = await db.raw(`
            SELECT trigger_name, event_manipulation 
            FROM information_schema.triggers 
            WHERE event_object_table = 'orden_produccion_detalle' 
            AND trigger_schema = 'catalogo_1'
        `);
        console.log('\nTriggers en orden_produccion_detalle:');
        triggers.rows.forEach(trigger => {
            console.log(`  - ${trigger.trigger_name}: ${trigger.event_manipulation}`);
        });
        
        console.log('\n✅ Limpieza completada. Ahora puedes ejecutar:');
        console.log('   npm run migrate');
        
    } catch (error) {
        console.error('❌ Error limpiando migraciones:', error.message);
    } finally {
        await db.destroy();
    }
}

resetMigrations(); 