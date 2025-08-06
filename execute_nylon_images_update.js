require('dotenv').config({ path: './sercodam-backend/.env' });
const fs = require('fs');

// Configuración de la base de datos
const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'sercodam_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  searchPath: [process.env.DB_SCHEMA || 'catalogo_1'],
  pool: {
    min: 2,
    max: 10
  }
};

async function executeNylonImagesUpdate() {
  const db = require('knex')(dbConfig);
  
  try {
    console.log('=== EJECUTANDO ACTUALIZACIÓN DE IMÁGENES DE NYLON ===\n');
    
    // Leer el archivo SQL
    const sqlContent = fs.readFileSync('update_nylon_images.sql', 'utf8');
    const updateStatements = sqlContent.split('\n').filter(line => line.trim());
    
    console.log(`Total de actualizaciones a ejecutar: ${updateStatements.length}\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Ejecutar cada statement
    for (let i = 0; i < updateStatements.length; i++) {
      const statement = updateStatements[i];
      
      try {
        await db.raw(statement);
        successCount++;
        console.log(`✅ ${i + 1}/${updateStatements.length}: ${statement}`);
      } catch (error) {
        errorCount++;
        console.log(`❌ ${i + 1}/${updateStatements.length}: Error en ${statement}`);
        console.log(`   Error: ${error.message}`);
      }
    }
    
    console.log('\n=== RESUMEN DE EJECUCIÓN ===');
    console.log(`✅ Actualizaciones exitosas: ${successCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📊 Total procesado: ${updateStatements.length}`);
    
    // Verificar que las actualizaciones se aplicaron correctamente
    console.log('\n=== VERIFICACIÓN DE ACTUALIZACIONES ===');
    const updatedRecords = await db('red_producto')
      .whereNotNull('foto')
      .where('foto', 'like', 'calibre-%')
      .select('id_mcr', 'foto')
      .orderBy('id_mcr');
    
    console.log(`Registros con fotos asignadas: ${updatedRecords.length}`);
    console.log('\nPrimeros 10 registros actualizados:');
    updatedRecords.slice(0, 10).forEach(record => {
      console.log(`  ${record.id_mcr}: ${record.foto}`);
    });
    
  } catch (error) {
    console.error('Error general:', error);
  } finally {
    await db.destroy();
  }
}

// Ejecutar la actualización
executeNylonImagesUpdate(); 