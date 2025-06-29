const axios = require('axios');

// Configuración
const API_BASE = 'http://localhost:4000/api/v1';
const TEST_USER_ID = 1; // Cambia esto por el ID de un usuario real

// Función para hacer login y obtener token
async function login() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = response.data.token;
    console.log('✅ Login exitoso, token obtenido');
    
    // Configurar axios para usar el token
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    return token;
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar guardar un draft
async function testSaveDraft() {
  try {
    console.log('\n🧪 Probando guardar draft...');
    
    const draftData = {
      id_usuario: TEST_USER_ID,
      datos_formulario: {
        cliente: 'Cliente de Prueba',
        observaciones: 'Observaciones de prueba',
        prioridad: 'alta',
        fecha_inicio: '2025-01-01',
        fecha_fin: '2025-01-15'
      },
      panos_seleccionados: [
        { id_item: 1, nombre: 'Paño de prueba', cantidad: 10 }
      ],
      materiales_seleccionados: [],
      herramientas_seleccionadas: [],
      paso_actual: 2
    };

    const response = await axios.post(`${API_BASE}/drafts`, draftData);
    console.log('✅ Draft guardado exitosamente:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error guardando draft:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar obtener draft del usuario
async function testGetUserDraft() {
  try {
    console.log('\n🧪 Probando obtener draft del usuario...');
    
    const response = await axios.get(`${API_BASE}/drafts/user/${TEST_USER_ID}`);
    console.log('✅ Draft obtenido:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error obteniendo draft:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar obtener todos los drafts
async function testGetAllDrafts() {
  try {
    console.log('\n🧪 Probando obtener todos los drafts...');
    
    const response = await axios.get(`${API_BASE}/drafts`);
    console.log('✅ Todos los drafts:', response.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error obteniendo todos los drafts:', error.response?.data || error.message);
    throw error;
  }
}

// Función principal
async function runTests() {
  try {
    console.log('🚀 Iniciando pruebas de la API de drafts...\n');
    
    // 1. Login
    await login();
    
    // 2. Probar guardar draft
    const savedDraft = await testSaveDraft();
    
    // 3. Probar obtener draft del usuario
    await testGetUserDraft();
    
    // 4. Probar obtener todos los drafts
    await testGetAllDrafts();
    
    console.log('\n🎉 Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('\n💥 Error en las pruebas:', error.message);
  }
}

// Ejecutar pruebas
runTests(); 