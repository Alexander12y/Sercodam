// ================================
// PRUEBA DE ESPECIFICACIONES DE PAÑOS
// ================================

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

// Función para probar la lista de paños
async function testPanosList() {
  console.log('\n🔍 Probando lista de paños...');
  
  try {
    const response = await api.get('/inventario/panos', {
      params: { limit: 5 } // Solo 5 paños para la prueba
    });
    
    console.log('✅ Respuesta exitosa');
    console.log('📊 Número de paños:', response.data.panos.length);
    
    // Mostrar detalles de cada paño
    response.data.panos.forEach((pano, index) => {
      console.log(`\n📋 Paño ${index + 1}:`);
      console.log(`  ID: ${pano.id_item}`);
      console.log(`  Tipo: ${pano.tipo_red}`);
      console.log(`  Dimensiones: ${pano.largo_m} × ${pano.ancho_m} m`);
      console.log(`  Área: ${pano.area_m2} m²`);
      
      // Mostrar especificaciones según el tipo
      if (pano.tipo_red === 'nylon') {
        console.log(`  Calibre: ${pano.calibre || 'N/A'}`);
        console.log(`  Cuadro: ${pano.cuadro || 'N/A'}`);
        console.log(`  Torsión: ${pano.torsion || 'N/A'}`);
        console.log(`  Refuerzo: ${pano.refuerzo !== undefined && pano.refuerzo !== null ? (pano.refuerzo ? 'Sí' : 'No') : 'N/A'}`);
      } else if (pano.tipo_red === 'lona') {
        console.log(`  Color: ${pano.color || 'N/A'}`);
        console.log(`  Presentación: ${pano.presentacion || 'N/A'}`);
      } else if (pano.tipo_red === 'polipropileno') {
        console.log(`  Grosor: ${pano.grosor || 'N/A'}`);
        console.log(`  Cuadro: ${pano.cuadro || 'N/A'}`);
      } else if (pano.tipo_red === 'malla sombra') {
        console.log(`  Color/Tipo: ${pano.color_tipo_red || 'N/A'}`);
        console.log(`  Presentación: ${pano.presentacion || 'N/A'}`);
      }
      
      // Mostrar especificaciones formateadas
      if (pano.especificaciones) {
        console.log(`  Especificaciones formateadas:`);
        console.log(`    ${pano.especificaciones.replace(/\n/g, '\n    ')}`);
      }
    });
    
    return response.data.panos;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar un paño específico
async function testPanoById(panos) {
  if (panos.length === 0) {
    console.log('\n⚠️ No hay paños para probar');
    return;
  }
  
  const pano = panos[0]; // Usar el primer paño
  console.log(`\n🔍 Probando paño específico ID: ${pano.id_item}...`);
  
  try {
    const response = await api.get(`/inventario/panos/${pano.id_item}`);
    
    console.log('✅ Respuesta exitosa');
    const panoDetalle = response.data.data;
    
    console.log(`📋 Detalles del paño:`);
    console.log(`  ID: ${panoDetalle.id_item}`);
    console.log(`  Tipo: ${panoDetalle.tipo_red}`);
    console.log(`  Dimensiones: ${panoDetalle.largo_m} × ${panoDetalle.ancho_m} m`);
    console.log(`  Área: ${panoDetalle.area_m2} m²`);
    
    // Mostrar especificaciones según el tipo
    if (panoDetalle.tipo_red === 'nylon') {
      console.log(`  Calibre: ${panoDetalle.calibre || 'N/A'}`);
      console.log(`  Cuadro: ${panoDetalle.cuadro || 'N/A'}`);
      console.log(`  Torsión: ${panoDetalle.torsion || 'N/A'}`);
      console.log(`  Refuerzo: ${panoDetalle.refuerzo !== undefined && panoDetalle.refuerzo !== null ? (panoDetalle.refuerzo ? 'Sí' : 'No') : 'N/A'}`);
    } else if (panoDetalle.tipo_red === 'lona') {
      console.log(`  Color: ${panoDetalle.color || 'N/A'}`);
      console.log(`  Presentación: ${panoDetalle.presentacion || 'N/A'}`);
    } else if (panoDetalle.tipo_red === 'polipropileno') {
      console.log(`  Grosor: ${panoDetalle.grosor || 'N/A'}`);
      console.log(`  Cuadro: ${panoDetalle.cuadro || 'N/A'}`);
    } else if (panoDetalle.tipo_red === 'malla sombra') {
      console.log(`  Color/Tipo: ${panoDetalle.color_tipo_red || 'N/A'}`);
      console.log(`  Presentación: ${panoDetalle.presentacion || 'N/A'}`);
    }
    
    // Mostrar especificaciones formateadas
    if (panoDetalle.especificaciones) {
      console.log(`  Especificaciones formateadas:`);
      console.log(`    ${panoDetalle.especificaciones.replace(/\n/g, '\n    ')}`);
    }
    
    return panoDetalle;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

// Función para verificar datos en las tablas hijas
async function testCatalogData() {
  console.log('\n🔍 Probando datos del catálogo...');
  
  try {
    // Probar endpoint de nylon
    const nylonResponse = await api.get('/inventario/panos/catalogos/nylon/full');
    console.log('✅ Datos de nylon:', nylonResponse.data.data.length, 'registros');
    
    // Probar endpoint de lona
    const lonaResponse = await api.get('/inventario/panos/catalogos/lona/full');
    console.log('✅ Datos de lona:', lonaResponse.data.data.length, 'registros');
    
    // Probar endpoint de polipropileno
    const polipropilenoResponse = await api.get('/inventario/panos/catalogos/polipropileno/full');
    console.log('✅ Datos de polipropileno:', polipropilenoResponse.data.data.length, 'registros');
    
    // Probar endpoint de malla sombra
    const mallaSombraResponse = await api.get('/inventario/panos/catalogos/malla-sombra/full');
    console.log('✅ Datos de malla sombra:', mallaSombraResponse.data.data.length, 'registros');
    
    return {
      nylon: nylonResponse.data.data,
      lona: lonaResponse.data.data,
      polipropileno: polipropilenoResponse.data.data,
      mallaSombra: mallaSombraResponse.data.data
    };
  } catch (error) {
    console.error('❌ Error obteniendo datos del catálogo:', error.response?.data || error.message);
    throw error;
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando pruebas de especificaciones de paños...');
  
  try {
    // 1. Login
    await login();
    
    // 2. Probar datos del catálogo
    await testCatalogData();
    
    // 3. Probar lista de paños
    const panos = await testPanosList();
    
    // 4. Probar paño específico
    await testPanoById(panos);
    
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
  testPanosList,
  testPanoById,
  testCatalogData
}; 