const db = require('./src/config/database');

async function testTables() {
  try {
    console.log('🔍 Verificando estructura de tablas...');
    
    // Verificar tabla pano
    console.log('\n📋 Tabla pano:');
    const panoColumns = await db.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'pano' 
      ORDER BY ordinal_position
    `);
    console.log(panoColumns.rows);
    
    // Verificar tabla red_producto
    console.log('\n📋 Tabla red_producto:');
    const redProductoColumns = await db.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'red_producto' 
      ORDER BY ordinal_position
    `);
    console.log(redProductoColumns.rows);
    
    // Verificar tabla nylon
    console.log('\n📋 Tabla nylon:');
    const nylonColumns = await db.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'nylon' 
      ORDER BY ordinal_position
    `);
    console.log(nylonColumns.rows);
    
    // Verificar tabla lona
    console.log('\n📋 Tabla lona:');
    const lonaColumns = await db.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'lona' 
      ORDER BY ordinal_position
    `);
    console.log(lonaColumns.rows);
    
    // Verificar tabla polipropileno
    console.log('\n📋 Tabla polipropileno:');
    const polipropilenoColumns = await db.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'polipropileno' 
      ORDER BY ordinal_position
    `);
    console.log(polipropilenoColumns.rows);
    
    // Verificar tabla malla_sombra
    console.log('\n📋 Tabla malla_sombra:');
    const mallaSombraColumns = await db.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'malla_sombra' 
      ORDER BY ordinal_position
    `);
    console.log(mallaSombraColumns.rows);
    
    // Probar consulta básica
    console.log('\n🔍 Probando consulta básica...');
    const basicQuery = await db('pano as p')
      .select('p.*')
      .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
      .limit(5);
    
    console.log('✅ Consulta básica exitosa:', basicQuery.length, 'registros');
    
    // Probar JOIN con nylon
    console.log('\n🔍 Probando JOIN con nylon...');
    const nylonQuery = await db('pano as p')
      .select('p.*', 'rp.tipo_red', 'n.calibre')
      .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
      .leftJoin('nylon as n', 'rp.id_mcr', 'n.id_mcr')
      .limit(5);
    
    console.log('✅ JOIN con nylon exitoso:', nylonQuery.length, 'registros');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.destroy();
  }
}

testTables(); 