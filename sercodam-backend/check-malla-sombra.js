const db = require('./src/config/database');

async function checkMallaSombra() {
  try {
    console.log('🔍 Verificando estructura de tabla malla_sombra...');
    
    // Verificar columnas de malla_sombra
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'malla_sombra' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Columnas de malla_sombra:');
    console.log(columns.rows);
    
    // Verificar si hay datos
    const data = await db('malla_sombra').limit(3);
    console.log('\n📊 Datos de ejemplo:');
    console.log(data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

checkMallaSombra(); 