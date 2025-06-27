const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function testNylonCatalogos() {
    try {
        console.log('🧪 Probando endpoint de catálogos de nylon...');
        
        // 1. Login para obtener token
        console.log('\n1. Iniciando sesión...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@sercodam.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login exitoso');
        
        // 2. Obtener catálogos de nylon
        console.log('\n2. Obteniendo catálogos de nylon...');
        const catalogosResponse = await axios.get(`${API_BASE_URL}/inventario/panos/catalogos/nylon`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const catalogos = catalogosResponse.data.data;
        console.log('✅ Catálogos obtenidos exitosamente:');
        console.log('   - Calibres:', catalogos.calibres);
        console.log('   - Cuadros:', catalogos.cuadros);
        console.log('   - Torsiones:', catalogos.torsiones);
        
        console.log('\n🎉 Prueba completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.response?.data || error.message);
    }
}

testNylonCatalogos(); 