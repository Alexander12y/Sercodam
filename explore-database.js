const { Pool } = require('pg');

// Configuración directa de la base de datos
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sercodam_db',
  user: 'postgres',
  password: 'P@chiicolipAt024!', // Cambia esto por tu contraseña real
  searchPath: ['catalogo_1']
});

async function exploreDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 EXPLORANDO BASE DE DATOS...\n');
    console.log('=====================================\n');
    
    // 1. TABLAS PRINCIPALES
    console.log('📋 TABLAS PRINCIPALES:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    tables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    // 2. SECUENCIAS
    console.log('\n📋 SECUENCIAS:');
    const sequences = await client.query(`
      SELECT 
        sequence_name,
        start_value,
        minimum_value,
        maximum_value,
        increment,
        cycle_option
      FROM information_schema.sequences
      ORDER BY sequence_name;
    `);
    
    if (sequences.rows.length === 0) {
      console.log('   No se encontraron secuencias');
    } else {
      sequences.rows.forEach(seq => {
        console.log(`   - ${seq.sequence_name}`);
        console.log(`     start: ${seq.start_value}, min: ${seq.minimum_value}, max: ${seq.maximum_value}, increment: ${seq.increment}`);
      });
    }
    
    // 3. TRIGGERS
    console.log('\n📋 TRIGGERS:');
    const triggers = await client.query(`
      SELECT 
        event_object_table,
        trigger_name,
        event_manipulation,
        action_timing,
        action_statement
      FROM information_schema.triggers
      ORDER BY event_object_table, trigger_name;
    `);
    
    if (triggers.rows.length === 0) {
      console.log('   No se encontraron triggers');
    } else {
      triggers.rows.forEach(trigger => {
        console.log(`   - ${trigger.event_object_table}.${trigger.trigger_name} (${trigger.event_manipulation} ${trigger.action_timing})`);
        console.log(`     ${trigger.action_statement.substring(0, 100)}...`);
      });
    }
    
    // 4. COLUMNAS AUTOINCREMENTALES
    console.log('\n📋 COLUMNAS AUTOINCREMENTALES:');
    const autoIncrementColumns = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE column_default LIKE 'nextval%'
      ORDER BY table_name, column_name;
    `);
    
    if (autoIncrementColumns.rows.length === 0) {
      console.log('   No se encontraron columnas autoincrementales');
    } else {
      autoIncrementColumns.rows.forEach(col => {
        console.log(`   - ${col.table_name}.${col.column_name} (${col.data_type})`);
        console.log(`     default: ${col.column_default}`);
      });
    }
    
    // 5. ESTADO ACTUAL DE TABLAS CLAVE
    console.log('\n📋 ESTADO ACTUAL DE TABLAS CLAVE:');
    const keyTables = ['inventario_item', 'pano', 'materiales_extras', 'herramientas', 'usuarios', 'orden_produccion'];
    
    for (const tableName of keyTables) {
      try {
        const count = await client.query(`SELECT COUNT(*) as total FROM ${tableName}`);
        const maxId = await client.query(`SELECT MAX(id_item) as max_id FROM ${tableName}`);
        console.log(`   - ${tableName}: ${count.rows[0].total} registros, max_id: ${maxId.rows[0].max_id || 'NULL'}`);
      } catch (error) {
        console.log(`   - ${tableName}: Error - ${error.message}`);
      }
    }
    
    // 6. SECUENCIAS CON VALORES ACTUALES
    console.log('\n📋 SECUENCIAS CON VALORES ACTUALES:');
    const currentSequences = await client.query(`
      SELECT 
        schemaname,
        sequencename,
        last_value,
        is_called
      FROM pg_sequences
      ORDER BY sequencename;
    `);
    
    if (currentSequences.rows.length === 0) {
      console.log('   No se encontraron secuencias');
    } else {
      currentSequences.rows.forEach(seq => {
        console.log(`   - ${seq.sequencename}: last_value=${seq.last_value}, is_called=${seq.is_called}`);
      });
    }
    
    // 7. FUNCIONES
    console.log('\n📋 FUNCIONES:');
    const functions = await client.query(`
      SELECT 
        routine_name,
        routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      ORDER BY routine_name;
    `);
    
    if (functions.rows.length === 0) {
      console.log('   No se encontraron funciones');
    } else {
      functions.rows.forEach(func => {
        console.log(`   - ${func.routine_name} (${func.routine_type})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error explorando base de datos:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  console.log('⚠️  IMPORTANTE: Cambia la contraseña en el script antes de ejecutarlo');
  console.log('   Línea 8: password: "tu_password_aqui"');
  console.log('');
  
  exploreDatabase()
    .then(() => {
      console.log('\n✅ Exploración completada!');
      console.log('\n💡 Ahora puedes crear el script de fix basado en esta información.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { exploreDatabase }; 