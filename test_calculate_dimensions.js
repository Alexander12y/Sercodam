const axios = require('axios');

async function testCalculateDimensions() {
  try {
    console.log('🧪 Probando endpoint de cálculo de dimensiones...');
    
    const testData = {
      id_item: 1, // Cambiar por un ID válido de paño
      cortes_individuales: [
        { largo: 2.0, ancho: 1.5, cantidad: 1 },
        { largo: 1.0, ancho: 1.0, cantidad: 2 }
      ]
    };

    console.log('📤 Enviando datos:', testData);

    const response = await axios.post('http://localhost:4000/api/v1/inventario/panos/calculate-dimensions', testData, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Respuesta exitosa:', response.data);
    
  } catch (error) {
    console.error('❌ Error en la prueba:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
    } else {
      console.error('Error:', error.message);
    }
  }
}

testCalculateDimensions(); 