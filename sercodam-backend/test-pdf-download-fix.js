const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

// Función para pedir el código OTP
async function promptForOTP() {
    if (!OTP_CODE || OTP_CODE === 'AQUÍ_TU_CODIGO_2FA') {
        throw new Error('Por favor, pon tu código 2FA en la variable OTP_CODE al inicio del script.');
    }
    return OTP_CODE.trim();
}

async function testPDFDownload() {
    console.log('🔍 Probando descarga de PDF...');
    
    try {
        // Obtener token de autenticación
        const token = await getAuthToken();
        console.log('✅ Token de autenticación obtenido');
        
        // Configurar headers con token
        const headers = {
            'Authorization': `Bearer ${token}`
        };
        
        // Primero obtener una orden existente que tenga PDF generado
        const ordenesResponse = await axios.get(`${BASE_URL}/ordenes?limit=10`, { headers });
        
        if (!ordenesResponse.data.success || !ordenesResponse.data.data.ordenes.length) {
            console.log('❌ No hay órdenes disponibles para probar PDF');
            return;
        }
        
        // Buscar una orden que tenga PDF generado
        const ordenConPDF = ordenesResponse.data.data.ordenes.find(orden => 
            orden.pdf_generado === true && orden.pdf_filename
        );
        
        if (!ordenConPDF) {
            console.log('❌ No hay órdenes con PDF generado');
            console.log('📄 Generando PDF para una orden existente...');
            
            // Generar PDF para la primera orden
            const primeraOrden = ordenesResponse.data.data.ordenes[0];
            console.log(`📋 Usando orden: ${primeraOrden.numero_op} (ID: ${primeraOrden.id_op})`);
            
            // Generar PDF
            const pdfResponse = await axios.get(`${BASE_URL}/ordenes/${primeraOrden.id_op}/pdf`, { headers });
            
            if (pdfResponse.data.success) {
                console.log('✅ PDF generado exitosamente');
                console.log(`   Filename: ${pdfResponse.data.data.filename}`);
                
                // Ahora intentar descargar
                await testDownloadPDF(primeraOrden.id_op, pdfResponse.data.data.filename, headers);
            } else {
                console.log('❌ Error generando PDF:', pdfResponse.data.message);
            }
        } else {
            console.log(`📋 Usando orden con PDF existente: ${ordenConPDF.numero_op} (ID: ${ordenConPDF.id_op})`);
            console.log(`   PDF: ${ordenConPDF.pdf_filename}`);
            
            // Probar descarga del PDF existente
            await testDownloadPDF(ordenConPDF.id_op, ordenConPDF.pdf_filename, headers);
        }
        
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

async function testDownloadPDF(ordenId, filename, headers) {
    console.log('📥 Probando descarga de PDF...');
    
    try {
        // Paso 1: Verificar que el archivo existe en el servidor
        console.log('🔍 Verificando que el archivo existe en el servidor...');
        const filepath = path.join(__dirname, 'temp', filename);
        
        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            console.log(`✅ Archivo encontrado en servidor:`);
            console.log(`   Ruta: ${filepath}`);
            console.log(`   Tamaño: ${stats.size} bytes`);
            console.log(`   Última modificación: ${stats.mtime}`);
            
            if (stats.size === 0) {
                console.log('⚠️  ADVERTENCIA: El archivo PDF está vacío (0 bytes)');
                console.log('   Esto indica un problema en la generación del PDF');
            }
        } else {
            console.log('❌ Archivo no encontrado en el servidor');
            console.log(`   Buscado en: ${filepath}`);
            return;
        }
        
        // Paso 2: Intentar descargar el PDF
        console.log('📥 Descargando PDF desde la API...');
        const downloadResponse = await axios.get(`${BASE_URL}/ordenes/${ordenId}/pdf/download`, {
            responseType: 'stream',
            headers
        });
        
        console.log('✅ Respuesta de descarga recibida');
        console.log(`   Content-Type: ${downloadResponse.headers['content-type']}`);
        console.log(`   Content-Length: ${downloadResponse.headers['content-length']}`);
        console.log(`   Content-Disposition: ${downloadResponse.headers['content-disposition']}`);
        
        // Paso 3: Guardar el PDF descargado para verificar
        const testFilename = `test_download_${Date.now()}.pdf`;
        const testPath = path.join(__dirname, 'temp', testFilename);
        
        const writer = fs.createWriteStream(testPath);
        downloadResponse.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`💾 PDF descargado guardado en: ${testPath}`);
                
                // Verificar que el archivo descargado es válido
                const stats = fs.statSync(testPath);
                console.log(`   Tamaño del archivo descargado: ${stats.size} bytes`);
                
                if (stats.size > 0) {
                    console.log('✅ PDF descargado correctamente');
                    console.log('🔍 Verifica que puedas abrir el archivo PDF en tu computadora');
                    
                    // Comparar con el archivo original
                    const originalStats = fs.statSync(filepath);
                    console.log(`   Tamaño original: ${originalStats.size} bytes`);
                    console.log(`   Tamaño descargado: ${stats.size} bytes`);
                    
                    if (stats.size === originalStats.size) {
                        console.log('✅ Los tamaños coinciden - descarga exitosa');
                    } else {
                        console.log('⚠️  Los tamaños no coinciden - posible problema en la descarga');
                    }
                } else {
                    console.log('❌ El archivo PDF descargado está vacío');
                }
                
                resolve();
            });
            
            writer.on('error', (error) => {
                console.log('❌ Error guardando PDF descargado:', error.message);
                reject(error);
            });
        });
        
    } catch (error) {
        console.log('❌ Error descargando PDF:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
}

async function runTest() {
    console.log('🚀 Iniciando prueba de descarga de PDF...\n');
    
    await testPDFDownload();
    
    console.log('\n✨ Prueba completada');
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
    runTest().catch(console.error);
}

module.exports = {
    testPDFDownload,
    runTest
}; 