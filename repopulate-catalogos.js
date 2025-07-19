const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración de base de datos
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sercodam',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function repopulateCatalogos() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Iniciando repoblación de catálogos...');
    
    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'repopulate-catalogos.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el SQL
    console.log('📝 Ejecutando script SQL...');
    await client.query(sqlContent);
    
    // Verificar los resultados
    console.log('✅ Verificando resultados...');
    const result = await client.query(`
      SELECT 'Nylon' as tabla, COUNT(*) as total FROM nylon
      UNION ALL
      SELECT 'Polipropileno' as tabla, COUNT(*) as total FROM polipropileno
      UNION ALL
      SELECT 'Malla Sombra' as tabla, COUNT(*) as total FROM malla_sombra
      UNION ALL
      SELECT 'Lona' as tabla, COUNT(*) as total FROM lona
    `);
    
    console.log('\n📊 Resultados de la repoblación:');
    console.log('================================');
    result.rows.forEach(row => {
      console.log(`${row.tabla}: ${row.total} registros`);
    });
    
    console.log('\n✅ Repoblación completada exitosamente!');
    console.log('🎯 Los dropdowns de especificaciones ahora deberían mostrar las opciones disponibles.');
    
  } catch (error) {
    console.error('❌ Error durante la repoblación:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  repopulateCatalogos()
    .then(() => {
      console.log('\n🎉 Proceso completado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { repopulateCatalogos }; 