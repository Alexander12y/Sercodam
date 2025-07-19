const db = require('./src/config/database');

async function cleanupProblematicFunctions() {
    try {
        console.log('🧹 Limpiando funciones problemáticas...');
        
        // Eliminar funciones problemáticas
        await db.raw('DROP FUNCTION IF EXISTS fn_restaurar_inventario_completo_cancelada(INTEGER);');
        await db.raw('DROP FUNCTION IF EXISTS fn_restaurar_inventario_materiales_cancelada(INTEGER);');
        await db.raw('DROP FUNCTION IF EXISTS fn_restaurar_inventario_panos_cancelada(INTEGER);');
        
        // Eliminar triggers relacionados
        await db.raw('DROP TRIGGER IF EXISTS trg_restaurar_inventario_cancelacion ON orden_produccion;');
        await db.raw('DROP FUNCTION IF EXISTS trg_restaurar_inventario_cancelacion();');
        
        console.log('✅ Funciones problemáticas eliminadas');
        
        // Verificar que se eliminaron
        const remainingFunctions = await db.raw(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_name LIKE '%restaurar_inventario%' 
            AND routine_schema = 'catalogo_1'
        `);
        
        if (remainingFunctions.rows.length === 0) {
            console.log('✅ No quedan funciones problemáticas');
        } else {
            console.log('⚠️ Funciones restantes:', remainingFunctions.rows.map(f => f.routine_name));
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await db.destroy();
    }
}

cleanupProblematicFunctions(); 