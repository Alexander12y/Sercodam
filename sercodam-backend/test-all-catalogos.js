const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function testAllCatalogos() {
    try {
        console.log('🧪 Probando todos los endpoints de catálogos...');
        
        // 1. Login para obtener token
        console.log('\n1. Iniciando sesión...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@sercodam.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login exitoso');
        
        const headers = {
            'Authorization': `Bearer ${token}`
        };
        
        // 2. Probar catálogos de nylon
        console.log('\n2. Probando catálogos de nylon...');
        const nylonResponse = await axios.get(`${API_BASE_URL}/inventario/panos/catalogos/nylon`, { headers });
        console.log('✅ Nylon:', nylonResponse.data.data);
        
        // 3. Probar catálogos de polipropileno
        console.log('\n3. Probando catálogos de polipropileno...');
        const polipropilenoResponse = await axios.get(`${API_BASE_URL}/inventario/panos/catalogos/polipropileno`, { headers });
        console.log('✅ Polipropileno:', polipropilenoResponse.data.data);
        
        // 4. Probar catálogos de lona
        console.log('\n4. Probando catálogos de lona...');
        const lonaResponse = await axios.get(`${API_BASE_URL}/inventario/panos/catalogos/lona`, { headers });
        console.log('✅ Lona:', lonaResponse.data.data);
        
        // 5. Probar catálogos de malla sombra
        console.log('\n5. Probando catálogos de malla sombra...');
        const mallaSombraResponse = await axios.get(`${API_BASE_URL}/inventario/panos/catalogos/malla-sombra`, { headers });
        console.log('✅ Malla Sombra:', mallaSombraResponse.data.data);
        
        console.log('\n🎉 Todas las pruebas completadas exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.response?.data || error.message);
    }
}

testAllCatalogos(); 