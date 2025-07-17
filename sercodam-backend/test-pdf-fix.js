const db = require('./src/config/database');
const logger = require('./src/config/logger');

async function testPDFFix() {
    try {
        console.log('🔍 Testing PDF generation fix...\n');

        // 1. Check if panos_sobrantes table exists
        console.log('1. Checking panos_sobrantes table...');
        try {
            const tableExists = await db.raw(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'panos_sobrantes' 
                    AND table_schema = 'catalogo_1'
                );
            `);
            console.log(`   panos_sobrantes table exists: ${tableExists.rows[0].exists}`);
        } catch (error) {
            console.log('   ❌ Error checking panos_sobrantes table:', error.message);
        }

        // 2. Check if trabajo_corte has id_op column
        console.log('\n2. Checking trabajo_corte table structure...');
        try {
            const columns = await db.raw(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'trabajo_corte' 
                AND table_schema = 'catalogo_1'
                AND column_name = 'id_op';
            `);
            console.log(`   id_op column exists in trabajo_corte: ${columns.rows.length > 0}`);
        } catch (error) {
            console.log('   ❌ Error checking trabajo_corte columns:', error.message);
        }

        // 3. Get a sample order with cutting data
        console.log('\n3. Finding orders with cutting data...');
        const ordersWithCuts = await db('orden_produccion as op')
            .join('trabajo_corte as tc', 'op.id_op', 'tc.id_op')
            .select('op.id_op', 'op.numero_op', 'op.estado')
            .limit(5);

        console.log(`   Found ${ordersWithCuts.length} orders with cutting data:`);
        ordersWithCuts.forEach(order => {
            console.log(`   - Order ${order.numero_op} (ID: ${order.id_op}, Estado: ${order.estado})`);
        });

        if (ordersWithCuts.length === 0) {
            console.log('   ❌ No orders with cutting data found. Creating a test order...');
            
            // Create a test order with cutting data
            const testOrder = await createTestOrder();
            if (testOrder) {
                console.log(`   ✅ Created test order: ${testOrder.numero_op} (ID: ${testOrder.id_op})`);
                ordersWithCuts.push(testOrder);
            }
        }

        // 4. Test PDF generation for the first order
        if (ordersWithCuts.length > 0) {
            const testOrder = ordersWithCuts[0];
            console.log(`\n4. Testing PDF generation for order ${testOrder.numero_op}...`);
            
            // Get cutting data
            const cutJobs = await db('trabajo_corte as tc')
                .leftJoin('pano as p', 'tc.id_item', 'p.id_item')
                .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                .where('tc.id_op', testOrder.id_op)
                .select(
                    'tc.*',
                    'p.largo_m as pano_largo',
                    'p.ancho_m as pano_ancho',
                    'p.area_m2 as pano_area',
                    'rp.tipo_red'
                );

            console.log(`   Found ${cutJobs.length} cutting jobs:`);
            for (const job of cutJobs) {
                console.log(`   - Job ${job.job_id}: ${job.altura_req}m x ${job.ancho_req}m from pano ${job.id_item}`);
                
                // Get plans for this job
                const plans = await db('plan_corte_pieza')
                    .where('job_id', job.job_id)
                    .orderBy('seq')
                    .select('*');
                
                console.log(`     Plans: ${plans.length} pieces`);
                plans.forEach(plan => {
                    console.log(`       - ${plan.rol_pieza}: ${plan.altura_plan}m x ${plan.ancho_plan}m`);
                });
            }

            // Get remnants
            const sobrantes = await db('panos_sobrantes')
                .where('id_op', testOrder.id_op)
                .select('*');
            
            console.log(`   Found ${sobrantes.length} remnants:`);
            sobrantes.forEach(sobrante => {
                console.log(`   - Remnant ${sobrante.id_remnant}: ${sobrante.altura_m}m x ${sobrante.ancho_m}m`);
            });

            // Test PDF generation
            console.log('\n5. Testing PDF generation...');
            const ordenesController = require('./src/controllers/ordenesController');
            
            // Mock request and response
            const req = { params: { id: testOrder.id_op } };
            const res = {
                json: (data) => {
                    console.log('   ✅ PDF generation response:', data.success ? 'SUCCESS' : 'FAILED');
                    if (data.success) {
                        console.log(`   📄 PDF filename: ${data.data.filename}`);
                    } else {
                        console.log(`   ❌ Error: ${data.message}`);
                    }
                }
            };

            try {
                await ordenesController.generarPDF(req, res);
            } catch (error) {
                console.log(`   ❌ PDF generation error: ${error.message}`);
            }
        }

        console.log('\n✅ PDF fix test completed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        logger.error('PDF fix test failed:', error);
    } finally {
        await db.destroy();
    }
}

async function createTestOrder() {
    try {
        // Find a suitable pano
        const pano = await db('pano')
            .where('estado_trabajo', 'Libre')
            .first();
        
        if (!pano) {
            console.log('   ❌ No free panos available for test');
            return null;
        }

        // Create test order
        const [orden] = await db('orden_produccion').insert({
            numero_op: `TEST-PDF-${Date.now()}`,
            fecha_op: new Date(),
            fecha_creacion: new Date(),
            cliente: 'Cliente Test PDF',
            observaciones: 'Orden de prueba para PDF',
            prioridad: 'media',
            estado: 'por aprobar'
        }).returning('*');

        // Create cutting job
        const panosController = require('./src/controllers/inventario/panosController');
        await panosController.createCutJob(
            orden.id_op, 
            pano.id_item, 
            5.0, // altura_req
            3.0, // ancho_req
            2.0, // umbral_sobrante_m2
            1,   // order_seq
            1    // id_operador (assuming admin user ID 1)
        );

        return orden;
    } catch (error) {
        console.log('   ❌ Error creating test order:', error.message);
        return null;
    }
}

// Run the test
testPDFFix(); 