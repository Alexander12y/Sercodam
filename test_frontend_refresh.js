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

async function testFrontendRefresh() {
  try {
    console.log('🔐 Obteniendo token de autenticación...');
    const token = await login();
    console.log('✅ Token obtenido exitosamente');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('🧪 Probando refresco de datos...');
    
    // Test 1: Obtener lista inicial
    console.log('\n📋 Test 1: Obtener lista inicial');
    const response1 = await axios.get(`${API_BASE_URL}/inventario/panos`, {
      headers,
      params: {
        page: 1,
        limit: 10
      }
    });
    
    const pano855Inicial = response1.data.panos.find(p => p.id_item === 855);
    console.log('✅ Paño 855 en lista inicial:');
    console.log('- Especificaciones:', pano855Inicial?.especificaciones);
    console.log('- Calibre:', pano855Inicial?.calibre);
    console.log('- Cuadro:', pano855Inicial?.cuadro);
    
    // Test 2: Actualizar paño
    console.log('\n📋 Test 2: Actualizar paño');
    const updateData = {
      tipo_red: 'nylon',
      calibre: '18',
      cuadro: '1"',
      torsion: 'Torcida',
      refuerzo: 'Sí',
      largo_m: 5.0,
      ancho_m: 5.0,
      estado: 'bueno',
      ubicacion: 'Bodega CDMX',
      precio_x_unidad: 150.00,
      stock_minimo: 5.0
    };
    
    const response2 = await axios.put(`${API_BASE_URL}/inventario/panos/855`, updateData, {
      headers
    });
    
    console.log('✅ Respuesta de actualización:', response2.data);
    
    // Test 3: Obtener lista después de actualizar (simulando refresco)
    console.log('\n📋 Test 3: Obtener lista después de actualizar');
    const response3 = await axios.get(`${API_BASE_URL}/inventario/panos`, {
      headers,
      params: {
        page: 1,
        limit: 10
      }
    });
    
    const pano855Final = response3.data.panos.find(p => p.id_item === 855);
    console.log('✅ Paño 855 en lista después de actualizar:');
    console.log('- Especificaciones:', pano855Final?.especificaciones);
    console.log('- Calibre:', pano855Final?.calibre);
    console.log('- Cuadro:', pano855Final?.cuadro);
    
    // Test 4: Verificar si los datos cambiaron
    console.log('\n📋 Test 4: Verificar cambios');
    const calibreCambio = pano855Inicial?.calibre !== pano855Final?.calibre;
    const cuadroCambio = pano855Inicial?.cuadro !== pano855Final?.cuadro;
    const especificacionesCambio = pano855Inicial?.especificaciones !== pano855Final?.especificaciones;
    
    console.log('✅ Cambios detectados:');
    console.log('- Calibre cambió:', calibreCambio);
    console.log('- Cuadro cambió:', cuadroCambio);
    console.log('- Especificaciones cambiaron:', especificacionesCambio);
    
    if (calibreCambio || cuadroCambio || especificacionesCambio) {
      console.log('🎉 ¡El refresco de datos funciona correctamente!');
    } else {
      console.log('❌ El refresco de datos NO está funcionando');
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
testFrontendRefresh(); 