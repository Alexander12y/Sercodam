const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function testEntradaSalida() {
  try {
    // 1. Login para obtener token
    console.log('🔐 Iniciando sesión...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin123!'
    });
    
    console.log('📝 Respuesta de login:', loginResponse.data);
    
    const token = loginResponse.data.data?.tokens?.accessToken;
    if (!token) {
      console.log('❌ No se recibió token');
      return;
    }
    console.log('✅ Login exitoso, token obtenido');
    
    // 2. Obtener un material existente
    console.log('📋 Obteniendo materiales...');
    const materialesResponse = await axios.get(`${API_BASE_URL}/inventario/materiales?limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!materialesResponse.data.materiales || materialesResponse.data.materiales.length === 0) {
      console.log('❌ No hay materiales disponibles');
      return;
    }
    
    const material = materialesResponse.data.materiales[0];
    console.log('✅ Material encontrado:', material.id_item);
    console.log('📋 Stock actual:', material.cantidad_disponible);
    
    // 3. Probar entrada de material
    console.log('🔄 Probando entrada de material...');
    const entradaData = {
      id: material.id_item,
      cantidad: 5,
      descripcion: 'Entrada de prueba'
    };
    
    console.log('📤 Datos de entrada:', entradaData);
    
    const entradaResponse = await axios.post(`${API_BASE_URL}/inventario/materiales/entrada`, entradaData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Entrada exitosa:', entradaResponse.data);
    
    // 4. Probar salida de material
    console.log('🔄 Probando salida de material...');
    const salidaData = {
      id: material.id_item,
      cantidad: 2,
      descripcion: 'Salida de prueba'
    };
    
    console.log('📤 Datos de salida:', salidaData);
    
    const salidaResponse = await axios.post(`${API_BASE_URL}/inventario/materiales/salida`, salidaData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Salida exitosa:', salidaResponse.data);
    
    // 5. Verificar stock final
    console.log('📋 Verificando stock final...');
    const materialFinalResponse = await axios.get(`${API_BASE_URL}/inventario/materiales/${material.id_item}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Stock final:', materialFinalResponse.data.data.cantidad_disponible);
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.response?.data || error.message);
    if (error.response?.data?.errors) {
      console.error('🚫 Errores de validación:', error.response.data.errors);
    }
    if (error.response?.status) {
      console.error('📊 Status code:', error.response.status);
    }
  }
}

testEntradaSalida(); 