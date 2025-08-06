// Cargar variables de entorno
require('dotenv').config({ path: './sercodam-backend/.env' });

const db = require('./sercodam-backend/src/config/database');

async function testRedesProductoDebug() {
  try {
    console.log('🧪 Debuggeando datos de redes-producto...');
    
    // Test 1: Verificar que la tabla existe y tiene datos
    console.log('\n📋 Test 1: Verificar tabla red_producto');
    const countResult = await db('catalogo_1.red_producto').count('* as total').first();
    console.log('✅ Total de registros:', countResult.total);
    
    // Test 2: Obtener algunos registros para ver la estructura
    console.log('\n📋 Test 2: Estructura de datos');
    const redes = await db('catalogo_1.red_producto')
      .select('*')
      .limit(3);
    
    console.log('✅ Primeras 3 redes:');
    redes.forEach((red, index) => {
      console.log(`\n📦 Red ${index + 1}:`, {
        id_mcr: red.id_mcr,
        tipo_red: red.tipo_red,
        marca: red.marca,
        calibre: red.calibre,
        cuadro: red.cuadro,
        torsion: red.torsion,
        refuerzo: red.refuerzo,
        color: red.color,
        presentacion: red.presentacion,
        grosor: red.grosor,
        color_tipo_red: red.color_tipo_red
      });
    });
    
    // Test 3: Verificar tipos de red disponibles
    console.log('\n📋 Test 3: Tipos de red disponibles');
    const tiposRed = await db('catalogo_1.red_producto')
      .distinct('tipo_red')
      .whereNotNull('tipo_red')
      .orderBy('tipo_red');
    
    console.log('✅ Tipos de red:', tiposRed.map(t => t.tipo_red));
    
    // Test 4: Verificar marcas disponibles
    console.log('\n📋 Test 4: Marcas disponibles');
    const marcas = await db('catalogo_1.red_producto')
      .distinct('marca')
      .whereNotNull('marca')
      .orderBy('marca');
    
    console.log('✅ Marcas:', marcas.map(m => m.marca));
    
    // Test 5: Probar filtro por tipo_red
    console.log('\n📋 Test 5: Filtro por tipo_red=nylon');
    const redesNylon = await db('catalogo_1.red_producto')
      .select('*')
      .where('tipo_red', 'ilike', '%nylon%')
      .limit(2);
    
    console.log('✅ Redes de nylon encontradas:', redesNylon.length);
    if (redesNylon.length > 0) {
      console.log('📦 Primera red de nylon:', {
        id_mcr: redesNylon[0].id_mcr,
        tipo_red: redesNylon[0].tipo_red,
        marca: redesNylon[0].marca,
        calibre: redesNylon[0].calibre
      });
    }
    
    console.log('\n🎉 Debug completado!');
    
  } catch (error) {
    console.error('❌ Error en el debug:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar el debug
testRedesProductoDebug(); 