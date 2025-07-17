const db = require('./src/config/database');

async function testDatabase() {
    try {
        console.log('🔍 Testing database connection...\n');

        // Test basic connection
        const result = await db.raw('SELECT version()');
        console.log('✅ Database connection successful');
        console.log(`   PostgreSQL version: ${result.rows[0].version.split(' ')[0]}\n`);

        // Check if tables exist
        console.log('📋 Checking table existence...');
        
        const tables = ['orden_produccion', 'trabajo_corte', 'plan_corte_pieza', 'panos_sobrantes', 'pano'];
        
        for (const table of tables) {
            try {
                const exists = await db.raw(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = ? 
                        AND table_schema = 'catalogo_1'
                    );
                `, [table]);
                console.log(`   ${table}: ${exists.rows[0].exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
            } catch (error) {
                console.log(`   ${table}: ❌ ERROR - ${error.message}`);
            }
        }

        // Check data in tables
        console.log('\n📊 Checking data in tables...');
        
        // Check orden_produccion
        const ordenes = await db('orden_produccion').select('id_op', 'numero_op', 'estado').limit(5);
        console.log(`   orden_produccion: ${ordenes.length} records`);
        ordenes.forEach(orden => {
            console.log(`     - ${orden.numero_op} (ID: ${orden.id_op}, Estado: ${orden.estado})`);
        });

        // Check trabajo_corte
        const trabajos = await db('trabajo_corte').select('job_id', 'id_item', 'altura_req', 'ancho_req', 'estado').limit(5);
        console.log(`   trabajo_corte: ${trabajos.length} records`);
        trabajos.forEach(trabajo => {
            console.log(`     - Job ${trabajo.job_id}: ${trabajo.altura_req}m x ${trabajo.ancho_req}m (Estado: ${trabajo.estado})`);
        });

        // Check plan_corte_pieza
        const planes = await db('plan_corte_pieza').select('job_id', 'seq', 'rol_pieza', 'altura_plan', 'ancho_plan').limit(10);
        console.log(`   plan_corte_pieza: ${planes.length} records`);
        planes.forEach(plan => {
            console.log(`     - Job ${plan.job_id}, Seq ${plan.seq}: ${plan.rol_pieza} - ${plan.altura_plan}m x ${plan.ancho_plan}m`);
        });

        // Check panos_sobrantes
        const sobrantes = await db('panos_sobrantes').select('id_remnant', 'id_item_padre', 'altura_m', 'ancho_m', 'estado').limit(5);
        console.log(`   panos_sobrantes: ${sobrantes.length} records`);
        sobrantes.forEach(sobrante => {
            console.log(`     - Remnant ${sobrante.id_remnant}: ${sobrante.altura_m}m x ${sobrante.ancho_m}m (Estado: ${sobrante.estado})`);
        });

        // Check pano
        const panos = await db('pano').select('id_item', 'largo_m', 'ancho_m', 'estado_trabajo').limit(5);
        console.log(`   pano: ${panos.length} records`);
        panos.forEach(pano => {
            console.log(`     - Pano ${pano.id_item}: ${pano.largo_m}m x ${pano.ancho_m}m (Estado: ${pano.estado_trabajo})`);
        });

        console.log('\n✅ Database test completed successfully!');

    } catch (error) {
        console.error('❌ Database test failed:', error);
    } finally {
        await db.destroy();
    }
}

testDatabase(); 