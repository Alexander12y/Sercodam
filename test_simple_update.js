const axios = require('axios');

async function testSimpleUpdate() {
    try {
        const API_BASE_URL = 'http://localhost:4000/api/v1';
        
        // Login
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.tokens.accessToken;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        console.log('🔍 === TEST SIMPLE UPDATE ===\n');
        
        // 1. Obtener datos iniciales
        console.log('1. 📊 DATOS INICIALES:');
        const initialResponse = await axios.get(`${API_BASE_URL}/inventario/panos/856`);
        const initialData = initialResponse.data.data;
        console.log('   📋 Largo:', initialData.largo_m);
        console.log('   📋 Ancho:', initialData.ancho_m);
        console.log('   📋 Estado:', initialData.estado);
        
        // 2. Actualizar SOLO campos básicos
        console.log('\n2. 🔄 ACTUALIZANDO CAMPOS BÁSICOS:');
        const updateData = {
            largo_m: 999,
            ancho_m: 888,
            estado: 'regular',
            ubicacion: 'Bodega Test',
            precio_x_unidad: 500,
            stock_minimo: 25
        };
        
        console.log('   📋 Datos a actualizar:', updateData);
        
        const updateResponse = await axios.put(`${API_BASE_URL}/inventario/panos/856`, updateData);
        console.log('   ✅ Respuesta:', updateResponse.data);
        
        // 3. Verificar cambios
        console.log('\n3. 🔍 VERIFICANDO CAMBIOS:');
        const finalResponse = await axios.get(`${API_BASE_URL}/inventario/panos/856?_t=${Date.now()}`);
        const finalData = finalResponse.data.data;
        
        console.log('   📋 Largo:', finalData.largo_m);
        console.log('   📋 Ancho:', finalData.ancho_m);
        console.log('   📋 Estado:', finalData.estado);
        console.log('   📋 Ubicación:', finalData.ubicacion);
        console.log('   📋 Precio:', finalData.precio_x_unidad);
        console.log('   📋 Stock mínimo:', finalData.stock_minimo);
        
        // 4. Análisis
        console.log('\n4. 📊 ANÁLISIS:');
        const largoChanged = finalData.largo_m == '999.000';
        const anchoChanged = finalData.ancho_m == '888.000';
        const estadoChanged = finalData.estado == 'regular';
        
        console.log(`   ${largoChanged ? '✅' : '❌'} Largo cambió: ${largoChanged}`);
        console.log(`   ${anchoChanged ? '✅' : '❌'} Ancho cambió: ${anchoChanged}`);
        console.log(`   ${estadoChanged ? '✅' : '❌'} Estado cambió: ${estadoChanged}`);
        
        if (largoChanged && anchoChanged && estadoChanged) {
            console.log('\n   🎉 ¡FUNCIONA! La actualización básica está funcionando');
        } else {
            console.log('\n   ❌ La actualización básica NO está funcionando');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testSimpleUpdate();