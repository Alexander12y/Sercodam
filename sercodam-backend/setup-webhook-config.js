const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupWebhookConfig() {
    console.log('🔧 Configuración de Webhook para Make.com\n');
    
    try {
        const envPath = path.join(__dirname, '.env');
        let envContent = '';
        
        // Leer archivo .env existente si existe
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
            console.log('📁 Archivo .env encontrado, actualizando configuración...\n');
        } else {
            console.log('📁 Creando nuevo archivo .env...\n');
        }
        
        // Solicitar configuración
        const makeWebhookUrl = await question('🔗 URL del webhook de Make.com: ');
        const makeApiKey = await question('🔑 API Key de Make.com: ');
        
        // Validar entrada
        if (!makeWebhookUrl || !makeApiKey) {
            console.log('❌ Error: URL y API Key son requeridos');
            process.exit(1);
        }
        
        // Preparar contenido del archivo .env
        const newEnvLines = [
            '# Configuración de Make.com Webhook',
            `MAKE_WEBHOOK_URL=${makeWebhookUrl}`,
            `MAKE_API_KEY=${makeApiKey}`,
            ''
        ];
        
        // Separar líneas existentes
        const existingLines = envContent.split('\n');
        const webhookLines = [];
        const otherLines = [];
        let inWebhookSection = false;
        
        for (const line of existingLines) {
            if (line.includes('MAKE_WEBHOOK_URL') || line.includes('MAKE_API_KEY')) {
                inWebhookSection = true;
                continue;
            }
            
            if (inWebhookSection && line.trim() === '') {
                inWebhookSection = false;
                continue;
            }
            
            if (inWebhookSection) {
                continue;
            }
            
            otherLines.push(line);
        }
        
        // Combinar contenido
        const finalContent = [...otherLines, ...newEnvLines].join('\n');
        
        // Escribir archivo
        fs.writeFileSync(envPath, finalContent);
        
        console.log('\n✅ Configuración guardada exitosamente!');
        console.log(`📁 Archivo: ${envPath}`);
        console.log(`🔗 Webhook URL: ${makeWebhookUrl}`);
        console.log(`🔑 API Key: ${makeApiKey.substring(0, 8)}...`);
        
        console.log('\n📋 Próximos pasos:');
        console.log('1. Reiniciar el servidor para cargar la nueva configuración');
        console.log('2. Probar la configuración con: npm run test-webhook');
        console.log('3. Verificar en Make.com que el webhook esté configurado correctamente');
        
    } catch (error) {
        console.error('❌ Error configurando webhook:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    setupWebhookConfig().catch(console.error);
}

module.exports = { setupWebhookConfig }; 