const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function testCalculateRecommendedDimensions() {
  try {
    console.log('🧪 Probando endpoint de cálculo de dimensiones recomendadas...');
    
    // Primero hacer login para obtener un token
    console.log('🔐 Haciendo login para obtener token...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@sercodam.com',
      password: 'admin123'
    });

    const token = loginResponse.data.token;
    console.log('✅ Token obtenido:', token ? 'Sí' : 'No');

    const testData = {
      id_item: 844, // Usar el ID que aparece en el error
      cortes_individuales: [
        {
          largo: 2.5,
          ancho: 1.8,
          cantidad: 1
        },
        {
          largo: 1.2,
          ancho: 0.9,
          cantidad: 2
        }
      ]
    };

    console.log('📤 Enviando datos de prueba:', testData);

    const response = await axios.post(
      `${API_BASE_URL}/inventario/panos/calculate-dimensions`,
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        timeout: 10000
      }
    );

    console.log('✅ Respuesta exitosa:', response.data);
    
    if (response.data.success) {
      const { areaTotal, dimensionesRecomendadas, utilizacion } = response.data.data;
      console.log('📊 Resultados:');
      console.log(`  - Área total requerida: ${areaTotal} m²`);
      console.log(`  - Dimensiones recomendadas: ${dimensionesRecomendadas.largo} × ${dimensionesRecomendadas.ancho} m`);
      console.log(`  - Utilización: ${utilizacion}%`);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.response?.data || error.message);
    
    if (error.response) {
      console.error('📊 Detalles del error:');
      console.error(`  - Status: ${error.response.status}`);
      console.error(`  - Data:`, error.response.data);
    }
  }
}

// Ejecutar la prueba
testCalculateRecommendedDimensions(); 