const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function testEstadoActual() {
  console.log('🔍 Verificando estado actual del sistema...\n');

  try {
    // 1. Probar login
    console.log('1. 🔐 Probando login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin123!'
    });
    
    if (loginResponse.data.success) {
      console.log('✅ Login exitoso');
      const token = loginResponse.data.token;
      
      // 2. Obtener paños
      console.log('\n2. 📋 Obteniendo paños...');
      const panosResponse = await axios.get(`${API_BASE_URL}/inventario/panos?limit=3`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (panosResponse.data.success) {
        console.log(`✅ Se encontraron ${panosResponse.data.panos?.length || 0} paños`);
        if (panosResponse.data.panos?.length > 0) {
          const primerPano = panosResponse.data.panos[0];
          console.log(`   Primer paño: ID ${primerPano.id_item}, Área: ${primerPano.area_m2} m²`);
        }
      } else {
        console.log('❌ Error obteniendo paños');
      }
      
    } else {
      console.log('❌ Login falló');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error.response?.data || error.message);
  }
}

testEstadoActual(); 