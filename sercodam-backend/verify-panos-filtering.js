const knex = require('knex');
const knexfile = require('./knexfile');

// Database connection
const db = knex(knexfile.development);

async function verifyPanosFiltering() {
    console.log('🔍 Verificando el filtrado de paños disponibles');
    
    try {
        // Check current state of panos
        const allPanos = await db('pano as p')
            .select('p.id_item', 'p.largo_m', 'p.ancho_m', 'p.area_m2', 'p.estado_trabajo', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .orderBy('p.area_m2', 'desc');

        console.log(`\n📊 Estado actual de paños en la base de datos (${allPanos.length} total):`);
        
        // Group by estado_trabajo
        const estadoCounts = {};
        allPanos.forEach(pano => {
            const estado = pano.estado_trabajo || 'null';
            estadoCounts[estado] = (estadoCounts[estado] || 0) + 1;
        });
        
        console.log('\n📊 Distribución por estado de trabajo:');
        Object.entries(estadoCounts).forEach(([estado, count]) => {
            console.log(`${estado}: ${count} paños`);
        });

        // Show available panos (Libre)
        const librePanos = allPanos.filter(p => p.estado_trabajo === 'Libre');
        console.log(`\n✅ Paños disponibles (estado_trabajo = 'Libre') - ${librePanos.length} encontrados:`);
        
        librePanos.forEach(pano => {
            console.log(`ID: ${pano.id_item}, ${pano.largo_m}x${pano.ancho_m} = ${pano.area_m2}m², Tipo: ${pano.tipo_red}`);
        });

        // Show unavailable panos
        const noLibrePanos = allPanos.filter(p => p.estado_trabajo !== 'Libre' && p.estado_trabajo !== null);
        console.log(`\n🚫 Paños NO disponibles (estado != 'Libre') - ${noLibrePanos.length} encontrados:`);
        
        noLibrePanos.slice(0, 10).forEach(pano => {
            console.log(`ID: ${pano.id_item}, ${pano.largo_m}x${pano.ancho_m} = ${pano.area_m2}m², Estado: ${pano.estado_trabajo}, Tipo: ${pano.tipo_red}`);
        });

        // Check for large available panos
        const largeLibrePanos = librePanos.filter(p => p.area_m2 > 20).sort((a, b) => b.area_m2 - a.area_m2);
        console.log(`\n🎯 Paños grandes disponibles (área > 20m²) - ${largeLibrePanos.length} encontrados:`);
        
        largeLibrePanos.forEach(pano => {
            console.log(`ID: ${pano.id_item}, ${pano.largo_m}x${pano.ancho_m} = ${pano.area_m2}m², Tipo: ${pano.tipo_red}`);
        });

        // Summary for frontend
        console.log('\n📝 Resumen para el frontend:');
        console.log(`• Total paños en BD: ${allPanos.length}`);
        console.log(`• Paños disponibles (Libre): ${librePanos.length}`);
        console.log(`• Paños ocupados: ${noLibrePanos.length}`);
        console.log(`• Paños grandes disponibles (>20m²): ${largeLibrePanos.length}`);
        
        if (librePanos.length === 0) {
            console.log('⚠️  ADVERTENCIA: No hay paños disponibles para nuevas órdenes');
        } else {
            console.log('✅ Hay paños disponibles para nuevas órdenes');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await db.destroy();
        process.exit(0);
    }
}

verifyPanosFiltering(); 