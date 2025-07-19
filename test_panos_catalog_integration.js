// ================================
// PRUEBA DE INTEGRACIÓN DE CATÁLOGO DE PAÑOS
// ================================
// Este script verifica que el sistema de catálogos funciona correctamente

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

// Configurar axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Función para hacer login y obtener token
async function login() {
  try {
    const response = await api.post('/auth/login', {
      email: 'admin@sercodam.com',
      password: 'admin123'
    });
    
    const token = response.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('✅ Login exitoso');
    return token;
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar los endpoints de catálogos
async function testCatalogEndpoints() {
  console.log('\n🔍 Probando endpoints de catálogos...');
  
  try {
    // 1. Probar endpoint de nylon
    console.log('\n1. Probando catálogo de nylon...');
    const nylonResponse = await api.get('/inventario/panos/catalogos/nylon');
    console.log('✅ Nylon catálogo:', nylonResponse.data.data);
    
    // 2. Probar endpoint de datos completos de nylon
    console.log('\n2. Probando datos completos de nylon...');
    const nylonFullResponse = await api.get('/inventario/panos/catalogos/nylon/full');
    console.log('✅ Nylon datos completos:', nylonFullResponse.data.data.length, 'registros');
    
    // 3. Probar endpoint de polipropileno
    console.log('\n3. Probando catálogo de polipropileno...');
    const polipropilenoResponse = await api.get('/inventario/panos/catalogos/polipropileno');
    console.log('✅ Polipropileno catálogo:', polipropilenoResponse.data.data);
    
    // 4. Probar endpoint de datos completos de polipropileno
    console.log('\n4. Probando datos completos de polipropileno...');
    const polipropilenoFullResponse = await api.get('/inventario/panos/catalogos/polipropileno/full');
    console.log('✅ Polipropileno datos completos:', polipropilenoFullResponse.data.data.length, 'registros');
    
    // 5. Probar endpoint de lona
    console.log('\n5. Probando catálogo de lona...');
    const lonaResponse = await api.get('/inventario/panos/catalogos/lona');
    console.log('✅ Lona catálogo:', lonaResponse.data.data);
    
    // 6. Probar endpoint de datos completos de lona
    console.log('\n6. Probando datos completos de lona...');
    const lonaFullResponse = await api.get('/inventario/panos/catalogos/lona/full');
    console.log('✅ Lona datos completos:', lonaFullResponse.data.data.length, 'registros');
    
    // 7. Probar endpoint de malla sombra
    console.log('\n7. Probando catálogo de malla sombra...');
    const mallaSombraResponse = await api.get('/inventario/panos/catalogos/malla-sombra');
    console.log('✅ Malla sombra catálogo:', mallaSombraResponse.data.data);
    
    // 8. Probar endpoint de datos completos de malla sombra
    console.log('\n8. Probando datos completos de malla sombra...');
    const mallaSombraFullResponse = await api.get('/inventario/panos/catalogos/malla-sombra/full');
    console.log('✅ Malla sombra datos completos:', mallaSombraFullResponse.data.data.length, 'registros');
    
    return {
      nylon: nylonResponse.data.data,
      nylonFull: nylonFullResponse.data.data,
      polipropileno: polipropilenoResponse.data.data,
      polipropilenoFull: polipropilenoFullResponse.data.data,
      lona: lonaResponse.data.data,
      lonaFull: lonaFullResponse.data.data,
      mallaSombra: mallaSombraResponse.data.data,
      mallaSombraFull: mallaSombraFullResponse.data.data
    };
    
  } catch (error) {
    console.error('❌ Error probando endpoints:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar la creación de un paño con id_mcr del catálogo
async function testCreatePanoWithCatalogId(catalogData) {
  console.log('\n🔍 Probando creación de paño con id_mcr del catálogo...');
  
  try {
    // Buscar un id_mcr válido de nylon
    if (catalogData.nylonFull.length === 0) {
      console.log('⚠️ No hay datos de nylon en el catálogo');
      return;
    }
    
    const nylonItem = catalogData.nylonFull[0];
    console.log('📋 Usando id_mcr de nylon:', nylonItem.id_mcr);
    console.log('📋 Especificaciones:', {
      calibre: nylonItem.calibre,
      cuadro: nylonItem.cuadro,
      torsion: nylonItem.torsion,
      refuerzo: nylonItem.refuerzo
    });
    
    // Crear un paño usando el id_mcr del catálogo
    const panoData = {
      id_mcr: nylonItem.id_mcr,
      largo_m: 10.5,
      ancho_m: 5.2,
      estado: 'bueno',
      ubicacion: 'Bodega CDMX',
      precio_x_unidad: 150.00,
      stock_minimo: 5.0
    };
    
    console.log('📤 Enviando datos:', panoData);
    
    const response = await api.post('/inventario/panos', panoData);
    console.log('✅ Paño creado exitosamente:', response.data);
    
    // Verificar que el paño se creó correctamente
    const createdPano = await api.get(`/inventario/panos/${response.data.data.id_item}`);
    console.log('✅ Paño verificado:', createdPano.data.data);
    
    return response.data.data;
    
  } catch (error) {
    console.error('❌ Error creando paño:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar que no se pueden crear combinaciones inválidas
async function testInvalidCombination() {
  console.log('\n🔍 Probando que no se pueden crear combinaciones inválidas...');
  
  try {
    // Intentar crear un paño con un id_mcr que no existe
    const invalidData = {
      id_mcr: 'INVALID_ID_MCR_123',
      largo_m: 10.5,
      ancho_m: 5.2,
      estado: 'bueno',
      ubicacion: 'Bodega CDMX',
      precio_x_unidad: 150.00,
      stock_minimo: 5.0
    };
    
    console.log('📤 Intentando crear paño con id_mcr inválido...');
    
    await api.post('/inventario/panos', invalidData);
    console.log('❌ ERROR: Se permitió crear un paño con id_mcr inválido');
    
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correcto: Se rechazó el id_mcr inválido');
      console.log('📋 Mensaje de error:', error.response.data.message);
    } else {
      console.error('❌ Error inesperado:', error.response?.data || error.message);
    }
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando pruebas de integración de catálogo de paños...');
  
  try {
    // 1. Login
    await login();
    
    // 2. Probar endpoints de catálogos
    const catalogData = await testCatalogEndpoints();
    
    // 3. Probar creación de paño con id_mcr válido
    await testCreatePanoWithCatalogId(catalogData);
    
    // 4. Probar que no se pueden crear combinaciones inválidas
    await testInvalidCombination();
    
    console.log('\n🎉 Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('\n💥 Error en las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  login,
  testCatalogEndpoints,
  testCreatePanoWithCatalogId,
  testInvalidCombination
}; 