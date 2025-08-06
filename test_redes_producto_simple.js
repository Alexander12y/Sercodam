// Cargar variables de entorno
require('dotenv').config({ path: './sercodam-backend/.env' });

const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function testRedesProductoSimple() {
  try {
    console.log('🧪 Probando endpoint de redes-producto (versión simple)...');
    
    // Test básico: obtener redes sin filtros
    console.log('\n📋 Test: Obtener redes sin filtros (limit 5)');
    const response = await axios.get(`${API_BASE_URL}/inventario/redes-producto`, {
      params: {
        limit: 5
      }
    });
    
    console.log('✅ Respuesta exitosa:', {
      status: response.status,
      total: response.data.pagination?.total,
      redes: response.data.data?.length
    });
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('📦 Primera red:', {
        id_mcr: response.data.data[0].id_mcr,
        tipo_red: response.data.data[0].tipo_red,
        marca: response.data.data[0].marca,
        especificaciones_texto: response.data.data[0].especificaciones_texto
      });
    }
    
    console.log('\n🎉 Test completado exitosamente!');
    
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
testRedesProductoSimple(); 