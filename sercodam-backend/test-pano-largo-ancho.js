const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function testPanoLargoAncho() {
    try {
        console.log('🧪 Probando creación de paño con largo y ancho...');
        
        // 1. Login para obtener token
        console.log('\n1. Iniciando sesión...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@sercodam.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login exitoso');
        
        // 2. Crear paño con largo y ancho
        console.log('\n2. Creando paño con largo y ancho...');
        const panoData = {
            tipo_red: 'lona',
            largo_m: 5.5,
            ancho_m: 3.2,
            estado: 'bueno',
            ubicacion: 'Almacén A, Estante 1',
            precio_x_unidad: 25.50,
            descripcion: 'Lona de prueba con largo y ancho',
            color: 'Verde',
            presentacion: 'Rollo'
        };
        
        const createResponse = await axios.post(`${API_BASE_URL}/inventario/panos`, panoData, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('✅ Paño creado exitosamente:', createResponse.data);
        
        // 3. Verificar que el paño se creó correctamente
        console.log('\n3. Verificando paño creado...');
        const panoId = createResponse.data.data.id_item;
        const getResponse = await axios.get(`${API_BASE_URL}/inventario/panos/${panoId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const pano = getResponse.data.data;
        console.log('📋 Datos del paño creado:');
        console.log(`   - ID: ${pano.id_item}`);
        console.log(`   - Tipo: ${pano.tipo_red}`);
        console.log(`   - Largo: ${pano.largo_m}m`);
        console.log(`   - Ancho: ${pano.ancho_m}m`);
        console.log(`   - Área calculada: ${pano.area_m2}m²`);
        console.log(`   - Estado: ${pano.estado}`);
        console.log(`   - Ubicación: ${pano.ubicacion}`);
        
        // Verificar que el área se calculó correctamente
        const areaEsperada = (5.5 * 3.2).toFixed(3);
        const areaReal = parseFloat(pano.area_m2).toFixed(3);
        
        if (areaEsperada === areaReal) {
            console.log('✅ Área calculada correctamente');
        } else {
            console.log(`❌ Error en cálculo de área. Esperado: ${areaEsperada}, Real: ${areaReal}`);
        }
        
        console.log('\n🎉 Prueba completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.response?.data || error.message);
    }
}

testPanoLargoAncho(); 