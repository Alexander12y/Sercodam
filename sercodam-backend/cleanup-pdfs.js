// Cargar variables de entorno
require('dotenv').config();

const pdfService = require('./src/services/pdfService');
const logger = require('./src/config/logger');

async function cleanupPDFs() {
    console.log('🧹 Iniciando limpieza de archivos PDF antiguos...');
    
    try {
        // Limpiar archivos PDF antiguos (más de 7 días)
        await pdfService.cleanupOldPDFs();
        
        console.log('✅ Limpieza de PDFs completada');
        
        // Mostrar archivos restantes
        const tempDir = require('path').join(__dirname, 'temp');
        const fs = require('fs');
        
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            const pdfFiles = files.filter(f => f.endsWith('.pdf'));
            
            console.log(`\n📋 Archivos PDF restantes (${pdfFiles.length}):`);
            pdfFiles.forEach(file => {
                const filepath = require('path').join(tempDir, file);
                const stats = fs.statSync(filepath);
                const ageInDays = Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24));
                console.log(`   📄 ${file} (${stats.size} bytes, ${ageInDays} días)`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error en limpieza de PDFs:', error);
        logger.error('Error en limpieza de PDFs:', error);
    }
}

cleanupPDFs(); 