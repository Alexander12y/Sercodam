const db = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function createFunctions() {
  try {
    console.log('🔧 Creando funciones de paños...');
    
    // Leer el script SQL
    const sqlPath = path.join(__dirname, 'create_functions_directly.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el script
    await db.raw(sqlScript);
    
    console.log('✅ Funciones de paños creadas exitosamente');
    
    // Verificar que las funciones se crearon
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
      
      console.log(`✅ Función ${funcName}: ${exists.rows.length > 0 ? 'CREADA' : 'ERROR'}`);
    }
    
  } catch (error) {
    console.error('❌ Error creando funciones:', error);
  } finally {
    await db.destroy();
  }
}

createFunctions(); 