const axios = require('axios');

async function testDebugPano() {
    try {
        const API_BASE_URL = 'http://localhost:4000/api/v1';
        
        // Login
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123'
        });
        
        const token = loginResponse.data.data.tokens.accessToken;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        console.log('🔍 Consultando datos directos de la base de datos...');
        
        // Consultar datos debug ANTES de actualizar
        const debugBefore = await axios.get(`${API_BASE_URL}/inventario/panos/856/debug`);
        console.log('📊 ANTES - Datos directos de BD:', {
            pano_largo: debugBefore.data.debug.pano.largo_m,
            nylon_refuerzo: debugBefore.data.debug.nylon.refuerzo,
            timestamp: debugBefore.data.debug.timestamp
        });
        
        // Actualizar con valores diferentes
        const updateData = {
            id_mcr: 'MCR-18-2 1/8-TO',
            largo_m: 2000,  // CAMBIO GRANDE
            ancho_m: 5678,
            estado: 'bueno',
            ubicacion: 'Bodega CDMX',
            precio_x_unidad: 9999.99,
            stock_minimo: 8888.88,
            tipo_red: 'Nylon',
            calibre: '18',
            cuadro: '2 1/8"',
            torsion: 'Torcida',
            refuerzo: 'Sí'  // CAMBIO A TRUE
        };
        
        console.log('🔄 Actualizando paño...');
        const updateResponse = await axios.put(`${API_BASE_URL}/inventario/panos/856`, updateData);
        console.log('✅ Respuesta actualización:', updateResponse.data);
        
        // Esperar un momento
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Consultar datos debug DESPUÉS de actualizar
        const debugAfter = await axios.get(`${API_BASE_URL}/inventario/panos/856/debug`);
        console.log('📊 DESPUÉS - Datos directos de BD:', {
            pano_largo: debugAfter.data.debug.pano.largo_m,
            nylon_refuerzo: debugAfter.data.debug.nylon.refuerzo,
            timestamp: debugAfter.data.debug.timestamp
        });
        
        // Comparar
        console.log('📊 COMPARACIÓN:');
        console.log(`   Largo: ${debugBefore.data.debug.pano.largo_m} → ${debugAfter.data.debug.pano.largo_m}`);
        console.log(`   Refuerzo: ${debugBefore.data.debug.nylon.refuerzo} → ${debugAfter.data.debug.nylon.refuerzo}`);
        
        if (debugBefore.data.debug.pano.largo_m !== debugAfter.data.debug.pano.largo_m) {
            console.log('✅ LARGO CAMBIÓ CORRECTAMENTE');
        } else {
            console.log('❌ LARGO NO CAMBIÓ');
        }
        
        if (debugBefore.data.debug.nylon.refuerzo !== debugAfter.data.debug.nylon.refuerzo) {
            console.log('✅ REFUERZO CAMBIÓ CORRECTAMENTE');
        } else {
            console.log('❌ REFUERZO NO CAMBIÓ');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testDebugPano();