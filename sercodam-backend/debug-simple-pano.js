const knex = require('knex');
const knexfile = require('./knexfile');

// Database connection using the same logic as the working test script
const db = knex(knexfile.development);

async function debugSimplePano() {
    console.log('🔍 Simple pano debug test');
    
    try {
        // First, check what panos we have
        const allPanos = await db('pano as p')
            .select('p.id_item', 'p.largo_m', 'p.ancho_m', 'p.area_m2', 'p.estado_trabajo', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .orderBy('p.area_m2', 'desc')
            .limit(10);

        console.log('\n📊 First 10 panos in database:');
        allPanos.forEach(pano => {
            console.log(`ID: ${pano.id_item}, Dim: ${pano.largo_m}x${pano.ancho_m}, Área: ${pano.area_m2}, Estado: ${pano.estado_trabajo}, Tipo: ${pano.tipo_red}`);
        });

        // Test manual query for 3x4 (standardized to 4x3)
        console.log('\n🔍 Testing manual query for 4x3 dimensions:');
        
        const testPanos = await db('pano as p')
            .select('p.*', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('p.estado_trabajo', 'Libre')
            .whereRaw('(GREATEST(p.largo_m, p.ancho_m) >= ? AND LEAST(p.largo_m, p.ancho_m) >= ?)', [4, 3])
            .whereRaw('p.area_m2 >= ?', [0])
            .orderBy('p.area_m2', 'asc');

        console.log(`\n✅ Found ${testPanos.length} suitable panos for 4x3:`);
        testPanos.forEach(pano => {
            console.log(`ID: ${pano.id_item}, Dim: ${pano.largo_m}x${pano.ancho_m}, Área: ${pano.area_m2}, Estado: ${pano.estado_trabajo}, Tipo: ${pano.tipo_red}`);
        });

        // Test with specific type filter
        const nylonPanos = await db('pano as p')
            .select('p.*', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('p.estado_trabajo', 'Libre')
            .where('rp.tipo_red', 'nylon')
            .whereRaw('(GREATEST(p.largo_m, p.ancho_m) >= ? AND LEAST(p.largo_m, p.ancho_m) >= ?)', [4, 3])
            .whereRaw('p.area_m2 >= ?', [0])
            .orderBy('p.area_m2', 'asc');

        console.log(`\n🎯 Found ${nylonPanos.length} nylon panos for 4x3:`);
        nylonPanos.forEach(pano => {
            console.log(`ID: ${pano.id_item}, Dim: ${pano.largo_m}x${pano.ancho_m}, Área: ${pano.area_m2}, Estado: ${pano.estado_trabajo}, Tipo: ${pano.tipo_red}`);
        });

        // Test the actual findSuitablePanos function - we need to manually implement it here
        // since we can't import the controller without issues
        console.log('\n🔧 Testing findSuitablePanos logic manually:');
        
        // Simulate the findSuitablePanos function logic
        let altura_req = 3;
        let ancho_req = 4;
        const tipo_red = 'nylon';
        
        // Estandarizar: asegurar altura >= ancho
        if (altura_req < ancho_req) {
            [altura_req, ancho_req] = [ancho_req, altura_req];
        }
        
        console.log(`📏 Standardized dimensions: ${altura_req}m x ${ancho_req}m`);

        let query = db('pano as p')
            .select('p.*', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('p.estado_trabajo', 'Libre')
            .whereRaw('(GREATEST(p.largo_m, p.ancho_m) >= ? AND LEAST(p.largo_m, p.ancho_m) >= ?)', [altura_req, ancho_req])
            .whereRaw('p.area_m2 >= ?', [0])
            .whereNotExists(function() {
                this.select('*')
                    .from('trabajo_corte as tc')
                    .join('orden_produccion as op', 'tc.id_op', 'op.id_op')
                    .whereRaw('tc.id_item = p.id_item')
                    .whereIn('op.estado', ['en_proceso', 'completada']);
            });

        if (tipo_red) {
            query = query.where('rp.tipo_red', tipo_red.toLowerCase());
        }

        const suitablePanos = await query.orderBy('p.area_m2', 'asc');
        
        console.log(`✅ Manual findSuitablePanos returned ${suitablePanos.length} results:`);
        suitablePanos.forEach(pano => {
            console.log(`ID: ${pano.id_item}, Dim: ${pano.largo_m}x${pano.ancho_m}, Área: ${pano.area_m2}, Estado: ${pano.estado_trabajo}, Tipo: ${pano.tipo_red}`);
        });

        // Also check if there are any panos that might be locked by orders
        const lockedPanos = await db('trabajo_corte as tc')
            .join('orden_produccion as op', 'tc.id_op', 'op.id_op')
            .join('pano as p', 'tc.id_item', 'p.id_item')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .whereIn('op.estado', ['en_proceso', 'completada'])
            .select('tc.id_item', 'p.largo_m', 'p.ancho_m', 'p.area_m2', 'p.estado_trabajo', 'rp.tipo_red', 'op.estado as orden_estado', 'op.numero_op');

        console.log(`\n🔒 Found ${lockedPanos.length} panos locked by approved orders:`);
        lockedPanos.forEach(pano => {
            console.log(`ID: ${pano.id_item}, Dim: ${pano.largo_m}x${pano.ancho_m}, Estado: ${pano.estado_trabajo}, Tipo: ${pano.tipo_red}, Orden: ${pano.numero_op} (${pano.orden_estado})`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await db.destroy();
        process.exit(0);
    }
}

debugSimplePano(); 