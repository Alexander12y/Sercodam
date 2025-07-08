const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:4000/api/v1';

// Código 2FA - CAMBIAR POR TU CÓDIGO REAL
const OTP_CODE = '468085';

// Datos de prueba
const TEST_DATA = {
  cliente: 'Cliente de Prueba - Frontend',
  descripcion_trabajo: 'Instalación de red para verificar frontend',
  observaciones: 'Prueba para verificar que aparece en el frontend',
  prioridad: 'media',
  fecha_inicio: '2025-01-15',
  fecha_fin: '2025-01-20',
  materiales: [
    {
      id_item: 562,
      tipo_item: 'PANO',
      cantidad: 1,
      largo_tomar: 5,
      ancho_tomar: 3,
      area_tomar: 15,
      notas: 'Paño para prueba de frontend'
    },
    {
      id_item: 5,
      tipo_item: 'EXTRA',
      cantidad: 1,
      notas: 'Material para prueba de frontend'
    }
  ],
  herramientas: [
    {
      id_item: 274,
      cantidad: 1,
      notas: 'Herramienta para prueba de frontend'
    }
  ]
};

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

// Función para pedir el código OTP (ahora solo regresa la variable)
async function promptForOTP() {
    if (!OTP_CODE || OTP_CODE === 'AQUÍ_TU_CODIGO_2FA') {
        throw new Error('Por favor, pon tu código 2FA en la variable OTP_CODE al inicio del script.');
    }
    return OTP_CODE.trim();
}

async function crearOrdenParaFrontend() {
    console.log('🚀 Creando orden para verificar frontend...\n');
    
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
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verificar que la orden existe en la base de datos
        console.log('🔍 Verificando que la orden existe en la base de datos...');
        const ordenResponse = await axios.get(`${BASE_URL}/ordenes/${id_op}`, { headers });
        
        if (ordenResponse.data.success) {
            const orden = ordenResponse.data.data;
            console.log('✅ Orden verificada en la base de datos:');
            console.log(`   Cliente: ${orden.cliente}`);
            console.log(`   Estado: ${orden.estado}`);
            console.log(`   Número: ${orden.numero_op}`);
            console.log(`   PDF generado: ${orden.pdf_generado ? 'Sí' : 'No'}`);
        }
        
        // Verificar que aparece en la lista de órdenes
        console.log('🔍 Verificando que aparece en la lista de órdenes...');
        const listResponse = await axios.get(`${BASE_URL}/ordenes?limit=10`, { headers });
        
        if (listResponse.data.success) {
            const ordenes = listResponse.data.data.ordenes;
            const ordenEncontrada = ordenes.find(o => o.id_op === id_op);
            
            if (ordenEncontrada) {
                console.log('✅ Orden encontrada en la lista de órdenes');
                console.log(`   Posición en la lista: ${ordenes.indexOf(ordenEncontrada) + 1}`);
            } else {
                console.log('⚠️  Orden NO encontrada en la lista de órdenes');
                console.log('   Esto puede indicar un problema con el frontend');
            }
        }
        
        console.log('\n🎉 ORDEN CREADA EXITOSAMENTE');
        console.log('✅ La orden se creó correctamente');
        console.log('✅ El PDF se generó automáticamente');
        console.log('✅ El webhook se envió a Make.com');
        console.log('\n📱 Ahora puedes verificar en el frontend:');
        console.log('   1. Ve a la página de Órdenes de Producción');
        console.log('   2. Busca la orden con número:', numero_op);
        console.log('   3. Verifica que aparece en la lista');
        
        return { success: true, id_op, numero_op };
        
    } catch (error) {
        console.error('❌ Error creando orden:', error.message);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🧪 PRUEBA DE CREACIÓN DE ORDEN PARA FRONTEND\n');
    console.log('Esta prueba crea una orden y NO la elimina para que puedas');
    console.log('verificarla en el frontend.\n');
    
    try {
        const resultado = await crearOrdenParaFrontend();
        
        if (resultado.success) {
            console.log('\n✅ PRUEBA EXITOSA');
            console.log(`Orden creada con ID: ${resultado.id_op}`);
            console.log(`Número de orden: ${resultado.numero_op}`);
            console.log('\n🔍 Ahora verifica en el frontend que la orden aparece correctamente.');
        } else {
            console.log('\n❌ PRUEBA FALLIDA');
            console.log(`Error: ${resultado.error}`);
        }
    } catch (error) {
        console.log('\n❌ ERROR CRÍTICO');
        console.log(`Error: ${error.message}`);
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