const axios = require('axios');

async function testIsolatedUpdate() {
    try {
        const API_BASE_URL = 'http://localhost:4000/api/v1';
        
        // Login
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.tokens.accessToken;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        console.log('🔍 === TEST DE AISLAMIENTO DE TRANSACCIONES ===\n');
        
        // 1. Obtener datos iniciales
        console.log('1. 📊 OBTENIENDO DATOS INICIALES...');
        const initialResponse = await axios.get(`${API_BASE_URL}/inventario/panos/856`);
        const initialData = initialResponse.data.data;
        console.log('   📋 Datos iniciales:', {
            largo_m: initialData.largo_m,
            cuadro: initialData.cuadro,
            refuerzo: initialData.refuerzo
        });
        
        // 2. Actualizar con valores únicos
        const timestamp = Date.now();
        const uniqueLargo = 1000 + (timestamp % 1000); // Valor único basado en timestamp
        const uniqueCuadro = `${timestamp % 10}"`;
        
        console.log('\n2. 🔄 ACTUALIZANDO CON VALORES ÚNICOS...');
        console.log(`   🎯 Nuevo largo: ${uniqueLargo}, Nuevo cuadro: ${uniqueCuadro}`);
        
        const updateData = {
            // NO enviar id_mcr - debe mantenerse el original del paño
            largo_m: uniqueLargo,
            ancho_m: 50,
            estado: 'bueno',
            ubicacion: 'Bodega CDMX',
            precio_x_unidad: 100,
            stock_minimo: 10,
            tipo_red: 'Nylon',
            calibre: '18',
            cuadro: uniqueCuadro,
            torsion: 'Torcida',
            refuerzo: 'No'
        };
        
        const updateResponse = await axios.put(`${API_BASE_URL}/inventario/panos/856`, updateData);
        console.log('   ✅ Respuesta de actualización:', updateResponse.data);
        
        // 3. Verificar inmediatamente (sin delay)
        console.log('\n3. ⚡ VERIFICANDO INMEDIATAMENTE (SIN DELAY)...');
        const immediateResponse = await axios.get(`${API_BASE_URL}/inventario/panos/856?_t=${Date.now()}`);
        const immediateData = immediateResponse.data.data;
        console.log('   📋 Datos inmediatos:', {
            largo_m: immediateData.largo_m,
            cuadro: immediateData.cuadro,
            refuerzo: immediateData.refuerzo
        });
        
        // 4. Verificar después de 1 segundo
        console.log('\n4. ⏳ ESPERANDO 1 SEGUNDO...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('5. 🔄 VERIFICANDO DESPUÉS DE 1 SEGUNDO...');
        const delayedResponse = await axios.get(`${API_BASE_URL}/inventario/panos/856?_t=${Date.now()}`);
        const delayedData = delayedResponse.data.data;
        console.log('   📋 Datos después de delay:', {
            largo_m: delayedData.largo_m,
            cuadro: delayedData.cuadro,
            refuerzo: delayedData.refuerzo
        });
        
        // 6. Verificar después de 5 segundos
        console.log('\n6. ⏳ ESPERANDO 5 SEGUNDOS MÁS...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('7. 🔄 VERIFICANDO DESPUÉS DE 5 SEGUNDOS TOTAL...');
        const finalResponse = await axios.get(`${API_BASE_URL}/inventario/panos/856?_t=${Date.now()}`);
        const finalData = finalResponse.data.data;
        console.log('   📋 Datos finales:', {
            largo_m: finalData.largo_m,
            cuadro: finalData.cuadro,
            refuerzo: finalData.refuerzo
        });
        
        // 7. Análisis de resultados
        console.log('\n8. 📊 ANÁLISIS DE RESULTADOS:');
        console.log(`   🎯 Valores esperados: largo=${uniqueLargo}, cuadro=${uniqueCuadro}, refuerzo=false`);
        console.log(`   ⚡ Inmediato: largo=${immediateData.largo_m}, cuadro=${immediateData.cuadro}, refuerzo=${immediateData.refuerzo}`);
        console.log(`   ⏳ 1 segundo: largo=${delayedData.largo_m}, cuadro=${delayedData.cuadro}, refuerzo=${delayedData.refuerzo}`);
        console.log(`   ⏰ 5 segundos: largo=${finalData.largo_m}, cuadro=${finalData.cuadro}, refuerzo=${finalData.refuerzo}`);
        
        const immediateCorrect = immediateData.largo_m == uniqueLargo && immediateData.cuadro == uniqueCuadro;
        const delayedCorrect = delayedData.largo_m == uniqueLargo && delayedData.cuadro == uniqueCuadro;
        const finalCorrect = finalData.largo_m == uniqueLargo && finalData.cuadro == uniqueCuadro;
        
        console.log(`\n   ${immediateCorrect ? '✅' : '❌'} Inmediato ${immediateCorrect ? 'CORRECTO' : 'INCORRECTO'}`);
        console.log(`   ${delayedCorrect ? '✅' : '❌'} 1 segundo ${delayedCorrect ? 'CORRECTO' : 'INCORRECTO'}`);
        console.log(`   ${finalCorrect ? '✅' : '❌'} 5 segundos ${finalCorrect ? 'CORRECTO' : 'INCORRECTO'}`);
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testIsolatedUpdate();