const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';
let authToken = '';

async function login() {
    console.log('1. 🔐 Iniciando sesión...');
    const loginPayload = {
        username: 'admin',
        password: 'Admin123!'
    };
    console.log('Payload de login:', loginPayload);
    
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, loginPayload);
        console.log('Respuesta completa del login:', response.data);
        
        if (response.data.success) {
            authToken = response.data.data.tokens.accessToken;
            console.log('✅ Login exitoso');
            console.log('🔑 Token recibido:', authToken);
            return true;
        } else {
            console.log('❌ Login falló:', response.data.message);
            return false;
        }
    } catch (error) {
        console.log('❌ Error en login:', error.response?.data || error.message);
        return false;
    }
}

async function getPanos() {
    console.log('2. 📋 Obteniendo paños disponibles...');
    try {
        const response = await axios.get(`${API_BASE_URL}/inventario/panos?limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        const panos = response.data.panos || [];
        console.log('✅ Se encontraron', panos.length, 'paños');
        
        if (panos.length > 0) {
            const panoPrueba = panos[0];
            console.log('   Paño de prueba:', panoPrueba.descripcion || panoPrueba.id_item);
            console.log('   Área disponible:', (Number(panoPrueba.area_m2) || 0).toFixed(3), 'm²');
            console.log('   Dimensiones:', (Number(panoPrueba.largo_m) || 0).toFixed(3), '×', (Number(panoPrueba.ancho_m) || 0).toFixed(3), 'm');
            return panoPrueba;
        }
        return null;
    } catch (error) {
        console.log('❌ Error obteniendo paños:', error.response?.data || error.message);
        return null;
    }
}

async function getMateriales() {
    console.log('3. 📦 Obteniendo materiales disponibles...');
    try {
        const response = await axios.get(`${API_BASE_URL}/inventario/materiales?limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        const materiales = response.data.materiales || [];
        console.log('✅ Se encontraron', materiales.length, 'materiales');
        
        if (materiales.length > 0) {
            const materialPrueba = materiales[0];
            console.log('   Material de prueba:', materialPrueba.descripcion || materialPrueba.id_item);
            console.log('   Cantidad disponible:', materialPrueba.cantidad_disponible || 0);
            console.log('   Unidad:', materialPrueba.unidad || 'unidad');
            return materialPrueba;
        }
        return null;
    } catch (error) {
        console.log('❌ Error obteniendo materiales:', error.response?.data || error.message);
        return null;
    }
}

async function getHerramientas() {
    console.log('4. 🛠️ Obteniendo herramientas disponibles...');
    try {
        const response = await axios.get(`${API_BASE_URL}/inventario/herramientas?limit=5`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log('Respuesta completa de herramientas:', JSON.stringify(response.data, null, 2));
        const herramientas = response.data.herramientas || [];
        console.log('✅ Se encontraron', herramientas.length, 'herramientas');
        if (herramientas.length > 0) {
            const herramientaPrueba = herramientas[0];
            console.log('   Herramienta de prueba:', herramientaPrueba.descripcion || herramientaPrueba.id_item);
            console.log('   Cantidad disponible:', herramientaPrueba.cantidad_disponible || 0);
            return herramientaPrueba;
        }
        return null;
    } catch (error) {
        console.log('❌ Error obteniendo herramientas:', error.response?.data || error.message);
        return null;
    }
}

async function createOrdenCompleta(pano, material, herramienta) {
    console.log('5. 📝 Creando orden de producción con paño, material y herramienta...');
    const ordenPayload = {
        cliente: 'Cliente de Prueba - Completa',
        observaciones: 'Prueba de paño, material y herramienta',
        prioridad: 'media',
        materiales: [
            {
                id_item: pano.id_item,
                tipo_item: 'PANO',
                cantidad: 1.0,
                notas: 'Tomando 1 m² del paño'
            },
            {
                id_item: material.id_item,
                tipo_item: 'EXTRA',
                cantidad: 1,
                notas: 'Tomando 1 unidad del material'
            }
        ],
        herramientas: [
            {
                id_item: herramienta.id_item,
                cantidad: 1,
                notas: 'Tomando 1 herramienta para la orden'
            }
        ]
    };
    console.log('Payload de la orden:', ordenPayload);
    try {
        const response = await axios.post(`${API_BASE_URL}/ordenes`, ordenPayload, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        if (response.data.success) {
            console.log('✅ Orden creada exitosamente:', response.data.data.numero_op);
            return response.data.data;
        } else {
            console.log('❌ Error creando orden:', response.data.message);
            return null;
        }
    } catch (error) {
        console.log('❌ Error creando orden:', error.response?.data || error.message);
        return null;
    }
}

async function verificarActualizaciones(pano, material) {
    console.log('6. 🔍 Verificando actualizaciones...');
    
    try {
        // Verificar paño
        const panoResponse = await axios.get(`${API_BASE_URL}/inventario/panos?search=${pano.id_item}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        const panosActualizados = panoResponse.data.panos || [];
        if (panosActualizados.length > 0) {
            const panoActualizado = panosActualizados[0];
            console.log('   Paño - Área anterior:', (Number(pano.area_m2) || 0).toFixed(2), 'm²');
            console.log('   Paño - Área actual:', (Number(panoActualizado.area_m2) || 0).toFixed(2), 'm²');
        }
        
        // Verificar material
        const materialResponse = await axios.get(`${API_BASE_URL}/inventario/materiales?search=${material.id_item}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });
        
        const materialesActualizados = materialResponse.data.materiales || [];
        if (materialesActualizados.length > 0) {
            const materialActualizado = materialesActualizados[0];
            console.log('   Material - Cantidad anterior:', material.cantidad_disponible || 0);
            console.log('   Material - Cantidad actual:', materialActualizado.cantidad_disponible || 0);
        }
        
    } catch (error) {
        console.log('❌ Error verificando actualizaciones:', error.response?.data || error.message);
    }
}

async function main() {
    console.log('🧪 Iniciando pruebas de manejo de área para paños, materiales y herramientas...\n');
    const loginSuccess = await login();
    if (!loginSuccess) {
        console.log('❌ No se pudo iniciar sesión. Abortando pruebas.');
        return;
    }
    const pano = await getPanos();
    if (!pano) {
        console.log('❌ No se encontraron paños. Abortando pruebas.');
        return;
    }
    const material = await getMateriales();
    if (!material) {
        console.log('❌ No se encontraron materiales. Abortando pruebas.');
        return;
    }
    const herramienta = await getHerramientas();
    if (!herramienta) {
        console.log('❌ No se encontraron herramientas. Abortando pruebas.');
        return;
    }
    // Orden completa
    const orden = await createOrdenCompleta(pano, material, herramienta);
    if (!orden) {
        console.log('❌ No se pudo crear la orden completa. Abortando pruebas.');
        return;
    }
    // Verificar actualizaciones
    await verificarActualizaciones(pano, material);
    console.log('\n✅ Pruebas completadas exitosamente!');
}

main().catch(console.error);