const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function testOrdenCompleta() {
  try {
    console.log('🧪 Probando creación de orden completa con fixes...');
    
    // 1. Login
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login exitoso');
    
    // 2. Obtener paños disponibles
    console.log('\n🔍 Obteniendo paños disponibles...');
    const panosResponse = await axios.get(`${API_BASE_URL}/inventario/panos?limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const panos = panosResponse.data.data?.panos || [];
    console.log(`✅ Se encontraron ${panos.length} paños`);
    
    if (panos.length === 0) {
      console.log('❌ No hay paños disponibles para probar');
      return;
    }
    
    // 3. Obtener materiales disponibles
    console.log('\n🔍 Obteniendo materiales disponibles...');
    const materialesResponse = await axios.get(`${API_BASE_URL}/inventario/materiales?limit=5`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const materiales = materialesResponse.data.data?.materiales || [];
    console.log(`✅ Se encontraron ${materiales.length} materiales`);
    
    if (materiales.length === 0) {
      console.log('❌ No hay materiales disponibles para probar');
      return;
    }
    
    // 4. Crear orden de producción
    console.log('\n📝 Creando orden de producción...');
    const ordenData = {
      cliente: 'Cliente Test Fixes',
      fecha_inicio: '2025-06-30',
      fecha_fin: '2025-07-07',
      prioridad: 'urgente',
      observaciones: 'Prueba con fixes aplicados',
      materiales: [
        {
          id_item: panos[0].id_item,
          cantidad: 2.5, // largo
          tipo_item: 'PANO',
          largo_tomar: 2.5,
          ancho_tomar: 1.8,
          notas: ''
        },
        {
          id_item: materiales[0].id_item,
          cantidad: 5,
          tipo_item: 'EXTRA',
          notas: 'Material de prueba'
        }
      ],
      herramientas: []
    };
    
    const ordenResponse = await axios.post(`${API_BASE_URL}/ordenes`, ordenData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (ordenResponse.data.success) {
      const { id_op, numero_op } = ordenResponse.data.data;
      console.log(`✅ Orden creada exitosamente: ID=${id_op}, Número=${numero_op}`);
      
      // 5. Verificar detalles de la orden
      console.log('\n🔍 Verificando detalles de la orden...');
      const detallesResponse = await axios.get(`${API_BASE_URL}/ordenes/${id_op}/detalle`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (detallesResponse.data.success) {
        const detalles = detallesResponse.data.data;
        console.log(`✅ Detalles obtenidos: ${detalles.panos?.length || 0} paños, ${detalles.materiales?.length || 0} materiales`);
        
        if (detalles.panos && detalles.panos.length > 0) {
          console.log('📋 Detalles de paños:');
          detalles.panos.forEach((pano, i) => {
            console.log(`   ${i + 1}. ID: ${pano.id_item}, Cantidad: ${pano.cantidad}, Notas: ${pano.notas}`);
          });
        }
        
        if (detalles.materiales && detalles.materiales.length > 0) {
          console.log('📋 Detalles de materiales:');
          detalles.materiales.forEach((material, i) => {
            console.log(`   ${i + 1}. ID: ${material.id_item}, Cantidad: ${material.cantidad}, Notas: ${material.notas}`);
          });
        }
      }
      
      // 6. Probar cambio de estado a cancelada
      console.log('\n🔄 Probando cambio de estado a cancelada...');
      const estadoResponse = await axios.patch(`${API_BASE_URL}/ordenes/${id_op}/estado`, {
        estado: 'cancelada'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (estadoResponse.data.success) {
        console.log('✅ Estado cambiado a cancelada exitosamente');
        
        // 7. Verificar que el inventario se restauró
        console.log('\n🔍 Verificando restauración de inventario...');
        const panoRestaurado = await axios.get(`${API_BASE_URL}/inventario/panos/${panos[0].id_item}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (panoRestaurado.data.success) {
          const pano = panoRestaurado.data.data;
          console.log(`✅ Paño restaurado - Largo: ${pano.largo_m}, Ancho: ${pano.ancho_m}`);
        }
      } else {
        console.log('❌ Error cambiando estado:', estadoResponse.data.message);
      }
      
    } else {
      console.log('❌ Error creando orden:', ordenResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ Error en prueba:', error.response?.data || error.message);
  }
}

testOrdenCompleta(); 