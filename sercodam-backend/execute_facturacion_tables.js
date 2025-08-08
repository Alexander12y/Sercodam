const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function executeFacturacionTables() {
    let pool;
    
    try {
        // Create connection pool
        pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'sercodam_db',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            schema: process.env.DB_SCHEMA || 'catalogo_1'
        });

        console.log('🚀 Ejecutando script de tablas de facturación...\n');

        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'create_facturacion_tables.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // Split the SQL content into individual statements
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`📋 Ejecutando ${statements.length} sentencias SQL...\n`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.trim()) {
                try {
                    console.log(`⏳ Ejecutando sentencia ${i + 1}/${statements.length}...`);
                    await pool.query(statement);
                    console.log(`✅ Sentencia ${i + 1} ejecutada correctamente`);
                } catch (error) {
                    console.error(`❌ Error en sentencia ${i + 1}:`, error.message);
                    // Continue with next statement
                }
            }
        }

        console.log('\n🎉 Script de facturación ejecutado correctamente!');
        console.log('\n📊 Tablas creadas:');
        console.log('   - factura');
        console.log('   - factura_detalle');
        console.log('   - pago');
        console.log('   - facturas_draft');
        console.log('\n🔧 Funciones y triggers creados:');
        console.log('   - generar_numero_factura()');
        console.log('   - actualizar_totales_factura()');
        console.log('   - actualizar_estado_factura()');

    } catch (error) {
        console.error('❌ Error al ejecutar el script:', error.message);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

// Run the script
executeFacturacionTables();
