require('dotenv').config();

async function testEmailProcessingSimple() {
    console.log('🧪 === PRUEBA SIMPLE DE PROCESAMIENTO DE EMAILS ===\n');
    
    try {
        // 1. Verificar variables de entorno básicas
        console.log('1️⃣ Verificando variables de entorno...');
        const requiredVars = [
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET', 
            'GOOGLE_REFRESH_TOKEN'
        ];
        
        const missingVars = [];
        for (const varName of requiredVars) {
            if (!process.env[varName]) {
                missingVars.push(varName);
            }
        }
        
        if (missingVars.length > 0) {
            console.log('❌ Variables faltantes:', missingVars.join(', '));
            return;
        }
        
        console.log('✅ Variables de entorno básicas configuradas');
        
        // 2. Probar conexión con Gmail directamente
        console.log('\n2️⃣ Probando conexión con Gmail...');
        try {
            const { google } = require('googleapis');
            
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                'http://localhost:3000/oauth2callback'
            );
            
            oauth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });
            
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
            
            // Probar obtener perfil
            const profile = await gmail.users.getProfile({ userId: 'me' });
            console.log('✅ Conexión exitosa con Gmail');
            console.log(`   Email: ${profile.data.emailAddress}`);
            console.log(`   Messages: ${profile.data.messagesTotal}`);
            
            // Probar buscar emails
            const response = await gmail.users.messages.list({
                userId: 'me',
                q: 'to:sercodamxbuddify@gmail.com',
                maxResults: 5
            });
            
            if (response.data.messages) {
                console.log(`   Emails encontrados: ${response.data.messages.length}`);
            } else {
                console.log('   No se encontraron emails');
            }
            
        } catch (error) {
            console.log('❌ Error conectando con Gmail:', error.message);
            return;
        }
        
        // 3. Probar servicios sin Redis
        console.log('\n3️⃣ Probando servicios de email...');
        try {
            // Importar servicios después de verificar la conexión
            const gmailService = require('./src/services/gmailService');
            const emailAutoProcessor = require('./src/services/emailAutoProcessor');
            
            // Probar obtener emails de Sercodam
            const emails = await gmailService.getSercodamEmails();
            console.log(`✅ Servicio Gmail funcionando, ${emails.length} emails encontrados`);
            
            if (emails.length > 0) {
                console.log('📧 Emails de ejemplo:');
                emails.slice(0, 2).forEach((email, index) => {
                    console.log(`   ${index + 1}. ${email.subject} (${email.from})`);
                });
            }
            
            // Probar procesamiento automático
            console.log('\n4️⃣ Probando procesamiento automático...');
            const results = await emailAutoProcessor.processEmails();
            console.log('✅ Procesamiento automático completado:');
            console.log(`   - Procesados: ${results.processed}`);
            console.log(`   - Creados: ${results.created}`);
            console.log(`   - Errores: ${results.errors}`);
            console.log(`   - Omitidos: ${results.skipped}`);
            
        } catch (error) {
            console.log('❌ Error en servicios:', error.message);
            console.log('Stack:', error.stack);
        }
        
        console.log('\n🎉 === PRUEBA COMPLETADA ===');
        
    } catch (error) {
        console.error('💥 Error en la prueba:', error);
    }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
    testEmailProcessingSimple()
        .then(() => {
            console.log('\n✅ Prueba finalizada');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Prueba falló:', error);
            process.exit(1);
        });
}

module.exports = { testEmailProcessingSimple }; 