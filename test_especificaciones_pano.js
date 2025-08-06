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

async function testEspecificacionesPano() {
  try {
    console.log('🔐 Obteniendo token de autenticación...');
    const token = await login();
    console.log('✅ Token obtenido exitosamente');
    
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    console.log('🧪 Probando especificaciones de paño específico...');
    
    // Test: Obtener un paño específico (ID 855 que vimos en las pruebas anteriores)
    console.log('\n📋 Test: Obtener paño ID 855');
    const response = await axios.get(`${API_BASE_URL}/inventario/panos/855`, {
      headers
    });
    
    console.log('✅ Respuesta completa del paño:');
    console.log(JSON.stringify(response.data, null, 2));
    
    if (response.data.data) {
      const pano = response.data.data;
      console.log('\n📊 Especificaciones del paño:');
      console.log('- ID:', pano.id_item);
      console.log('- ID_MCR:', pano.id_mcr);
      console.log('- Tipo de red:', pano.tipo_red);
      console.log('- Calibre:', pano.calibre);
      console.log('- Cuadro:', pano.cuadro);
      console.log('- Torsión:', pano.torsion);
      console.log('- Refuerzo:', pano.refuerzo);
      console.log('- Color:', pano.color);
      console.log('- Presentación:', pano.presentacion);
      console.log('- Grosor:', pano.grosor);
      console.log('- Color/Tipo:', pano.color_tipo_red);
      console.log('- Especificaciones generadas:', pano.especificaciones);
    }
    
    console.log('\n🎉 Test de especificaciones completado exitosamente!');
    
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
testEspecificacionesPano(); 