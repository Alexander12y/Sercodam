// Cargar variables de entorno
require('dotenv').config({ path: './sercodam-backend/.env' });

const db = require('./sercodam-backend/src/config/database');

async function testRedesProductoStructure() {
  try {
    console.log('🧪 Verificando estructura de tabla red_producto...');
    
    // Test 1: Obtener todas las columnas de la tabla
    console.log('\n📋 Test 1: Estructura de columnas');
    const columnsResult = await db.raw(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'catalogo_1' 
      AND table_name = 'red_producto'
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ Columnas de la tabla:');
    columnsResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Test 2: Obtener un registro completo para ver los nombres reales
    console.log('\n📋 Test 2: Registro completo');
    const red = await db('catalogo_1.red_producto')
      .select('*')
      .first();
    
    console.log('✅ Registro completo:');
    Object.keys(red).forEach(key => {
      console.log(`   - ${key}: ${red[key]}`);
    });
    
    // Test 3: Buscar columnas que contengan especificaciones
    console.log('\n📋 Test 3: Buscar columnas de especificaciones');
    const specColumns = columnsResult.rows.filter(col => 
      col.column_name.toLowerCase().includes('calibre') ||
      col.column_name.toLowerCase().includes('cuadro') ||
      col.column_name.toLowerCase().includes('torsion') ||
      col.column_name.toLowerCase().includes('refuerzo') ||
      col.column_name.toLowerCase().includes('color') ||
      col.column_name.toLowerCase().includes('presentacion') ||
      col.column_name.toLowerCase().includes('grosor')
    );
    
    console.log('✅ Columnas de especificaciones encontradas:');
    specColumns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });
    
    console.log('\n🎉 Estructura verificada!');
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar la verificación
testRedesProductoStructure(); 