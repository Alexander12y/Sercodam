const db = require('./src/config/database');

async function fixPanoEstado() {
    try {
        console.log('🔧 Corrigiendo estado_trabajo de paños...');
        
        // Verificar paños con estado_trabajo NULL
        const panosNull = await db('pano')
            .whereNull('estado_trabajo')
            .select('id_item', 'largo_m', 'ancho_m', 'area_m2');
        
        console.log(`📋 Paños con estado_trabajo NULL: ${panosNull.length}`);
        panosNull.forEach(pano => {
            console.log(`- ID: ${pano.id_item} | ${pano.largo_m}m x ${pano.ancho_m}m = ${pano.area_m2}m²`);
        });
        
        if (panosNull.length > 0) {
            // Actualizar paños con estado_trabajo NULL a 'Libre'
            const result = await db('pano')
                .whereNull('estado_trabajo')
                .update({ estado_trabajo: 'Libre' });
            
            console.log(`✅ Actualizados ${result} paños a estado_trabajo = 'Libre'`);
            
            // Verificar el resultado
            const panosLibres = await db('pano')
                .where('estado_trabajo', 'Libre')
                .select('id_item', 'largo_m', 'ancho_m', 'area_m2', 'estado_trabajo');
            
            console.log(`📋 Paños libres después de la corrección: ${panosLibres.length}`);
            panosLibres.forEach(pano => {
                console.log(`- ID: ${pano.id_item} | ${pano.largo_m}m x ${pano.ancho_m}m = ${pano.area_m2}m² | Estado: ${pano.estado_trabajo}`);
            });
        } else {
            console.log('✅ No hay paños que necesiten corrección');
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await db.destroy();
    }
}

fixPanoEstado(); 