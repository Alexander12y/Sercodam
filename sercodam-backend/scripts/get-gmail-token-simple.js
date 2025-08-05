const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function getGmailToken() {
  console.log('🔐 === OBTENER TOKEN DE GMAIL ===\n');
  
  try {
    // Verificar variables de entorno
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.log('❌ Variables de entorno no configuradas');
      console.log('Por favor, configura GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en tu archivo .env');
      return;
    }
    
    console.log('✅ Variables de entorno encontradas');
    console.log(`Client ID: ${clientId.substring(0, 20)}...`);
    
    // Crear cliente OAuth2
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost:3000/oauth2callback'
    );
    
    // Generar URL de autorización
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent'
    });
    
    console.log('\n🌐 Abre esta URL en tu navegador para autorizar la aplicación:');
    console.log(authUrl);
    console.log('\n📋 Después de autorizar, copia el código de autorización de la URL');
    console.log('El código aparecerá después de "code=" en la URL de redirección');
    
    // Solicitar código de autorización
    const authCode = await question('\n🔑 Código de autorización: ');
    
    if (!authCode) {
      console.log('❌ Código de autorización requerido');
      return;
    }
    
    console.log('\n🔄 Intercambiando código por tokens...');
    
    // Intercambiar código por tokens
    const { tokens } = await oauth2Client.getToken(authCode);
    
    console.log('✅ Tokens obtenidos exitosamente!\n');
    
    // Mostrar tokens
    console.log('📋 === TOKENS OBTENIDOS ===');
    console.log(`Access Token: ${tokens.access_token.substring(0, 20)}...`);
    console.log(`Refresh Token: ${tokens.refresh_token}`);
    console.log(`Expires In: ${tokens.expires_in} segundos`);
    console.log(`Token Type: ${tokens.token_type}`);
    
    if (tokens.scope) {
      console.log(`Scope: ${tokens.scope}`);
    }
    
    console.log('\n💾 === CONFIGURACIÓN PARA .ENV ===');
    console.log('Agrega esta línea a tu archivo .env:');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    
    // Probar conexión
    console.log('\n🧪 === PROBANDO CONEXIÓN ===');
    
    oauth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log('✅ Conexión exitosa con Gmail');
      console.log(`Email: ${profile.data.emailAddress}`);
      console.log(`Messages Total: ${profile.data.messagesTotal}`);
      console.log(`Threads Total: ${profile.data.threadsTotal}`);
    } catch (error) {
      console.log('❌ Error probando conexión:', error.message);
    }
    
    console.log('\n🎉 === CONFIGURACIÓN COMPLETADA ===');
    console.log('Ahora puedes usar el procesamiento automático de emails');
    
  } catch (error) {
    console.error('💥 Error obteniendo token:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Sugerencia: Verifica tu conexión a internet');
    } else if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Sugerencia: El código de autorización puede haber expirado');
      console.log('Intenta generar un nuevo código de autorización');
    }
  } finally {
    rl.close();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  getGmailToken()
    .then(() => {
      console.log('\n✅ Script completado');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script falló:', error);
      process.exit(1);
    });
}

module.exports = { getGmailToken }; 