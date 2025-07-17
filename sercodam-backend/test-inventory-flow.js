const axios = require('axios');
const knex = require('knex');
const knexfile = require('./knexfile');

// Database connection
const db = knex(knexfile.development);

// API configuration
const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';

// Test data
const TEST_DATA = {
    cliente: 'Cliente Test Inventario',
    observaciones: 'Orden de prueba para verificar flujo de inventario',
    prioridad: 'media',
    panos: [
        {
            id_item: 565, // Use specific pano ID 565
            altura_req: 2.3, // Slightly less than available largo_m
            ancho_req: 2.9, // Slightly less than available ancho_m
            umbral_sobrante_m2: 0.5
        }
    ],
    materiales: [
        {
            id_item: 1, // Assuming this material exists
            tipo_item: 'EXTRA',
            cantidad: 5,
            notas: 'Material de prueba'
        }
    ],
    herramientas: [
        {
            id_item: 274, // Assuming this tool exists
            cantidad: 1,
            notas: 'Herramienta de prueba'
        }
    ]
};

// Store test results
const testResults = {
    initialInventory: {},
    afterOrderCreation: {},
    afterOrderApproval: {},
    afterCutCompletion: {},
    finalInventory: {},
    orderId: null,
    jobId: null
};

// Helper function to get inventory snapshot
async function getInventorySnapshot(description) {
    console.log(`\n📊 ${description}:`);
    
    // Get materials inventory
    const materiales = await db('materiales_extras')
        .select('id_item', 'descripcion', 'cantidad_disponible', 'unidad')
        .orderBy('id_item');
    
    // Get panos inventory
    const panos = await db('pano')
        .select('id_item', 'largo_m', 'ancho_m', 'area_m2', 'estado_trabajo')
        .orderBy('id_item');
    
    // Get tools inventory
    const herramientas = await db('herramientas')
        .select('id_item', 'descripcion', 'cantidad_disponible', 'unidad')
        .orderBy('id_item');
    
    // Get inventory movements
    const movimientos = await db('movimiento_inventario')
        .select('id_movimiento', 'id_item', 'tipo_mov', 'cantidad', 'notas', 'fecha')
        .orderBy('fecha', 'desc')
        .limit(10);
    
    const snapshot = {
        materiales,
        panos,
        herramientas,
        movimientos
    };
    
    console.log(`   📦 Materiales (${materiales.length}):`);
    materiales.forEach(m => {
        console.log(`      ID ${m.id_item}: ${m.descripcion} - ${m.cantidad_disponible} ${m.unidad}`);
    });
    
    console.log(`   🧵 Paños (${panos.length}):`);
    panos.forEach(p => {
        console.log(`      ID ${p.id_item}: ${p.largo_m}m x ${p.ancho_m}m = ${p.area_m2}m² - ${p.estado_trabajo}`);
    });
    
    console.log(`   🔧 Herramientas (${herramientas.length}):`);
    herramientas.forEach(h => {
        console.log(`      ID ${h.id_item}: ${h.descripcion} - ${h.cantidad_disponible} ${h.unidad}`);
    });
    
    console.log(`   📋 Últimos 10 movimientos:`);
    movimientos.forEach(m => {
        console.log(`      ${m.tipo_mov}: ${m.cantidad} - ${m.notas}`);
    });
    
    return snapshot;
}

// Helper function to login
async function login() {
    console.log('\n🔐 Iniciando sesión...');
    
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
            username: 'admin2',
            password: 'Admin123!'
        });
        
        if (response.data.success) {
            console.log('✅ Login exitoso');
            return response.data.data.tokens.accessToken;
        } else {
            throw new Error('Login failed');
        }
    } catch (error) {
        console.error('❌ Error en login:', error.response?.data || error.message);
        throw error;
    }
}

// Helper function to create order
async function createOrder(token) {
    console.log('\n📝 Creando orden de producción...');
    
    try {
        const response = await axios.post(`${API_BASE}/ordenes`, TEST_DATA, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
            testResults.orderId = response.data.data.id_op;
            console.log(`✅ Orden creada exitosamente: ${response.data.data.numero_op} (ID: ${testResults.orderId})`);
            return response.data.data;
        } else {
            throw new Error('Order creation failed');
        }
    } catch (error) {
        console.error('❌ Error creando orden:', error.response?.data || error.message);
        throw error;
    }
}

// Helper function to approve order
async function approveOrder(token, orderId) {
    console.log('\n✅ Aprobando orden...');
    
    try {
        const response = await axios.post(`${API_BASE}/ordenes/${orderId}/approve`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
            console.log('✅ Orden aprobada exitosamente');
            return response.data;
        } else {
            throw new Error('Order approval failed');
        }
    } catch (error) {
        console.error('❌ Error aprobando orden:', error.response?.data || error.message);
        throw error;
    }
}

