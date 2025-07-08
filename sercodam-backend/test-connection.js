// Cargar variables de entorno
require('dotenv').config();

const db = require('./src/config/database');

async function testConnection() {
    console.log('🔌 Probando conexión a la base de datos...');
    console.log('🔧 Configuración:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER
    });
    
    try {
        // Probar conexión
        const result = await db.raw('SELECT 1 as test');
        console.log('✅ Conexión exitosa:', result.rows[0]);
        
        // Probar consulta simple
        const tableCount = await db.raw("SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'catalogo_1'");
        console.log('📊 Tablas en esquema catalogo_1:', tableCount.rows[0].count);
        
        // Verificar algunas tablas importantes
        const tables = await db.raw(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'catalogo_1' 
            AND table_name IN ('orden_produccion', 'orden_produccion_detalle', 'pano', 'materiales_extras')
            ORDER BY table_name
        `);
        
        console.log('📋 Tablas principales encontradas:');
        tables.rows.forEach(row => {
            console.log(`   - ${row.table_name}`);
        });
        
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        console.error('Detalles:', error);
    } finally {
        try {
            await db.destroy();
            console.log('🔌 Conexión cerrada');
        } catch (closeError) {
            console.error('⚠️ Error cerrando conexión:', closeError.message);
        }
    }
}

testConnection(); 