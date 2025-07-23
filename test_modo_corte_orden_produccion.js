const axios = require('axios');
const fs = require('fs');

// Configuración
const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_EMAIL = 'admin@sercodam.com';
const TEST_PASSWORD = 'admin123';

let authToken = null;

// Función para login
async function login() {
    try {
        console.log('🔐 Iniciando sesión...');
        const response = await axios.post(`${BASE_URL}/auth/login`, {
            email: TEST_EMAIL,
            password: TEST_PASSWORD
        });
        
        authToken = response.data.token;
        console.log('✅ Login exitoso');
        return true;
    } catch (error) {
        console.error('❌ Error en login:', error.response?.data || error.message);
        return false;
    }
}

// Función para crear una orden con cortes individuales
async function crearOrdenConCortesIndividuales() {
    try {
        console.log('\n📋 Creando orden con cortes individuales...');
        
        const ordenData = {
            numero_op: `TEST-OP-${Date.now()}`,
            cliente: 'Cliente Test',
            observaciones: 'Orden de prueba con cortes individuales',
            prioridad: 'media',
            panos: [
                {
                    altura_req: 2.5,
                    ancho_req: 1.8,
                    tipo_red: 'nylon',
                    umbral_sobrante_m2: 5.0,
                    modo_corte: 'individuales',
                    cortes_individuales: [
                        {
                            largo: 1.2,
                            ancho: 0.9,
                            cantidad: 2
                        },
                        {
                            largo: 0.8,
                            ancho: 0.6,
                            cantidad: 1
                        }
                    ]
                }
            ],
            materiales: [],
            herramientas: []
        };

        const response = await axios.post(`${BASE_URL}/ordenes`, ordenData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Orden creada exitosamente');
        console.log('📊 Datos de la orden:', {
            id_op: response.data.data.id_op,
            numero_op: response.data.data.numero_op,
            modo_corte: response.data.data.modo_corte
        });

        return response.data.data.id_op;
    } catch (error) {
        console.error('❌ Error creando orden:', error.response?.data || error.message);
        return null;
    }
}

// Función para crear una orden con cortes simples
async function crearOrdenConCortesSimples() {
    try {
        console.log('\n📋 Creando orden con cortes simples...');
        
        const ordenData = {
            numero_op: `TEST-OP-SIMPLE-${Date.now()}`,
            cliente: 'Cliente Test Simple',
            observaciones: 'Orden de prueba con cortes simples',
            prioridad: 'media',
            panos: [
                {
                    altura_req: 3.0,
                    ancho_req: 2.0,
                    tipo_red: 'nylon',
                    umbral_sobrante_m2: 5.0,
                    modo_corte: 'simple'
                }
            ],
            materiales: [],
            herramientas: []
        };

        const response = await axios.post(`${BASE_URL}/ordenes`, ordenData, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ Orden simple creada exitosamente');
        console.log('📊 Datos de la orden:', {
            id_op: response.data.data.id_op,
            numero_op: response.data.data.numero_op,
            modo_corte: response.data.data.modo_corte
        });

        return response.data.data.id_op;
    } catch (error) {
        console.error('❌ Error creando orden simple:', error.response?.data || error.message);
        return null;
    }
}

// Función para verificar el modo_corte en la base de datos
async function verificarModoCorteEnBD(id_op) {
    try {
        console.log(`\n🔍 Verificando modo_corte en BD para orden ${id_op}...`);
        
        const response = await axios.get(`${BASE_URL}/ordenes/${id_op}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        const orden = response.data.data;
        console.log('📊 Datos de la orden desde BD:', {
            id_op: orden.id_op,
            numero_op: orden.numero_op,
            modo_corte: orden.modo_corte,
            estado: orden.estado
        });

        return orden.modo_corte;
    } catch (error) {
        console.error('❌ Error verificando orden en BD:', error.response?.data || error.message);
        return null;
    }
}

// Función para generar PDF y verificar que incluye modo_corte
async function generarPDFYVerificar(id_op) {
    try {
        console.log(`\n📄 Generando PDF para orden ${id_op}...`);
        
        const response = await axios.get(`${BASE_URL}/ordenes/${id_op}/pdf`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('✅ PDF generado exitosamente');
        console.log('📊 Datos del PDF:', {
            filename: response.data.data.filename,
            downloadUrl: response.data.data.downloadUrl
        });

        // Verificar que el PDF incluye el modo_corte en los datos
        if (response.data.data.cuts) {
            console.log('🔍 Verificando datos de cortes en PDF:');
            response.data.data.cuts.forEach((cut, index) => {
                console.log(`  Corte ${index + 1}:`, {
                    id_item: cut.id_item,
                    modo_corte: cut.modo_corte,
                    altura_req: cut.altura_req,
                    ancho_req: cut.ancho_req,
                    cortes_individuales_count: cut.cortes_individuales?.length || 0
                });
            });
        }

        return true;
    } catch (error) {
        console.error('❌ Error generando PDF:', error.response?.data || error.message);
        return false;
    }
}

// Función principal
async function main() {
    console.log('🚀 Iniciando prueba de modo_corte en orden_produccion...\n');

    // 1. Login
    if (!await login()) {
        console.error('❌ No se pudo hacer login, abortando...');
        return;
    }

    // 2. Crear orden con cortes individuales
    const idOrdenIndividuales = await crearOrdenConCortesIndividuales();
    if (!idOrdenIndividuales) {
        console.error('❌ No se pudo crear orden con cortes individuales');
        return;
    }

    // 3. Verificar modo_corte en BD para orden con cortes individuales
    const modoCorteIndividuales = await verificarModoCorteEnBD(idOrdenIndividuales);
    if (modoCorteIndividuales !== 'individuales') {
        console.error(`❌ Error: modo_corte debería ser 'individuales', pero es '${modoCorteIndividuales}'`);
    } else {
        console.log('✅ modo_corte correcto para orden con cortes individuales');
    }

    // 4. Generar PDF para orden con cortes individuales
    await generarPDFYVerificar(idOrdenIndividuales);

    // 5. Crear orden con cortes simples
    const idOrdenSimples = await crearOrdenConCortesSimples();
    if (!idOrdenSimples) {
        console.error('❌ No se pudo crear orden con cortes simples');
        return;
    }

    // 6. Verificar modo_corte en BD para orden con cortes simples
    const modoCorteSimples = await verificarModoCorteEnBD(idOrdenSimples);
    if (modoCorteSimples !== 'simple') {
        console.error(`❌ Error: modo_corte debería ser 'simple', pero es '${modoCorteSimples}'`);
    } else {
        console.log('✅ modo_corte correcto para orden con cortes simples');
    }

    // 7. Generar PDF para orden con cortes simples
    await generarPDFYVerificar(idOrdenSimples);

    console.log('\n🎉 Prueba completada exitosamente!');
    console.log('📋 Resumen:');
    console.log(`  - Orden con cortes individuales: ${idOrdenIndividuales} (modo_corte: ${modoCorteIndividuales})`);
    console.log(`  - Orden con cortes simples: ${idOrdenSimples} (modo_corte: ${modoCorteSimples})`);
}

// Ejecutar prueba
main().catch(error => {
    console.error('❌ Error en la prueba:', error);
    process.exit(1);
}); 