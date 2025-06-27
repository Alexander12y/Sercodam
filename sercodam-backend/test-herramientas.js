const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';

// Función para hacer requests con manejo de errores
async function makeRequest(method, endpoint, data = null, token = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error en ${method} ${endpoint}:`, error.response?.data || error.message);
    return null;
  }
}

async function testHerramientas() {
  console.log('🧪 Iniciando pruebas de herramientas...\n');

  // 1. Login para obtener token
  console.log('1. 🔐 Iniciando sesión...');
  const loginData = await makeRequest('POST', '/auth/login', {
    username: 'admin',
    password: 'Admin123!'
  });

  if (!loginData?.success) {
    console.error('❌ Error en login');
    return;
  }

  const token = loginData.token;
  console.log('✅ Login exitoso\n');

  // 2. Obtener herramientas sin filtros
  console.log('2. 🔧 Obteniendo herramientas sin filtros...');
  const herramientas = await makeRequest('GET', '/inventario/herramientas?limit=10', null, token);
  
  if (herramientas?.success) {
    console.log(`✅ Se obtuvieron ${herramientas.herramientas?.length || 0} herramientas`);
    if (herramientas.herramientas?.length > 0) {
      const primera = herramientas.herramientas[0];
      console.log(`   Primera herramienta: ${primera.descripcion || primera.id_herramienta} (${primera.categoria})`);
    }
  } else {
    console.log('❌ Error obteniendo herramientas');
  }
  console.log('');

  // 3. Obtener categorías disponibles
  console.log('3. 📂 Obteniendo categorías de herramientas...');
  const categorias = await makeRequest('GET', '/inventario/herramientas/categorias', null, token);
  
  if (categorias?.success) {
    console.log(`✅ Se obtuvieron ${categorias.data?.length || 0} categorías:`);
    categorias.data?.slice(0, 5).forEach(cat => console.log(`   - ${cat}`));
    if (categorias.data?.length > 5) {
      console.log(`   ... y ${categorias.data.length - 5} más`);
    }
  } else {
    console.log('❌ Error obteniendo categorías');
  }
  console.log('');

  // 4. Buscar herramientas por categoría específica
  if (categorias?.data?.length > 0) {
    const categoriaTest = categorias.data[0];
    console.log(`4. 🔍 Buscando herramientas por categoría: "${categoriaTest}"...`);
    const herramientasPorCategoria = await makeRequest('GET', `/inventario/herramientas?categoria=${encodeURIComponent(categoriaTest)}&limit=5`, null, token);
    
    if (herramientasPorCategoria?.success) {
      console.log(`✅ Se encontraron ${herramientasPorCategoria.herramientas?.length || 0} herramientas en la categoría "${categoriaTest}"`);
      herramientasPorCategoria.herramientas?.forEach(h => {
        console.log(`   - ${h.descripcion || h.id_herramienta} (Stock: ${h.cantidad_disponible || 0})`);
      });
    } else {
      console.log('❌ Error buscando por categoría');
    }
    console.log('');
  }

  // 5. Buscar herramientas por texto
  console.log('5. 🔍 Buscando herramientas por texto "Pinzas"...');
  const busqueda = await makeRequest('GET', '/inventario/herramientas?search=Pinzas&limit=5', null, token);
  
  if (busqueda?.success) {
    console.log(`✅ Se encontraron ${busqueda.herramientas?.length || 0} herramientas con "Pinzas"`);
    busqueda.herramientas?.forEach(h => {
      console.log(`   - ${h.descripcion || h.id_herramienta} (${h.categoria})`);
    });
  } else {
    console.log('❌ Error en búsqueda por texto');
  }
  console.log('');

  // 6. Probar ordenamiento
  console.log('6. 📊 Probando ordenamiento por descripción...');
  const ordenadas = await makeRequest('GET', '/inventario/herramientas?sortBy=descripcion&sortOrder=asc&limit=3', null, token);
  
  if (ordenadas?.success) {
    console.log(`✅ Se obtuvieron ${ordenadas.herramientas?.length || 0} herramientas ordenadas:`);
    ordenadas.herramientas?.forEach(h => {
      console.log(`   - ${h.descripcion || h.id_herramienta}`);
    });
  } else {
    console.log('❌ Error en ordenamiento');
  }
  console.log('');

  console.log('🎉 Pruebas de herramientas completadas!');
}

// Ejecutar las pruebas
testHerramientas().catch(console.error); 