require('dotenv').config({ path: './sercodam-backend/.env' });

// Configuración directa usando variables de entorno
const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'sercodam_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  searchPath: [process.env.DB_SCHEMA || 'catalogo_1'],
  pool: {
    min: 2,
    max: 10
  }
};

// Mapeo de imágenes disponibles con mejor organización
const availableImages = {
  // Calibre 18 - Imágenes específicas
  '18-1-torcida': 'calibre-18x1-torcida.jpeg',
  '18-2-torcida': 'calibre-18x2-torcida.jpeg', 
  '18-4-torcida': 'calibre-18x4-torcida.jpeg',
  
  // Calibre 30 - Imagen específica
  '30-7/8': 'calibre-30x7-8-sq.jpeg',
  
  // Calibre 36 - Imágenes específicas
  '36-2-trenzada': 'calibre-36x2-trenzada.jpeg',
  '36-1 3/4-torcida': 'calibre-36x2-75-torcida.jpeg',
  '36-4-torcida': 'calibre-36x4-torcida.jpeg',
  '36-4-trenzada': 'calibre-36x4-trenzada.png',
  
  // Calibre 42 - Imágenes específicas
  '42-2-torcida': 'calibre-42x2-torcida.jpeg',
  '42-2 1/8-trenzada': 'calibre-42x2-1-8-trenzada.jpeg',
  
  // Calibre 9 - Imagen específica
  '9-9/16-torcida': 'calibre-9x9_16-torcida.png'
};

// Mapeo inteligente por calibre y cuadro
const calibreCuadroMapping = {
  '18': {
    '1': 'calibre-18x1-torcida.jpeg',
    '2': 'calibre-18x2-torcida.jpeg',
    '4': 'calibre-18x4-torcida.jpeg',
    'default': 'calibre-18x1-torcida.jpeg'
  },
  '30': {
    '7/8': 'calibre-30x7-8-sq.jpeg',
    'default': 'calibre-30x7-8-sq.jpeg'
  },
  '36': {
    '2': 'calibre-36x2-trenzada.jpeg',
    '1 3/4': 'calibre-36x2-75-torcida.jpeg',
    '4': 'calibre-36x4-torcida.jpeg',
    'default': 'calibre-36x2-trenzada.jpeg'
  },
  '42': {
    '2': 'calibre-42x2-torcida.jpeg',
    '2 1/8': 'calibre-42x2-1-8-trenzada.jpeg',
    'default': 'calibre-42x2-torcida.jpeg'
  },
  '60': {
    'default': 'calibre-36x2-trenzada.jpeg' // Usar imagen de calibre 36 como aproximación
  }
};

// Función para encontrar la imagen más apropiada
function findBestImage(calibre, cuadro, torsion) {
  const key = `${calibre}-${cuadro}-${torsion.toLowerCase()}`;
  
  // Buscar coincidencia exacta
  if (availableImages[key]) {
    return availableImages[key];
  }
  
  // Usar mapeo inteligente por calibre y cuadro
  if (calibreCuadroMapping[calibre]) {
    // Buscar cuadro específico
    if (calibreCuadroMapping[calibre][cuadro]) {
      return calibreCuadroMapping[calibre][cuadro];
    }
    
    // Buscar cuadro similar
    const cuadroNum = parseFloat(cuadro.replace(/[^0-9.]/g, ''));
    for (const [cuadroKey, imageFile] of Object.entries(calibreCuadroMapping[calibre])) {
      if (cuadroKey !== 'default') {
        const imageCuadroNum = parseFloat(cuadroKey.replace(/[^0-9.]/g, ''));
        if (Math.abs(imageCuadroNum - cuadroNum) <= 0.5) {
          return imageFile;
        }
      }
    }
    
    // Usar imagen por defecto del calibre
    return calibreCuadroMapping[calibre]['default'];
  }
  
  return null; // No se encontró imagen
}

async function mapNylonImages() {
  const db = require('knex')(dbConfig);
  
  try {
    // Obtener todos los registros de nylon
    const nylonRecords = await db('nylon').select('*');
    
    console.log('=== MAPEO DE IMÁGENES PARA REDES DE NYLON ===\n');
    
    const updates = [];
    let exactMatches = 0;
    let calibreMatches = 0;
    let noMatches = 0;
    
    for (const record of nylonRecords) {
      const { id_mcr, calibre, cuadro, torsion } = record;
      const imageFile = findBestImage(calibre, cuadro, torsion);
      
      let matchType = 'Sin coincidencia';
      if (imageFile) {
        const key = `${calibre}-${cuadro}-${torsion.toLowerCase()}`;
        if (availableImages[key]) {
          matchType = 'Coincidencia exacta';
          exactMatches++;
        } else if (imageFile.includes(`calibre-${calibre}`)) {
          matchType = 'Coincidencia por calibre';
          calibreMatches++;
        }
        
        updates.push({
          id_mcr,
          imageFile,
          matchType
        });
      } else {
        noMatches++;
      }
      
      console.log(`${id_mcr}: ${imageFile || 'SIN IMAGEN'} (${matchType})`);
    }
    
    console.log('\n=== RESUMEN ===');
    console.log(`Coincidencias exactas: ${exactMatches}`);
    console.log(`Coincidencias por calibre: ${calibreMatches}`);
    console.log(`Sin coincidencia: ${noMatches}`);
    console.log(`Total: ${nylonRecords.length}`);
    
    // Generar SQL para actualizar la tabla red_producto
    console.log('\n=== SQL PARA ACTUALIZAR TABLA RED_PRODUCTO ===');
    console.log('-- Actualizar fotos de redes de nylon');
    
    for (const update of updates) {
      if (update.imageFile) {
        console.log(`UPDATE red_producto SET foto = '${update.imageFile}' WHERE id_mcr = '${update.id_mcr}';`);
      }
    }
    
    // También generar un archivo SQL
    const sqlContent = updates
      .filter(update => update.imageFile)
      .map(update => `UPDATE red_producto SET foto = '${update.imageFile}' WHERE id_mcr = '${update.id_mcr}';`)
      .join('\n');
    
    require('fs').writeFileSync('update_nylon_images.sql', sqlContent);
    console.log('\nArchivo SQL generado: update_nylon_images.sql');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

// Ejecutar el mapeo
mapNylonImages(); 