const axios = require('axios');

async function testPanosAPI() {
    try {
        console.log('🔍 Probando API de paños...');
        
        // Primero hacer login para obtener token
        const loginResponse = await axios.post('http://localhost:4000/api/v1/auth/login', {
            username: 'admin',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login exitoso, token obtenido');
        
        // Configurar headers con token
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        
        // Probar endpoint de paños
        console.log('📋 Llamando a /api/v1/inventario/panos...');
        const panosResponse = await axios.get('http://localhost:4000/api/v1/inventario/panos', config);
        
        console.log('✅ Respuesta de la API:');
        console.log('Status:', panosResponse.status);
        console.log('Success:', panosResponse.data.success);
        console.log('Total de paños:', panosResponse.data.data?.panos?.length || 0);
        console.log('Paginación:', panosResponse.data.data?.pagination);
        
        if (panosResponse.data.data?.panos?.length > 0) {
            console.log('📋 Primeros 3 paños:');
            panosResponse.data.data.panos.slice(0, 3).forEach((pano, index) => {
                console.log(`${index + 1}. ID: ${pano.id_item}, Estado: ${pano.estado}, Área: ${pano.area_m2}m²`);
            });
        } else {
            console.log('⚠️ No hay paños en la base de datos');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    }
}

testPanosAPI(); 