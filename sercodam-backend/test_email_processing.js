const emailAutoProcessor = require('./src/services/emailAutoProcessor');
const gmailService = require('./src/services/gmailService');
const emailConfig = require('./src/config/emailConfig');
const logger = require('./src/config/logger');

async function testEmailProcessing() {
    console.log('🧪 === PRUEBA DE PROCESAMIENTO DE EMAILS ===\n');
    
    try {
        // 1. Verificar configuración
        console.log('1️⃣ Verificando configuración...');
        const configValid = emailConfig.validate();
        console.log('✅ Configuración válida:', configValid);
        
        if (!configValid) {
            console.log('❌ Configuración inválida, abortando prueba');
            return;
        }
        
        // 2. Probar conexión con Gmail
        console.log('\n2️⃣ Probando conexión con Gmail...');
        try {
            const emails = await gmailService.getSercodamEmails();
            console.log(`✅ Conexión exitosa, encontrados ${emails.length} emails`);
            
            if (emails.length > 0) {
                console.log('📧 Emails encontrados:');
                emails.slice(0, 3).forEach((email, index) => {
                    console.log(`   ${index + 1}. ${email.subject} (${email.from})`);
                });
            }
        } catch (error) {
            console.log('❌ Error conectando con Gmail:', error.message);
            console.log('⚠️ Verifica las credenciales de Gmail');
            return;
        }
        
        // 3. Probar procesamiento de un email específico
        console.log('\n3️⃣ Probando procesamiento de email...');
        try {
            const emails = await gmailService.getSercodamEmails();
            if (emails.length > 0) {
                const testEmail = emails[0];
                console.log(`📧 Procesando email: ${testEmail.subject}`);
                
                const result = await emailAutoProcessor.processSingleEmail(testEmail.messageId);
                
                if (result.processed) {
                    console.log('✅ Email procesado exitosamente');
                    console.log(`   Lead creado: ${result.lead.id_lead}`);
                    console.log(`   Cliente: ${result.lead.nombre_remitente}`);
                    console.log(`   Email: ${result.lead.email_remitente}`);
                } else {
                    console.log('ℹ️ Email ya procesado anteriormente');
                }
            } else {
                console.log('ℹ️ No hay emails para procesar');
            }
        } catch (error) {
            console.log('❌ Error procesando email:', error.message);
        }
        
        // 4. Probar procesamiento automático
        console.log('\n4️⃣ Probando procesamiento automático...');
        try {
            const results = await emailAutoProcessor.processEmails();
            console.log('✅ Procesamiento automático completado:');
            console.log(`   - Procesados: ${results.processed}`);
            console.log(`   - Creados: ${results.created}`);
            console.log(`   - Errores: ${results.errors}`);
            console.log(`   - Omitidos: ${results.skipped}`);
        } catch (error) {
            console.log('❌ Error en procesamiento automático:', error.message);
        }
        
        // 5. Verificar estado
        console.log('\n5️⃣ Estado del procesamiento:');
        const status = emailAutoProcessor.getStatus();
        console.log('   - Procesando:', status.isProcessing);
        console.log('   - Último email:', status.lastProcessedEmailId);
        console.log('   - Timestamp:', status.timestamp);
        
        console.log('\n🎉 === PRUEBA COMPLETADA ===');
        
    } catch (error) {
        console.error('💥 Error en la prueba:', error);
    }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
    testEmailProcessing()
        .then(() => {
            console.log('\n✅ Prueba finalizada');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Prueba falló:', error);
            process.exit(1);
        });
}

module.exports = { testEmailProcessing };