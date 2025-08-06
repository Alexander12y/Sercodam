const axios = require('axios');

async function testGetPanosAfterUpdate() {
    try {
        const API_BASE_URL = 'http://localhost:4000/api/v1';
        
        // Login
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.tokens.accessToken;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        console.log('🔍 === PASO 1: Obtener datos ANTES de actualizar ===');
        
        // 1. Obtener paños ANTES
        const beforeResponse = await axios.get(`${API_BASE_URL}/inventario/panos?page=1&limit=50`);
        const panoBefore = beforeResponse.data.panos.find(p => p.id_item === 856);
        
        console.log('📊 ANTES - Paño 856:', {
            cuadro: panoBefore?.cuadro,
            refuerzo: panoBefore?.refuerzo,
            largo_m: panoBefore?.largo_m,
            especificaciones: panoBefore?.especificaciones
        });
        
        console.log('\n🔍 === PASO 2: Actualizar paño ===');
        
        // 2. Actualizar paño
        const updateData = {
            id_mcr: 'MCR-18-2 1/8-TO',
            largo_m: 999,  // CAMBIO GRANDE PARA QUE SEA OBVIO
            ancho_m: 50,
            estado: 'bueno',
            ubicacion: 'Bodega CDMX',
            precio_x_unidad: 100,
            stock_minimo: 10,
            tipo_red: 'Nylon',
            calibre: '18',
            cuadro: '5"',  // CAMBIO GRANDE
            torsion: 'Torcida',
            refuerzo: 'No'  // CAMBIO
        };
        
        const updateResponse = await axios.put(`${API_BASE_URL}/inventario/panos/856`, updateData);
        console.log('✅ Actualización exitosa:', updateResponse.data);
        
        // 3. Esperar 2 segundos
        console.log('\n⏳ Esperando 2 segundos...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n🔍 === PASO 3: Obtener datos DESPUÉS de actualizar ===');
        
        // 4. Obtener paños DESPUÉS con cache busting
        const afterResponse = await axios.get(`${API_BASE_URL}/inventario/panos?page=1&limit=50&_t=${Date.now()}`);
        const panoAfter = afterResponse.data.panos.find(p => p.id_item === 856);
        
        console.log('📊 DESPUÉS - Paño 856:', {
            cuadro: panoAfter?.cuadro,
            refuerzo: panoAfter?.refuerzo,
            largo_m: panoAfter?.largo_m,
            especificaciones: panoAfter?.especificaciones
        });
        
        console.log('\n🔍 === PASO 4: Comparación ===');
        
        console.log('📊 COMPARACIÓN DETALLADA:');
        console.log(`   Largo: ${panoBefore?.largo_m} → ${panoAfter?.largo_m} ${panoBefore?.largo_m !== panoAfter?.largo_m ? '✅ CAMBIÓ' : '❌ NO CAMBIÓ'}`);
        console.log(`   Cuadro: ${panoBefore?.cuadro} → ${panoAfter?.cuadro} ${panoBefore?.cuadro !== panoAfter?.cuadro ? '✅ CAMBIÓ' : '❌ NO CAMBIÓ'}`);
        console.log(`   Refuerzo: ${panoBefore?.refuerzo} → ${panoAfter?.refuerzo} ${panoBefore?.refuerzo !== panoAfter?.refuerzo ? '✅ CAMBIÓ' : '❌ NO CAMBIÓ'}`);
        
        console.log('\n🔍 === PASO 5: Verificar directo en BD ===');
        
        // 5. Usar endpoint debug para ver datos directos
        try {
            const debugResponse = await axios.get(`${API_BASE_URL}/inventario/panos/856/debug`);
            console.log('🔬 DATOS DIRECTOS DE BD:', {
                pano_largo: debugResponse.data.debug.pano.largo_m,
                nylon_cuadro: debugResponse.data.debug.nylon.cuadro,
                nylon_refuerzo: debugResponse.data.debug.nylon.refuerzo
            });
        } catch (debugError) {
            console.log('❌ Error en debug endpoint (puede que no exista)');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testGetPanosAfterUpdate();