// Cargar variables de entorno
require('dotenv').config({ path: './sercodam-backend/.env' });

const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin123!'
    });
    
    return response.data.data.tokens.accessToken;
  } catch (error) {
    console.error('Error en login:', error.response?.data || error.message);
    throw error;
  }
}

async function testCatalogosRedes() {
  try {
    console.log('🔐 Obteniendo token de autenticación...');
    const token = await login();
    console.log('✅ Token obtenido exitosamente');
    
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    console.log('🧪 Probando endpoint de catálogos de redes...');
    
    // Test: Obtener catálogos
    console.log('\n📋 Test: Obtener catálogos de especificaciones');
    const response = await axios.get(`${API_BASE_URL}/inventario/redes-producto/catalogos`, {
      headers
    });
    
    console.log('✅ Respuesta completa de catálogos:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.data) {
      console.log('\n📊 Resumen de catálogos:');
      console.log('- tipos_red:', response.data.data.tipos_red?.length || 0);
      console.log('- marcas:', response.data.data.marcas?.length || 0);
      console.log('- calibres:', response.data.data.calibres?.length || 0);
      console.log('- cuadros:', response.data.data.cuadros?.length || 0);
      console.log('- torsiones:', response.data.data.torsiones?.length || 0);
      console.log('- colores:', response.data.data.colores?.length || 0);
      console.log('- presentaciones:', response.data.data.presentaciones?.length || 0);
      console.log('- grosores:', response.data.data.grosores?.length || 0);
      console.log('- colores_tipo_red:', response.data.data.colores_tipo_red?.length || 0);
      
      if (response.data.data.calibres) {
        console.log('\n📋 Calibres disponibles:', response.data.data.calibres);
      }
      if (response.data.data.cuadros) {
        console.log('\n📋 Cuadros disponibles:', response.data.data.cuadros);
      }
      if (response.data.data.torsiones) {
        console.log('\n📋 Torsiones disponibles:', response.data.data.torsiones);
      }
      if (response.data.data.colores) {
        console.log('\n📋 Colores disponibles:', response.data.data.colores);
      }
    }
    
    console.log('\n🎉 Test de catálogos completado exitosamente!');
    
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
testCatalogosRedes(); 