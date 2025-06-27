const db = require('./src/config/database');

async function testPanos() {
    try {
        console.log('🔍 Verificando datos en tabla pano...');
        
        // Contar total de paños
        const countResult = await db('pano').count('* as total');
        console.log('📊 Total de paños en la base de datos:', countResult[0].total);
        
        // Obtener algunos paños de ejemplo
        const panos = await db('pano').select('*').limit(5);
        console.log('📋 Primeros 5 paños:');
        panos.forEach((pano, index) => {
            console.log(`${index + 1}. ID: ${pano.id_item}, Estado: ${pano.estado}, Área: ${pano.area_m2}m²`);
        });
        
        // Verificar si existe la vista materializada
        const viewExists = await db.raw(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'mv_panos_resumen' AND table_schema = 'public'
            );
        `);
        console.log('👁️ Vista materializada mv_panos_resumen existe:', viewExists.rows[0].exists);
        
        if (viewExists.rows[0].exists) {
            const viewCount = await db('mv_panos_resumen').count('* as total');
            console.log('📊 Total en vista materializada:', viewCount[0].total);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await db.destroy();
    }
}

testPanos(); 