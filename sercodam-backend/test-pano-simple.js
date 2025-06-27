const knex = require('knex');
require('dotenv').config();

// Configuración simple para pruebas
const dbConfig = {
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: false
    },
    searchPath: [process.env.DB_SCHEMA || 'catalogo_1'],
    pool: {
        min: 0,
        max: 1,
        createTimeoutMillis: 5000,
        acquireTimeoutMillis: 5000,
        idleTimeoutMillis: 5000
    }
};

const db = knex(dbConfig);

async function testPanoQuery() {
    try {
        console.log('🚀 Probando consulta directa a tabla pano...');
        
        // Probar consulta simple
        console.log('\n1. Consulta simple SELECT * FROM pano LIMIT 5...');
        const panos = await db('pano').select('*').limit(5);
        console.log('✅ Resultado:', panos);
        
        // Probar count
        console.log('\n2. Consulta COUNT...');
        const { count } = await db('pano').count('* as count').first();
        console.log('✅ Total de registros:', count);
        
        console.log('\n🎉 Pruebas completadas exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en consulta:', error);
    } finally {
        // Cerrar conexión
        await db.destroy();
    }
}

testPanoQuery(); 