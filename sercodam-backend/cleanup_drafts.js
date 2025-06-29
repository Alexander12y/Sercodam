const db = require('./src/config/database');

async function cleanupDrafts() {
  try {
    console.log('🧹 Limpiando drafts corruptos...');
    
    // Eliminar todos los drafts existentes
    const result = await db('ordenes_draft')
      .where('activo', true)
      .update({ activo: false });
    
    console.log(`✅ Se eliminaron ${result} drafts`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error limpiando drafts:', error);
    process.exit(1);
  }
}

cleanupDrafts(); 