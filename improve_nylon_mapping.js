require('dotenv').config({ path: './sercodam-backend/.env' });

// Configuración de la base de datos
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

async function improveNylonMapping() {
  const db = require('knex')(dbConfig);
  
  try {
    console.log('=== MAPEO MEJORADO DE IMÁGENES DE NYLON ===\n');
    
    // Obtener todos los registros de nylon
    const nylonRecords = await db('nylon').select('*');
    const redProductIds = (await db('red_producto').select('id_mcr')).map(r => r.id_mcr);
    
    console.log(`Total registros de nylon: ${nylonRecords.length}`);
    console.log(`Registros en red_producto: ${redProductIds.length}\n`);
    
    const updates = [];
    
    for (const record of nylonRecords) {
      const { id_mcr, calibre, cuadro, torsion } = record;
      
      // Verificar que existe en red_producto
      if (!redProductIds.includes(id_mcr)) {
        console.log(`⚠️  ${id_mcr} no existe en red_producto`);
        continue;
      }
      
      // Determinar imagen basada en calibre y cuadro específico
      let imageFile = null;
      let matchType = 'Sin coincidencia';
      
      if (calibre === '18') {
        if (cuadro === '1') {
          imageFile = 'calibre-18x1-torcida.jpeg';
          matchType = 'Coincidencia exacta';
        } else if (cuadro === '2') {
          imageFile = 'calibre-18x2-torcida.jpeg';
          matchType = 'Coincidencia exacta';
        } else if (cuadro === '4') {
          imageFile = 'calibre-18x4-torcida.jpeg';
          matchType = 'Coincidencia exacta';
        } else {
          // Para otros cuadros, usar la imagen más cercana
          const cuadroNum = parseFloat(cuadro.replace(/[^0-9.]/g, ''));
          if (cuadroNum <= 1.5) {
            imageFile = 'calibre-18x1-torcida.jpeg';
            matchType = 'Coincidencia por proximidad';
          } else if (cuadroNum <= 3) {
            imageFile = 'calibre-18x2-torcida.jpeg';
            matchType = 'Coincidencia por proximidad';
          } else {
            imageFile = 'calibre-18x4-torcida.jpeg';
            matchType = 'Coincidencia por proximidad';
          }
        }
      } else if (calibre === '30') {
        imageFile = 'calibre-30x7-8-sq.jpeg';
        matchType = 'Coincidencia exacta';
      } else if (calibre === '36') {
        if (cuadro === '2') {
          imageFile = 'calibre-36x2-trenzada.jpeg';
          matchType = 'Coincidencia exacta';
        } else if (cuadro === '1 3/4') {
          imageFile = 'calibre-36x2-75-torcida.jpeg';
          matchType = 'Coincidencia exacta';
        } else if (cuadro === '4') {
          imageFile = 'calibre-36x4-torcida.jpeg';
          matchType = 'Coincidencia exacta';
        } else {
          // Para otros cuadros, usar la imagen más cercana
          const cuadroNum = parseFloat(cuadro.replace(/[^0-9.]/g, ''));
          if (cuadroNum <= 2) {
            imageFile = 'calibre-36x2-trenzada.jpeg';
            matchType = 'Coincidencia por proximidad';
          } else {
            imageFile = 'calibre-36x4-torcida.jpeg';
            matchType = 'Coincidencia por proximidad';
          }
        }
      } else if (calibre === '42') {
        if (cuadro === '2') {
          imageFile = 'calibre-42x2-torcida.jpeg';
          matchType = 'Coincidencia exacta';
        } else if (cuadro === '2 1/8') {
          imageFile = 'calibre-42x2-1-8-trenzada.jpeg';
          matchType = 'Coincidencia exacta';
        } else {
          imageFile = 'calibre-42x2-torcida.jpeg';
          matchType = 'Coincidencia por proximidad';
        }
      } else if (calibre === '60') {
        // Para calibre 60, usar imagen de calibre 36 como aproximación
        imageFile = 'calibre-36x2-trenzada.jpeg';
        matchType = 'Aproximación por calibre similar';
      } else if (calibre === 'S') {
        // Para calibre S, usar imagen de calibre 36 como aproximación
        imageFile = 'calibre-36x2-trenzada.jpeg';
        matchType = 'Aproximación por calibre similar';
      }
      
      if (imageFile) {
        updates.push({
          id_mcr,
          imageFile,
          calibre,
          cuadro,
          torsion,
          matchType
        });
        
        console.log(`${id_mcr}: ${imageFile} (${matchType})`);
      }
    }
    
    // Generar estadísticas
    console.log('\n=== ESTADÍSTICAS DEL MAPEO ===');
    const matchStats = {};
    updates.forEach(update => {
      if (!matchStats[update.matchType]) {
        matchStats[update.matchType] = 0;
      }
      matchStats[update.matchType]++;
    });
    
    Object.entries(matchStats).forEach(([type, count]) => {
      console.log(`${type}: ${count}`);
    });
    
    // Generar SQL mejorado
    console.log('\n=== GENERANDO SQL MEJORADO ===');
    const sqlContent = updates
      .map(update => `UPDATE red_producto SET foto = '${update.imageFile}' WHERE id_mcr = '${update.id_mcr}';`)
      .join('\n');
    
    require('fs').writeFileSync('update_nylon_images_final.sql', sqlContent);
    console.log('Archivo SQL final generado: update_nylon_images_final.sql');
    
    // Mostrar resumen por calibre
    console.log('\n=== RESUMEN POR CALIBRE ===');
    const calibreSummary = {};
    updates.forEach(update => {
      if (!calibreSummary[update.calibre]) {
        calibreSummary[update.calibre] = {};
      }
      if (!calibreSummary[update.calibre][update.imageFile]) {
        calibreSummary[update.calibre][update.imageFile] = 0;
      }
      calibreSummary[update.calibre][update.imageFile]++;
    });
    
    Object.entries(calibreSummary).forEach(([calibre, images]) => {
      console.log(`Calibre ${calibre}:`);
      Object.entries(images).forEach(([image, count]) => {
        console.log(`  - ${image}: ${count} registros`);
      });
    });
    
    console.log(`\nTotal de actualizaciones: ${updates.length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

// Ejecutar el mapeo mejorado
improveNylonMapping(); 