const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000/api/v1';

// Código 2FA - CAMBIAR POR TU CÓDIGO REAL
const OTP_CODE = 'AQUÍ_TU_CODIGO_2FA';

// Función para obtener token de autenticación
async function getAuthToken() {
    try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        
        // Si el backend indica que requiere 2FA
        if (response.data && response.data.require2FA) {
            const otp = await promptForOTP();
            // Enviar el código OTP usando el endpoint correcto
            const otpResponse = await axios.post(`${BASE_URL}/auth/login/2fa`, {
                tempToken: response.data.tempToken,
                token: otp
            });
            if (otpResponse.data.success) {
                return otpResponse.data.data.tokens.accessToken;
            } else {
                throw new Error('Error en 2FA: ' + otpResponse.data.message);
            }
        }
        
        // Si el login fue exitoso y no requiere 2FA
        if (response.data.success) {
            return response.data.data.tokens.accessToken;
        } else {
            throw new Error('Error en login: ' + response.data.message);
        }
    } catch (error) {
        throw new Error(`Error obteniendo token: ${error.message}`);
    }
}

// Función para pedir el código OTP
async function promptForOTP() {
    if (!OTP_CODE || OTP_CODE === 'AQUÍ_TU_CODIGO_2FA') {
        throw new Error('Por favor, pon tu código 2FA en la variable OTP_CODE al inicio del script.');
    }
    return OTP_CODE.trim();
}

async function testPDFSimple() {
    console.log('🔍 Probando generación y descarga de PDF...');
    
    try {
        // Obtener token de autenticación
        const token = await getAuthToken();
        console.log('✅ Token de autenticación obtenido');
        
        // Configurar headers con token
        const headers = {
            'Authorization': `Bearer ${token}`
        };
        
        // Obtener una orden existente
        const ordenesResponse = await axios.get(`${BASE_URL}/ordenes?limit=1`, { headers });
        
        if (!ordenesResponse.data.success || !ordenesResponse.data.data.ordenes.length) {
            console.log('❌ No hay órdenes disponibles para probar PDF');
            return;
        }
        
        const orden = ordenesResponse.data.data.ordenes[0];
        console.log(`📋 Usando orden: ${orden.numero_op} (ID: ${orden.id_op})`);
        
        // Generar PDF
        console.log('📄 Generando PDF...');
        const pdfResponse = await axios.get(`${BASE_URL}/ordenes/${orden.id_op}/pdf`, { headers });
        
        if (pdfResponse.data.success) {
            console.log('✅ PDF generado exitosamente');
            console.log(`   Filename: ${pdfResponse.data.data.filename}`);
        } else {
            console.log('❌ Error generando PDF:', pdfResponse.data.message);
            return;
        }
        
        // Descargar PDF
        console.log('📥 Descargando PDF...');
        const downloadResponse = await axios.get(`${BASE_URL}/ordenes/${orden.id_op}/pdf/download`, {
            responseType: 'stream',
            headers
        });
        
        console.log('✅ PDF descargado exitosamente');
        console.log(`   Content-Type: ${downloadResponse.headers['content-type']}`);
        console.log(`   Content-Length: ${downloadResponse.headers['content-length']}`);
        console.log(`   Content-Disposition: ${downloadResponse.headers['content-disposition']}`);
        
        // Verificar que el stream tiene contenido
        let dataLength = 0;
        downloadResponse.data.on('data', (chunk) => {
            dataLength += chunk.length;
        });
        
        downloadResponse.data.on('end', () => {
            console.log(`   Datos recibidos: ${dataLength} bytes`);
            if (dataLength > 0) {
                console.log('✅ PDF descargado correctamente con contenido');
                console.log('🔍 Ahora puedes probar descargar desde el frontend');
            } else {
                console.log('❌ PDF descargado pero sin contenido');
            }
        });
        
        downloadResponse.data.on('error', (error) => {
            console.log('❌ Error en stream de descarga:', error.message);
        });
        
    } catch (error) {
        console.log('❌ Error en prueba de PDF:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
}

async function runTest() {
    console.log('🚀 Iniciando prueba simple de PDF...\n');
    
    await testPDFSimple();
    
    console.log('\n✨ Prueba completada');
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
    runTest().catch(console.error);
}

module.exports = {
    testPDFSimple,
    runTest
}; 