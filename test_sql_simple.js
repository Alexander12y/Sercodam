// ================================
// PRUEBA SQL SIMPLE - ESPECIFICACIONES
// ================================

require('dotenv').config();
const knex = require('knex');

// Configuración de desarrollo
const config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'sercodam_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  searchPath: [process.env.DB_SCHEMA || 'catalogo_1']
};

// Crear conexión
const db = knex(config);

async function testConsultaSQL() {
  console.log('🔍 Probando consulta SQL directa...');
  console.log('Configuración:', {
    host: config.connection.host,
    port: config.connection.port,
    database: config.connection.database,
    user: config.connection.user,
    searchPath: config.searchPath
  });
  
  try {
    // 1. Probar conexión
    console.log('\n🔍 Probando conexión...');
    const version = await db.raw('SELECT version()');
    console.log('✅ Conexión exitosa:', version.rows[0].version);
    
    // 2. Contar paños
    console.log('\n🔍 Contando paños...');
    const panoCount = await db('pano').count('* as count').first();
    console.log(`Total de paños: ${panoCount.count}`);
    
    // 3. Obtener algunos paños con JOINs
    console.log('\n🔍 Obteniendo paños con JOINs...');
    const panos = await db('pano as p')
      .select(
        'p.id_item',
        'p.id_mcr',
        'rp.tipo_red',
        'rp.descripcion',
        // Campos específicos de nylon
        'n.calibre',
        'n.cuadro',
        'n.torsion',
        'n.refuerzo',
        // Campos específicos de lona
        'l.color',
        'l.presentacion',
        // Campos específicos de polipropileno
        'pp.grosor',
        'pp.cuadro as pp_cuadro',
        // Campos específicos de malla sombra
        'ms.color_tipo_red',
        'ms.presentacion as ms_presentacion'
      )
      .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
      .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
      .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
      .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
      .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
      .limit(5);
    
    console.log(`✅ Consulta exitosa. Paños encontrados: ${panos.length}`);
    
    // Mostrar detalles de cada paño
    panos.forEach((pano, index) => {
      console.log(`\n📋 Paño ${index + 1}:`);
      console.log(`  ID: ${pano.id_item}`);
      console.log(`  ID_MCR: ${pano.id_mcr}`);
      console.log(`  Tipo: ${pano.tipo_red}`);
      console.log(`  Descripción: ${pano.descripcion}`);
      
      // Mostrar campos específicos según el tipo
      if (pano.tipo_red === 'nylon') {
        console.log(`  Calibre: ${pano.calibre || 'NULL'}`);
        console.log(`  Cuadro: ${pano.cuadro || 'NULL'}`);
        console.log(`  Torsión: ${pano.torsion || 'NULL'}`);
        console.log(`  Refuerzo: ${pano.refuerzo !== undefined && pano.refuerzo !== null ? pano.refuerzo : 'NULL'}`);
      } else if (pano.tipo_red === 'lona') {
        console.log(`  Color: ${pano.color || 'NULL'}`);
        console.log(`  Presentación: ${pano.presentacion || 'NULL'}`);
      } else if (pano.tipo_red === 'polipropileno') {
        console.log(`  Grosor: ${pano.grosor || 'NULL'}`);
        console.log(`  Cuadro: ${pano.pp_cuadro || 'NULL'}`);
      } else if (pano.tipo_red === 'malla sombra') {
        console.log(`  Color/Tipo: ${pano.color_tipo_red || 'NULL'}`);
        console.log(`  Presentación: ${pano.ms_presentacion || 'NULL'}`);
      }
    });
    
    // 4. Verificar datos en las tablas hijas
    console.log('\n🔍 Verificando datos en tablas hijas...');
    
    // Nylon
    const nylonCount = await db('nylon').count('* as count').first();
    console.log(`Nylon: ${nylonCount.count} registros`);
    
    // Lona
    const lonaCount = await db('lona').count('* as count').first();
    console.log(`Lona: ${lonaCount.count} registros`);
    
    // Polipropileno
    const polipropilenoCount = await db('polipropileno').count('* as count').first();
    console.log(`Polipropileno: ${polipropilenoCount.count} registros`);
    
    // Malla sombra
    const mallaSombraCount = await db('malla_sombra').count('* as count').first();
    console.log(`Malla sombra: ${mallaSombraCount.count} registros`);
    
    // 5. Verificar si hay paños sin datos en tablas hijas
    console.log('\n🔍 Verificando paños sin datos en tablas hijas...');
    
    const pañosSinDatos = await db('pano as p')
      .select('p.id_item', 'p.id_mcr', 'rp.tipo_red')
      .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
      .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
      .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
      .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
      .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
      .whereNull('n.id_mcr')
      .whereNull('l.id_mcr')
      .whereNull('pp.id_mcr')
      .whereNull('ms.id_mcr')
      .limit(5);
    
    console.log(`Paños sin datos en tablas hijas: ${pañosSinDatos.length}`);
    pañosSinDatos.forEach(pano => {
      console.log(`  ID: ${pano.id_item}, ID_MCR: ${pano.id_mcr}, Tipo: ${pano.tipo_red}`);
    });
    
    return panos;
    
  } catch (error) {
    console.error('❌ Error en consulta SQL:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando prueba SQL simple...');
  
  try {
    await testConsultaSQL();
    console.log('\n🎉 Prueba completada exitosamente!');
    
  } catch (error) {
    console.error('\n💥 Error en la prueba:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  testConsultaSQL
}; 