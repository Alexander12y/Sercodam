// Cargar variables de entorno
require('dotenv').config({ path: './sercodam-backend/.env' });

const axios = require('axios');
const { Pool } = require('pg');

const API_BASE_URL = 'http://localhost:4000/api/v1';

// Configuración de la base de datos
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sercodam_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function login() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      username: 'admin',
      password: 'Admin123!'
    });
    
    return response.data.data.tokens.accessToken;
  } catch (error) {
    console.error('Error en login:', error.response?.data || error.message);
    throw error;
  }
}

async function getPanoFromDB(id) {
  try {
    const query = `
      SELECT 
        p.*,
        rp.tipo_red,
        rp.unidad,
        rp.marca,
        rp.descripcion,
        n.calibre,
        n.cuadro,
        n.torsion,
        n.refuerzo,
        l.color,
        l.presentacion,
        pp.grosor,
        pp.cuadro as pp_cuadro,
        ms.color_tipo_red,
        ms.presentacion as ms_presentacion
      FROM pano p
      LEFT JOIN red_producto rp ON p.id_mcr = rp.id_mcr
      LEFT JOIN nylon n ON p.id_mcr = n.id_mcr
      LEFT JOIN lona l ON p.id_mcr = l.id_mcr
      LEFT JOIN polipropileno pp ON p.id_mcr = pp.id_mcr
      LEFT JOIN malla_sombra ms ON p.id_mcr = ms.id_mcr
      WHERE p.id_item = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Error obteniendo paño de BD:', error);
    throw error;
  }
}

async function testPanoUpdateComplete() {
  try {
    console.log('🔐 Obteniendo token de autenticación...');
    const token = await login();
    console.log('✅ Token obtenido exitosamente');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    const panoId = 856; // Paño a probar
    
    console.log(`🧪 Probando actualización completa del paño ${panoId}...`);
    
    // PASO 1: Obtener estado inicial desde la base de datos
    console.log('\n📋 PASO 1: Estado inicial desde BD');
    const panoInicial = await getPanoFromDB(panoId);
    
    if (!panoInicial) {
      console.error(`❌ Paño ${panoId} no encontrado en la base de datos`);
      return;
    }
    
    console.log('✅ Paño inicial desde BD:');
    console.log('- ID:', panoInicial.id_item);
    console.log('- ID_MCR:', panoInicial.id_mcr);
    console.log('- Tipo red:', panoInicial.tipo_red);
    console.log('- Calibre:', panoInicial.calibre);
    console.log('- Cuadro:', panoInicial.cuadro);
    console.log('- Torsión:', panoInicial.torsion);
    console.log('- Refuerzo:', panoInicial.refuerzo);
    console.log('- Largo:', panoInicial.largo_m);
    console.log('- Ancho:', panoInicial.ancho_m);
    console.log('- Estado:', panoInicial.estado);
    console.log('- Ubicación:', panoInicial.ubicacion);
    console.log('- Precio:', panoInicial.precio_x_unidad);
    console.log('- Stock mínimo:', panoInicial.stock_minimo);
    console.log('- Updated at:', panoInicial.updated_at);
    
    // PASO 2: Actualizar paño vía API
    console.log('\n📋 PASO 2: Actualizando paño vía API');
    const updateData = {
      tipo_red: 'nylon',
      calibre: '18',
      cuadro: '3"', // Cambio específico
      torsion: 'Torcida',
      refuerzo: 'Sí',
      largo_m: 250.0,
      ancho_m: 150.0,
      estado: 'bueno',
      ubicacion: 'Bodega CDMX',
      precio_x_unidad: 150.00,
      stock_minimo: 10.0
    };
    
    console.log('📤 Datos a enviar:', updateData);
    
    const response = await axios.put(`${API_BASE_URL}/inventario/panos/${panoId}`, updateData, {
      headers
    });
    
    console.log('✅ Respuesta de actualización:', response.data);
    
    // PASO 3: Obtener estado final desde la base de datos
    console.log('\n📋 PASO 3: Estado final desde BD');
    const panoFinal = await getPanoFromDB(panoId);
    
    console.log('✅ Paño final desde BD:');
    console.log('- ID:', panoFinal.id_item);
    console.log('- ID_MCR:', panoFinal.id_mcr);
    console.log('- Tipo red:', panoFinal.tipo_red);
    console.log('- Calibre:', panoFinal.calibre);
    console.log('- Cuadro:', panoFinal.cuadro);
    console.log('- Torsión:', panoFinal.torsion);
    console.log('- Refuerzo:', panoFinal.refuerzo);
    console.log('- Largo:', panoFinal.largo_m);
    console.log('- Ancho:', panoFinal.ancho_m);
    console.log('- Estado:', panoFinal.estado);
    console.log('- Ubicación:', panoFinal.ubicacion);
    console.log('- Precio:', panoFinal.precio_x_unidad);
    console.log('- Stock mínimo:', panoFinal.stock_minimo);
    console.log('- Updated at:', panoFinal.updated_at);
    
    // PASO 4: Comparar cambios
    console.log('\n📋 PASO 4: Comparando cambios');
    
    const cambios = {
      calibre: panoInicial.calibre !== panoFinal.calibre,
      cuadro: panoInicial.cuadro !== panoFinal.cuadro,
      torsion: panoInicial.torsion !== panoFinal.torsion,
      refuerzo: panoInicial.refuerzo !== panoFinal.refuerzo,
      largo_m: panoInicial.largo_m !== panoFinal.largo_m,
      ancho_m: panoInicial.ancho_m !== panoFinal.ancho_m,
      estado: panoInicial.estado !== panoFinal.estado,
      ubicacion: panoInicial.ubicacion !== panoFinal.ubicacion,
      precio_x_unidad: panoInicial.precio_x_unidad !== panoFinal.precio_x_unidad,
      stock_minimo: panoInicial.stock_minimo !== panoFinal.stock_minimo,
      updated_at: panoInicial.updated_at !== panoFinal.updated_at
    };
    
    console.log('✅ Cambios detectados:');
    Object.entries(cambios).forEach(([campo, cambio]) => {
      if (cambio) {
        console.log(`- ${campo}: ${panoInicial[campo]} → ${panoFinal[campo]}`);
      }
    });
    
    // PASO 5: Verificar si el cuadro específico cambió
    console.log('\n📋 PASO 5: Verificación específica del cuadro');
    const cuadroCambio = panoInicial.cuadro !== panoFinal.cuadro;
    console.log(`Cuadro cambió: ${cuadroCambio}`);
    console.log(`Cuadro inicial: "${panoInicial.cuadro}"`);
    console.log(`Cuadro final: "${panoFinal.cuadro}"`);
    console.log(`Esperado: "3""`);
    
    if (cuadroCambio && panoFinal.cuadro === '3"') {
      console.log('🎉 ¡El cuadro se actualizó correctamente en la BD!');
    } else {
      console.log('❌ El cuadro NO se actualizó correctamente en la BD');
    }
    
    // PASO 6: Probar endpoint de lista para ver qué devuelve
    console.log('\n📋 PASO 6: Probando endpoint de lista');
    const listResponse = await axios.get(`${API_BASE_URL}/inventario/panos`, {
      headers,
      params: {
        page: 1,
        limit: 50
      }
    });
    
    const panoEnLista = listResponse.data.panos.find(p => p.id_item === panoId);
    if (panoEnLista) {
      console.log('✅ Paño en lista desde API:');
      console.log('- Calibre:', panoEnLista.calibre);
      console.log('- Cuadro:', panoEnLista.cuadro);
      console.log('- Especificaciones:', panoEnLista.especificaciones);
      
      const cuadroEnLista = panoEnLista.cuadro === '3"';
      console.log(`Cuadro en lista es "3"": ${cuadroEnLista}`);
      
      if (cuadroEnLista) {
        console.log('🎉 ¡El cuadro se refleja correctamente en la lista!');
      } else {
        console.log('❌ El cuadro NO se refleja en la lista');
      }
    } else {
      console.log('❌ Paño no encontrado en la lista');
    }
    
    console.log('\n🎯 CONCLUSIÓN:');
    if (cuadroCambio && panoFinal.cuadro === '3"' && panoEnLista?.cuadro === '3"') {
      console.log('✅ Todo funciona correctamente - el problema está en el frontend');
    } else if (cuadroCambio && panoFinal.cuadro === '3"' && panoEnLista?.cuadro !== '3"') {
      console.log('❌ El backend actualiza correctamente pero la lista no refleja los cambios');
    } else if (!cuadroCambio) {
      console.log('❌ El backend NO está actualizando correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.response?.data || error.message);
    if (error.response) {
      console.error('📊 Detalles del error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
  } finally {
    await pool.end();
  }
}

// Ejecutar la prueba
testPanoUpdateComplete(); 