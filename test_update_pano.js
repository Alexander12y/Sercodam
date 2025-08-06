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

async function testUpdatePano() {
  try {
    console.log('🔐 Obteniendo token de autenticación...');
    const token = await login();
    console.log('✅ Token obtenido exitosamente');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('🧪 Probando actualización de paño...');
    
    // Test 1: Obtener paño antes de actualizar
    console.log('\n📋 Test 1: Obtener paño ID 855 antes de actualizar');
    const response1 = await axios.get(`${API_BASE_URL}/inventario/panos/855`, {
      headers
    });
    
    console.log('✅ Paño antes de actualizar:');
    console.log('- Calibre:', response1.data.data.calibre);
    console.log('- Cuadro:', response1.data.data.cuadro);
    console.log('- Torsión:', response1.data.data.torsion);
    console.log('- Especificaciones:', response1.data.data.especificaciones);
    
    // Test 2: Actualizar paño
    console.log('\n📋 Test 2: Actualizar paño con nuevas especificaciones');
    const updateData = {
      tipo_red: 'nylon',
      calibre: '30',
      cuadro: '7/8"',
      torsion: 'Trenzada',
      refuerzo: 'Sí',
      largo_m: 10.0,
      ancho_m: 10.0,
      estado: 'bueno',
      ubicacion: 'Bodega CDMX',
      precio_x_unidad: 135.67,
      stock_minimo: 10.0
    };
    
    const response2 = await axios.put(`${API_BASE_URL}/inventario/panos/855`, updateData, {
      headers
    });
    
    console.log('✅ Respuesta de actualización:', response2.data);
    
    // Test 3: Obtener paño después de actualizar
    console.log('\n📋 Test 3: Obtener paño ID 855 después de actualizar');
    const response3 = await axios.get(`${API_BASE_URL}/inventario/panos/855`, {
      headers
    });
    
    console.log('✅ Paño después de actualizar:');
    console.log('- Calibre:', response3.data.data.calibre);
    console.log('- Cuadro:', response3.data.data.cuadro);
    console.log('- Torsión:', response3.data.data.torsion);
    console.log('- Refuerzo:', response3.data.data.refuerzo);
    console.log('- Especificaciones:', response3.data.data.especificaciones);
    
    // Test 4: Verificar en la lista de paños
    console.log('\n📋 Test 4: Verificar en lista de paños');
    const response4 = await axios.get(`${API_BASE_URL}/inventario/panos`, {
      headers,
      params: {
        limit: 10
      }
    });
    
    const panoEnLista = response4.data.panos.find(p => p.id_item === 855);
    if (panoEnLista) {
      console.log('✅ Paño en lista después de actualizar:');
      console.log('- Calibre:', panoEnLista.calibre);
      console.log('- Cuadro:', panoEnLista.cuadro);
      console.log('- Torsión:', panoEnLista.torsion);
      console.log('- Especificaciones:', panoEnLista.especificaciones);
    }
    
    console.log('\n🎉 Test de actualización completado exitosamente!');
    
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
testUpdatePano(); 