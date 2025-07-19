const { Pool } = require('pg');

// Configuración de la base de datos
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sercodam_db',
  user: 'postgres',
  password: 'P@chiicolipAt024!',
  searchPath: ['catalogo_1']
});

async function checkSequences() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 VERIFICANDO SECUENCIAS EXISTENTES...\n');
    
    // Verificar secuencias que realmente existen
    const sequences = await client.query(`
      SELECT sequence_name
      FROM information_schema.sequences
      ORDER BY sequence_name;
    `);
    
    console.log('📋 Secuencias disponibles:');
    sequences.rows.forEach(seq => {
      console.log(`   - ${seq.sequence_name}`);
    });
    
    // Verificar secuencias específicas que necesitamos
    const neededSequences = [
      'inventario_item_id_item_seq',
      'pano_id_pano_seq',
      'materiales_extras_id_item_seq',
      'herramientas_id_item_seq',
      'usuario_id_seq'
    ];
    
    console.log('\n📋 Verificando secuencias necesarias:');
    for (const seqName of neededSequences) {
      const exists = sequences.rows.some(s => s.sequence_name === seqName);
      console.log(`   - ${seqName}: ${exists ? '✅ Existe' : '❌ No existe'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  checkSequences()
    .then(() => {
      console.log('\n✅ Verificación completada!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { checkSequences }; 