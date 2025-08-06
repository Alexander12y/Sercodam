// Cargar variables de entorno
require('dotenv').config({ path: './sercodam-backend/.env' });

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

async function testRedesProductoFix() {
  try {
    console.log('🧪 Probando endpoint de redes-producto...');
    
    // Test 1: Obtener redes con filtro de tipo_red
    console.log('\n📋 Test 1: Obtener redes con filtro tipo_red=nylon');
    const response1 = await axios.get(`${API_BASE_URL}/inventario/redes-producto`, {
      params: {
        limit: 10,
        tipo_red: 'nylon'
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
      calibres: response2.data.data?.calibres?.length
    });
    
    // Test 3: Obtener todas las redes sin filtros
    console.log('\n📋 Test 3: Obtener todas las redes (limit 5)');
    const response3 = await axios.get(`${API_BASE_URL}/inventario/redes-producto`, {
      params: {
        limit: 5
      }
    });
    
    console.log('✅ Todas las redes:', {
      status: response3.status,
      total: response3.data.pagination?.total,
      redes: response3.data.data?.length
    });
    
    console.log('\n🎉 Todos los tests pasaron exitosamente!');
    console.log('✅ El endpoint de redes-producto está funcionando correctamente');
    
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
testRedesProductoFix(); 