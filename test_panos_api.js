const axios = require('axios');

async function testPanosAPI() {
  try {
    console.log('🔍 Testing panos API...');
    
    // Test the panos endpoint
    const response = await axios.get('http://localhost:4000/api/v1/inventario/panos?limit=10');
    
    console.log('✅ API Response Status:', response.status);
    console.log('✅ API Response Data:', {
      success: response.data.success,
      panosCount: response.data.panos?.length || 0,
      pagination: response.data.pagination
    });
    
    if (response.data.panos && response.data.panos.length > 0) {
      console.log('✅ First pano sample:', {
        id_item: response.data.panos[0].id_item,
        tipo_red: response.data.panos[0].tipo_red,
        descripcion: response.data.panos[0].descripcion,
        largo_m: response.data.panos[0].largo_m,
        ancho_m: response.data.panos[0].ancho_m
      });
    }
    
  } catch (error) {
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testPanosAPI(); 