// ================================
// VERIFICAR DATOS EN TABLAS
// ================================

const { Client } = require('pg');

// Configuración de conexión
const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'sercodam_db',
  user: 'postgres',
  password: '',
  schema: 'catalogo_1'
});

async function verificarDatos() {
  try {
    await client.connect();
    console.log('✅ Conectado a PostgreSQL');
    
    // 1. Verificar datos en red_producto
    console.log('\n🔍 Verificando red_producto...');
    const redProductoResult = await client.query('SELECT COUNT(*) as count FROM red_producto');
    console.log(`Total en red_producto: ${redProductoResult.rows[0].count}`);
    
    // 2. Verificar datos en tablas hijas
    console.log('\n🔍 Verificando tablas hijas...');
    
    const nylonResult = await client.query('SELECT COUNT(*) as count FROM nylon');
    console.log(`Total en nylon: ${nylonResult.rows[0].count}`);
    
    const lonaResult = await client.query('SELECT COUNT(*) as count FROM lona');
    console.log(`Total en lona: ${lonaResult.rows[0].count}`);
    
    const polipropilenoResult = await client.query('SELECT COUNT(*) as count FROM polipropileno');
    console.log(`Total en polipropileno: ${polipropilenoResult.rows[0].count}`);
    
    const mallaSombraResult = await client.query('SELECT COUNT(*) as count FROM malla_sombra');
    console.log(`Total en malla_sombra: ${mallaSombraResult.rows[0].count}`);
    
    // 3. Verificar datos en pano
    console.log('\n🔍 Verificando pano...');
    const panoResult = await client.query('SELECT COUNT(*) as count FROM pano');
    console.log(`Total en pano: ${panoResult.rows[0].count}`);
    
    // 4. Verificar algunos paños con sus tipos
    console.log('\n🔍 Verificando algunos paños...');
    const panosResult = await client.query(`
      SELECT p.id_item, p.id_mcr, rp.tipo_red, rp.descripcion
      FROM pano p
      LEFT JOIN red_producto rp ON p.id_mcr = rp.id_mcr
      LIMIT 5
    `);
    
    console.log('Paños encontrados:');
    panosResult.rows.forEach((pano, index) => {
      console.log(`  ${index + 1}. ID: ${pano.id_item}, ID_MCR: ${pano.id_mcr}, Tipo: ${pano.tipo_red}, Desc: ${pano.descripcion}`);
    });
    
    // 5. Verificar si hay datos en tablas hijas para los paños
    if (panosResult.rows.length > 0) {
      console.log('\n🔍 Verificando datos específicos...');
      
      for (const pano of panosResult.rows) {
        console.log(`\nPaño ID ${pano.id_item} (${pano.tipo_red}):`);
        
        if (pano.tipo_red === 'nylon') {
          const nylonData = await client.query('SELECT * FROM nylon WHERE id_mcr = $1', [pano.id_mcr]);
          if (nylonData.rows.length > 0) {
            console.log(`  ✅ Datos en nylon:`, nylonData.rows[0]);
          } else {
            console.log(`  ❌ NO hay datos en nylon para id_mcr: ${pano.id_mcr}`);
          }
        } else if (pano.tipo_red === 'lona') {
          const lonaData = await client.query('SELECT * FROM lona WHERE id_mcr = $1', [pano.id_mcr]);
          if (lonaData.rows.length > 0) {
            console.log(`  ✅ Datos en lona:`, lonaData.rows[0]);
          } else {
            console.log(`  ❌ NO hay datos en lona para id_mcr: ${pano.id_mcr}`);
          }
        } else if (pano.tipo_red === 'polipropileno') {
          const polipropilenoData = await client.query('SELECT * FROM polipropileno WHERE id_mcr = $1', [pano.id_mcr]);
          if (polipropilenoData.rows.length > 0) {
            console.log(`  ✅ Datos en polipropileno:`, polipropilenoData.rows[0]);
          } else {
            console.log(`  ❌ NO hay datos en polipropileno para id_mcr: ${pano.id_mcr}`);
          }
        } else if (pano.tipo_red === 'malla sombra') {
          const mallaSombraData = await client.query('SELECT * FROM malla_sombra WHERE id_mcr = $1', [pano.id_mcr]);
          if (mallaSombraData.rows.length > 0) {
            console.log(`  ✅ Datos en malla_sombra:`, mallaSombraData.rows[0]);
          } else {
            console.log(`  ❌ NO hay datos en malla_sombra para id_mcr: ${pano.id_mcr}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

verificarDatos(); 