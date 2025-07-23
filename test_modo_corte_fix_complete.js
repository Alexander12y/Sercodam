const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

// Función para login
async function login() {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'admin@sercodam.com',
            password: 'admin123'
        });
        return response.data.token;
    } catch (error) {
        console.error('Error en login:', error.response?.data || error.message);
        throw error;
    }
}

// Función para crear orden con cortes individuales
async function createOrdenConCortesIndividuales(token) {
    const payload = {
        cliente: 'Cliente Test Cortes Individuales',
        id_cliente: '1',
        observaciones: 'Orden de prueba con cortes individuales',
        prioridad: 'alta',
        fecha_inicio: '2025-01-15',
        fecha_fin: '2025-01-20',
        panos: [
            {
                altura_req: 2.5,
                ancho_req: 3.0,
                tipo_red: 'nylon',
                umbral_sobrante_m2: 0.5,
                cantidad: 1,
                notas: 'Paño con cortes individuales',
                modo_corte: 'individuales',
                cortes_individuales: [
                    {
                        largo: 1.0,
                        ancho: 0.8,
                        cantidad: 5
                    },
                    {
                        largo: 0.6,
                        ancho: 0.4,
                        cantidad: 10
                    }
                ]
            }
        ],
        materiales: [],
        herramientas: []
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/ordenes`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.data.id_op;
    } catch (error) {
        console.error('Error creando orden con cortes individuales:', error.response?.data || error.message);
        throw error;
    }
}

// Función para crear orden con cortes simples
async function createOrdenConCortesSimples(token) {
    const payload = {
        cliente: 'Cliente Test Cortes Simples',
        id_cliente: '1',
        observaciones: 'Orden de prueba con cortes simples',
        prioridad: 'media',
        fecha_inicio: '2025-01-15',
        fecha_fin: '2025-01-20',
        panos: [
            {
                altura_req: 2.0,
                ancho_req: 2.5,
                tipo_red: 'nylon',
                umbral_sobrante_m2: 0.5,
                cantidad: 1,
                notas: 'Paño con corte simple',
                modo_corte: 'simple',
                cortes_individuales: null
            }
        ],
        materiales: [],
        herramientas: []
    };

    try {
        const response = await axios.post(`${API_BASE_URL}/ordenes`, payload, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.data.id_op;
    } catch (error) {
        console.error('Error creando orden con cortes simples:', error.response?.data || error.message);
        throw error;
    }
}

// Función para verificar modo_corte en la base de datos
async function verificarModoCorteEnBD(token, id_op) {
    try {
        const response = await axios.get(`${API_BASE_URL}/ordenes/${id_op}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const orden = response.data.data;
        console.log(`  - Orden ${id_op}: modo_corte = ${orden.modo_corte}`);
        return orden.modo_corte;
    } catch (error) {
        console.error(`Error verificando orden ${id_op}:`, error.response?.data || error.message);
        return null;
    }
}

// Función para generar PDF y verificar datos
async function generarPDFYVerificar(token, id_op) {
    try {
        const response = await axios.get(`${API_BASE_URL}/ordenes/${id_op}/pdf`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'arraybuffer'
        });
        
        console.log(`  ✅ PDF generado correctamente para orden ${id_op}`);
        
        // Verificar que el PDF se generó (tiene contenido)
        if (response.data && response.data.length > 0) {
            console.log(`  📄 Tamaño del PDF: ${response.data.length} bytes`);
            return true;
        } else {
            console.log(`  ❌ PDF vacío para orden ${id_op}`);
            return false;
        }
    } catch (error) {
        console.error(`Error generando PDF para orden ${id_op}:`, error.response?.data || error.message);
        return false;
    }
}

// Función principal de prueba
async function ejecutarPruebaCompleta() {
    console.log('🚀 Iniciando prueba completa de modo_corte...\n');
    
    try {
        // 1. Login
        console.log('1️⃣ Iniciando sesión...');
        const token = await login();
        console.log('✅ Login exitoso\n');
        
        // 2. Crear orden con cortes individuales
        console.log('2️⃣ Creando orden con cortes individuales...');
        const idOrdenIndividuales = await createOrdenConCortesIndividuales(token);
        console.log(`✅ Orden con cortes individuales creada: ${idOrdenIndividuales}\n`);
        
        // 3. Crear orden con cortes simples
        console.log('3️⃣ Creando orden con cortes simples...');
        const idOrdenSimples = await createOrdenConCortesSimples(token);
        console.log(`✅ Orden con cortes simples creada: ${idOrdenSimples}\n`);
        
        // 4. Verificar modo_corte en BD
        console.log('4️⃣ Verificando modo_corte en base de datos...');
        const modoCorteIndividuales = await verificarModoCorteEnBD(token, idOrdenIndividuales);
        const modoCorteSimples = await verificarModoCorteEnBD(token, idOrdenSimples);
        
        // 5. Validar resultados
        console.log('\n5️⃣ Validando resultados...');
        if (modoCorteIndividuales === 'individuales') {
            console.log('✅ modo_corte correcto para orden con cortes individuales');
        } else {
            console.error(`❌ Error: modo_corte debería ser 'individuales', pero es '${modoCorteIndividuales}'`);
        }
        
        if (modoCorteSimples === 'simple') {
            console.log('✅ modo_corte correcto para orden con cortes simples');
        } else {
            console.error(`❌ Error: modo_corte debería ser 'simple', pero es '${modoCorteSimples}'`);
        }
        
        // 6. Generar PDFs para verificar que funcionan
        console.log('\n6️⃣ Generando PDFs para verificar funcionalidad...');
        await generarPDFYVerificar(token, idOrdenIndividuales);
        await generarPDFYVerificar(token, idOrdenSimples);
        
        // 7. Resumen final
        console.log('\n📊 RESUMEN FINAL:');
        console.log(`  - Orden con cortes individuales: ${idOrdenIndividuales} (modo_corte: ${modoCorteIndividuales})`);
        console.log(`  - Orden con cortes simples: ${idOrdenSimples} (modo_corte: ${modoCorteSimples})`);
        
        if (modoCorteIndividuales === 'individuales' && modoCorteSimples === 'simple') {
            console.log('\n🎉 ¡PRUEBA EXITOSA! El modo_corte se está detectando correctamente.');
        } else {
            console.log('\n❌ PRUEBA FALLIDA. Revisar la lógica de detección de modo_corte.');
        }
        
    } catch (error) {
        console.error('\n💥 Error en la prueba:', error.message);
    }
}

// Ejecutar la prueba
ejecutarPruebaCompleta(); 