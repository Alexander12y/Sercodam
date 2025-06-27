const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';
let authToken = '';

// Función para hacer login y obtener token
async function login() {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        
        authToken = response.data.data.tokens.accessToken;
        console.log('✅ Login exitoso');
        console.log('🔍 DEBUG - Token recibido:', authToken ? authToken.substring(0, 20) + '...' : 'No token');
        return authToken;
    } catch (error) {
        console.error('❌ Error en login:', error.response?.data || error.message);
        throw error;
    }
}

// Función para hacer requests autenticados
async function makeRequest(method, endpoint, data = null) {
    try {
        console.log(`🔍 DEBUG - Making ${method} request to ${endpoint}`);
        console.log(`🔍 DEBUG - Auth token: ${authToken ? authToken.substring(0, 20) + '...' : 'No token'}`);
        
        const config = {
            method,
            url: `${API_BASE_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error(`❌ Error en ${method} ${endpoint}:`, error.response?.data || error.message);
        throw error;
    }
}

// Función para probar catálogos
async function testCatalogos() {
    console.log('\n=== PRUEBAS DE CATÁLOGOS ===\n');
    
    try {
        // 1. Probar subgrupos de paños
        console.log('1. Probando subgrupos de paños...');
        const subgruposPanos = await makeRequest('GET', '/catalogos/panos/subgrupos');
        console.log('✅ Subgrupos de paños:', subgruposPanos.data);
        
        // 2. Probar catálogo de paños
        console.log('\n2. Probando catálogo de paños...');
        const panos = await makeRequest('GET', '/catalogos/panos?limit=5');
        console.log(`✅ Paños encontrados: ${panos.data.panos.length}`);
        console.log('Primer paño:', panos.data.panos[0]?.nombre || 'No hay paños');
        
        // 3. Probar subgrupos de materiales
        console.log('\n3. Probando subgrupos de materiales...');
        const subgruposMateriales = await makeRequest('GET', '/catalogos/materiales/subgrupos');
        console.log('✅ Subgrupos de materiales:', subgruposMateriales.data);
        
        // 4. Probar catálogo de materiales
        console.log('\n4. Probando catálogo de materiales...');
        const materiales = await makeRequest('GET', '/catalogos/materiales?limit=5');
        console.log(`✅ Materiales encontrados: ${materiales.data.materiales.length}`);
        console.log('Primer material:', materiales.data.materiales[0]?.nombre || 'No hay materiales');
        
        // 5. Probar subgrupos de herramientas
        console.log('\n5. Probando subgrupos de herramientas...');
        const subgruposHerramientas = await makeRequest('GET', '/catalogos/herramientas/subgrupos');
        console.log('✅ Subgrupos de herramientas:', subgruposHerramientas.data);
        
        // 6. Probar catálogo de herramientas
        console.log('\n6. Probando catálogo de herramientas...');
        const herramientas = await makeRequest('GET', '/catalogos/herramientas?limit=5');
        console.log(`✅ Herramientas encontradas: ${herramientas.data.herramientas.length}`);
        console.log('Primera herramienta:', herramientas.data.herramientas[0]?.nombre || 'No hay herramientas');
        
        // 7. Probar búsqueda en materiales
        console.log('\n7. Probando búsqueda en materiales...');
        const busquedaMateriales = await makeRequest('GET', '/catalogos/materiales?search=cinta&limit=3');
        console.log(`✅ Materiales con "cinta": ${busquedaMateriales.data.materiales.length}`);
        
        // 8. Probar filtro por subgrupo en materiales
        if (subgruposMateriales.data.length > 0) {
            console.log('\n8. Probando filtro por subgrupo...');
            const primerSubgrupo = subgruposMateriales.data[0];
            const materialesPorSubgrupo = await makeRequest('GET', `/catalogos/materiales?subgrupo=${primerSubgrupo}&limit=3`);
            console.log(`✅ Materiales en subgrupo "${primerSubgrupo}": ${materialesPorSubgrupo.data.materiales.length}`);
        }
        
        console.log('\n✅ Todas las pruebas de catálogos completadas exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en pruebas de catálogos:', error.message);
    }
}

// Función principal
async function main() {
    try {
        console.log('🚀 Iniciando pruebas de catálogos...');
        
        // Login
        await login();
        
        // Probar catálogos
        await testCatalogos();
        
        console.log('\n🎉 Todas las pruebas completadas!');
        
    } catch (error) {
        console.error('💥 Error en pruebas:', error.message);
        process.exit(1);
    }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
    main();
}

module.exports = { login, makeRequest, testCatalogos }; 