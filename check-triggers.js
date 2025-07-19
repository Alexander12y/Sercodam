const { Pool } = require('pg');
const path = require('path');

// Cargar configuración del backend
const configPath = path.join(__dirname, 'sercodam-backend', 'config', 'development.js');
const config = require(configPath);

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
});

async function checkTriggers() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando triggers en la base de datos...\n');
    
    // Verificar triggers en la tabla pano
    console.log('📋 Triggers en tabla pano:');
    const panoTriggers = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'pano'
      ORDER BY trigger_name;
    `);
    
    if (panoTriggers.rows.length === 0) {
      console.log('   No hay triggers en la tabla pano');
    } else {
      panoTriggers.rows.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} (${trigger.event_manipulation})`);
        console.log(`     ${trigger.action_statement}`);
      });
    }
    
    console.log('\n📋 Triggers en tabla inventario_item:');
    const inventarioTriggers = await client.query(`
      SELECT 
        trigger_name,
        event_manipulation,
        action_statement
      FROM information_schema.triggers 
      WHERE event_object_table = 'inventario_item'
      ORDER BY trigger_name;
    `);
    
    if (inventarioTriggers.rows.length === 0) {
      console.log('   No hay triggers en la tabla inventario_item');
    } else {
      inventarioTriggers.rows.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} (${trigger.event_manipulation})`);
        console.log(`     ${trigger.action_statement}`);
      });
    }
    
    // Verificar secuencias
    console.log('\n📋 Secuencias relacionadas:');
    const sequences = await client.query(`
      SELECT 
        sequence_name,
        last_value,
        is_called
      FROM information_schema.sequences 
      WHERE sequence_name LIKE '%inventario%' OR sequence_name LIKE '%pano%'
      ORDER BY sequence_name;
    `);
    
    if (sequences.rows.length === 0) {
      console.log('   No se encontraron secuencias relacionadas');
    } else {
      sequences.rows.forEach(seq => {
        console.log(`   - ${seq.sequence_name}: last_value=${seq.last_value}, is_called=${seq.is_called}`);
      });
    }
    
    // Verificar estado actual de las tablas
    console.log('\n📋 Estado actual de las tablas:');
    const tableCounts = await client.query(`
      SELECT 
        'inventario_item' as tabla, COUNT(*) as total FROM inventario_item
      UNION ALL
      SELECT 'pano' as tabla, COUNT(*) as total FROM pano
      ORDER BY tabla;
    `);
    
    tableCounts.rows.forEach(row => {
      console.log(`   - ${row.tabla}: ${row.total} registros`);
    });
    
    // Verificar el último ID en inventario_item
    console.log('\n📋 Último ID en inventario_item:');
    const lastId = await client.query(`
      SELECT MAX(id_item) as max_id FROM inventario_item;
    `);
    
    console.log(`   - Máximo id_item: ${lastId.rows[0].max_id || 'NULL'}`);
    
  } catch (error) {
    console.error('❌ Error verificando triggers:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkTriggers()
    .then(() => {
      console.log('\n✅ Verificación completada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { checkTriggers }; 