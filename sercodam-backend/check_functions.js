const db = require('./src/config/database');

async function checkFunctions() {
  try {
    console.log('🔍 Verificando funciones de paños...');
    
    // Verificar si la función fn_generar_nota_pano existe
    const functionExists = await db.raw(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name = 'fn_generar_nota_pano'
      AND routine_schema = 'catalogo_1'
    `);
    
    console.log('✅ Función fn_generar_nota_pano existe:', functionExists.rows.length > 0);
    
    if (functionExists.rows.length > 0) {
      // Probar la función con un paño existente
      const panos = await db('pano').select('id_item', 'id_mcr').limit(1);
      
      if (panos.length > 0) {
        const testPano = panos[0];
        console.log(`🔍 Probando función con paño ID: ${testPano.id_item}, MCR: ${testPano.id_mcr}`);
        
        const testResult = await db.raw('SELECT fn_generar_nota_pano(?, ?, ?) as nota', [
          testPano.id_item, 
          2.5, 
          'largo'
        ]);
        
        console.log('✅ Resultado de la función:', testResult.rows[0]?.nota || 'Sin resultado');
      } else {
        console.log('⚠️  No hay paños en la tabla para probar');
      }
    }
    
    // Verificar otras funciones
    const functions = [
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
      
      console.log(`✅ Función ${funcName} existe:`, exists.rows.length > 0);
    }
    
  } catch (error) {
    console.error('❌ Error verificando funciones:', error);
  } finally {
    await db.destroy();
  }
}

checkFunctions(); 