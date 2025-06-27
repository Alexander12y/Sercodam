const knex = require('knex');

// Crear una nueva instancia de Knex para este test
const db = knex({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'sercodam_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'P@chiicolipAt024!',
        ssl: false
    },
    searchPath: [process.env.DB_SCHEMA || 'catalogo_1'],
    pool: {
        min: 0,
        max: 5,
        createTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100,
        propagateCreateError: false
    }
});

async function main() {
  try {
    console.log('🔍 Consultando paños con JOIN a red_producto...');
    const panos = await db('pano as p')
      .select(
        'p.id_item',
        'p.id_mcr',
        'p.largo_m',
        'p.ancho_m',
        'p.area_m2',
        'p.estado',
        'p.ubicacion',
        'p.precio_x_unidad',
        'p.created_at',
        'p.updated_at',
        'rp.tipo_red',
        'rp.unidad',
        'rp.marca',
        'rp.descripcion'
      )
      .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
      .orderBy('p.id_item', 'desc')
      .limit(10);

    if (panos.length === 0) {
      console.log('⚠️ No se encontraron paños.');
    } else {
      console.log(`✅ Se encontraron ${panos.length} paños:`);
      panos.forEach((pano, i) => {
        console.log(`\n#${i + 1}:`);
        console.log(`  ID: ${pano.id_item}`);
        console.log(`  MCR: ${pano.id_mcr}`);
        console.log(`  Tipo: ${pano.tipo_red || 'N/A'}`);
        console.log(`  Estado: ${pano.estado}`);
        console.log(`  Área: ${pano.area_m2}m²`);
        console.log(`  Ubicación: ${pano.ubicacion}`);
      });
    }
  } catch (err) {
    console.error('❌ Error consultando paños:', err);
  } finally {
    await db.destroy();
  }
}

main(); 