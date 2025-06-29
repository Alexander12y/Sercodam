const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

// Función para probar el sistema de drafts
async function testDrafts() {
  try {
    console.log('🧪 Probando sistema de drafts...\n');

    // 1. Probar guardar un draft
    console.log('1. Guardando draft...');
    const draftData = {
      id_usuario: 1,
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

    const saveResponse = await axios.post(`${API_BASE}/drafts`, draftData);
    console.log('✅ Draft guardado:', saveResponse.data);

    // 2. Probar obtener draft del usuario
    console.log('\n2. Obteniendo draft del usuario...');
    const getResponse = await axios.get(`${API_BASE}/drafts/user/1`);
    console.log('✅ Draft obtenido:', getResponse.data);

    // 3. Probar obtener todos los drafts
    console.log('\n3. Obteniendo todos los drafts...');
    const getAllResponse = await axios.get(`${API_BASE}/drafts`);
    console.log('✅ Todos los drafts:', getAllResponse.data);

    console.log('\n🎉 Todas las pruebas pasaron correctamente!');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error.response?.data || error.message);
  }
}

// Ejecutar pruebas
testDrafts(); 