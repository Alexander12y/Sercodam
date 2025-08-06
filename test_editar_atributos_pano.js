const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

// Función para obtener token de autenticación
async function getAuthToken() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@sercodam.com',
      password: 'admin123'
    });
    
    return response.data.token;
  } catch (error) {
    console.error('Error obteniendo token:', error.response?.data || error.message);
    throw error;
  }
}

// Función para obtener un paño de prueba
async function getPanoDePrueba(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/inventario/panos`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 1 }
    });
    
    if (response.data.data && response.data.data.length > 0) {
      return response.data.data[0];
    }
    
    throw new Error('No se encontraron paños para probar');
  } catch (error) {
    console.error('Error obteniendo paño de prueba:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar el endpoint find-id-mcr
async function testFindIdMcr(token) {
  try {
    console.log('🔍 Probando endpoint find-id-mcr...');
    
    // Probar con especificaciones de nylon
    const response = await axios.post(`${API_BASE_URL}/inventario/panos/find-id-mcr`, {
      tipo_red: 'nylon',
      especificaciones: {
        calibre: '18',
        cuadro: '2 1/8"',
        torsion: '1/8',
        refuerzo: true
      }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ find-id-mcr exitoso:', response.data);
    return response.data.data.id_mcr;
  } catch (error) {
    console.error('❌ Error en find-id-mcr:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar actualización de paño con cambio de id_mcr
async function testUpdatePanoConCambioIdMcr(token, pano, nuevoIdMcr) {
  try {
    console.log('🔍 Probando actualización de paño con cambio de id_mcr...');
    console.log('📊 Paño original:', {
      id_item: pano.id_item,
      id_mcr: pano.id_mcr,
      tipo_red: pano.tipo_red
    });
    console.log('🔄 Nuevo id_mcr:', nuevoIdMcr);
    
    const updateData = {
      id_mcr: nuevoIdMcr,
      largo_m: pano.largo_m,
      ancho_m: pano.ancho_m,
      estado: pano.estado,
      ubicacion: pano.ubicacion,
      precio_x_unidad: pano.precio_x_unidad,
      stock_minimo: pano.stock_minimo
    };
    
    const response = await axios.put(`${API_BASE_URL}/inventario/panos/${pano.id_item}`, updateData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Actualización exitosa:', response.data);
    
    // Verificar que el cambio se aplicó
    const panoActualizado = await axios.get(`${API_BASE_URL}/inventario/panos/${pano.id_item}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Paño actualizado:', {
      id_item: panoActualizado.data.data.id_item,
      id_mcr: panoActualizado.data.data.id_mcr,
      tipo_red: panoActualizado.data.data.tipo_red
    });
    
    return panoActualizado.data.data;
  } catch (error) {
    console.error('❌ Error en actualización:', error.response?.data || error.message);
    throw error;
  }
}

// Función principal
async function testEditarAtributosPano() {
  console.log('🚀 Iniciando prueba de edición de atributos de paños...\n');
  
  try {
    // 1. Obtener token
    console.log('1. 🔐 Obteniendo token de autenticación...');
    const token = await getAuthToken();
    console.log('✅ Token obtenido\n');
    
    // 2. Obtener paño de prueba
    console.log('2. 📋 Obteniendo paño de prueba...');
    const pano = await getPanoDePrueba(token);
    console.log('✅ Paño obtenido:', {
      id_item: pano.id_item,
      id_mcr: pano.id_mcr,
      tipo_red: pano.tipo_red
    });
    console.log('');
    
    // 3. Probar endpoint find-id-mcr
    console.log('3. 🔍 Probando endpoint find-id-mcr...');
    const nuevoIdMcr = await testFindIdMcr(token);
    console.log('✅ Nuevo id_mcr encontrado:', nuevoIdMcr);
    console.log('');
    
    // 4. Probar actualización con cambio de id_mcr
    console.log('4. 🔄 Probando actualización con cambio de id_mcr...');
    const panoActualizado = await testUpdatePanoConCambioIdMcr(token, pano, nuevoIdMcr);
    console.log('✅ Prueba completada exitosamente');
    console.log('');
    
    // 5. Resumen
    console.log('📊 RESUMEN DE LA PRUEBA:');
    console.log('   • Token obtenido: ✅');
    console.log('   • Paño de prueba obtenido: ✅');
    console.log('   • Endpoint find-id-mcr probado: ✅');
    console.log('   • Actualización con cambio de id_mcr: ✅');
    console.log('');
    console.log('🎉 Todas las pruebas pasaron exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    process.exit(1);
  }
}

// Ejecutar la prueba
testEditarAtributosPano(); 