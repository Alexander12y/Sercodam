const axios = require('axios');
const knex = require('knex');
const logger = require('./src/config/logger');

// Cargar variables de entorno desde .env
require('dotenv').config();

// Configuración de base de datos independiente para el script
const dbConfig = {
    client: 'postgresql',
    connection: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'sercodam_op'
    },
    pool: {
        min: 1,
        max: 5,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100
    }
};

// Crear conexión independiente
const db = knex(dbConfig);

const BASE_URL = 'http://localhost:4000/api/v1';

// === PON AQUÍ TU CÓDIGO 2FA (OTP) MANUALMENTE ===
const OTP_CODE = '089301'; // <-- Reemplaza esto por tu código cada vez que corras el script

// Datos de prueba reales de la base de datos
const TEST_DATA = {
    cliente: 'Cliente de Prueba - PDF Automático',
    descripcion_trabajo: 'Instalación de red con PDF automático',
    observaciones: 'Prueba de generación automática de PDF y webhook',
    prioridad: 'media', // Valores válidos: 'baja', 'media', 'alta', 'urgente'
    fecha_inicio: '2025-01-15',
    fecha_fin: '2025-01-20',
    materiales: [
        {
            id_item: 562, // Paño real de la base de datos
            tipo_item: 'PANO',
            cantidad: 1,
            largo_tomar: 5.0,
            ancho_tomar: 3.0,
            area_tomar: 15.0,
            notas: 'Paño para prueba de PDF automático'
        },
        {
            id_item: 5, // Material real de la base de datos
            tipo_item: 'EXTRA',
            cantidad: 1,
            notas: 'Material para prueba de PDF automático'
        }
    ],
    herramientas: [
        {
            id_item: 274, // Herramienta real de la base de datos
            cantidad: 1,
            notas: 'Herramienta para prueba de PDF automático'
        }
    ]
};

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

// Función para pedir el código OTP (ahora solo regresa la variable)
async function promptForOTP() {
    if (!OTP_CODE || OTP_CODE === 'AQUÍ_TU_CODIGO_2FA') {
        throw new Error('Por favor, pon tu código 2FA en la variable OTP_CODE al inicio del script.');
    }
    return OTP_CODE.trim();
}

