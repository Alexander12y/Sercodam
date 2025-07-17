require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'sercodam_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        schema: process.env.DB_SCHEMA || 'catalogo_1'
    });

    try {
        console.log('🔍 Testing database connection with .env variables...\n');
        console.log('📋 Connection details:');
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   Port: ${process.env.DB_PORT || 5432}`);
        console.log(`   Database: ${process.env.DB_NAME || 'sercodam_db'}`);
        console.log(`   User: ${process.env.DB_USER || 'postgres'}`);
        console.log(`   Schema: ${process.env.DB_SCHEMA || 'catalogo_1'}\n`);

        const client = await pool.connect();
        console.log('✅ Database connection successful!\n');

        // Test basic query
        const result = await client.query('SELECT version()');
        console.log(`📊 PostgreSQL version: ${result.rows[0].version.split(' ')[0]}\n`);

        // Check if tables exist
        console.log('📋 Checking table existence...');
        
        const tables = ['orden_produccion', 'trabajo_corte', 'plan_corte_pieza', 'panos_sobrantes', 'pano'];
        
        for (const table of tables) {
            try {
                const exists = await client.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = $1 
                        AND table_schema = $2
                    );
                `, [table, process.env.DB_SCHEMA || 'catalogo_1']);
                console.log(`   ${table}: ${exists.rows[0].exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
            } catch (error) {
                console.log(`   ${table}: ❌ ERROR - ${error.message}`);
            }
        }

        // Check data in tables
        console.log('\n📊 Checking data in tables...');
        
        // Check orden_produccion
        const ordenes = await client.query('SELECT id_op, numero_op, estado FROM orden_produccion LIMIT 5');
        console.log(`   orden_produccion: ${ordenes.rows.length} records`);
        ordenes.rows.forEach(orden => {
            console.log(`     - ${orden.numero_op} (ID: ${orden.id_op}, Estado: ${orden.estado})`);
        });

        // Check trabajo_corte
        const trabajos = await client.query('SELECT job_id, id_item, altura_req, ancho_req, estado FROM trabajo_corte LIMIT 5');
        console.log(`   trabajo_corte: ${trabajos.rows.length} records`);
        trabajos.rows.forEach(trabajo => {
            console.log(`     - Job ${trabajo.job_id}: ${trabajo.altura_req}m x ${trabajo.ancho_req}m (Estado: ${trabajo.estado})`);
        });

        // Check plan_corte_pieza
        const planes = await client.query('SELECT job_id, seq, rol_pieza, altura_plan, ancho_plan FROM plan_corte_pieza LIMIT 10');
        console.log(`   plan_corte_pieza: ${planes.rows.length} records`);
        planes.rows.forEach(plan => {
            console.log(`     - Job ${plan.job_id}, Seq ${plan.seq}: ${plan.rol_pieza} - ${plan.altura_plan}m x ${plan.ancho_plan}m`);
        });

        // Check panos_sobrantes
        const sobrantes = await client.query('SELECT id_remnant, id_item_padre, altura_m, ancho_m, estado FROM panos_sobrantes LIMIT 5');
        console.log(`   panos_sobrantes: ${sobrantes.rows.length} records`);
        sobrantes.rows.forEach(sobrante => {
            console.log(`     - Remnant ${sobrante.id_remnant}: ${sobrante.altura_m}m x ${sobrante.ancho_m}m (Estado: ${sobrante.estado})`);
        });

        // Check pano
        const panos = await client.query('SELECT id_item, largo_m, ancho_m, estado_trabajo FROM pano LIMIT 5');
        console.log(`   pano: ${panos.rows.length} records`);
        panos.rows.forEach(pano => {
            console.log(`     - Pano ${pano.id_item}: ${pano.largo_m}m x ${pano.ancho_m}m (Estado: ${pano.estado_trabajo})`);
        });

        client.release();
        console.log('\n✅ Database connection test completed successfully!');

    } catch (error) {
        console.error('❌ Database connection test failed:', error);
    } finally {
        await pool.end();
    }
}

testConnection(); 