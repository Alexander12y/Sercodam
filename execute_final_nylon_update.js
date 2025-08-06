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

async function executeFinalNylonUpdate() {
  const db = require('knex')(dbConfig);
  
  try {
    console.log('=== EJECUTANDO ACTUALIZACIÓN FINAL DE IMÁGENES DE NYLON ===\n');
    
    // Verificar estado antes de la actualización
    console.log('1. Estado antes de la actualización:');
    const beforeUpdate = await db('red_producto')
      .whereNotNull('foto')
      .where('foto', 'like', 'calibre-%')
      .select('id_mcr', 'foto')
      .orderBy('id_mcr');
    
    console.log(`   Registros con fotos antes: ${beforeUpdate.length}`);
    
    // Leer el archivo SQL final
    const sqlContent = fs.readFileSync('update_nylon_images_final.sql', 'utf8');
    const updateStatements = sqlContent.split('\n').filter(line => line.trim());
    
    console.log(`\n2. Total de actualizaciones a ejecutar: ${updateStatements.length}\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    // Ejecutar cada statement
    for (let i = 0; i < updateStatements.length; i++) {
      const statement = updateStatements[i];
      
      try {
        await db.raw(statement);
        successCount++;
        
        // Mostrar progreso cada 10 actualizaciones
        if ((i + 1) % 10 === 0 || i === updateStatements.length - 1) {
          console.log(`   ✅ Progreso: ${i + 1}/${updateStatements.length} actualizaciones completadas`);
        }
      } catch (error) {
        errorCount++;
        console.log(`   ❌ Error en ${statement}`);
        console.log(`      Error: ${error.message}`);
      }
    }
    
    console.log('\n3. RESUMEN DE EJECUCIÓN:');
    console.log(`   ✅ Actualizaciones exitosas: ${successCount}`);
    console.log(`   ❌ Errores: ${errorCount}`);
    console.log(`   📊 Total procesado: ${updateStatements.length}`);
    
    // Verificar estado después de la actualización
    console.log('\n4. Estado después de la actualización:');
    const afterUpdate = await db('red_producto')
      .whereNotNull('foto')
      .where('foto', 'like', 'calibre-%')
      .select('id_mcr', 'foto')
      .orderBy('id_mcr');
    
    console.log(`   Registros con fotos después: ${afterUpdate.length}`);
    console.log(`   Nuevos registros con fotos: ${afterUpdate.length - beforeUpdate.length}`);
    
    // Mostrar algunos ejemplos de registros actualizados
    console.log('\n5. Ejemplos de registros actualizados:');
    const examples = afterUpdate.slice(0, 10);
    examples.forEach(record => {
      console.log(`   ${record.id_mcr}: ${record.foto}`);
    });
    
    // Generar resumen por tipo de imagen
    console.log('\n6. Resumen por tipo de imagen:');
    const imageSummary = {};
    afterUpdate.forEach(record => {
      if (!imageSummary[record.foto]) {
        imageSummary[record.foto] = 0;
      }
      imageSummary[record.foto]++;
    });
    
    Object.entries(imageSummary).forEach(([image, count]) => {
      console.log(`   ${image}: ${count} registros`);
    });
    
    console.log('\n✅ ACTUALIZACIÓN COMPLETADA EXITOSAMENTE');
    
  } catch (error) {
    console.error('Error general:', error);
  } finally {
    await db.destroy();
  }
}

// Ejecutar la actualización final
executeFinalNylonUpdate(); 