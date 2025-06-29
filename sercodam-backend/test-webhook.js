const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';
const WEBHOOK_URL = `${API_BASE_URL}/webhook/make/orden-produccion`;
const API_KEY = 'sercodam_make_webhook_2025'; // Clave de prueba

// Datos de ejemplo para probar el webhook
const testData = {
    cliente: 'LH - IK',
    descripcion_trabajo: '255.00 m2 de Red de Nylon',
    observaciones: 'CON REFUERZO EN LAS ORILLAS',
    prioridad: 'media',
    fecha_entrega: '2025-05-15',
    direccion_instalacion: 'Av. Principal 123, Ciudad de México',
    contacto_cliente: 'Juan Pérez',
    telefono_cliente: '55-1234-5678',
    panos: [
        {
            largo: 50.00,
            ancho: 1.70,
            cantidad: 3,
            tipo_red: 'nylon',
            calibre: '18',
            cuadro: '1"',
            torsion: 'torcida',
            refuerzo: 'con refuerzo',
            color: 'teñida',
            precio_m2: 100.00
        }
    ],
    materiales: [
        {
            id_item: 1,
            cantidad: 10,
            notas: 'Cables de sujeción'
        }
    ],
    herramientas: [
        {
            id_item: 1,
            cantidad: 2,
            notas: 'Taladros para instalación'
        }
    ],
    precio_total: 25500.00,
    iva: 4080.00,
    total_con_iva: 29580.00,
    flete: 'por cobrar'
};

async function testWebhook() {
    console.log('🧪 Probando webhook de Make.com...');
    console.log('📡 URL:', WEBHOOK_URL);
    console.log('🔑 API Key:', API_KEY.substring(0, 10) + '...');
    console.log('📦 Datos de prueba:', JSON.stringify(testData, null, 2));

    try {
        const response = await axios.post(WEBHOOK_URL, testData, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY
            },
            timeout: 30000
        });

        console.log('✅ Webhook exitoso!');
        console.log('📊 Respuesta:', response.data);
        
        if (response.data.success) {
            console.log('🎉 Orden de producción creada exitosamente');
            console.log('📋 Número de orden:', response.data.data.numero_op);
            console.log('🆔 ID de orden:', response.data.data.id_op);
        }

    } catch (error) {
        console.error('❌ Error en webhook:', error.response?.data || error.message);
        
        if (error.response) {
            console.error('📊 Status:', error.response.status);
            console.error('📋 Headers:', error.response.headers);
        }
    }
}

async function testHealthCheck() {
    console.log('\n🏥 Probando health check del webhook...');
    
    try {
        const response = await axios.get(`${API_BASE_URL}/webhook/make/health`);
        console.log('✅ Health check exitoso:', response.data);
    } catch (error) {
        console.error('❌ Health check falló:', error.response?.data || error.message);
    }
}

async function testConfig() {
    console.log('\n⚙️ Probando configuración del webhook...');
    
    try {
        const response = await axios.get(`${API_BASE_URL}/webhook/make/config`);
        console.log('✅ Configuración obtenida:', response.data);
    } catch (error) {
        console.error('❌ Error obteniendo configuración:', error.response?.data || error.message);
    }
}

async function runTests() {
    console.log('🚀 Iniciando pruebas del webhook de Make.com\n');
    
    await testHealthCheck();
    await testConfig();
    await testWebhook();
    
    console.log('\n✨ Pruebas completadas');
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = {
    testWebhook,
    testHealthCheck,
    testConfig,
    testData
}; 