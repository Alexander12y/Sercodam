const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

// Función para hacer login y obtener token
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

// Función para probar el endpoint de redes producto
async function testRedesProducto(token) {
  try {
    console.log('🔍 Probando endpoint de redes producto...');
    
    const response = await axios.get(`${API_BASE_URL}/inventario/redes-producto`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 10 }
    });
    
    console.log('✅ Respuesta exitosa:', {
      total: response.data.pagination?.total,
      items: response.data.data?.length,
      sample: response.data.data?.[0]
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error en redes producto:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar filtros específicos
async function testFiltrosRedes(token) {
  try {
    console.log('🔍 Probando filtros de redes producto...');
    
    // Probar filtro por tipo de red
    const responseNylon = await axios.get(`${API_BASE_URL}/inventario/redes-producto`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { 
        tipo_red: 'nylon',
        limit: 5
      }
    });
    
    console.log('✅ Filtro por nylon:', {
      total: responseNylon.data.pagination?.total,
      items: responseNylon.data.data?.length
    });
    
    // Probar filtro por marca
    const responseMarca = await axios.get(`${API_BASE_URL}/inventario/redes-producto`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { 
        marca: 'Sercodam',
        limit: 5
      }
    });
    
    console.log('✅ Filtro por marca:', {
      total: responseMarca.data.pagination?.total,
      items: responseMarca.data.data?.length
    });
    
  } catch (error) {
    console.error('❌ Error en filtros:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar catálogos
async function testCatalogos(token) {
  try {
    console.log('🔍 Probando catálogos de redes producto...');
    
    const response = await axios.get(`${API_BASE_URL}/inventario/redes-producto/catalogos`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Catálogos obtenidos:', {
      nylon: response.data.data?.nylon ? 'Disponible' : 'No disponible',
      polipropileno: response.data.data?.polipropileno ? 'Disponible' : 'No disponible',
      lona: response.data.data?.lona ? 'Disponible' : 'No disponible',
      mallaSombra: response.data.data?.mallaSombra ? 'Disponible' : 'No disponible'
    });
    
    return response.data;
  } catch (error) {
    console.error('❌ Error en catálogos:', error.response?.data || error.message);
    throw error;
  }
}

// Función principal
async function runTests() {
  try {
    console.log('🚀 Iniciando pruebas de redes producto...\n');
    
    // Login
    console.log('1. Haciendo login...');
    const token = await login();
    console.log('✅ Login exitoso\n');
    
    // Probar endpoint básico
    console.log('2. Probando endpoint básico...');
    await testRedesProducto(token);
    console.log('');
    
    // Probar filtros
    console.log('3. Probando filtros...');
    await testFiltrosRedes(token);
    console.log('');
    
    // Probar catálogos
    console.log('4. Probando catálogos...');
    await testCatalogos(token);
    console.log('');
    
    console.log('🎉 Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('💥 Error en las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar pruebas
runTests(); 