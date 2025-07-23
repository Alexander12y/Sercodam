const axios = require('axios');

// Configuración de la API
const API_BASE_URL = 'http://localhost:3001/api';
let authToken = null;

// Función para login
async function login() {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@sercodam.com',
            password: 'admin123'
        });
        
        authToken = response.data.token;
        console.log('✅ Login exitoso');
        return authToken;
    } catch (error) {
        console.error('❌ Error en login:', error.response?.data || error.message);
        throw error;
    }
}

// Función para verificar el estado actual de la tabla trabajo_corte
async function verificarEstadoActual() {
    try {
        const response = await axios.get(`${API_BASE_URL}/ordenes/check-trabajo-corte-modo`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('📊 Estado actual de trabajo_corte:');
        console.log(response.data);
        
        return response.data;
    } catch (error) {
        console.error('❌ Error verificando estado:', error.response?.data || error.message);
        throw error;
    }
}

// Función para crear una orden de prueba con cortes simples e individuales
async function crearOrdenPrueba() {
    try {
        const ordenData = {
            cliente: {
                nombre_cliente: 'Cliente Prueba Modo Corte',
                email: 'test@test.com',
                telefono: '123456789'
            },
            panos: [
                {
                    altura_req: 2.0,
                    ancho_req: 1.5,
                    tipo_red: 'Nylon',
                    umbral_sobrante_m2: 2.0,
                    modo_corte: 'simple' // Corte simple
                },
                {
                    altura_req: 3.0,
                    ancho_req: 2.0,
                    tipo_red: 'Lona',
                    umbral_sobrante_m2: 3.0,
                    modo_corte: 'individuales', // Cortes individuales
                    cortes_individuales: [
                        {
                            largo: 1.0,
                            ancho: 0.8,
                            cantidad: 2
                        },
                        {
                            largo: 0.5,
                            ancho: 0.4,
                            cantidad: 1
                        }
                    ]
                }
            ],
            materiales: [],
            herramientas: []
        };

        const response = await axios.post(`${API_BASE_URL}/ordenes`, ordenData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log('✅ Orden de prueba creada:', response.data.id_op);
        return response.data.id_op;
    } catch (error) {
        console.error('❌ Error creando orden de prueba:', error.response?.data || error.message);
        throw error;
    }
}

// Función para verificar los trabajos de corte de una orden específica
async function verificarTrabajosCorte(idOp) {
    try {
        const response = await axios.get(`${API_BASE_URL}/ordenes/${idOp}/trabajos-corte`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        console.log(`📋 Trabajos de corte para orden ${idOp}:`);
        response.data.forEach((trabajo, index) => {
            console.log(`  Trabajo ${index + 1}:`);
            console.log(`    - Job ID: ${trabajo.job_id}`);
            console.log(`    - Modo Corte: ${trabajo.modo_corte}`);
            console.log(`    - Dimensiones: ${trabajo.altura_req}m x ${trabajo.ancho_req}m`);
            console.log(`    - Estado: ${trabajo.estado}`);
            if (trabajo.cortes_individuales && trabajo.cortes_individuales.length > 0) {
                console.log(`    - Cortes Individuales: ${trabajo.cortes_individuales.length} cortes`);
                trabajo.cortes_individuales.forEach((corte, idx) => {
                    console.log(`      Corte ${idx + 1}: ${corte.largo}m x ${corte.ancho}m (${corte.cantidad} piezas)`);
                });
            }
            console.log('');
        });
        
        return response.data;
    } catch (error) {
        console.error('❌ Error verificando trabajos de corte:', error.response?.data || error.message);
        throw error;
    }
}

// Función principal
async function main() {
    try {
        console.log('🔍 Iniciando prueba de corrección de modo_corte...\n');
        
        // 1. Login
        await login();
        
        // 2. Verificar estado actual
        console.log('\n📊 Verificando estado actual de la base de datos...');
        await verificarEstadoActual();
        
        // 3. Crear orden de prueba
        console.log('\n🔄 Creando orden de prueba con cortes simples e individuales...');
        const idOp = await crearOrdenPrueba();
        
        // 4. Verificar trabajos de corte
        console.log('\n📋 Verificando trabajos de corte de la orden de prueba...');
        await verificarTrabajosCorte(idOp);
        
        // 5. Verificar estado final
        console.log('\n📊 Verificando estado final de la base de datos...');
        await verificarEstadoActual();
        
        console.log('\n✅ Prueba completada exitosamente');
        console.log('🎯 El campo modo_corte debería estar funcionando correctamente ahora');
        
    } catch (error) {
        console.error('\n❌ Error en la prueba:', error.message);
        process.exit(1);
    }
}

// Ejecutar la prueba
main(); 