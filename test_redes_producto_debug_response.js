// Cargar variables de entorno
require('dotenv').config({ path: './sercodam-backend/.env' });

const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function testRedesProductoDebugResponse() {
  try {
    console.log('🧪 Debuggeando respuesta exacta del backend...');
    
    // Test 1: Obtener redes sin filtros
    console.log('\n📋 Test 1: Obtener redes sin filtros (limit 3)');
    const response1 = await axios.get(`${API_BASE_URL}/inventario/redes-producto`, {
      params: {
        limit: 3
      }
    });
    
    console.log('✅ Respuesta completa del backend:');
    console.log(JSON.stringify(response1.data, null, 2));
    
    if (response1.data.data && response1.data.data.length > 0) {
      console.log('\n📦 Primera red - estructura completa:');
      console.log(JSON.stringify(response1.data.data[0], null, 2));
    }
    
    // Test 2: Obtener catálogos
    console.log('\n📋 Test 2: Obtener catálogos de especificaciones');
    const response2 = await axios.get(`${API_BASE_URL}/inventario/redes-producto/catalogos`);
    
    console.log('✅ Respuesta completa de catálogos:');
    console.log(JSON.stringify(response2.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.response?.data || error.message);
    if (error.response) {
      console.error('📊 Detalles del error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
  }
}

// Ejecutar la prueba
testRedesProductoDebugResponse(); 