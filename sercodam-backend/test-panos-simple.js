const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testPanos() {
  try {
    console.log('🔍 Probando endpoint de paños...');
    
    // Primero hacer login
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    console.log('✅ Login exitoso');
    const token = loginResponse.data.token;
    
    // Probar endpoint de paños
    const panosResponse = await axios.get(`${API_BASE}/inventario/panos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Respuesta de paños:', panosResponse.data);
    console.log('📊 Cantidad de paños:', panosResponse.data.panos?.length || 0);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testPanos(); 