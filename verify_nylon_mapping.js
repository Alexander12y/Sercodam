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

async function verifyNylonMapping() {
  const db = require('knex')(dbConfig);
  
  try {
    console.log('=== VERIFICACIÓN DE MAPEO DE NYLON ===\n');
    
    // 1. Verificar que todos los registros de nylon existan en red_producto
    console.log('1. Verificando coincidencia entre nylon y red_producto...');
    const nylonRecords = await db('nylon').select('id_mcr');
    const redProductRecords = await db('red_producto').select('id_mcr');
    
    const nylonIds = nylonRecords.map(r => r.id_mcr);
    const redProductIds = redProductRecords.map(r => r.id_mcr);
    
    const missingInRedProduct = nylonIds.filter(id => !redProductIds.includes(id));
    const extraInRedProduct = redProductIds.filter(id => !nylonIds.includes(id));
    
    console.log(`   Total registros en nylon: ${nylonIds.length}`);
    console.log(`   Total registros en red_producto: ${redProductIds.length}`);
    console.log(`   Registros de nylon faltantes en red_producto: ${missingInRedProduct.length}`);
    console.log(`   Registros extra en red_producto: ${extraInRedProduct.length}`);
    
    if (missingInRedProduct.length > 0) {
      console.log('   IDs faltantes en red_producto:');
      missingInRedProduct.forEach(id => console.log(`     - ${id}`));
    }
    
    // 2. Verificar formato de imágenes
    console.log('\n2. Verificando formato de imágenes disponibles...');
    const availableImages = [
      'calibre-18x1-torcida.jpeg',
      'calibre-18x2-torcida.jpeg', 
      'calibre-18x4-torcida.jpeg',
      'calibre-30x7-8-sq.jpeg',
      'calibre-36x2-trenzada.jpeg',
      'calibre-36x2-75-torcida.jpeg',
      'calibre-36x4-torcida.jpeg',
      'calibre-36x4-trenzada.png',
      'calibre-42x2-torcida.jpeg',
      'calibre-42x2-1-8-trenzada.jpeg',
      'calibre-9x9_16-torcida.png'
    ];
    
    console.log('   Imágenes disponibles:');
    availableImages.forEach(img => {
      const extension = img.split('.').pop();
      console.log(`     - ${img} (${extension})`);
    });
    
    // 3. Verificar estado actual de red_producto
    console.log('\n3. Estado actual de red_producto...');
    const currentRedProduct = await db('red_producto')
      .select('id_mcr', 'foto')
      .orderBy('id_mcr');
    
    const withPhotos = currentRedProduct.filter(r => r.foto);
    const withoutPhotos = currentRedProduct.filter(r => !r.foto);
    
    console.log(`   Registros con fotos: ${withPhotos.length}`);
    console.log(`   Registros sin fotos: ${withoutPhotos.length}`);
    
    if (withPhotos.length > 0) {
      console.log('   Primeros 5 registros con fotos:');
      withPhotos.slice(0, 5).forEach(r => {
        console.log(`     ${r.id_mcr}: ${r.foto}`);
      });
    }
    
    // 4. Generar mapeo corregido
    console.log('\n4. Generando mapeo corregido...');
    
    const nylonWithDetails = await db('nylon').select('*');
    const updates = [];
    
    for (const record of nylonWithDetails) {
      const { id_mcr, calibre, cuadro, torsion } = record;
      
      // Verificar que existe en red_producto
      if (!redProductIds.includes(id_mcr)) {
        console.log(`   ⚠️  ${id_mcr} no existe en red_producto`);
        continue;
      }
      
      // Determinar imagen basada en calibre y cuadro
      let imageFile = null;
      
      if (calibre === '18') {
        if (cuadro === '1') imageFile = 'calibre-18x1-torcida.jpeg';
        else if (cuadro === '2') imageFile = 'calibre-18x2-torcida.jpeg';
        else if (cuadro === '4') imageFile = 'calibre-18x4-torcida.jpeg';
        else imageFile = 'calibre-18x1-torcida.jpeg'; // default
      } else if (calibre === '30') {
        imageFile = 'calibre-30x7-8-sq.jpeg';
      } else if (calibre === '36') {
        if (cuadro === '2') imageFile = 'calibre-36x2-trenzada.jpeg';
        else if (cuadro === '1 3/4') imageFile = 'calibre-36x2-75-torcida.jpeg';
        else if (cuadro === '4') imageFile = 'calibre-36x4-torcida.jpeg';
        else imageFile = 'calibre-36x2-trenzada.jpeg'; // default
      } else if (calibre === '42') {
        if (cuadro === '2') imageFile = 'calibre-42x2-torcida.jpeg';
        else if (cuadro === '2 1/8') imageFile = 'calibre-42x2-1-8-trenzada.jpeg';
        else imageFile = 'calibre-42x2-torcida.jpeg'; // default
      } else if (calibre === '60') {
        imageFile = 'calibre-36x2-trenzada.jpeg'; // usar imagen de calibre 36 como aproximación
      }
      
      if (imageFile) {
        updates.push({
          id_mcr,
          imageFile,
          calibre,
          cuadro,
          torsion
        });
      }
    }
    
    console.log(`   Total de actualizaciones a realizar: ${updates.length}`);
    
    // 5. Generar SQL corregido
    console.log('\n5. Generando SQL corregido...');
    const sqlContent = updates
      .map(update => `UPDATE red_producto SET foto = '${update.imageFile}' WHERE id_mcr = '${update.id_mcr}';`)
      .join('\n');
    
    require('fs').writeFileSync('update_nylon_images_corrected.sql', sqlContent);
    console.log('   Archivo SQL corregido generado: update_nylon_images_corrected.sql');
    
    // 6. Mostrar resumen del mapeo
    console.log('\n6. Resumen del mapeo:');
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
      console.log(`   Calibre ${calibre}:`);
      Object.entries(images).forEach(([image, count]) => {
        console.log(`     - ${image}: ${count} registros`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

// Ejecutar la verificación
verifyNylonMapping(); 