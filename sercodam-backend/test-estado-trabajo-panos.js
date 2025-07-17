const axios = require('axios');
const knex = require('knex');
const knexfile = require('./knexfile');

// Database connection
const db = knex(knexfile.development);

// API configuration
const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';

// Test data
const TEST_DATA = {
    cliente: 'Cliente Test Estados Trabajo',
    observaciones: 'Orden de prueba para verificar estados de trabajo de paños',
    prioridad: 'alta',
    panos: [
        {
            // No especificar id_item - dejar que el sistema seleccione
            altura_req: 2.0,
            ancho_req: 2.5,
            umbral_sobrante_m2: 1.0
        }
    ]
};

// Store test results
const testResults = {
    orderId: null,
    jobId: null,
    panoId: null, // Se determinará dinámicamente
    estadosCapturados: []
};

// Helper function to capture pano state
async function capturarEstadoPano(descripcion) {
    console.log(`\n📊 ${descripcion}:`);
    
    const pano = await db('pano')
        .where('id_item', testResults.panoId)
        .select('id_item', 'largo_m', 'ancho_m', 'area_m2', 'estado_trabajo')
        .first();
    
    if (pano) {
        console.log(`   🧵 Paño ID ${pano.id_item}: ${pano.largo_m}m x ${pano.ancho_m}m = ${pano.area_m2}m² - Estado: ${pano.estado_trabajo}`);
        
        testResults.estadosCapturados.push({
            descripcion,
            timestamp: new Date().toISOString(),
            ...pano
        });
    } else {
        console.log(`   ❌ Paño ID ${testResults.panoId} no encontrado`);
    }
    
    return pano;
}

// Helper function to get order state
async function capturarEstadoOrden(descripcion) {
    if (!testResults.orderId) return null;
    
    const orden = await db('orden_produccion')
        .where('id_op', testResults.orderId)
        .select('id_op', 'numero_op', 'estado')
        .first();
    
    if (orden) {
        console.log(`   📋 Orden ${orden.numero_op}: ${orden.estado}`);
    }
    
    return orden;
}

