const axios = require('axios');

async function testOrdenAPI() {
  try {
    console.log('🔍 Probando API de orden...');
    
    // Primero obtener una orden que tenga paños
    const response = await axios.get('http://localhost:4000/api/v1/ordenes');
    const ordenes = response.data.data?.ordenes || response.data.ordenes || [];
    
    if (ordenes.length === 0) {
      console.log('❌ No hay órdenes disponibles');
      return;
    }
    
    // Buscar una orden que tenga paños
    let ordenConPanos = null;
    for (const orden of ordenes) {
      const detalleResponse = await axios.get(`http://localhost:4000/api/v1/ordenes/${orden.id_op}/detalle`);
      const detalle = detalleResponse.data.data || detalleResponse.data;
      
      if (detalle.panos && detalle.panos.length > 0) {
        ordenConPanos = detalle;
        console.log(`✅ Orden encontrada con paños: ${orden.numero_op} (ID: ${orden.id_op})`);
        break;
      }
    }
    
    if (!ordenConPanos) {
      console.log('❌ No se encontró ninguna orden con paños');
      return;
    }
    
    console.log('\n📊 Datos de la orden:');
    console.log(`  - Número: ${ordenConPanos.orden.numero_op}`);
    console.log(`  - Cliente: ${ordenConPanos.orden.nombre_cliente}`);
    console.log(`  - Estado: ${ordenConPanos.orden.estado}`);
    
    console.log('\n📋 Paños:');
    console.log(`  - Cantidad: ${ordenConPanos.panos.length}`);
    ordenConPanos.panos.forEach((pano, index) => {
      console.log(`  ${index + 1}. ID: ${pano.id_item}, Tipo: ${pano.tipo_red}, Cantidad: ${pano.cantidad}`);
      console.log(`     Largo: ${pano.largo_m}, Ancho: ${pano.ancho_m}, Notas: "${pano.notas}"`);
    });
    
    console.log('\n📦 Materiales:');
    console.log(`  - Cantidad: ${ordenConPanos.materiales.length}`);
    
    console.log('\n🔧 Herramientas:');
    console.log(`  - Cantidad: ${ordenConPanos.herramientas.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testOrdenAPI(); 