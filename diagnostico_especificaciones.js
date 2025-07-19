// ================================
// DIAGNÓSTICO DE ESPECIFICACIONES DE PAÑOS
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
      username: 'admin',
      password: 'Admin123!'
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

// Función para diagnosticar un paño específico
async function diagnosticarPano(panoId) {
  console.log(`\n🔍 DIAGNÓSTICO DEL PAÑO ID: ${panoId}`);
  console.log('=' .repeat(50));
  
  try {
    // 1. Obtener el paño desde el endpoint
    const response = await api.get(`/inventario/panos/${panoId}`);
    const pano = response.data.data;
    
    console.log('\n📋 DATOS DEL PAÑO:');
    console.log(`ID: ${pano.id_item}`);
    console.log(`ID_MCR: ${pano.id_mcr}`);
    console.log(`Tipo de red: ${pano.tipo_red}`);
    console.log(`Dimensiones: ${pano.largo_m} × ${pano.ancho_m} m`);
    console.log(`Área: ${pano.area_m2} m²`);
    
    // 2. Verificar campos específicos según el tipo
    console.log('\n🔍 CAMPOS ESPECÍFICOS:');
    if (pano.tipo_red === 'nylon') {
      console.log(`Calibre: ${pano.calibre || 'NULL'}`);
      console.log(`Cuadro: ${pano.cuadro || 'NULL'}`);
      console.log(`Torsión: ${pano.torsion || 'NULL'}`);
      console.log(`Refuerzo: ${pano.refuerzo !== undefined && pano.refuerzo !== null ? pano.refuerzo : 'NULL'}`);
    } else if (pano.tipo_red === 'lona') {
      console.log(`Color: ${pano.color || 'NULL'}`);
      console.log(`Presentación: ${pano.presentacion || 'NULL'}`);
    } else if (pano.tipo_red === 'polipropileno') {
      console.log(`Grosor: ${pano.grosor || 'NULL'}`);
      console.log(`Cuadro: ${pano.cuadro || 'NULL'}`);
    } else if (pano.tipo_red === 'malla sombra') {
      console.log(`Color/Tipo: ${pano.color_tipo_red || 'NULL'}`);
      console.log(`Presentación: ${pano.presentacion || 'NULL'}`);
    }
    
    // 3. Verificar especificaciones formateadas
    console.log('\n📝 ESPECIFICACIONES FORMATEADAS:');
    console.log(`Especificaciones: ${pano.especificaciones || 'NULL'}`);
    
    // 4. Verificar datos en red_producto
    console.log('\n🔍 VERIFICANDO RED_PRODUCTO:');
    const redProductoResponse = await api.get(`/catalogos/red-producto/${pano.id_mcr}`);
    const redProducto = redProductoResponse.data.data;
    console.log(`Tipo de red en catálogo: ${redProducto.tipo_red}`);
    console.log(`Descripción: ${redProducto.descripcion}`);
    
    // 5. Verificar datos en tabla hija según el tipo
    console.log('\n🔍 VERIFICANDO TABLA HIJA:');
    if (pano.tipo_red === 'nylon') {
      const nylonResponse = await api.get(`/inventario/panos/catalogos/nylon/full`);
      const nylonData = nylonResponse.data.data.find(item => item.id_mcr === pano.id_mcr);
      if (nylonData) {
        console.log('✅ Datos encontrados en tabla nylon:');
        console.log(`  Calibre: ${nylonData.calibre}`);
        console.log(`  Cuadro: ${nylonData.cuadro}`);
        console.log(`  Torsión: ${nylonData.torsion}`);
        console.log(`  Refuerzo: ${nylonData.refuerzo}`);
      } else {
        console.log('❌ NO se encontraron datos en tabla nylon para este id_mcr');
      }
    } else if (pano.tipo_red === 'lona') {
      const lonaResponse = await api.get(`/inventario/panos/catalogos/lona/full`);
      const lonaData = lonaResponse.data.data.find(item => item.id_mcr === pano.id_mcr);
      if (lonaData) {
        console.log('✅ Datos encontrados en tabla lona:');
        console.log(`  Color: ${lonaData.color}`);
        console.log(`  Presentación: ${lonaData.presentacion}`);
      } else {
        console.log('❌ NO se encontraron datos en tabla lona para este id_mcr');
      }
    } else if (pano.tipo_red === 'polipropileno') {
      const polipropilenoResponse = await api.get(`/inventario/panos/catalogos/polipropileno/full`);
      const polipropilenoData = polipropilenoResponse.data.data.find(item => item.id_mcr === pano.id_mcr);
      if (polipropilenoData) {
        console.log('✅ Datos encontrados en tabla polipropileno:');
        console.log(`  Grosor: ${polipropilenoData.grosor}`);
        console.log(`  Cuadro: ${polipropilenoData.cuadro}`);
      } else {
        console.log('❌ NO se encontraron datos en tabla polipropileno para este id_mcr');
      }
    } else if (pano.tipo_red === 'malla sombra') {
      const mallaSombraResponse = await api.get(`/inventario/panos/catalogos/malla-sombra/full`);
      const mallaSombraData = mallaSombraResponse.data.data.find(item => item.id_mcr === pano.id_mcr);
      if (mallaSombraData) {
        console.log('✅ Datos encontrados en tabla malla_sombra:');
        console.log(`  Color/Tipo: ${mallaSombraData.color_tipo_red}`);
        console.log(`  Presentación: ${mallaSombraData.presentacion}`);
      } else {
        console.log('❌ NO se encontraron datos en tabla malla_sombra para este id_mcr');
      }
    }
    
    // 6. Verificar la función generateSpecifications
    console.log('\n🔍 VERIFICANDO FUNCIÓN generateSpecifications:');
    console.log('Datos que se pasan a la función:');
    const datosParaFuncion = {
      tipo_red: pano.tipo_red,
      calibre: pano.calibre,
      cuadro: pano.cuadro,
      torsion: pano.torsion,
      refuerzo: pano.refuerzo,
      color: pano.color,
      presentacion: pano.presentacion,
      grosor: pano.grosor,
      color_tipo_red: pano.color_tipo_red
    };
    console.log(JSON.stringify(datosParaFuncion, null, 2));
    
    return pano;
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.response?.data || error.message);
    throw error;
  }
}

