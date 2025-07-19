// ================================
// PRUEBA SIMPLE DE ENDPOINTS DE CATÁLOGOS
// ================================

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

// Configurar axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Función para hacer login y obtener token
async function login() {
  try {
    const response = await api.post('/auth/login', {
      email: 'admin@sercodam.com',
      password: 'admin123'
    });
    
    const token = response.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('✅ Login exitoso');
    return token;
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar endpoint de nylon
async function testNylonEndpoint() {
  console.log('\n🔍 Probando endpoint de nylon...');
  
  try {
    const response = await api.get('/inventario/panos/catalogos/nylon/full');
    console.log('✅ Respuesta exitosa');
    console.log('📊 Número de registros:', response.data.data.length);
    console.log('📋 Primeros 3 registros:');
    response.data.data.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id_mcr}, Calibre: ${item.calibre}, Cuadro: ${item.cuadro}, Torsión: ${item.torsion}, Refuerzo: ${item.refuerzo}`);
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar endpoint de polipropileno
async function testPolipropilenoEndpoint() {
  console.log('\n🔍 Probando endpoint de polipropileno...');
  
  try {
    const response = await api.get('/inventario/panos/catalogos/polipropileno/full');
    console.log('✅ Respuesta exitosa');
    console.log('📊 Número de registros:', response.data.data.length);
    console.log('📋 Primeros 3 registros:');
    response.data.data.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id_mcr}, Grosor: ${item.grosor}, Cuadro: ${item.cuadro}`);
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar endpoint de lona
async function testLonaEndpoint() {
  console.log('\n🔍 Probando endpoint de lona...');
  
  try {
    const response = await api.get('/inventario/panos/catalogos/lona/full');
    console.log('✅ Respuesta exitosa');
    console.log('📊 Número de registros:', response.data.data.length);
    console.log('📋 Primeros 3 registros:');
    response.data.data.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id_mcr}, Color: ${item.color}, Presentación: ${item.presentacion}`);
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar endpoint de malla sombra
async function testMallaSombraEndpoint() {
  console.log('\n🔍 Probando endpoint de malla sombra...');
  
  try {
    const response = await api.get('/inventario/panos/catalogos/malla-sombra/full');
    console.log('✅ Respuesta exitosa');
    console.log('📊 Número de registros:', response.data.data.length);
    console.log('📋 Primeros 3 registros:');
    response.data.data.slice(0, 3).forEach((item, index) => {
      console.log(`  ${index + 1}. ID: ${item.id_mcr}, Color/Tipo: ${item.color_tipo_red}, Presentación: ${item.presentacion}`);
    });
    
    return response.data.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando pruebas simples de endpoints...');
  
  try {
    // 1. Login
    await login();
    
    // 2. Probar todos los endpoints
    await testNylonEndpoint();
    await testPolipropilenoEndpoint();
    await testLonaEndpoint();
    await testMallaSombraEndpoint();
    
    console.log('\n🎉 Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('\n💥 Error en las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  login,
  testNylonEndpoint,
  testPolipropilenoEndpoint,
  testLonaEndpoint,
  testMallaSombraEndpoint
}; 