// Helper function to get cut jobs
async function getCutJobs(token) {
    console.log('\n🔍 Obteniendo trabajos de corte...');
    
    try {
        const response = await axios.get(`${API_BASE}/ordenes/cut-jobs`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
            const jobs = response.data.data;
            console.log(`✅ Encontrados ${jobs.length} trabajos de corte`);
            
            if (jobs.length > 0 && jobs[0].cut_jobs && jobs[0].cut_jobs.length > 0) {
                testResults.jobId = jobs[0].cut_jobs[0].job_id;
                console.log(`   📋 Job ID: ${testResults.jobId}`);
            }
            
            return jobs;
        } else {
            throw new Error('Failed to get cut jobs');
        }
    } catch (error) {
        console.error('❌ Error obteniendo trabajos de corte:', error.response?.data || error.message);
        throw error;
    }
}

// Helper function to complete cut job
async function completeCutJob(token, jobId) {
    console.log('\n✂️ Completando trabajo de corte...');
    
    try {
        // Get cut plans first
        const plansResponse = await axios.get(`${API_BASE}/ordenes/cut-jobs/${jobId}/plans`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!plansResponse.data.success) {
            throw new Error('Failed to get cut plans');
        }
        
        const plans = plansResponse.data.data;
        console.log(`   📋 Planes de corte encontrados: ${plans.length}`);
        
        // Create actual cuts based on plans
        const actualPieces = plans.map(plan => ({
            seq: plan.seq,
            altura_real: plan.altura_plan,
            ancho_real: plan.ancho_plan
        }));
        
        console.log(`   ✂️ Enviando ${actualPieces.length} cortes reales...`);
        
        const response = await axios.post(`${API_BASE}/ordenes/submit-actual-cuts`, {
            job_id: jobId,
            actual_pieces: actualPieces
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
            console.log('✅ Trabajo de corte completado exitosamente');
            return response.data;
        } else {
            throw new Error('Cut job completion failed');
        }
    } catch (error) {
        console.error('❌ Error completando trabajo de corte:', error.response?.data || error.message);
        throw error;
    }
}

// Helper function to cleanup test data
async function cleanupTestData() {
    console.log('\n🧹 Limpiando datos de prueba...');
    
    try {
        if (testResults.orderId) {
            // Delete cut jobs
            await db('trabajo_corte').where('id_op', testResults.orderId).del();
            await db('plan_corte_pieza').whereIn('job_id', function() {
                this.select('job_id').from('trabajo_corte').where('id_op', testResults.orderId);
            }).del();
            await db('real_corte_pieza').whereIn('job_id', function() {
                this.select('job_id').from('trabajo_corte').where('id_op', testResults.orderId);
            }).del();
            
            // Delete order details
            await db('orden_produccion_detalle').where('id_op', testResults.orderId).del();
            await db('herramienta_ordenada').where('id_op', testResults.orderId).del();
            
            // Delete remnants
            await db('panos_sobrantes').where('id_op', testResults.orderId).del();
            
            // Delete inventory movements
            await db('movimiento_inventario').where('id_op', testResults.orderId).del();
            
            // Delete the order
            await db('orden_produccion').where('id_op', testResults.orderId).del();
            
            console.log(`✅ Datos de prueba eliminados para orden ${testResults.orderId}`);
        }
        
        // Restore inventory to initial state (this would need to be implemented based on your specific needs)
        console.log('⚠️  Nota: El inventario no se restaura automáticamente. Revisa manualmente si es necesario.');
        
    } catch (error) {
        console.error('❌ Error limpiando datos de prueba:', error.message);
    }
}

// Main test function
async function runInventoryFlowTest() {
    console.log('🚀 Iniciando prueba del flujo de inventario...');
    console.log('=' .repeat(60));
    
    let token;
    
    try {
        // 1. Get initial inventory snapshot
        testResults.initialInventory = await getInventorySnapshot('INVENTARIO INICIAL');
        
        // 2. Login
        token = await login();
        
        // 3. Create order
        const orderData = await createOrder(token);
        
        // 4. Get inventory after order creation
        testResults.afterOrderCreation = await getInventorySnapshot('DESPUÉS DE CREAR ORDEN');
        
        // 5. Approve order
        await approveOrder(token, testResults.orderId);
        
        // 6. Get inventory after order approval
        testResults.afterOrderApproval = await getInventorySnapshot('DESPUÉS DE APROBAR ORDEN');
        
        // 7. Get cut jobs
        await getCutJobs(token);
        
        if (testResults.jobId) {
            // 8. Complete cut job
            await completeCutJob(token, testResults.jobId);
            
            // 9. Get inventory after cut completion
            testResults.afterCutCompletion = await getInventorySnapshot('DESPUÉS DE COMPLETAR CORTE');
        } else {
            console.log('⚠️  No se encontró trabajo de corte para completar');
        }
        
        // 10. Final inventory snapshot
        testResults.finalInventory = await getInventorySnapshot('INVENTARIO FINAL');
        
        // 11. Generate comparison report
        console.log('\n📊 REPORTE DE COMPARACIÓN:');
        console.log('=' .repeat(60));
        
        // Compare materials
        console.log('\n📦 CAMBIOS EN MATERIALES:');
        const initialMaterials = testResults.initialInventory.materiales;
        const finalMaterials = testResults.finalInventory.materiales;
        
        initialMaterials.forEach(initial => {
            const final = finalMaterials.find(f => f.id_item === initial.id_item);
            if (final) {
                const difference = final.cantidad_disponible - initial.cantidad_disponible;
                if (difference !== 0) {
                    console.log(`   ID ${initial.id_item} (${initial.descripcion}): ${initial.cantidad_disponible} → ${final.cantidad_disponible} (${difference > 0 ? '+' : ''}${difference})`);
                }
            }
        });
        
        // Compare panos
        console.log('\n🧵 CAMBIOS EN PAÑOS:');
        const initialPanos = testResults.initialInventory.panos;
        const finalPanos = testResults.finalInventory.panos;
        
        initialPanos.forEach(initial => {
            const final = finalPanos.find(f => f.id_item === initial.id_item);
            if (final) {
                const areaDifference = final.area_m2 - initial.area_m2;
                if (areaDifference !== 0 || initial.estado_trabajo !== final.estado_trabajo) {
                    console.log(`   ID ${initial.id_item}: ${initial.area_m2}m² → ${final.area_m2}m² (${areaDifference > 0 ? '+' : ''}${areaDifference.toFixed(2)}m²) | ${initial.estado_trabajo} → ${final.estado_trabajo}`);
                }
            }
        });
        
        // Show new movements
        console.log('\n📋 NUEVOS MOVIMIENTOS DE INVENTARIO:');
        const newMovements = testResults.finalInventory.movimientos.filter(m => 
            !testResults.initialInventory.movimientos.some(im => im.id_movimiento === m.id_movimiento)
        );
        
        newMovements.forEach(movement => {
            console.log(`   ${movement.tipo_mov}: ${movement.cantidad} - ${movement.notas}`);
        });
        
        // 12. Verify expected behavior
        console.log('\n✅ VERIFICACIÓN DEL COMPORTAMIENTO ESPERADO:');
        console.log('=' .repeat(60));
        
        // Check if materials were discounted on approval
        const materialsDiscountedOnApproval = testResults.afterOrderApproval.movimientos.some(m => 
            m.tipo_mov === 'CONSUMO' && m.notas.includes('Consumo para orden')
        );
        console.log(`   📦 Materiales descontados al aprobar orden: ${materialsDiscountedOnApproval ? '✅ SÍ' : '❌ NO'}`);
        
        // Check if panos were discounted on cut completion
        const panosDiscountedOnCut = testResults.afterCutCompletion.movimientos.some(m => 
            m.tipo_mov === 'CONSUMO' && m.notas.includes('Consumo de paño para corte')
        );
        console.log(`   🧵 Paños descontados al completar corte: ${panosDiscountedOnCut ? '✅ SÍ' : '❌ NO'}`);
        
        // Check if remnants were created
        const remnantsCreated = testResults.afterCutCompletion.panos.some(p => 
            p.estado_trabajo === 'Libre' && p.area_m2 < 5 // Assuming remnants are smaller
        );
        console.log(`   🔄 Remanentes creados: ${remnantsCreated ? '✅ SÍ' : '❌ NO'}`);
        
        console.log('\n🎉 PRUEBA COMPLETADA EXITOSAMENTE!');
        
    } catch (error) {
        console.error('\n❌ ERROR EN LA PRUEBA:', error.message);
        console.error(error.stack);
    } finally {
        // Cleanup
        await cleanupTestData();
        
        // Close database connection
        await db.destroy();
        
        console.log('\n🔚 Conexión a base de datos cerrada');
    }
}

// Run the test
if (require.main === module) {
    runInventoryFlowTest().catch(console.error);
}

module.exports = { runInventoryFlowTest }; 