// Función para listar algunos paños y diagnosticarlos
async function diagnosticarPanos() {
  console.log('\n🔍 DIAGNÓSTICO GENERAL DE PAÑOS');
  console.log('=' .repeat(50));
  
  try {
    // Obtener lista de paños
    const response = await api.get('/inventario/panos', {
      params: { limit: 10 }
    });
    
    const panos = response.data.panos;
    console.log(`\n📊 Total de paños encontrados: ${panos.length}`);
    
    // Mostrar resumen de cada paño
    panos.forEach((pano, index) => {
      console.log(`\n📋 Paño ${index + 1}:`);
      console.log(`  ID: ${pano.id_item}`);
      console.log(`  ID_MCR: ${pano.id_mcr}`);
      console.log(`  Tipo: ${pano.tipo_red}`);
      console.log(`  Especificaciones: ${pano.especificaciones || 'NULL'}`);
      
      // Verificar si tiene campos específicos
      let tieneCampos = false;
      if (pano.tipo_red === 'nylon' && (pano.calibre || pano.cuadro || pano.torsion !== undefined)) {
        tieneCampos = true;
      } else if (pano.tipo_red === 'lona' && (pano.color || pano.presentacion)) {
        tieneCampos = true;
      } else if (pano.tipo_red === 'polipropileno' && (pano.grosor || pano.cuadro)) {
        tieneCampos = true;
      } else if (pano.tipo_red === 'malla sombra' && (pano.color_tipo_red || pano.presentacion)) {
        tieneCampos = true;
      }
      
      console.log(`  Tiene campos específicos: ${tieneCampos ? '✅ SÍ' : '❌ NO'}`);
    });
    
    // Diagnosticar el primer paño en detalle
    if (panos.length > 0) {
      await diagnosticarPano(panos[0].id_item);
    }
    
    return panos;
    
  } catch (error) {
    console.error('❌ Error en diagnóstico general:', error.response?.data || error.message);
    throw error;
  }
}

// Función principal
async function main() {
  console.log('🚀 Iniciando diagnóstico de especificaciones...');
  
  try {
    // 1. Login
    await login();
    
    // 2. Diagnóstico general
    await diagnosticarPanos();
    
    console.log('\n🎉 Diagnóstico completado!');
    
  } catch (error) {
    console.error('\n💥 Error en el diagnóstico:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  login,
  diagnosticarPano,
  diagnosticarPanos
}; 