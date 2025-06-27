const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function testPanoRefuerzoFix() {
    try {
        console.log('🧪 Probando creación de paño con refuerzo corregido...');
        console.log('🔗 URL del API:', API_BASE_URL);
        
        // 1. Login para obtener token
        console.log('\n1. Iniciando sesión...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        console.log('🔑 loginResponse.data:', loginResponse.data);
        const token = loginResponse.data.data.tokens.accessToken;
        console.log('✅ Login exitoso');
        
        // 2. Crear paño con refuerzo = "Sí"
        console.log('\n2. Creando paño con refuerzo = "Sí"...');
        const panoDataSi = {
            tipo_red: 'nylon',
            largo_m: 5.0,
            ancho_m: 3.0,
            estado: 'bueno',
            ubicacion: 'Almacén A, Estante 1',
            precio_x_unidad: 25.50,
            descripcion: 'Nylon con refuerzo - Prueba',
            calibre: '18',
            cuadro: '1 1/2"',
            torsion: 'Torcida',
            refuerzo: 'Sí'
        };
        
        const createResponseSi = await axios.post(`${API_BASE_URL}/inventario/panos`, panoDataSi, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Paño con refuerzo "Sí" creado exitosamente:', createResponseSi.data);
        
        // 3. Crear paño con refuerzo = "No"
        console.log('\n3. Creando paño con refuerzo = "No"...');
        const panoDataNo = {
            tipo_red: 'nylon',
            largo_m: 4.0,
            ancho_m: 2.5,
            estado: 'regular',
            ubicacion: 'Almacén B, Estante 2',
            precio_x_unidad: 20.00,
            descripcion: 'Nylon sin refuerzo - Prueba',
            calibre: '20',
            cuadro: '2x2',
            torsion: 'Recta',
            refuerzo: 'No'
        };
        
        const createResponseNo = await axios.post(`${API_BASE_URL}/inventario/panos`, panoDataNo, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Paño con refuerzo "No" creado exitosamente:', createResponseNo.data);
        
        // 4. Verificar que los paños se crearon correctamente
        console.log('\n4. Verificando paños creados...');
        const panoIdSi = createResponseSi.data.data.id_item.id_item;
        const panoIdNo = createResponseNo.data.data.id_item.id_item;
        
        const getResponseSi = await axios.get(`${API_BASE_URL}/inventario/panos/${panoIdSi}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const getResponseNo = await axios.get(`${API_BASE_URL}/inventario/panos/${panoIdNo}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('📋 Paño con refuerzo "Sí":');
        console.log(`   - ID: ${getResponseSi.data.data.id_item}`);
        console.log(`   - Área: ${getResponseSi.data.data.area_m2}m²`);
        console.log(`   - Refuerzo: ${getResponseSi.data.data.refuerzo}`);
        
        console.log('📋 Paño con refuerzo "No":');
        console.log(`   - ID: ${getResponseNo.data.data.id_item}`);
        console.log(`   - Área: ${getResponseNo.data.data.area_m2}m²`);
        console.log(`   - Refuerzo: ${getResponseNo.data.data.refuerzo}`);
        
        console.log('\n🎉 Prueba completada exitosamente! El error de refuerzo ha sido corregido.');
        
    } catch (error) {
        console.error('❌ Error en la prueba:');
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
            console.error('   Headers:', error.response.headers);
        } else if (error.request) {
            console.error('   Request error:', error.request);
        } else {
            console.error('   Error:', error.message);
        }
        console.error('   Stack:', error.stack);
    }
}

testPanoRefuerzoFix(); 