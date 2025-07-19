const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de la base de datos
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sercodam_db',
  user: 'postgres',
  password: 'P@chiicolipAt024!',
  searchPath: ['catalogo_1']
});

async function fixSequences() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 INICIANDO RE-SYNC DE SECUENCIAS...\n');
    console.log('=====================================\n');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'fix-sequences-complete.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Dividir el SQL en secciones para ejecutar por partes
    const sections = sqlContent.split('-- ===============================');
    
    console.log('📋 Ejecutando re-sync de secuencias principales...\n');
    
    // Ejecutar la primera sección (re-sync de secuencias)
    const reSyncSection = sections[1] + sections[2];
    await client.query(reSyncSection);
    console.log('✅ Secuencias principales resincronizadas\n');
    
    // Verificar secuencias
    console.log('📋 Verificando estado de secuencias...\n');
    const verifySection = sections[3];
    const verifyResult = await client.query(verifySection);
    
    console.log('📊 Estado de secuencias principales:');
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.secuencia}: last_value=${row.last_value}, is_called=${row.is_called}`);
    });
    console.log('');
    
    // Verificar triggers
    console.log('📋 Verificando triggers activos...\n');
    const triggersSection = sections[4];
    const triggersResult = await client.query(triggersSection);
    
    console.log('📊 Triggers en tablas clave:');
    triggersResult.rows.forEach(row => {
      console.log(`   - ${row.tabla}.${row.trigger_name} (${row.evento} ${row.momento})`);
    });
    console.log('');
    
    // Estado final de tablas
    console.log('📋 Estado final de tablas...\n');
    const tablesSection = sections[5];
    const tablesResult = await client.query(tablesSection);
    
    console.log('📊 Conteo de registros:');
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.tabla}: ${row.total} registros`);
    });
    console.log('');
    
    // Últimos IDs
    const lastIdsSection = sections[6];
    const lastIdsResult = await client.query(lastIdsSection);
    
    console.log('📊 Últimos IDs:');
    lastIdsResult.rows.forEach(row => {
      console.log(`   - ${row.tabla}: max_id=${row.max_id || 'NULL'}`);
    });
    console.log('');
    
    console.log('✅ RE-SYNC COMPLETADO EXITOSAMENTE!');
    console.log('🎯 Ahora puedes insertar paños sin errores de clave duplicada.');
    
  } catch (error) {
    console.error('❌ Error durante el re-sync:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixSequences()
    .then(() => {
      console.log('\n🎉 Proceso completado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { fixSequences }; 