// Helper function to get cut job state
async function capturarEstadoTrabajoCorte(descripcion) {
    if (!testResults.orderId) return null;
    
    const trabajos = await db('trabajo_corte')
        .where('id_op', testResults.orderId)
        .select('job_id', 'id_item', 'estado', 'altura_req', 'ancho_req');
    
    trabajos.forEach(trabajo => {
        console.log(`   ✂️ Trabajo ${trabajo.job_id}: Item ${trabajo.id_item} - ${trabajo.estado} (${trabajo.altura_req}x${trabajo.ancho_req})`);
        if (trabajo.id_item === testResults.panoId) {
            testResults.jobId = trabajo.job_id;
        }
    });
    
    return trabajos;
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
async function crearOrden(token) {
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
async function aprobarOrden(token, orderId) {
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

// Helper function to complete cut job
async function completarCorte(token, jobId) {
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

// Helper function to find which pano the system will select
async function encontrarPanoQueSeUsara() {
    console.log('\n🔍 Encontrando paño que el sistema seleccionará...');
    
    const altura_req = TEST_DATA.panos[0].altura_req;
    const ancho_req = TEST_DATA.panos[0].ancho_req;
    
    // Usar la misma lógica que panosController.findSuitablePanos
    const panos = await db('pano as p')
        .select('p.*', 'rp.tipo_red')
        .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
        .where('p.estado_trabajo', 'Libre')
        .whereRaw('(GREATEST(p.largo_m, p.ancho_m) >= ? AND LEAST(p.largo_m, p.ancho_m) >= ?)', [altura_req, ancho_req])
        .whereRaw('p.area_m2 >= 0') // min_area_threshold = 0
        .whereNotExists(function() {
            this.select('*')
                .from('trabajo_corte as tc')
                .join('orden_produccion as op', 'tc.id_op', 'op.id_op')
                .whereRaw('tc.id_item = p.id_item')
                .whereIn('op.estado', ['en_proceso', 'completada']);
        })
        .orderBy('p.area_m2', 'asc');
    
    if (panos.length > 0) {
        const panoSeleccionado = panos[0]; // El sistema selecciona el más pequeño
        testResults.panoId = panoSeleccionado.id_item;
        console.log(`   ✅ Sistema usará paño ID ${panoSeleccionado.id_item}: ${panoSeleccionado.largo_m}m x ${panoSeleccionado.ancho_m}m = ${panoSeleccionado.area_m2}m²`);
        return panoSeleccionado;
    } else {
        console.log('   ❌ No se encontró paño adecuado');
        return null;
    }
}

// Helper function to cleanup test data
async function limpiarDatosPrueba() {
    console.log('\n🧹 Limpiando datos de prueba...');
    
    try {
        if (testResults.orderId) {
            // Delete cut jobs and related data
            await db('real_corte_pieza').whereIn('job_id', function() {
                this.select('job_id').from('trabajo_corte').where('id_op', testResults.orderId);
            }).del();
            
            await db('plan_corte_pieza').whereIn('job_id', function() {
                this.select('job_id').from('trabajo_corte').where('id_op', testResults.orderId);
            }).del();
            
            await db('reporte_variacion').whereIn('job_id', function() {
                this.select('job_id').from('trabajo_corte').where('id_op', testResults.orderId);
            }).del();
            
            await db('trabajo_corte').where('id_op', testResults.orderId).del();
            
            // Delete order details
            await db('orden_produccion_detalle').where('id_op', testResults.orderId).del();
            await db('herramienta_ordenada').where('id_op', testResults.orderId).del();
            
            // Delete remnants and movements
            await db('panos_sobrantes').where('id_op', testResults.orderId).del();
            await db('movimiento_inventario').where('id_op', testResults.orderId).del();
            
            // Delete the order
            await db('orden_produccion').where('id_op', testResults.orderId).del();
            
            console.log(`✅ Datos de prueba eliminados para orden ${testResults.orderId}`);
        }
        
    } catch (error) {
        console.error('❌ Error limpiando datos de prueba:', error.message);
    }
}

// Main test function
async function probarEstadosTrabajoPanos() {
    console.log('🚀 Iniciando prueba de estados de trabajo de paños...');
    console.log('=' .repeat(70));
    
    let token;
    
    try {
        // 1. Encontrar paño que el sistema seleccionará
        const panoSeleccionado = await encontrarPanoQueSeUsara();
        if (!panoSeleccionado) {
            console.log('❌ No hay paños disponibles para la prueba');
            return;
        }
        
        // 2. Estado inicial
        await capturarEstadoPano('ESTADO INICIAL DEL PAÑO');
        
        // 3. Login
        token = await login();
        
        // 4. Crear orden
        await crearOrden(token);
        await capturarEstadoPano('DESPUÉS DE CREAR ORDEN');
        await capturarEstadoOrden('Estado de la orden');
        
        // 5. Aprobar orden
        await aprobarOrden(token, testResults.orderId);
        await capturarEstadoPano('DESPUÉS DE APROBAR ORDEN');
        await capturarEstadoOrden('Estado de la orden');
        await capturarEstadoTrabajoCorte('Trabajos de corte');
        
        // 6. Completar corte
        if (testResults.jobId) {
            await completarCorte(token, testResults.jobId);
            await capturarEstadoPano('DESPUÉS DE COMPLETAR CORTE');
            await capturarEstadoOrden('Estado de la orden');
            await capturarEstadoTrabajoCorte('Trabajos de corte');
        } else {
            console.log('⚠️  No se encontró trabajo de corte para completar');
        }
        
        // 7. Generar reporte de estados
        console.log('\n📊 REPORTE DE CAMBIOS DE ESTADO:');
        console.log('=' .repeat(70));
        
        testResults.estadosCapturados.forEach((estado, index) => {
            const anterior = index > 0 ? testResults.estadosCapturados[index - 1] : null;
            const cambioEstado = anterior && anterior.estado_trabajo !== estado.estado_trabajo 
                ? ` (cambió de "${anterior.estado_trabajo}")` 
                : '';
            
            console.log(`${index + 1}. ${estado.descripcion}`);
            console.log(`   📐 Dimensiones: ${estado.largo_m}m x ${estado.ancho_m}m = ${estado.area_m2}m²`);
            console.log(`   🏷️  Estado de trabajo: ${estado.estado_trabajo}${cambioEstado}`);
            console.log();
        });
        
        // 8. Verificar comportamiento esperado
        console.log('\n✅ VERIFICACIÓN DEL COMPORTAMIENTO ESPERADO:');
        console.log('=' .repeat(70));
        
        const estadoInicial = testResults.estadosCapturados.find(e => e.descripcion.includes('INICIAL'));
        const estadoDespuesCrear = testResults.estadosCapturados.find(e => e.descripcion.includes('CREAR ORDEN'));
        const estadoDespuesAprobar = testResults.estadosCapturados.find(e => e.descripcion.includes('APROBAR ORDEN'));
        const estadoDespuesCorte = testResults.estadosCapturados.find(e => e.descripcion.includes('COMPLETAR CORTE'));
        
        // Verificaciones
        const inicialLibre = estadoInicial?.estado_trabajo === 'Libre';
        console.log(`   📋 1. Estado inicial "Libre": ${inicialLibre ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
        
        const mantieneDespuesCrear = estadoDespuesCrear?.estado_trabajo === estadoInicial?.estado_trabajo;
        console.log(`   📋 2. Se mantiene después de crear orden: ${mantieneDespuesCrear ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
        
        const reservadoDespuesAprobar = estadoDespuesAprobar?.estado_trabajo === 'Reservado';
        console.log(`   📋 3. "Reservado" después de aprobar: ${reservadoDespuesAprobar ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
        
        const enProgresoDespuesCorte = estadoDespuesCorte?.estado_trabajo === 'En progreso';
        console.log(`   📋 4. "En progreso" después de completar corte: ${enProgresoDespuesCorte ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
        
        const areReducida = estadoDespuesCorte && estadoInicial && (estadoDespuesCorte.area_m2 < estadoInicial.area_m2);
        console.log(`   📋 5. Área reducida después del corte: ${areReducida ? '✅ CORRECTO' : '❌ INCORRECTO'}`);
        
        // Log detallado del área para debug
        if (estadoInicial && estadoDespuesCorte) {
            const reduccion = estadoInicial.area_m2 - estadoDespuesCorte.area_m2;
            console.log(`      💡 Área inicial: ${estadoInicial.area_m2}m², final: ${estadoDespuesCorte.area_m2}m², reducción: ${reduccion.toFixed(3)}m²`);
            console.log(`      🔍 Comparación: ${estadoDespuesCorte.area_m2} < ${estadoInicial.area_m2} = ${estadoDespuesCorte.area_m2 < estadoInicial.area_m2}`);
        }
        
        // Resumen final
        const todasCorrectas = inicialLibre && mantieneDespuesCrear && reservadoDespuesAprobar && enProgresoDespuesCorte && areReducida;
        
        console.log('\n🎯 RESULTADO FINAL:');
        console.log(`   ${todasCorrectas ? '🎉 TODAS LAS VERIFICACIONES PASARON' : '⚠️  ALGUNAS VERIFICACIONES FALLARON'}`);
        
        if (todasCorrectas) {
            console.log('   ✅ El flujo de estados de trabajo funciona correctamente');
        } else {
            console.log('   ❌ Hay problemas en el flujo de estados de trabajo');
        }
        
    } catch (error) {
        console.error('\n❌ ERROR EN LA PRUEBA:', error.message);
        console.error(error.stack);
    } finally {
        // Cleanup
        await limpiarDatosPrueba();
        
        // Close database connection
        await db.destroy();
        
        console.log('\n🔚 Prueba finalizada y conexión cerrada');
    }
}

// Run the test
if (require.main === module) {
    probarEstadosTrabajoPanos().catch(console.error);
}

module.exports = { probarEstadosTrabajoPanos }; 