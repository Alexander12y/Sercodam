// Cargar variables de entorno
require('dotenv').config({ path: './sercodam-backend/.env' });

const knex = require('./sercodam-backend/src/config/database');

async function testDatabaseQueries() {
  try {
    console.log('🧪 Probando consultas a la base de datos normalizada...\n');
    
    // Test 1: Verificar estructura de tablas
    console.log('📋 1. Verificando estructura de tablas:');
    const tipos = await knex('catalogo_1.tipo_proyecto').select('*');
    console.log('   Tabla tipo_proyecto:', tipos.length, 'registros');
    tipos.forEach(t => console.log(`   - ${t.tipo_proyecto}: ${t.foto_tipo}`));
    
    const titulos = await knex('catalogo_1.titulo_proyecto').select('*');
    console.log('   Tabla titulo_proyecto:', titulos.length, 'registros');
    
    // Test 2: Probar consulta JOIN
    console.log('\n📋 2. Probando consulta JOIN (nueva lógica):');
    const testTitulos = [
      'Redes para Racks Selectivos',
      'Red perimetral Sistema V (Horca)',
      'Redes para Golf'
    ];
    
    for (const titulo of testTitulos) {
      const resultado = await knex('catalogo_1.titulo_proyecto as tp')
        .join('catalogo_1.tipo_proyecto as tpro', 'tp.tipo_proyecto', 'tpro.tipo_proyecto')
        .select('tp.titulo_proyecto', 'tp.foto_titulo', 'tpro.foto_tipo')
        .where('tp.titulo_proyecto', titulo)
        .first();
      
      if (resultado) {
        const fotoAUsar = resultado.foto_titulo || resultado.foto_tipo;
        console.log(`   - ${titulo}:`);
        console.log(`     foto_titulo: ${resultado.foto_titulo || 'NULL'}`);
        console.log(`     foto_tipo: ${resultado.foto_tipo}`);
        console.log(`     foto final: ${fotoAUsar}`);
      } else {
        console.log(`   - ${titulo}: NO ENCONTRADO`);
      }
    }
    
    // Test 3: Simular la función obtenerImagenProyecto
    console.log('\n📋 3. Simulando función obtenerImagenProyecto:');
    const imagenProyecto = await knex('catalogo_1.titulo_proyecto as tp')
      .join('catalogo_1.tipo_proyecto as tpro', 'tp.tipo_proyecto', 'tpro.tipo_proyecto')
      .select('tp.foto_titulo', 'tpro.foto_tipo')
      .where('tp.titulo_proyecto', 'Redes para Racks Selectivos')
      .first();
    
    if (imagenProyecto) {
      const fotoAUsar = imagenProyecto.foto_titulo || imagenProyecto.foto_tipo;
      console.log(`   Resultado: { foto: "${fotoAUsar}" }`);
    }
    
    console.log('\n✅ Pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    await knex.destroy();
  }
}

// Ejecutar las pruebas
testDatabaseQueries(); 