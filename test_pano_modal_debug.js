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

async function testPanoModalDebug() {
  try {
    console.log('🔐 Obteniendo token de autenticación...');
    const token = await login();
    console.log('✅ Token obtenido exitosamente');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('🧪 Debuggeando problema del PanoModal...');
    
    // Test 1: Obtener paño específico antes de actualizar
    console.log('\n📋 Test 1: Obtener paño 855 antes de actualizar');
    const response1 = await axios.get(`${API_BASE_URL}/inventario/panos/855`, {
      headers
    });
    
    console.log('✅ Paño 855 antes de actualizar:');
    console.log('- Calibre:', response1.data.data.calibre);
    console.log('- Cuadro:', response1.data.data.cuadro);
    console.log('- Especificaciones:', response1.data.data.especificaciones);
    
    // Test 2: Actualizar con datos diferentes
    console.log('\n📋 Test 2: Actualizar paño con datos diferentes');
    const updateData = {
      tipo_red: 'nylon',
      calibre: '30',
      cuadro: '7/8"',
      torsion: 'Trenzada',
      refuerzo: 'No',
      largo_m: 8.0,
      ancho_m: 8.0,
      estado: 'bueno',
      ubicacion: 'Bodega CDMX',
      precio_x_unidad: 120.00,
      stock_minimo: 8.0
    };
    
    const response2 = await axios.put(`${API_BASE_URL}/inventario/panos/855`, updateData, {
      headers
    });
    
    console.log('✅ Respuesta de actualización:', response2.data);
    
    // Test 3: Obtener paño específico después de actualizar
    console.log('\n📋 Test 3: Obtener paño 855 después de actualizar');
    const response3 = await axios.get(`${API_BASE_URL}/inventario/panos/855`, {
      headers
    });
    
    console.log('✅ Paño 855 después de actualizar:');
    console.log('- Calibre:', response3.data.data.calibre);
    console.log('- Cuadro:', response3.data.data.cuadro);
    console.log('- Especificaciones:', response3.data.data.especificaciones);
    
    // Test 4: Obtener lista completa y buscar el paño
    console.log('\n📋 Test 4: Obtener lista completa');
    const response4 = await axios.get(`${API_BASE_URL}/inventario/panos`, {
      headers,
      params: {
        page: 1,
        limit: 50
      }
    });
    
    const panoEnLista = response4.data.panos.find(p => p.id_item === 855);
    console.log('✅ Paño 855 en lista completa:');
    console.log('- Calibre:', panoEnLista?.calibre);
    console.log('- Cuadro:', panoEnLista?.cuadro);
    console.log('- Especificaciones:', panoEnLista?.especificaciones);
    
    // Test 5: Verificar si los datos son consistentes
    console.log('\n📋 Test 5: Verificar consistencia de datos');
    const calibreConsistente = response3.data.data.calibre === panoEnLista?.calibre;
    const cuadroConsistente = response3.data.data.cuadro === panoEnLista?.cuadro;
    const especificacionesConsistentes = response3.data.data.especificaciones === panoEnLista?.especificaciones;
    
    console.log('✅ Consistencia de datos:');
    console.log('- Calibre consistente:', calibreConsistente);
    console.log('- Cuadro consistente:', cuadroConsistente);
    console.log('- Especificaciones consistentes:', especificacionesConsistentes);
    
    if (calibreConsistente && cuadroConsistente && especificacionesConsistentes) {
      console.log('🎉 Los datos son consistentes entre endpoint individual y lista');
      console.log('🔍 El problema está en el frontend - no está refrescando la lista');
    } else {
      console.log('❌ Los datos NO son consistentes - problema en el backend');
    }
    
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
testPanoModalDebug(); 