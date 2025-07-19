const db = require('./src/config/database');

async function fixConsumedPano() {
    try {
        console.log('🔧 Corrigiendo estado de paño padre consumido...');
        
        // Buscar paños que están en "En progreso" pero deberían estar "Consumido"
        const panosEnProgreso = await db('pano')
            .where('estado_trabajo', 'En progreso')
            .select('id_item', 'largo_m', 'ancho_m', 'area_m2', 'estado_trabajo');
        
        console.log(`📋 Paños en estado "En progreso": ${panosEnProgreso.length}`);
        panosEnProgreso.forEach(pano => {
            console.log(`- ID: ${pano.id_item} | ${pano.largo_m}m x ${pano.ancho_m}m = ${pano.area_m2}m²`);
        });
        
        if (panosEnProgreso.length > 0) {
            // Verificar si estos paños tienen remanentes generados
            for (const pano of panosEnProgreso) {
                const remanentes = await db('panos_sobrantes')
                    .where('id_item_padre', pano.id_item)
                    .select('*');
                
                console.log(`🔍 Paño ${pano.id_item} tiene ${remanentes.length} remanentes`);
                
                if (remanentes.length > 0) {
                    // Si tiene remanentes, el paño padre debería estar "Consumido"
                    await db('pano')
                        .where('id_item', pano.id_item)
                        .update({ estado_trabajo: 'Consumido' });
                    
                    console.log(`✅ Paño ${pano.id_item} marcado como "Consumido"`);
                }
            }
            
            // Verificar el resultado final
            const panosConsumidos = await db('pano')
                .where('estado_trabajo', 'Consumido')
                .select('id_item', 'largo_m', 'ancho_m', 'area_m2', 'estado_trabajo');
            
            console.log(`📋 Paños consumidos después de la corrección: ${panosConsumidos.length}`);
            panosConsumidos.forEach(pano => {
                console.log(`- ID: ${pano.id_item} | ${pano.largo_m}m x ${pano.ancho_m}m = ${pano.area_m2}m² | Estado: ${pano.estado_trabajo}`);
            });
        } else {
            console.log('✅ No hay paños que necesiten corrección');
        }
        
        // Mostrar estado final de todos los paños
        const todosLosPanos = await db('pano')
            .select('id_item', 'largo_m', 'ancho_m', 'area_m2', 'estado_trabajo')
            .orderBy('id_item');
        
        console.log('\n📊 Estado final de todos los paños:');
        todosLosPanos.forEach(pano => {
            console.log(`- ID: ${pano.id_item} | ${pano.largo_m}m x ${pano.ancho_m}m = ${pano.area_m2}m² | Estado: ${pano.estado_trabajo}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await db.destroy();
    }
}

fixConsumedPano(); 