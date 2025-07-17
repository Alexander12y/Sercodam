const db = require('./src/config/database');
const panosController = require('./src/controllers/inventario/panosController');

async function debugPanoSuitability() {
    console.log('🔍 DEBUG: Testing pano suitability for 3x4 dimensions');
    
    try {
        // Test the findSuitablePanos function with the exact parameters
        const altura_req = 3;
        const ancho_req = 4;
        const tipo_red = 'nylon'; // or null to test without type filtering
        
        console.log(`\n📏 Looking for panos suitable for: ${altura_req}m x ${ancho_req}m`);
        console.log(`🎯 Tipo de red filter: ${tipo_red || 'ninguno'}`);
        
        // Call the findSuitablePanos function
        const suitablePanos = await panosController.findSuitablePanos(altura_req, ancho_req, tipo_red);
        
        console.log(`\n✅ Found ${suitablePanos.length} suitable panos:`);
        
        if (suitablePanos.length === 0) {
            console.log('❌ No suitable panos found!');
            
            // Let's check what panos exist and why they don't qualify
            console.log('\n🔍 Checking all panos in database:');
            
            const allPanos = await db('pano as p')
                .select('p.*', 'rp.tipo_red')
                .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                .orderBy('p.area_m2', 'desc');
            
            console.log(`📊 Total panos in database: ${allPanos.length}`);
            
            allPanos.forEach(pano => {
                const largoMax = Math.max(pano.largo_m, pano.ancho_m);
                const anchoMin = Math.min(pano.largo_m, pano.ancho_m);
                const heightReq = Math.max(altura_req, ancho_req);
                const widthReq = Math.min(altura_req, ancho_req);
                
                const sizeCheck = largoMax >= heightReq && anchoMin >= widthReq;
                const typeCheck = !tipo_red || (pano.tipo_red && pano.tipo_red.toLowerCase() === tipo_red.toLowerCase());
                const stateCheck = pano.estado_trabajo === 'Libre';
                
                console.log(`\n🔸 Pano ID: ${pano.id_item}`);
                console.log(`   📐 Dimensions: ${pano.largo_m}m x ${pano.ancho_m}m (área: ${pano.area_m2}m²)`);
                console.log(`   🏷️  Tipo: ${pano.tipo_red || 'N/A'}`);
                console.log(`   📊 Estado trabajo: ${pano.estado_trabajo || 'N/A'}`);
                console.log(`   ✅ Size check (${largoMax} >= ${heightReq} && ${anchoMin} >= ${widthReq}): ${sizeCheck}`);
                console.log(`   ✅ Type check: ${typeCheck}`);
                console.log(`   ✅ State check (Libre): ${stateCheck}`);
                console.log(`   🎯 Overall suitable: ${sizeCheck && typeCheck && stateCheck}`);
                
                // Check if it's in any approved orders
                const inApprovedOrder = db('trabajo_corte as tc')
                    .join('orden_produccion as op', 'tc.id_op', 'op.id_op')
                    .where('tc.id_item', pano.id_item)
                    .whereIn('op.estado', ['en_proceso', 'completada']);
                
                console.log(`   🚫 In approved order check needed: true`);
            });
            
        } else {
            suitablePanos.forEach((pano, index) => {
                console.log(`\n${index + 1}. Pano ID: ${pano.id_item}`);
                console.log(`   📐 Dimensions: ${pano.largo_m}m x ${pano.ancho_m}m`);
                console.log(`   🏷️  Tipo: ${pano.tipo_red || 'N/A'}`);
                console.log(`   📊 Área: ${pano.area_m2}m²`);
                console.log(`   📊 Estado trabajo: ${pano.estado_trabajo || 'N/A'}`);
            });
        }
        
        // Test the exact query that findSuitablePanos uses
        console.log('\n🔍 Testing the exact SQL query:');
        
        // Standardize: ensure altura >= ancho
        let altura_standardized = altura_req;
        let ancho_standardized = ancho_req;
        if (altura_req < ancho_req) {
            [altura_standardized, ancho_standardized] = [ancho_req, altura_req];
        }
        
        console.log(`📏 Standardized dimensions: ${altura_standardized}m x ${ancho_standardized}m`);
        
        let query = db('pano as p')
            .select('p.*', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('p.estado_trabajo', 'Libre')
            .whereRaw('(GREATEST(p.largo_m, p.ancho_m) >= ? AND LEAST(p.largo_m, p.ancho_m) >= ?)', [altura_standardized, ancho_standardized])
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

        const sqlResult = await query.orderBy('p.area_m2', 'asc');
        
        console.log(`🔍 SQL query returned ${sqlResult.length} results`);
        console.log('📝 Raw SQL:', query.toString());
        
        if (sqlResult.length > 0) {
            console.log('\n✅ SQL query results:');
            sqlResult.forEach((pano, index) => {
                console.log(`${index + 1}. ID: ${pano.id_item}, ${pano.largo_m}x${pano.ancho_m}, tipo: ${pano.tipo_red}, estado: ${pano.estado_trabajo}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error during debug:', error);
    } finally {
        process.exit(0);
    }
}

debugPanoSuitability(); 