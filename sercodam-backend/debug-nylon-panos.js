const knex = require('knex');
const knexfile = require('./knexfile');

// Database connection using the same logic as the working test script
const db = knex(knexfile.development);

async function debugNylonPanos() {
    console.log('🔍 Debug: Checking nylon panos specifically');
    
    try {
        // First, get ALL nylon panos regardless of state
        const allNylonPanos = await db('pano as p')
            .select('p.id_item', 'p.largo_m', 'p.ancho_m', 'p.area_m2', 'p.estado_trabajo', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('rp.tipo_red', 'nylon')
            .orderBy('p.area_m2', 'desc');

        console.log(`\n📊 ALL nylon panos in database (${allNylonPanos.length}):`);
        allNylonPanos.forEach(pano => {
            console.log(`ID: ${pano.id_item}, Dim: ${pano.largo_m}x${pano.ancho_m}, Área: ${pano.area_m2}, Estado: ${pano.estado_trabajo}`);
        });

        // Check only FREE nylon panos
        const freeNylonPanos = await db('pano as p')
            .select('p.id_item', 'p.largo_m', 'p.ancho_m', 'p.area_m2', 'p.estado_trabajo', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('rp.tipo_red', 'nylon')
            .where('p.estado_trabajo', 'Libre')
            .orderBy('p.area_m2', 'desc');

        console.log(`\n✅ FREE nylon panos (${freeNylonPanos.length}):`);
        freeNylonPanos.forEach(pano => {
            console.log(`ID: ${pano.id_item}, Dim: ${pano.largo_m}x${pano.ancho_m}, Área: ${pano.area_m2}, Estado: ${pano.estado_trabajo}`);
        });

        // Check for ANY tipo_red that's free and suitable for 4x3
        console.log('\n🔍 Checking ALL tipos_red for 4x3 dimensions:');
        
        const allSuitablePanos = await db('pano as p')
            .select('p.*', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('p.estado_trabajo', 'Libre')
            .whereRaw('(GREATEST(p.largo_m, p.ancho_m) >= ? AND LEAST(p.largo_m, p.ancho_m) >= ?)', [4, 3])
            .whereRaw('p.area_m2 >= ?', [0])
            .whereNotExists(function() {
                this.select('*')
                    .from('trabajo_corte as tc')
                    .join('orden_produccion as op', 'tc.id_op', 'op.id_op')
                    .whereRaw('tc.id_item = p.id_item')
                    .whereIn('op.estado', ['en_proceso', 'completada']);
            })
            .orderBy('p.area_m2', 'asc');

        console.log(`\n🎯 ALL suitable panos (any type) for 4x3 (${allSuitablePanos.length}):`);
        allSuitablePanos.forEach(pano => {
            console.log(`ID: ${pano.id_item}, Dim: ${pano.largo_m}x${pano.ancho_m}, Área: ${pano.area_m2}, Estado: ${pano.estado_trabajo}, Tipo: ${pano.tipo_red}`);
        });

        // Test without tipo_red filter
        console.log('\n🧪 Testing findSuitablePanos WITHOUT tipo_red filter:');
        
        let query = db('pano as p')
            .select('p.*', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('p.estado_trabajo', 'Libre')
            .whereRaw('(GREATEST(p.largo_m, p.ancho_m) >= ? AND LEAST(p.largo_m, p.ancho_m) >= ?)', [4, 3])
            .whereRaw('p.area_m2 >= ?', [0])
            .whereNotExists(function() {
                this.select('*')
                    .from('trabajo_corte as tc')
                    .join('orden_produccion as op', 'tc.id_op', 'op.id_op')
                    .whereRaw('tc.id_item = p.id_item')
                    .whereIn('op.estado', ['en_proceso', 'completada']);
            });

        const suitablePanosNoTypeFilter = await query.orderBy('p.area_m2', 'asc');
        
        console.log(`✅ Results WITHOUT tipo_red filter (${suitablePanosNoTypeFilter.length}):`);
        suitablePanosNoTypeFilter.forEach(pano => {
            console.log(`ID: ${pano.id_item}, Dim: ${pano.largo_m}x${pano.ancho_m}, Área: ${pano.area_m2}, Estado: ${pano.estado_trabajo}, Tipo: ${pano.tipo_red}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await db.destroy();
        process.exit(0);
    }
}

debugNylonPanos(); 