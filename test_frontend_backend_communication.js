const axios = require('axios');

// Configuración similar al frontend
const api = axios.create({
  baseURL: 'http://localhost:4000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Simular el token de autenticación
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5Ac2VyY29kYW0uY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzM1NzI4MDAwLCJleHAiOjE3MzU4MTQ0MDB9.example'; // Reemplazar con un token válido

api.interceptors.request.use(
  (config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

async function testPanosAPI() {
  try {
    console.log('🔍 Probando comunicación con el backend...');
    
    // 1. Probar el endpoint de paños
    const response = await api.get('/inventario/panos', { 
      params: { limit: 10 } 
    });
    
    console.log('✅ Respuesta del backend recibida');
    console.log('📊 Estructura de la respuesta:', {
      status: response.status,
      hasData: !!response.data,
      hasPanos: !!response.data.panos,
      panosLength: response.data.panos?.length || 0
    });
    
    if (response.data.panos && response.data.panos.length > 0) {
      const primerPano = response.data.panos[0];
      
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
      response.data.panos.forEach((pano, index) => {
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
    
    if (error.response?.status === 401) {
      console.log('🔑 Error de autenticación - Necesitas un token válido');
    }
  }
}

// Ejecutar la prueba
testPanosAPI(); 