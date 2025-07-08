const db = require('./src/config/database');

async function checkFunctions() {
  try {
    console.log('🔍 Verificando funciones de paños...');
    
    const functions = [
      'fn_generar_nota_pano',
      'fn_restaurar_inventario_panos_cancelada',
      'fn_limpiar_detalle_completadas',
      'fn_cancelar_ordenes_30_dias'
    ];
    
    for (const funcName of functions) {
      const exists = await db.raw(`
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_name = ?
        AND routine_schema = 'catalogo_1'
      `, [funcName]);
      
      console.log(`✅ Función ${funcName}: ${exists.rows.length > 0 ? 'EXISTE' : 'NO EXISTE'}`);
    }
    
  } catch (error) {
    console.error('❌ Error verificando funciones:', error);
  } finally {
    await db.destroy();
  }
}

checkFunctions(); 