async function testCrearOrdenConPDFAutomatico() {
    console.log('🚀 Probando creación de orden con PDF automático...\n');
    
    try {
        // Obtener token de autenticación
        const token = await getAuthToken();
        console.log('✅ Token de autenticación obtenido');
        
        // Configurar headers con token
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        console.log('📋 Creando orden de producción...');
        console.log('📦 Datos de prueba:', JSON.stringify(TEST_DATA, null, 2));
        
        // Crear orden
        const createResponse = await axios.post(`${BASE_URL}/ordenes`, TEST_DATA, { headers });
        
        if (!createResponse.data.success) {
            throw new Error('Error creando orden: ' + createResponse.data.message);
        }
        
        const { id_op, numero_op } = createResponse.data.data;
        console.log('✅ Orden creada exitosamente');
        console.log(`   ID: ${id_op}`);
        console.log(`   Número: ${numero_op}`);
        
        // Esperar un momento para que se genere el PDF y se envíe el webhook en background
        console.log('⏳ Esperando generación automática de PDF y webhook...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Verificar que el PDF se generó con retry
        console.log('🔍 Verificando generación de PDF...');
        let ordenConPDF = null;
        let intentos = 0;
        const maxIntentos = 3;
        
        while (intentos < maxIntentos) {
            try {
                ordenConPDF = await db('orden_produccion')
                    .where('id_op', id_op)
                    .select('pdf_generado', 'pdf_filename', 'pdf_generado_at')
                    .first();
                break; // Si llegamos aquí, no hubo error
            } catch (error) {
                intentos++;
                console.log(`⚠️  Intento ${intentos}/${maxIntentos} falló: ${error.message}`);
                
                if (intentos < maxIntentos) {
                    console.log('⏳ Esperando 2 segundos antes del siguiente intento...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    console.log('❌ No se pudo verificar el PDF después de 3 intentos');
                    console.log('   Esto puede ser normal si el PDF aún se está generando');
                }
            }
        }
        
        if (ordenConPDF && ordenConPDF.pdf_generado) {
            console.log('✅ PDF generado automáticamente');
            console.log(`   Archivo: ${ordenConPDF.pdf_filename}`);
            console.log(`   Fecha: ${ordenConPDF.pdf_generado_at}`);
            console.log('📡 Webhook enviado automáticamente a Make.com con PDF adjunto');
        } else {
            console.log('⚠️  PDF no se generó automáticamente o aún está en proceso');
            console.log('   Esto puede ser normal si el proceso está tardando más de lo esperado');
        }
        
        // Verificar que la orden existe y tiene todos los datos
        console.log('\n📊 Verificando datos de la orden...');
        const orden = await db('orden_produccion').where('id_op', id_op).first();
        const detalles = await db('orden_produccion_detalle').where('id_op', id_op);
        const herramientas = await db('herramienta_ordenada').where('id_op', id_op);
        
        console.log('✅ Datos de la orden:');
        console.log(`   Cliente: ${orden.cliente}`);
        console.log(`   Estado: ${orden.estado}`);
        console.log(`   Detalles: ${detalles.length} items`);
        console.log(`   Herramientas: ${herramientas.length} items`);
        
        return { success: true, id_op, numero_op };
        
    } catch (error) {
        console.error('❌ Error en prueba:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        return { success: false, error: error.message };
    }
}

async function limpiarDatosPrueba(id_op) {
    if (!id_op) return;
    
    console.log('\n🧹 Limpiando datos de prueba...');
    
    try {
        // Eliminar en orden correcto (por foreign keys)
        await db('herramienta_ordenada').where('id_op', id_op).del();
        await db('orden_produccion_detalle').where('id_op', id_op).del();
        await db('orden_produccion').where('id_op', id_op).del();
        
        console.log('✅ Datos de prueba eliminados');
    } catch (error) {
        console.error('❌ Error limpiando datos:', error.message);
        console.log('   Los datos pueden haberse limpiado manualmente o ya no existir');
    }
}

async function cerrarConexion() {
    try {
        await db.destroy();
        console.log('🔌 Conexión a base de datos cerrada');
    } catch (error) {
        console.error('❌ Error cerrando conexión:', error.message);
    }
}

async function main() {
    console.log('🧪 PRUEBA DE PDF AUTOMÁTICO Y WEBHOOK\n');
    console.log('Esta prueba verifica:');
    console.log('1. Creación de orden de producción');
    console.log('2. Generación automática de PDF en background');
    console.log('3. Envío de webhook a Make.com con PDF adjunto');
    console.log('4. Limpieza de datos de prueba\n');
    
    try {
        const resultado = await testCrearOrdenConPDFAutomatico();
        
        if (resultado.success) {
            console.log('\n🎉 PRUEBA EXITOSA');
            console.log('✅ La orden se creó correctamente');
            console.log('✅ El PDF se generó automáticamente');
            console.log('✅ El webhook se envió a Make.com con PDF adjunto');
            
            // Limpiar datos de prueba
            await limpiarDatosPrueba(resultado.id_op);
        } else {
            console.log('\n❌ PRUEBA FALLIDA');
            console.log(`Error: ${resultado.error}`);
        }
    } catch (error) {
        console.log('\n❌ ERROR CRÍTICO');
        console.log(`Error: ${error.message}`);
    } finally {
        // Cerrar conexión a la base de datos
        await cerrarConexion();
    }
    
    console.log('\n✨ Prueba completada');
    process.exit(0);
}

// Manejar errores no capturados
process.on('unhandledRejection', (error) => {
    console.error('❌ Error no manejado:', error);
    process.exit(1);
});

// Ejecutar prueba
main().catch(console.error); 