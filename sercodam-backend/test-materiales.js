const axios = require('axios');
const knex = require('knex');

const API_BASE_URL = 'http://localhost:4000/api/v1';

// Configuración de la base de datos para consultas directas
const dbConfig = {
    client: 'pg',
    connection: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'sercodam_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'P@chiicolipAt024!',
    },
    searchPath: [process.env.DB_SCHEMA || 'catalogo_1']
};

const db = knex(dbConfig);

// Función para hacer login y obtener token
async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin123!'
    });
    
    const token = response.data.data.tokens.accessToken;
    console.log('✅ Login exitoso, token obtenido');
    return token;
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    throw error;
  }
}

// Función para configurar axios con token
function setupAxios(token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Función para probar obtener materiales
async function testGetMateriales(token) {
  try {
    console.log('\n🔍 Probando obtener materiales...');
    const materialesRes = await axios.get(`${API_BASE_URL}/inventario/materiales`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Materiales obtenidos:', materialesRes.data.materiales?.length || 0, 'materiales');
    console.log('📋 Respuesta completa de la API:', JSON.stringify(materialesRes.data, null, 2));
    return materialesRes.data.materiales;
  } catch (error) {
    console.error('❌ Error obteniendo materiales:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar obtener categorías
async function testGetCategorias() {
  try {
    console.log('\n🔍 Probando obtener categorías...');
    const response = await axios.get(`${API_BASE_URL}/inventario/materiales/categorias`);
    console.log('✅ Categorías obtenidas:', response.data.data?.length || 0, 'categorías');
    console.log('📋 Primeras 5 categorías:', response.data.data?.slice(0, 5));
    return response.data.data;
  } catch (error) {
    console.error('❌ Error obteniendo categorías:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar crear un material
async function testCreateMaterial(token) {
  try {
    console.log('\n🔍 Probando crear material...');
    const materialData = {
      id_material_extra: `MAT_${Date.now()}`,
      descripcion: 'Cinta adhesiva de prueba',
      categoria: 'Abrazaderas',
      presentacion: 'Rollo de 50m',
      unidad: 'rollo',
      permite_decimales: false,
      cantidad_disponible: 10,
      marca: '3M',
      estado_calidad: 'Bueno',
      ubicacion: 'Bodega CDMX',
      precioxunidad: 25.50,
      uso_principal: 'Sujeción temporal de materiales'
    };
    console.log('Payload enviado al backend:', materialData);
    // Crear material
    let materialId;
    try {
        const createRes = await axios.post(`${API_BASE_URL}/inventario/materiales`, materialData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Material creado:', createRes.data.data);
        materialId = createRes.data.data.id_item;
    } catch (err) {
        console.error('❌ Error creando material:', err.response ? err.response.data : err);
        throw err;
    }

    return materialId;
  } catch (error) {
    console.error('❌ Error creando material:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar actualizar un material
async function testUpdateMaterial(materialId, token) {
  try {
    console.log('\n🔍 Probando actualizar material...');
    console.log('\n--- Verificando existencia del material antes de actualizar ---');
    
    // Consulta directa a la base de datos
    try {
        const materialInDb = await db('materiales_extras')
            .where('id_item', materialId)
            .first();
        console.log('Material en BD (consulta directa):', materialInDb);
        
        const inventarioItem = await db('inventario_item')
            .where('id_item', materialId)
            .first();
        console.log('Inventario item en BD:', inventarioItem);
    } catch (dbError) {
        console.error('Error en consulta directa a BD:', dbError);
    }
    
    const getMaterialRes = await axios.get(`${API_BASE_URL}/inventario/materiales/${materialId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Respuesta GET material:', getMaterialRes.data);

    // Actualizar material
    console.log('\n--- Actualizando material ---');
    console.log('Material ID para actualizar:', materialId);
    
    // Agregar delay para asegurar que la creación se complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updateData = {
      nombre: 'Material Actualizado',
      descripcion: 'Descripción actualizada',
      estado_calidad: 'bueno',
      ubicacion: 'Bodega B',
      marca: 'Marca Actualizada',
      precio: 150.00,
      stock_minimo: 5,
      stock_actual: 25
    };
    
    const response = await axios.put(`${API_BASE_URL}/inventario/materiales/${materialId}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Material actualizado:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error actualizando material:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar entrada de material
async function testEntradaMaterial(materialId) {
  try {
    console.log('\n🔍 Probando entrada de material...');
    const entradaData = {
      id: materialId,
      cantidad: 5,
      descripcion: 'Compra de inventario'
    };
    
    const response = await axios.post(`${API_BASE_URL}/inventario/materiales/entrada`, entradaData);
    console.log('✅ Entrada registrada:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error en entrada de material:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar salida de material
async function testSalidaMaterial(materialId) {
  try {
    console.log('\n🔍 Probando salida de material...');
    const salidaData = {
      id: materialId,
      cantidad: 2,
      descripcion: 'Uso en instalación'
    };
    
    const response = await axios.post(`${API_BASE_URL}/inventario/materiales/salida`, salidaData);
    console.log('✅ Salida registrada:', response.data.data);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error en salida de material:', error.response?.data || error.message);
    throw error;
  }
}

// Función para probar eliminar un material
async function testDeleteMaterial(materialId) {
  try {
    console.log('\n🔍 Probando eliminar material...');
    await axios.delete(`${API_BASE_URL}/inventario/materiales/${materialId}`);
    console.log('✅ Material eliminado exitosamente');
  } catch (error) {
    console.error('❌ Error eliminando material:', error.response?.data || error.message);
    throw error;
  }
}

// Función principal de prueba
async function runTests() {
  let token;
  let materialId;
  
  try {
    console.log('🚀 Iniciando pruebas del sistema de materiales...\n');
    
    // 1. Login
    token = await login();
    setupAxios(token);
    
    // 2. Obtener categorías
    await testGetCategorias();
    
    // 3. Obtener materiales
    await testGetMateriales(token);
    
    // 4. Crear material de prueba
    materialId = await testCreateMaterial(token);
    
    // 5. Actualizar material
    await testUpdateMaterial(materialId, token);
    
    // 6. Registrar entrada
    await testEntradaMaterial(materialId);
    
    // 7. Registrar salida
    await testSalidaMaterial(materialId);
    
    // 8. Obtener materiales actualizados
    await testGetMateriales(token);
    
    // 9. Eliminar material de prueba
    await testDeleteMaterial(materialId);
    
    console.log('\n🎉 ¡Todas las pruebas completadas exitosamente!');
    
  } catch (error) {
    console.error('\n💥 Error en las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar pruebas
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  login,
  testGetMateriales,
  testCreateMaterial,
  testUpdateMaterial,
  testEntradaMaterial,
  testSalidaMaterial,
  testDeleteMaterial
}; 