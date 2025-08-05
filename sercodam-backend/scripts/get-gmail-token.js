const { google } = require('googleapis');
const readline = require('readline');
const http = require('http');
const url = require('url');
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
      console.log('\nEjemplo:');
      console.log('GOOGLE_CLIENT_ID=tu_client_id');
      console.log('GOOGLE_CLIENT_SECRET=tu_client_secret');
      return;
    }
    
    console.log('✅ Variables de entorno encontradas');
    console.log(`Client ID: ${clientId.substring(0, 20)}...`);
    console.log('Usando flujo de loopback IP (localhost)\n');
    
    // Crear cliente OAuth2 con redirect_uri de loopback
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost:3001/oauth2callback'
    );
    
    // Crear servidor temporal para recibir el código de autorización
    const server = http.createServer(async (req, res) => {
      const queryObject = url.parse(req.url, true).query;
      
      if (queryObject.error) {
        console.log('❌ Error de autorización:', queryObject.error);
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end('<h1>Error de autorización</h1><p>Puedes cerrar esta ventana</p>');
        server.close();
        return;
      }
      
      if (queryObject.code) {
        console.log('🔄 Código de autorización recibido, intercambiando por tokens...');
        
        try {
          const { tokens } = await oauth2Client.getToken(queryObject.code);
          
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
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<h1>¡Autorización exitosa!</h1><p>Puedes cerrar esta ventana y revisar la terminal</p>');
          
        } catch (error) {
          console.error('💥 Error intercambiando tokens:', error.message);
          res.writeHead(500, { 'Content-Type': 'text/html' });
          res.end('<h1>Error intercambiando tokens</h1><p>Revisa la terminal para más detalles</p>');
        }
        
        server.close();
        rl.close();
        return;
      }
      
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h1>Error</h1><p>Parámetros inválidos</p>');
    });
    
    // Iniciar servidor en puerto 3001
    server.listen(3001, () => {
      console.log('🌐 Servidor temporal iniciado en http://localhost:3001');
      
      // Generar URL de autorización
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Forzar consentimiento para obtener refresh token
      });
      
      console.log('\n🌐 Abre esta URL en tu navegador para autorizar la aplicación:');
      console.log(authUrl);
      console.log('\n📋 El navegador se redirigirá automáticamente después de la autorización');
      console.log('⏳ Esperando autorización...\n');
    });
    
  } catch (error) {
    console.error('💥 Error obteniendo token:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Sugerencia: Verifica tu conexión a internet');
    } else if (error.message.includes('invalid_grant')) {
      console.log('\n💡 Sugerencia: El código de autorización puede haber expirado');
      console.log('Intenta generar un nuevo código de autorización');
    }
    
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