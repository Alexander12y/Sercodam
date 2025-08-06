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

async function simulateFrontendFlow() {
  try {
    console.log('🔐 Obteniendo token de autenticación...');
    const token = await login();
    console.log('✅ Token obtenido exitosamente');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('🧪 Simulando flujo completo del frontend...');
    
    // Simular: Usuario abre la lista de paños
    console.log('\n📋 Paso 1: Cargar lista inicial de paños');
    const response1 = await axios.get(`${API_BASE_URL}/inventario/panos`, {
      headers,
      params: {
        page: 1,
        limit: 50
      }
    });
    
    const pano855Inicial = response1.data.panos.find(p => p.id_item === 855);
    console.log('✅ Lista inicial cargada - Paño 855:');
    console.log('- Calibre:', pano855Inicial?.calibre);
    console.log('- Cuadro:', pano855Inicial?.cuadro);
    console.log('- Especificaciones:', pano855Inicial?.especificaciones);
    
    // Simular: Usuario hace clic en editar paño 855
    console.log('\n📋 Paso 2: Usuario hace clic en editar paño 855');
    const response2 = await axios.get(`${API_BASE_URL}/inventario/panos/855`, {
      headers
    });
    
    console.log('✅ Datos del paño para editar:');
    console.log('- Calibre:', response2.data.data.calibre);
    console.log('- Cuadro:', response2.data.data.cuadro);
    console.log('- Especificaciones:', response2.data.data.especificaciones);
    
    // Simular: Usuario modifica los datos y guarda
    console.log('\n📋 Paso 3: Usuario modifica y guarda el paño');
    const updateData = {
      tipo_red: 'nylon',
      calibre: '18',
      cuadro: '1"',
      torsion: 'Torcida',
      refuerzo: 'Sí',
      largo_m: 6.0,
      ancho_m: 6.0,
      estado: 'bueno',
      ubicacion: 'Bodega CDMX',
      precio_x_unidad: 140.00,
      stock_minimo: 6.0
    };
    
    const response3 = await axios.put(`${API_BASE_URL}/inventario/panos/855`, updateData, {
      headers
    });
    
    console.log('✅ Respuesta de actualización:', response3.data);
    
    // Simular: Frontend llama a onSuccess() y recarga la lista
    console.log('\n📋 Paso 4: Frontend recarga la lista después de onSuccess()');
    const response4 = await axios.get(`${API_BASE_URL}/inventario/panos`, {
      headers,
      params: {
        page: 1,
        limit: 50
      }
    });
    
    const pano855Final = response4.data.panos.find(p => p.id_item === 855);
    console.log('✅ Lista recargada - Paño 855:');
    console.log('- Calibre:', pano855Final?.calibre);
    console.log('- Cuadro:', pano855Final?.cuadro);
    console.log('- Especificaciones:', pano855Final?.especificaciones);
    
    // Verificar si los cambios se reflejaron
    console.log('\n📋 Paso 5: Verificar si los cambios se reflejaron');
    const calibreCambio = pano855Inicial?.calibre !== pano855Final?.calibre;
    const cuadroCambio = pano855Inicial?.cuadro !== pano855Final?.cuadro;
    const especificacionesCambio = pano855Inicial?.especificaciones !== pano855Final?.especificaciones;
    
    console.log('✅ Cambios detectados:');
    console.log('- Calibre cambió:', calibreCambio);
    console.log('- Cuadro cambió:', cuadroCambio);
    console.log('- Especificaciones cambiaron:', especificacionesCambio);
    
    if (calibreCambio || cuadroCambio || especificacionesCambio) {
      console.log('🎉 ¡El flujo completo funciona correctamente!');
      console.log('🔍 El problema está en el frontend - específicamente en:');
      console.log('   1. PanoModal no llama a onSuccess()');
      console.log('   2. PanosList no recarga la lista');
      console.log('   3. Redux no actualiza el estado');
    } else {
      console.log('❌ El flujo NO está funcionando - los datos no cambiaron');
    }
    
    // Simular: Verificar que el paño individual también tiene los cambios
    console.log('\n📋 Paso 6: Verificar paño individual después de actualizar');
    const response5 = await axios.get(`${API_BASE_URL}/inventario/panos/855`, {
      headers
    });
    
    console.log('✅ Paño individual después de actualizar:');
    console.log('- Calibre:', response5.data.data.calibre);
    console.log('- Cuadro:', response5.data.data.cuadro);
    console.log('- Especificaciones:', response5.data.data.especificaciones);
    
    // Verificar consistencia
    const consistente = 
      response5.data.data.calibre === pano855Final?.calibre &&
      response5.data.data.cuadro === pano855Final?.cuadro &&
      response5.data.data.especificaciones === pano855Final?.especificaciones;
    
    console.log('✅ Consistencia entre individual y lista:', consistente);
    
  } catch (error) {
    console.error('❌ Error en la simulación:', error.response?.data || error.message);
    if (error.response) {
      console.error('📊 Detalles del error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
  }
}

// Ejecutar la simulación
simulateFrontendFlow(); 