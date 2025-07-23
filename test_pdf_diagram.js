const axios = require('axios');

async function testPDFDiagram() {
  try {
    console.log('🧪 Probando generación de PDF con diagrama de desperdicios...');
    
    // Crear una orden de prueba con múltiples cortes
    const testData = {
      cliente: "Cliente de Prueba",
      observaciones: "Prueba de diagrama con desperdicios",
      panos: [
        {
          id_item: 1, // Cambiar por un ID válido
          largo_tomar: 2.0,
          ancho_tomar: 1.5,
          cantidad: 1,
          umbral_sobrante_m2: 1.0, // Umbral bajo para generar desperdicios
          modo_cortes: 'individuales',
          cortes_individuales: [
            { largo: 1.0, ancho: 0.5, cantidad: 1 }, // 0.5 m² - será desperdicio
            { largo: 1.5, ancho: 1.0, cantidad: 1 }  // 1.5 m² - será remanente útil
          ]
        }
      ],
      materiales: [],
      herramientas: []
    };

    console.log('📤 Enviando datos de prueba:', testData);

    const response = await axios.post('http://localhost:4000/api/v1/ordenes', testData, {
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Reemplazar con token válido
      }
    });

    console.log('✅ Orden creada exitosamente:', response.data);
    console.log('📄 PDF generado con diagrama de desperdicios');
    
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

testPDFDiagram(); 