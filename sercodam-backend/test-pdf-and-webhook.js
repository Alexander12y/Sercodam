const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/v1';

// Función para obtener token de autenticación
async function getAuthToken() {
    try {
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        
        if (loginResponse.data.success) {
            return loginResponse.data.data.tokens.accessToken;
        } else {
            throw new Error('Error en login: ' + loginResponse.data.message);
        }
    } catch (error) {
        console.log('❌ Error obteniendo token de autenticación:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
        throw error;
    }
}

async function testPDFGeneration() {
    console.log('🔍 Probando generación de PDF...');
    
    try {
        // Obtener token de autenticación
        const token = await getAuthToken();
        console.log('✅ Token de autenticación obtenido');
        
        // Configurar headers con token
        const headers = {
            'Authorization': `Bearer ${token}`
        };
        
        // Primero obtener una orden existente
        const ordenesResponse = await axios.get(`${BASE_URL}/ordenes?limit=1`, { headers });
        
        if (!ordenesResponse.data.success || !ordenesResponse.data.data.ordenes.length) {
            console.log('❌ No hay órdenes disponibles para probar PDF');
            return;
        }
        
        const orden = ordenesResponse.data.data.ordenes[0];
        console.log(`📋 Usando orden: ${orden.numero_op} (ID: ${orden.id_op})`);
        
        // Probar generación de PDF
        const pdfResponse = await axios.get(`${BASE_URL}/ordenes/${orden.id_op}/pdf`, {
            responseType: 'stream',
            headers
        });
        
        console.log('✅ PDF generado exitosamente');
        console.log(`📄 Content-Type: ${pdfResponse.headers['content-type']}`);
        console.log(`📄 Content-Length: ${pdfResponse.headers['content-length']}`);
        console.log(`📄 Content-Disposition: ${pdfResponse.headers['content-disposition']}`);
        
        // NO guardar el PDF automáticamente - solo verificar que se genera correctamente
        console.log('📄 PDF generado correctamente (no guardado automáticamente)');
        
    } catch (error) {
        console.log('❌ Error generando PDF:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
}

async function testMakeWebhookConfig() {
    console.log('\n🔍 Probando configuración de Make.com webhook...');
    
    try {
        const configResponse = await axios.get(`${BASE_URL}/webhook/make-config`);
        
        if (configResponse.data.success) {
            console.log('✅ Configuración obtenida:');
            console.log(`   Webhook URL: ${configResponse.data.data.webhookUrl}`);
            console.log(`   API Key: ${configResponse.data.data.apiKey ? 'Configurado' : 'No configurado'}`);
            console.log(`   Timeout: ${configResponse.data.data.timeout}ms`);
        } else {
            console.log('❌ Error obteniendo configuración:', configResponse.data.message);
        }
        
    } catch (error) {
        console.log('❌ Error verificando configuración:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
}

async function testMakeWebhook() {
    console.log('\n🔍 Probando envío de webhook a Make.com...');
    
    try {
        const webhookResponse = await axios.post(`${BASE_URL}/webhook/test-make`);
        
        if (webhookResponse.data.success) {
            console.log('✅ Webhook enviado exitosamente a Make.com');
            console.log(`   Status: ${webhookResponse.data.data.status}`);
            console.log(`   URL: ${webhookResponse.data.data.url}`);
            console.log(`   Response:`, webhookResponse.data.data.data);
        } else {
            console.log('❌ Error enviando webhook:', webhookResponse.data.message);
        }
        
    } catch (error) {
        console.log('❌ Error enviando webhook:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
}

async function testEstadoChange() {
    console.log('\n🔍 Probando cambio de estado con webhook...');
    
    try {
        // Obtener token de autenticación
        const token = await getAuthToken();
        const headers = {
            'Authorization': `Bearer ${token}`
        };
        
        // Obtener una orden en proceso
        const ordenesResponse = await axios.get(`${BASE_URL}/ordenes?estado=en_proceso&limit=1`, { headers });
        
        if (!ordenesResponse.data.success || !ordenesResponse.data.data.ordenes.length) {
            console.log('❌ No hay órdenes en proceso para probar cambio de estado');
            return;
        }
        
        const orden = ordenesResponse.data.data.ordenes[0];
        console.log(`📋 Cambiando estado de orden: ${orden.numero_op} (ID: ${orden.id_op})`);
        
        // Cambiar estado a en_proceso
        const estadoResponse = await axios.patch(`${BASE_URL}/ordenes/${orden.id_op}/estado`, {
            estado: 'en_proceso',
            notas: 'Prueba de webhook automático'
        }, { headers });
        
        if (estadoResponse.data.success) {
            console.log('✅ Estado cambiado exitosamente');
            console.log(`   Estado anterior: ${estadoResponse.data.data.estado_anterior}`);
            console.log(`   Estado nuevo: ${estadoResponse.data.data.estado_nuevo}`);
            console.log(`   Webhook enviado: ${estadoResponse.data.data.webhook_enviado}`);
        } else {
            console.log('❌ Error cambiando estado:', estadoResponse.data.message);
        }
        
    } catch (error) {
        console.log('❌ Error cambiando estado:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
}

async function runAllTests() {
    console.log('🚀 Iniciando pruebas de PDF y Webhook...\n');
    
    await testPDFGeneration();
    await testMakeWebhookConfig();
    await testMakeWebhook();
    await testEstadoChange();
    
    console.log('\n✨ Pruebas completadas');
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testPDFGeneration,
    testMakeWebhookConfig,
    testMakeWebhook,
    testEstadoChange,
    runAllTests
}; 