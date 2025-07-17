const axios = require('axios');
const knex = require('knex');
const knexfile = require('./knexfile');

// Database connection
const db = knex(knexfile.development);

// API configuration
const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';

// Test data
const TEST_DATA = {
    cliente: 'Debug Pano Selection',
    observaciones: 'Debug para rastrear selección de paños',
    prioridad: 'alta',
    panos: [
        {
            altura_req: 2.0,
            ancho_req: 2.5,
            umbral_sobrante_m2: 1.0
        }
    ]
};

async function login() {
    console.log('🔐 Iniciando sesión...');
    try {
        const response = await axios.post(`${API_BASE}/auth/login`, {
            username: 'admin2',
            password: 'Admin123!'
        });
        if (response.data.success) {
            console.log('✅ Login exitoso');
            return response.data.data.tokens.accessToken;
        }
    } catch (error) {
        console.error('❌ Error en login:', error.response?.data || error.message);
        throw error;
    }
}

async function debugPanoSelection() {
    console.log('🔍 DEBUG: Selección de Paños');
    console.log('=' .repeat(50));
    
    let token;
    let orderId = null;
    
    try {
        // 1. Login
        token = await login();
        
        // 2. Ver paños disponibles ANTES de crear orden
        console.log('\n📊 PAÑOS DISPONIBLES ANTES DE CREAR ORDEN:');
        
        const altura_req = TEST_DATA.panos[0].altura_req;
        const ancho_req = TEST_DATA.panos[0].ancho_req;
        
        const panosDisponibles = await db('pano as p')
            .select('p.*', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('p.estado_trabajo', 'Libre')
            .whereRaw('(GREATEST(p.largo_m, p.ancho_m) >= ? AND LEAST(p.largo_m, p.ancho_m) >= ?)', [altura_req, ancho_req])
            .whereRaw('p.area_m2 >= 0')
            .whereNotExists(function() {
                this.select('*')
                    .from('trabajo_corte as tc')
                    .join('orden_produccion as op', 'tc.id_op', 'op.id_op')
                    .whereRaw('tc.id_item = p.id_item')
                    .whereIn('op.estado', ['en_proceso', 'completada']);
            })
            .orderBy('p.area_m2', 'asc')
            .limit(5); // Solo los primeros 5
        
        console.log(`   Encontrados ${panosDisponibles.length} paños disponibles:`);
        panosDisponibles.forEach((pano, index) => {
            console.log(`   ${index + 1}. ID ${pano.id_item}: ${pano.largo_m}m x ${pano.ancho_m}m = ${pano.area_m2}m² - ${pano.estado_trabajo}`);
        });
        
        if (panosDisponibles.length === 0) {
            console.log('   ❌ No hay paños disponibles');
            return;
        }
        
        const expectedPano = panosDisponibles[0];
        console.log(`\n🎯 PAÑO ESPERADO: ID ${expectedPano.id_item}`);
        
        // 3. Crear orden
        console.log('\n📝 CREANDO ORDEN...');
        const response = await axios.post(`${API_BASE}/ordenes`, TEST_DATA, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
            orderId = response.data.data.id_op;
            console.log(`✅ Orden creada: ${response.data.data.numero_op} (ID: ${orderId})`);
        } else {
            throw new Error('Failed to create order');
        }
        
        // 4. Ver qué trabajo de corte se creó
        console.log('\n✂️ TRABAJOS DE CORTE CREADOS:');
        const trabajosCorte = await db('trabajo_corte')
            .where('id_op', orderId)
            .select('*');
        
        trabajosCorte.forEach(trabajo => {
            console.log(`   Job ID ${trabajo.job_id}: Paño ${trabajo.id_item} - ${trabajo.altura_req}x${trabajo.ancho_req}`);
            
            if (trabajo.id_item === expectedPano.id_item) {
                console.log(`   ✅ CORRECTO: Usa el paño esperado`);
            } else {
                console.log(`   ❌ INCORRECTO: Esperaba paño ${expectedPano.id_item}, pero usa ${trabajo.id_item}`);
            }
        });
        
        // 5. Ver estado de los paños después de crear orden
        console.log('\n📊 ESTADO DE PAÑOS DESPUÉS DE CREAR ORDEN:');
        
        // Verificar el paño esperado
        const panoEsperadoDespues = await db('pano')
            .where('id_item', expectedPano.id_item)
            .first();
        
        console.log(`   Paño esperado (${expectedPano.id_item}): ${panoEsperadoDespues.estado_trabajo}`);
        
        // Verificar los paños que realmente se usaron
        for (const trabajo of trabajosCorte) {
            const panoUsado = await db('pano')
                .where('id_item', trabajo.id_item)
                .first();
            
            console.log(`   Paño usado (${trabajo.id_item}): ${panoUsado.estado_trabajo}`);
        }
        
        // 6. Ver si hay órdenes que están bloqueando paños
        console.log('\n🚫 VERIFICANDO BLOQUEOS:');
        const panosReservados = await db('trabajo_corte as tc')
            .join('orden_produccion as op', 'tc.id_op', 'op.id_op')
            .whereIn('tc.id_item', panosDisponibles.map(p => p.id_item))
            .whereIn('op.estado', ['en_proceso', 'completada'])
            .select('tc.id_item', 'op.numero_op', 'op.estado');
        
        if (panosReservados.length > 0) {
            console.log('   Paños bloqueados por otras órdenes:');
            panosReservados.forEach(reservado => {
                console.log(`   - Paño ${reservado.id_item} bloqueado por orden ${reservado.numero_op} (${reservado.estado})`);
            });
        } else {
            console.log('   ✅ No hay paños bloqueados por otras órdenes');
        }
        
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        if (error.response && error.response.data) {
            console.error('   Detalles:', JSON.stringify(error.response.data, null, 2));
        }
    } finally {
        // Cleanup
        if (orderId) {
            console.log('\n🧹 Limpiando datos de prueba...');
            try {
                await db('real_corte_pieza').whereIn('job_id', function() {
                    this.select('job_id').from('trabajo_corte').where('id_op', orderId);
                }).del();
                
                await db('plan_corte_pieza').whereIn('job_id', function() {
                    this.select('job_id').from('trabajo_corte').where('id_op', orderId);
                }).del();
                
                await db('trabajo_corte').where('id_op', orderId).del();
                await db('orden_produccion_detalle').where('id_op', orderId).del();
                await db('herramienta_ordenada').where('id_op', orderId).del();
                await db('panos_sobrantes').where('id_op', orderId).del();
                await db('movimiento_inventario').where('id_op', orderId).del();
                await db('orden_produccion').where('id_op', orderId).del();
                
                console.log(`✅ Datos de prueba eliminados para orden ${orderId}`);
            } catch (cleanupError) {
                console.error('❌ Error limpiando:', cleanupError.message);
            }
        }
        
        await db.destroy();
        console.log('\n🔚 Debug finalizado');
    }
}

// Run the debug
if (require.main === module) {
    debugPanoSelection().catch(console.error);
}

module.exports = { debugPanoSelection }; 