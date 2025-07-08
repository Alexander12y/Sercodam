const knex = require('knex');
const knexfile = require('./knexfile');

async function runMigrations() {
    const environment = process.env.NODE_ENV || 'development';
    const config = knexfile[environment];
    
    console.log(`Ejecutando migraciones en entorno: ${environment}`);
    
    const db = knex(config);
    
    try {
        // Ejecutar migraciones
        await db.migrate.latest();
        console.log('✅ Migraciones ejecutadas correctamente');
        
        // Verificar que las funciones se crearon correctamente
        console.log('Verificando funciones SQL...');
        
        const funciones = [
            'fn_generar_nota_pano',
            'fn_restaurar_inventario_panos_cancelada',
            'fn_limpiar_detalle_completadas',
            'fn_cancelar_ordenes_30_dias',
            'trg_restaurar_inventario_cancelacion'
        ];
        
        for (const funcion of funciones) {
            try {
                const result = await db.raw(`SELECT routine_name FROM information_schema.routines WHERE routine_name = ?`, [funcion]);
                if (result.rows.length > 0) {
                    console.log(`✅ Función ${funcion} creada correctamente`);
                } else {
                    console.log(`❌ Función ${funcion} no encontrada`);
                }
            } catch (error) {
                console.log(`❌ Error verificando función ${funcion}:`, error.message);
            }
        }
        
        // Verificar triggers
        console.log('Verificando triggers...');
        try {
            const triggers = await db.raw(`
                SELECT trigger_name 
                FROM information_schema.triggers 
                WHERE trigger_name = 'trg_orden_cancelada'
            `);
            if (triggers.rows.length > 0) {
                console.log('✅ Trigger trg_orden_cancelada creado correctamente');
            } else {
                console.log('❌ Trigger trg_orden_cancelada no encontrado');
            }
        } catch (error) {
            console.log('❌ Error verificando triggers:', error.message);
        }
        
        console.log('🎉 Proceso de migración completado');
        
    } catch (error) {
        console.error('❌ Error ejecutando migraciones:', error);
        process.exit(1);
    } finally {
        await db.destroy();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    runMigrations();
}

module.exports = runMigrations; 