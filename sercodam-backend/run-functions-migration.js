const db = require('./src/config/database');

async function runFunctionsMigration() {
  try {
    console.log('🔧 Ejecutando migración de funciones de paños...');
    
    // Ejecutar la migración de funciones
    const migration = require('./src/migrations/014_create_pano_inventory_functions');
    await migration.up(db);
    
    console.log('✅ Migración de funciones completada');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
  } finally {
    await db.destroy();
  }
}

runFunctionsMigration(); 