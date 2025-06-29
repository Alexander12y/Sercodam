const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/v1';

async function testWebhookEndpoints() {
    console.log('🔍 Probando endpoints de webhook...\n');
    
    try {
        // Probar endpoint de configuración
        console.log('1. Probando /webhook/make-config...');
        const configResponse = await axios.get(`${BASE_URL}/webhook/make-config`);
        console.log('✅ Configuración obtenida:', configResponse.data);
        
    } catch (error) {
        console.log('❌ Error en configuración:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
    
    try {
        // Probar endpoint de test
        console.log('\n2. Probando /webhook/test-make...');
        const testResponse = await axios.post(`${BASE_URL}/webhook/test-make`);
        console.log('✅ Test exitoso:', testResponse.data);
        
    } catch (error) {
        console.log('❌ Error en test:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
    
    try {
        // Probar endpoint de health
        console.log('\n3. Probando /webhook/health...');
        const healthResponse = await axios.get(`${BASE_URL}/webhook/health`);
        console.log('✅ Health check:', healthResponse.data);
        
    } catch (error) {
        console.log('❌ Error en health check:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
}

testWebhookEndpoints().catch(console.error); 