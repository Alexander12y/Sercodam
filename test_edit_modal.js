const axios = require('axios');

async function testEditModal() {
    try {
        const API_BASE_URL = 'http://localhost:4000/api/v1';
        
        // Login
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.tokens.accessToken;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        console.log('🔍 === TEST MODAL DE EDICIÓN ===\n');
        
        // 1. Obtener datos iniciales del paño 856
        console.log('1. 📊 DATOS INICIALES DEL PAÑO 856:');
        const initialResponse = await axios.get(`${API_BASE_URL}/inventario/panos/856`);
        const initialData = initialResponse.data.data;
        console.log('   📋 ID:', initialData.id_item);
        console.log('   📋 ID_MCR:', initialData.id_mcr);
        console.log('   📋 Tipo de red:', initialData.tipo_red);
        console.log('   📋 Largo:', initialData.largo_m);
        console.log('   📋 Ancho:', initialData.ancho_m);
        console.log('   📋 Estado:', initialData.estado);
        console.log('   📋 Ubicación:', initialData.ubicacion);
        console.log('   📋 Precio:', initialData.precio_x_unidad);
        console.log('   📋 Stock mínimo:', initialData.stock_minimo);
        console.log('   📋 Calibre:', initialData.calibre);
        console.log('   📋 Cuadro:', initialData.cuadro);
        console.log('   📋 Torsión:', initialData.torsion);
        console.log('   📋 Refuerzo:', initialData.refuerzo);
        
        // 2. Simular actualización con solo campos básicos (como lo haría el modal)
        console.log('\n2. 🔄 SIMULANDO ACTUALIZACIÓN DEL MODAL:');
        const updateData = {
            // SOLO campos básicos (sin tipo_red ni especificaciones)
            largo_m: 1500,
            ancho_m: 1000,
            estado: 'malo',
            ubicacion: 'Querétaro',
            precio_x_unidad: 750,
            stock_minimo: 30
        };
        
        console.log('   📋 Datos a enviar (solo campos básicos):', updateData);
        
        const updateResponse = await axios.put(`${API_BASE_URL}/inventario/panos/856`, updateData);
        console.log('   ✅ Respuesta:', updateResponse.data);
        
        // 3. Verificar que solo cambiaron los campos básicos
        console.log('\n3. 🔍 VERIFICANDO CAMBIOS:');
        const finalResponse = await axios.get(`${API_BASE_URL}/inventario/panos/856?_t=${Date.now()}`);
        const finalData = finalResponse.data.data;
        
        console.log('   📋 Largo:', finalData.largo_m);
        console.log('   📋 Ancho:', finalData.ancho_m);
        console.log('   📋 Estado:', finalData.estado);
        console.log('   📋 Ubicación:', finalData.ubicacion);
        console.log('   📋 Precio:', finalData.precio_x_unidad);
        console.log('   📋 Stock mínimo:', finalData.stock_minimo);
        
        // 4. Verificar que las especificaciones NO cambiaron
        console.log('\n4. 🔍 VERIFICANDO QUE ESPECIFICACIONES NO CAMBIARON:');
        console.log('   📋 Calibre:', finalData.calibre);
        console.log('   📋 Cuadro:', finalData.cuadro);
        console.log('   📋 Torsión:', finalData.torsion);
        console.log('   📋 Refuerzo:', finalData.refuerzo);
        
        // 5. Análisis
        console.log('\n5. 📊 ANÁLISIS:');
        const basicFieldsChanged = 
            finalData.largo_m == '1500.000' &&
            finalData.ancho_m == '1000.000' &&
            finalData.estado == 'malo' &&
            finalData.ubicacion == 'Querétaro' &&
            finalData.precio_x_unidad == '750.00' &&
            finalData.stock_minimo == '30.00';
            
        const specsUnchanged = 
            finalData.calibre == initialData.calibre &&
            finalData.cuadro == initialData.cuadro &&
            finalData.torsion == initialData.torsion &&
            finalData.refuerzo == initialData.refuerzo;
            
        const tipoRedUnchanged = finalData.tipo_red == initialData.tipo_red;
        
        console.log(`   ${basicFieldsChanged ? '✅' : '❌'} Campos básicos cambiaron: ${basicFieldsChanged}`);
        console.log(`   ${specsUnchanged ? '✅' : '❌'} Especificaciones no cambiaron: ${specsUnchanged}`);
        console.log(`   ${tipoRedUnchanged ? '✅' : '❌'} Tipo de red no cambió: ${tipoRedUnchanged}`);
        
        if (basicFieldsChanged && specsUnchanged && tipoRedUnchanged) {
            console.log('\n   🎉 ¡PERFECTO! El modal de edición funciona correctamente:');
            console.log('      ✅ Solo actualiza campos básicos');
            console.log('      ✅ Mantiene especificaciones intactas');
            console.log('      ✅ Mantiene tipo de red intacto');
        } else {
            console.log('\n   ❌ El modal de edición NO funciona correctamente');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testEditModal(); 