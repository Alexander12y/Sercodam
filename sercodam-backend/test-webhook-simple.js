// Script simple para probar el webhook de Make.com
require('dotenv').config();

const webhookService = require('./src/services/makeWebhookService');

async function testWebhook() {
    console.log('🧪 PRUEBA SIMPLE DE WEBHOOK\n');
    
    try {
        console.log('📋 Configuración del webhook:');
        console.log(`   URL: ${webhookService.makeWebhookUrl}`);
        console.log(`   API Key: ${webhookService.apiKey.substring(0, 8)}...`);
        
        // Datos de prueba
        const testData = {
            id_op: 999,
            numero_op: 'TEST-WEBHOOK-001',
            cliente: 'Cliente de Prueba Webhook',
            descripcion_trabajo: 'Prueba de webhook simple',
            observaciones: 'Esta es una prueba del webhook',
            prioridad: 'media',
            fecha_creacion: new Date(),
            fecha_inicio: '2025-01-15',
            fecha_fin: '2025-01-20',
            direccion_instalacion: 'Dirección de prueba',
            contacto_cliente: 'Contacto de prueba',
            telefono_cliente: '123-456-7890',
            estado: 'en_proceso',
            panos: [
                {
                    largo_m: 10,
                    ancho_m: 5,
                    cantidad: 1,
                    tipo_red: 'nylon',
                    area_m2: 50,
                    precio_m2: 25.50
                }
            ],
            materiales: [
                {
                    descripcion: 'Material de prueba',
                    categoria: 'General',
                    cantidad: 1,
                    unidad: 'unidad'
                }
            ],
            herramientas: [
                {
                    nombre: 'Herramienta de prueba',
                    descripcion: 'Descripción de herramienta',
                    categoria: 'General',
                    cantidad: 1
                }
            ]
        };
        
        console.log('\n📤 Enviando webhook de prueba...');
        
        const resultado = await webhookService.enviarOrdenEnProceso(testData);
        
        console.log('\n📊 Resultado:');
        console.log(`   Éxito: ${resultado.success}`);
        console.log(`   Status: ${resultado.status}`);
        console.log(`   PDF incluido: ${resultado.pdfIncluido}`);
        
        if (resultado.success) {
            console.log('✅ Webhook enviado exitosamente');
            console.log(`   Respuesta: ${JSON.stringify(resultado.data, null, 2)}`);
        } else {
            console.log('❌ Error enviando webhook');
            console.log(`   Error: ${resultado.error}`);
            console.log(`   Status: ${resultado.status}`);
        }
        
    } catch (error) {
        console.error('💥 Error crítico:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Ejecutar prueba
testWebhook().then(() => {
    console.log('\n✨ Prueba completada');
    process.exit(0);
}).catch(console.error); 