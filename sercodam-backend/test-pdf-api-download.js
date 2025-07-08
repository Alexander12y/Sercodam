// Cargar variables de entorno
require('dotenv').config();

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:4000/api/v1';

// Función para obtener token de autenticación
async function getAuthToken() {
    try {
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        
        if (loginResponse.data.success) {
            return loginResponse.data.data.tokens.accessToken;
        } else {
            throw new Error('Error en login: ' + loginResponse.data.message);
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

async function testPDFAPIDownload() {
    console.log('🔍 Probando descarga de PDF a través de la API...');
    
    try {
        // Obtener token de autenticación
        const token = await getAuthToken();
        console.log('✅ Token de autenticación obtenido');
        
        // Configurar headers con token
        const headers = {
            'Authorization': `Bearer ${token}`
        };
        
        // Obtener una orden existente
        console.log('\n📋 Obteniendo órdenes disponibles...');
        const ordenesResponse = await axios.get(`${BASE_URL}/ordenes?limit=5`, { headers });
        
        if (!ordenesResponse.data.success || !ordenesResponse.data.data.ordenes.length) {
            console.log('❌ No hay órdenes disponibles para probar PDF');
            return;
        }
        
        // Buscar una orden que tenga PDF generado
        let ordenConPDF = null;
        for (const orden of ordenesResponse.data.data.ordenes) {
            console.log(`🔍 Verificando orden ${orden.numero_op} (ID: ${orden.id_op})...`);
            
            try {
                // Intentar descargar el PDF
                const downloadResponse = await axios.get(`${BASE_URL}/ordenes/${orden.id_op}/pdf/download`, {
                    responseType: 'stream',
                    headers,
                    timeout: 10000
                });
                
                console.log(`✅ PDF encontrado para orden ${orden.numero_op}`);
                console.log(`   Content-Type: ${downloadResponse.headers['content-type']}`);
                console.log(`   Content-Length: ${downloadResponse.headers['content-length']}`);
                console.log(`   Content-Disposition: ${downloadResponse.headers['content-disposition']}`);
                
                ordenConPDF = orden;
                break;
                
            } catch (downloadError) {
                if (downloadError.response && downloadError.response.status === 404) {
                    console.log(`   ⚠️ No hay PDF para esta orden`);
                } else {
                    console.log(`   ❌ Error verificando PDF: ${downloadError.message}`);
                }
            }
        }
        
        if (!ordenConPDF) {
            console.log('\n❌ No se encontró ninguna orden con PDF disponible');
            console.log('🔄 Intentando generar PDF para la primera orden...');
            
            const primeraOrden = ordenesResponse.data.data.ordenes[0];
            
            // Generar PDF
            console.log(`📄 Generando PDF para orden ${primeraOrden.numero_op}...`);
            const pdfResponse = await axios.get(`${BASE_URL}/ordenes/${primeraOrden.id_op}/pdf`, { headers });
            
            if (pdfResponse.data.success) {
                console.log('✅ PDF generado exitosamente');
                console.log(`   Filename: ${pdfResponse.data.data.filename}`);
                ordenConPDF = primeraOrden;
            } else {
                console.log('❌ Error generando PDF:', pdfResponse.data.message);
                return;
            }
        }
        
        // Ahora descargar el PDF
        console.log(`\n📥 Descargando PDF de orden ${ordenConPDF.numero_op}...`);
        const downloadResponse = await axios.get(`${BASE_URL}/ordenes/${ordenConPDF.id_op}/pdf/download`, {
            responseType: 'stream',
            headers,
            timeout: 15000
        });
        
        console.log('✅ PDF descargado exitosamente');
        console.log(`   Content-Type: ${downloadResponse.headers['content-type']}`);
        console.log(`   Content-Length: ${downloadResponse.headers['content-length']}`);
        console.log(`   Content-Disposition: ${downloadResponse.headers['content-disposition']}`);
        
        // Guardar el PDF para verificar que es válido
        const testFilename = `test_api_pdf_${Date.now()}.pdf`;
        const testPath = path.join(__dirname, 'temp', testFilename);
        
        // Crear directorio temp si no existe
        const tempDir = path.join(__dirname, 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const writer = fs.createWriteStream(testPath);
        downloadResponse.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`💾 PDF guardado en: ${testPath}`);
                
                // Verificar que el archivo existe y tiene contenido
                const stats = fs.statSync(testPath);
                console.log(`   Tamaño del archivo: ${stats.size} bytes`);
                
                if (stats.size > 0) {
                    console.log('✅ PDF descargado y guardado correctamente');
                    console.log('🔍 Verifica que puedas abrir el archivo PDF en tu computadora');
                } else {
                    console.log('❌ El archivo PDF está vacío');
                }
                
                resolve();
            });
            
            writer.on('error', (error) => {
                console.log('❌ Error guardando PDF:', error.message);
                reject(error);
            });
        });
        
    } catch (error) {
        console.log('❌ Error en prueba de descarga de PDF:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
}

async function runTest() {
    console.log('🚀 Iniciando prueba de descarga de PDF a través de la API...\n');
    
    await testPDFAPIDownload();
    
    console.log('\n✨ Prueba completada');
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
    runTest().catch(console.error);
}

module.exports = {
    testPDFAPIDownload,
    runTest
}; 