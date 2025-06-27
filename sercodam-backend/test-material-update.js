const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function testMaterialUpdate() {
  try {
    // 1. Login para obtener token
    console.log('🔐 Iniciando sesión...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@sercodam.com',
      password: 'admin123'
    });
    
    console.log('📝 Respuesta de login:', loginResponse.data);
    
    if (!loginResponse.data.token) {
      console.log('❌ No se recibió token');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login exitoso, token obtenido');
    
    // 2. Obtener un material existente
    console.log('📋 Obteniendo materiales...');
    const materialesResponse = await axios.get(`${API_BASE_URL}/inventario/materiales?limit=1`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('📝 Respuesta de materiales:', materialesResponse.data);
    
    if (!materialesResponse.data.materiales || materialesResponse.data.materiales.length === 0) {
      console.log('❌ No hay materiales disponibles');
      return;
    }
    
    const material = materialesResponse.data.materiales[0];
    console.log('✅ Material encontrado:', material.id_item);
    console.log('📋 Datos del material:', material);
    
    // 3. Intentar actualizar con datos mínimos
    console.log('🔄 Probando actualización con datos mínimos...');
    const updateData = {
      descripcion: 'Material de prueba actualizado',
      cantidad_disponible: 10
    };
    
    console.log('📤 Datos a enviar:', updateData);
    
    const updateResponse = await axios.put(`${API_BASE_URL}/inventario/materiales/${material.id_item}`, updateData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Actualización exitosa:', updateResponse.data);
    
    // 4. Probar con datos completos
    console.log('🔄 Probando actualización con datos completos...');
    const fullUpdateData = {
      descripcion: 'Material de prueba completo',
      categoria: 'Cintas',
      presentacion: 'Rollo',
      unidad: 'Metros',
      permite_decimales: false,
      cantidad_disponible: 15,
      marca: 'Marca Test',
      estado_calidad: 'Bueno',
      ubicacion: 'Bodega CDMX',
      precioxunidad: 25.50,
      uso_principal: 'Uso de prueba'
    };
    
    console.log('📤 Datos completos a enviar:', fullUpdateData);
    
    const fullUpdateResponse = await axios.put(`${API_BASE_URL}/inventario/materiales/${material.id_item}`, fullUpdateData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Actualización completa exitosa:', fullUpdateResponse.data);
    
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

testMaterialUpdate(); 