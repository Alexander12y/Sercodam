const axios = require('axios');

// Configuración similar al frontend
const api = axios.create({
  baseURL: 'http://localhost:4000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function testWithLogin() {
  try {
    console.log('🔍 Iniciando prueba con login...');
    
    // 1. Hacer login
    const loginResponse = await api.post('/auth/login', {
      username: 'admin',
      password: 'Admin123!'
    });
    
    console.log('✅ Login exitoso');
    const token = loginResponse.data.token;
    
    // Configurar el token para las siguientes requests
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // 2. Probar el endpoint de paños
    console.log('🔍 Probando endpoint de paños...');
    const panosResponse = await api.get('/inventario/panos', { 
      params: { limit: 10 } 
    });
    
    console.log('✅ Respuesta del backend recibida');
    console.log('📊 Estructura de la respuesta:', {
      status: panosResponse.status,
      hasData: !!panosResponse.data,
      hasPanos: !!panosResponse.data.panos,
      panosLength: panosResponse.data.panos?.length || 0
    });
    
    if (panosResponse.data.panos && panosResponse.data.panos.length > 0) {
      const primerPano = panosResponse.data.panos[0];
      
      console.log('🔍 Primer paño recibido:', {
        id_item: primerPano.id_item,
        tipo_red: primerPano.tipo_red,
        especificaciones: primerPano.especificaciones,
        tiene_especificaciones: !!primerPano.especificaciones,
        longitud_especificaciones: primerPano.especificaciones?.length,
        todas_las_propiedades: Object.keys(primerPano)
      });
      
      // Verificar si hay especificaciones
      if (primerPano.especificaciones) {
        console.log('✅ ESPECIFICACIONES ENCONTRADAS:', primerPano.especificaciones);
      } else {
        console.log('❌ NO HAY ESPECIFICACIONES en el primer paño');
        
        // Verificar si hay otros campos relacionados
        console.log('🔍 Campos disponibles:', Object.keys(primerPano));
        console.log('🔍 Valores de campos relacionados:', {
          calibre: primerPano.calibre,
          cuadro: primerPano.cuadro,
          torsion: primerPano.torsion,
          refuerzo: primerPano.refuerzo,
          color: primerPano.color,
          presentacion: primerPano.presentacion,
          grosor: primerPano.grosor
        });
      }
      
      // Verificar todos los paños
      console.log('\n🔍 Verificando especificaciones en todos los paños:');
      panosResponse.data.panos.forEach((pano, index) => {
        console.log(`Paño ${index + 1} (ID: ${pano.id_item}):`, {
          tipo_red: pano.tipo_red,
          tiene_especificaciones: !!pano.especificaciones,
          especificaciones: pano.especificaciones || 'NO TIENE'
        });
      });
      
    } else {
      console.log('❌ No se recibieron paños del backend');
    }
    
  } catch (error) {
    console.error('❌ Error en la comunicación:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

// Ejecutar la prueba
testWithLogin(); 