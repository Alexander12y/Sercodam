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

async function testFiltrosPanos() {
  try {
    console.log('🔐 Obteniendo token de autenticación...');
    const token = await login();
    console.log('✅ Token obtenido exitosamente');
    
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    console.log('🧪 Probando filtros de paños...');
    
    // Test 1: Obtener paños sin filtros
    console.log('\n📋 Test 1: Obtener paños sin filtros (limit 5)');
    const response1 = await axios.get(`${API_BASE_URL}/inventario/panos`, {
      headers,
      params: {
        limit: 5
      }
    });
    
    console.log('✅ Respuesta exitosa:', {
      status: response1.status,
      total: response1.data.pagination?.total,
      panos: response1.data.panos?.length
    });
    
    if (response1.data.panos && response1.data.panos.length > 0) {
      console.log('📦 Primer paño:', {
        id_item: response1.data.panos[0].id_item,
        id_mcr: response1.data.panos[0].id_mcr,
        tipo_red: response1.data.panos[0].tipo_red,
        especificaciones: response1.data.panos[0].especificaciones
      });
    }
    
    // Test 2: Filtrar por tipo_red=nylon
    console.log('\n📋 Test 2: Filtrar por tipo_red=nylon');
    const response2 = await axios.get(`${API_BASE_URL}/inventario/panos`, {
      headers,
      params: {
        limit: 3,
        tipo_red: 'nylon'
      }
    });
    
    console.log('✅ Redes de nylon:', {
      status: response2.status,
      total: response2.data.pagination?.total,
      panos: response2.data.panos?.length
    });
    
    if (response2.data.panos && response2.data.panos.length > 0) {
      console.log('📦 Primer paño de nylon:', {
        id_item: response2.data.panos[0].id_item,
        id_mcr: response2.data.panos[0].id_mcr,
        tipo_red: response2.data.panos[0].tipo_red,
        calibre: response2.data.panos[0].calibre,
        cuadro: response2.data.panos[0].cuadro,
        torsion: response2.data.panos[0].torsion,
        especificaciones: response2.data.panos[0].especificaciones
      });
    }
    
    // Test 3: Filtrar por calibre específico
    console.log('\n📋 Test 3: Filtrar por calibre=30-7/8');
    const response3 = await axios.get(`${API_BASE_URL}/inventario/panos`, {
      headers,
      params: {
        limit: 3,
        calibre: '30-7/8'
      }
    });
    
    console.log('✅ Paños con calibre 30-7/8:', {
      status: response3.status,
      total: response3.data.pagination?.total,
      panos: response3.data.panos?.length
    });
    
    if (response3.data.panos && response3.data.panos.length > 0) {
      console.log('📦 Primer paño con calibre 30-7/8:', {
        id_item: response3.data.panos[0].id_item,
        id_mcr: response3.data.panos[0].id_mcr,
        tipo_red: response3.data.panos[0].tipo_red,
        calibre: response3.data.panos[0].calibre,
        especificaciones: response3.data.panos[0].especificaciones
      });
    }
    
    // Test 4: Filtrar por tipo_red=lona
    console.log('\n📋 Test 4: Filtrar por tipo_red=lona');
    const response4 = await axios.get(`${API_BASE_URL}/inventario/panos`, {
      headers,
      params: {
        limit: 3,
        tipo_red: 'lona'
      }
    });
    
    console.log('✅ Redes de lona:', {
      status: response4.status,
      total: response4.data.pagination?.total,
      panos: response4.data.panos?.length
    });
    
    if (response4.data.panos && response4.data.panos.length > 0) {
      console.log('📦 Primer paño de lona:', {
        id_item: response4.data.panos[0].id_item,
        id_mcr: response4.data.panos[0].id_mcr,
        tipo_red: response4.data.panos[0].tipo_red,
        color: response4.data.panos[0].color,
        presentacion: response4.data.panos[0].presentacion,
        especificaciones: response4.data.panos[0].especificaciones
      });
    }
    
    console.log('\n🎉 Todos los tests de filtros pasaron exitosamente!');
    
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
testFiltrosPanos(); 