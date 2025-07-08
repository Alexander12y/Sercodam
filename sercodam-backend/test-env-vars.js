// Script para verificar variables de entorno del webhook
require('dotenv').config();

console.log('🔍 Verificando variables de entorno del webhook...\n');

const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
const makeApiKey = process.env.MAKE_API_KEY;

console.log('📋 Variables encontradas:');
console.log(`   MAKE_WEBHOOK_URL: ${makeWebhookUrl ? '✅ Configurada' : '❌ No configurada'}`);
console.log(`   MAKE_API_KEY: ${makeApiKey ? '✅ Configurada' : '❌ No configurada'}`);

if (makeWebhookUrl) {
    console.log(`   URL: ${makeWebhookUrl}`);
}

if (makeApiKey) {
    console.log(`   API Key: ${makeApiKey.substring(0, 8)}...`);
}

console.log('\n🔧 Probando servicio de webhook...');

const MakeWebhookService = require('./src/services/makeWebhookService');
const webhookService = new MakeWebhookService();

console.log(`   URL configurada: ${webhookService.makeWebhookUrl}`);
console.log(`   API Key configurada: ${webhookService.apiKey.substring(0, 8)}...`);

// Verificar si usa valores por defecto
if (webhookService.makeWebhookUrl.includes('your-webhook-url')) {
    console.log('⚠️  ADVERTENCIA: Usando URL por defecto - verificar archivo .env');
}

if (webhookService.apiKey.includes('your-make-api-key')) {
    console.log('⚠️  ADVERTENCIA: Usando API key por defecto - verificar archivo .env');
}

console.log('\n✨ Verificación completada'); 