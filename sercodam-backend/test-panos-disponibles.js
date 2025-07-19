const db = require('./src/config/database');
const logger = require('./src/config/logger');

async function testPanosDisponibles() {
    try {
        console.log('🔍 Verificando paños disponibles en la base de datos...\n');

        // Verificar todos los paños
        const todosLosPanos = await db('pano as p')
            .select('p.*', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .orderBy('p.area_m2', 'desc');

        console.log(`📊 Total de paños en la base de datos: ${todosLosPanos.length}\n`);

        // Mostrar los primeros 10 paños más grandes
        console.log('📋 Top 10 paños más grandes:');
        todosLosPanos.slice(0, 10).forEach((pano, index) => {
            console.log(`${index + 1}. ID: ${pano.id_item} | ${pano.largo_m}m x ${pano.ancho_m}m = ${pano.area_m2}m² | Tipo: ${pano.tipo_red || 'N/A'} | Estado: ${pano.estado_trabajo}`);
        });

        // Verificar paños libres
        const panosLibres = await db('pano as p')
            .select('p.*', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('p.estado_trabajo', 'Libre')
            .orderBy('p.area_m2', 'desc');

        console.log(`\n✅ Paños libres: ${panosLibres.length}`);

        // Verificar paños que pueden servir para 3x2.5
        const altura_req = 3;
        const ancho_req = 2.5;

        console.log(`\n🎯 Buscando paños para ${altura_req}m x ${ancho_req}m:`);

        const panosAdecuados = await db('pano as p')
            .select('p.*', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('p.estado_trabajo', 'Libre')
            .where(function() {
                this.where(function() {
                    // Caso 1: largo_m >= altura_req Y ancho_m >= ancho_req
                    this.where('p.largo_m', '>=', altura_req)
                        .andWhere('p.ancho_m', '>=', ancho_req);
                }).orWhere(function() {
                    // Caso 2: largo_m >= ancho_req Y ancho_m >= altura_req (rotación)
                    this.where('p.largo_m', '>=', ancho_req)
                        .andWhere('p.ancho_m', '>=', altura_req);
                });
            })
            .orderBy('p.area_m2', 'asc');

        console.log(`📦 Paños adecuados encontrados: ${panosAdecuados.length}`);

        if (panosAdecuados.length > 0) {
            console.log('\n📋 Paños que pueden servir:');
            panosAdecuados.forEach((pano, index) => {
                console.log(`${index + 1}. ID: ${pano.id_item} | ${pano.largo_m}m x ${pano.ancho_m}m = ${pano.area_m2}m² | Tipo: ${pano.tipo_red || 'N/A'}`);
            });
        } else {
            console.log('\n❌ No se encontraron paños adecuados');
            
            // Mostrar paños más cercanos
            const panosCercanos = await db('pano as p')
                .select('p.*', 'rp.tipo_red')
                .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                .where('p.estado_trabajo', 'Libre')
                .where('p.area_m2', '>=', altura_req * ancho_req)
                .orderBy('p.area_m2', 'asc')
                .limit(5);

            console.log('\n🔍 Paños más cercanos por área:');
            panosCercanos.forEach((pano, index) => {
                console.log(`${index + 1}. ID: ${pano.id_item} | ${pano.largo_m}m x ${pano.ancho_m}m = ${pano.area_m2}m² | Tipo: ${pano.tipo_red || 'N/A'}`);
            });
        }

        // Verificar estados de trabajo
        const estadosTrabajo = await db('pano')
            .select('estado_trabajo')
            .count('* as count')
            .groupBy('estado_trabajo');

        console.log('\n📊 Estados de trabajo:');
        estadosTrabajo.forEach(estado => {
            console.log(`- ${estado.estado_trabajo}: ${estado.count} paños`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await db.destroy();
    }
}

testPanosDisponibles(); 