// ================================
// PRUEBA DE LA CONSULTA EXACTA DEL BACKEND
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

async function testQueryExacta() {
  console.log('🔍 Probando la consulta EXACTA del backend...');
  
  try {
    // 1. Probar conexión
    console.log('\n🔍 Probando conexión...');
    const version = await db.raw('SELECT version()');
    console.log('✅ Conexión exitosa');
    
    // 2. Ejecutar la consulta EXACTA del backend
    console.log('\n🔍 Ejecutando consulta del backend...');
    const panos = await db('pano as p')
      .select(
        'p.*',
        'rp.tipo_red',
        'rp.unidad',
        'rp.marca',
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
    
    // 3. Mostrar los datos RAW de la consulta
    panos.forEach((pano, index) => {
      console.log(`\n📋 Paño ${index + 1} - DATOS RAW:`);
      console.log(`  ID: ${pano.id_item}`);
      console.log(`  ID_MCR: ${pano.id_mcr}`);
      console.log(`  Tipo: ${pano.tipo_red}`);
      console.log(`  Descripción: ${pano.descripcion}`);
      
      // Mostrar TODOS los campos específicos
      console.log(`  --- CAMPOS ESPECÍFICOS ---`);
      console.log(`  Calibre: ${pano.calibre || 'NULL'}`);
      console.log(`  Cuadro: ${pano.cuadro || 'NULL'}`);
      console.log(`  Torsión: ${pano.torsion || 'NULL'}`);
      console.log(`  Refuerzo: ${pano.refuerzo !== undefined && pano.refuerzo !== null ? pano.refuerzo : 'NULL'}`);
      console.log(`  Color: ${pano.color || 'NULL'}`);
      console.log(`  Presentación: ${pano.presentacion || 'NULL'}`);
      console.log(`  Grosor: ${pano.grosor || 'NULL'}`);
      console.log(`  PP_Cuadro: ${pano.pp_cuadro || 'NULL'}`);
      console.log(`  Color_Tipo_Red: ${pano.color_tipo_red || 'NULL'}`);
      console.log(`  MS_Presentacion: ${pano.ms_presentacion || 'NULL'}`);
    });
    
    // 4. Probar el mapeo exacto del backend
    console.log('\n🔍 Probando mapeo del backend...');
    const panosWithDetails = panos.map((pano) => {
      const result = {
        id_item: pano.id_item,
        id_mcr: pano.id_mcr,
        largo_m: pano.largo_m,
        ancho_m: pano.ancho_m,
        area_m2: pano.area_m2,
        estado: pano.estado,
        ubicacion: pano.ubicacion,
        precio_x_unidad: pano.precio_x_unidad,
        created_at: pano.created_at,
        updated_at: pano.updated_at,
        tipo_red: pano.tipo_red,
        unidad: pano.unidad,
        marca: pano.marca,
        descripcion: pano.descripcion,
        stock_minimo: pano.stock_minimo,
        estado_trabajo: pano.estado_trabajo,
        // Campos específicos de nylon
        calibre: pano.calibre,
        cuadro: pano.cuadro || pano.pp_cuadro,
        torsion: pano.torsion,
        refuerzo: pano.refuerzo,
        // Campos específicos de lona
        color: pano.color,
        presentacion: pano.presentacion || pano.ms_presentacion,
        // Campos específicos de polipropileno
        grosor: pano.grosor,
        // Campos específicos de malla sombra
        color_tipo_red: pano.color_tipo_red
      };

      console.log(`\n📋 Paño ${pano.id_item} - DESPUÉS DEL MAPEO:`);
      console.log(`  Tipo: ${result.tipo_red}`);
      console.log(`  Calibre: ${result.calibre || 'NULL'}`);
      console.log(`  Cuadro: ${result.cuadro || 'NULL'}`);
      console.log(`  Torsión: ${result.torsion || 'NULL'}`);
      console.log(`  Refuerzo: ${result.refuerzo !== undefined && result.refuerzo !== null ? result.refuerzo : 'NULL'}`);
      console.log(`  Color: ${result.color || 'NULL'}`);
      console.log(`  Presentación: ${result.presentacion || 'NULL'}`);
      console.log(`  Grosor: ${result.grosor || 'NULL'}`);
      console.log(`  Color_Tipo_Red: ${result.color_tipo_red || 'NULL'}`);

      return result;
    });
    
    // 5. Probar la función generateSpecifications
    console.log('\n🔍 Probando función generateSpecifications...');
    
    const generateSpecifications = (pano) => {
      const specs = [];
      
      console.log(`Generando especificaciones para tipo: ${pano.tipo_red}`);
      
      switch (pano.tipo_red?.toLowerCase()) {
        case 'nylon':
          if (pano.calibre) specs.push(`Calibre: ${pano.calibre}`);
          if (pano.cuadro) specs.push(`Cuadro: ${pano.cuadro}`);
          if (pano.torsion) specs.push(`Torsión: ${pano.torsion}`);
          if (pano.refuerzo !== undefined && pano.refuerzo !== null) {
            specs.push(`Refuerzo: ${pano.refuerzo === true || pano.refuerzo === 't' ? 'Sí' : 'No'}`);
          }
          break;
        case 'lona':
          if (pano.color) specs.push(`Color: ${pano.color}`);
          if (pano.presentacion) specs.push(`Presentación: ${pano.presentacion}`);
          break;
        case 'polipropileno':
          if (pano.grosor) specs.push(`Grosor: ${pano.grosor}`);
          if (pano.cuadro) specs.push(`Cuadro: ${pano.cuadro}`);
          break;
        case 'malla sombra':
          if (pano.color_tipo_red) specs.push(`Color/Tipo: ${pano.color_tipo_red}`);
          if (pano.presentacion) specs.push(`Presentación: ${pano.presentacion}`);
          break;
      }
      
      const result = specs.join('\n');
      console.log(`Especificaciones generadas: "${result || '(vacío)'}"`);
      return result;
    };
    
    panosWithDetails.forEach((pano, index) => {
      console.log(`\n📋 Paño ${index + 1} - ESPECIFICACIONES:`);
      const especificaciones = generateSpecifications(pano);
      console.log(`Resultado: "${especificaciones}"`);
    });
    
    return panos;
    
  } catch (error) {
    console.error('❌ Error en consulta:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando prueba de consulta exacta...');
  
  try {
    await testQueryExacta();
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
  testQueryExacta
}; 