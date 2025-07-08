const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function testHerramientasSimple() {
  try {
    console.log('🔍 Probando búsqueda de herramientas...');
    
    // 1. Login
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login exitoso');
    
    // 2. Probar búsqueda simple
    console.log('\n🔍 Probando búsqueda simple...');
    const response = await axios.get(`${API_BASE_URL}/inventario/herramientas?limit=10`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Respuesta completa:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log(`✅ Se encontraron ${response.data.data.herramientas.length} herramientas`);
      response.data.data.herramientas.forEach((h, i) => {
        console.log(`   ${i + 1}. ${h.descripcion || h.id_herramienta || h.id_item} (${h.categoria || 'Sin categoría'})`);
      });
    } else {
      console.log('❌ Error en la respuesta');
    }
    
    // 3. Probar búsqueda con filtro
    console.log('\n🔍 Probando búsqueda con filtro...');
    const responseFilter = await axios.get(`${API_BASE_URL}/inventario/herramientas?search=pinza&limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Respuesta con filtro:', JSON.stringify(responseFilter.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testHerramientasSimple(); 