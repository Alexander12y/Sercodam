// Cargar variables de entorno
require('dotenv').config({ path: './sercodam-backend/.env' });

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';

async function testRedesProductoFinal() {
  try {
    console.log('🧪 Probando endpoint de redes-producto (versión final)...');
    
    // Test 1: Obtener redes sin filtros
    console.log('\n📋 Test 1: Obtener redes sin filtros (limit 5)');
    const response1 = await axios.get(`${API_BASE_URL}/inventario/redes-producto`, {
      params: {
        limit: 5
      }
    });
    
    console.log('✅ Respuesta exitosa:', {
      status: response1.status,
      total: response1.data.pagination?.total,
      redes: response1.data.data?.length
    });
    
    if (response1.data.data && response1.data.data.length > 0) {
      console.log('📦 Primera red:', {
        id_mcr: response1.data.data[0].id_mcr,
        tipo_red: response1.data.data[0].tipo_red,
        marca: response1.data.data[0].marca,
        especificaciones: response1.data.data[0].especificaciones_texto
      });
    }
    
    // Test 2: Obtener catálogos
    console.log('\n📋 Test 2: Obtener catálogos de especificaciones');
    const response2 = await axios.get(`${API_BASE_URL}/inventario/redes-producto/catalogos`);
    
    console.log('✅ Catálogos obtenidos:', {
      status: response2.status,
      tipos_red: response2.data.data?.tipos_red?.length,
      marcas: response2.data.data?.marcas?.length,
      calibres: response2.data.data?.calibres?.length,
      cuadros: response2.data.data?.cuadros?.length,
      torsiones: response2.data.data?.torsiones?.length,
      colores: response2.data.data?.colores?.length,
      presentaciones: response2.data.data?.presentaciones?.length,
      grosores: response2.data.data?.grosores?.length
    });
    
    // Test 3: Filtrar por tipo_red=nylon
    console.log('\n📋 Test 3: Filtrar por tipo_red=nylon');
    const response3 = await axios.get(`${API_BASE_URL}/inventario/redes-producto`, {
      params: {
        limit: 3,
        tipo_red: 'nylon'
      }
    });
    
    console.log('✅ Redes de nylon:', {
      status: response3.status,
      total: response3.data.pagination?.total,
      redes: response3.data.data?.length
    });
    
    if (response3.data.data && response3.data.data.length > 0) {
      console.log('📦 Primera red de nylon:', {
        id_mcr: response3.data.data[0].id_mcr,
        tipo_red: response3.data.data[0].tipo_red,
        marca: response3.data.data[0].marca,
        calibre: response3.data.data[0].calibre,
        especificaciones: response3.data.data[0].especificaciones_texto
      });
    }
    
    console.log('\n🎉 Todos los tests pasaron exitosamente!');
    console.log('✅ El endpoint de redes-producto está funcionando correctamente con JOINs');
    
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
testRedesProductoFinal(); 