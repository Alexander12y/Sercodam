require('dotenv').config({ path: './sercodam-backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sercodam_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'P@chiicolipAt024!',
});

async function fixCotizacionTitulosFinal() {
    try {
        console.log('🔧 === CORRECCIÓN FINAL DE TÍTULOS ===\n');

        // 1. Obtener títulos válidos de la base de datos
        const titulosValidos = await pool.query(`
            SELECT titulo_proyecto, tipo_proyecto, foto_titulo 
            FROM catalogo_1.titulo_proyecto 
            ORDER BY tipo_proyecto, titulo_proyecto;
        `);

        console.log('Títulos válidos en la base de datos:');
        titulosValidos.rows.forEach(row => {
            console.log(`   - "${row.titulo_proyecto}" (${row.tipo_proyecto})`);
        });
        console.log('');

        // 2. Obtener cotizaciones problemáticas
        const cotizaciones = await pool.query(`
            SELECT id_cotizacion, numero_cotizacion, titulo_proyecto, tipo_proyecto 
            FROM catalogo_1.cotizacion 
            ORDER BY fecha_creacion DESC;
        `);

        console.log('Cotizaciones a corregir:');
        cotizaciones.rows.forEach(row => {
            console.log(`   - ${row.numero_cotizacion}: "${row.titulo_proyecto}"`);
        });
        console.log('');

        // 3. Mapeo específico basado en el análisis de caracteres
        const mapeoTitulos = {
            // Redes Anticaída (diferentes codificaciones)
            'Redes AnticaÃ­da': 'Redes Antica¡da',
            'Redes Anticaφda': 'Redes Antica¡da',
            'Redes Antica├¡da': 'Redes Antica¡da',
            
            // Redes para Fútbol (diferentes codificaciones)
            'Redes para FÃºtbol': 'Redes para F£tbol',
            'Redes para F·tbol': 'Redes para F£tbol',
            'Redes para F├║tbol': 'Redes para F£tbol',
            
            // Títulos de prueba
            'Test Project Simple': 'Redes Antica¡da'
        };

        let corregidas = 0;
        for (const cotizacion of cotizaciones.rows) {
            const tituloActual = cotizacion.titulo_proyecto;
            const tituloCorregido = mapeoTitulos[tituloActual];
            
            if (tituloCorregido) {
                console.log(`   🔄 Corrigiendo: "${tituloActual}" → "${tituloCorregido}"`);
                
                await pool.query(`
                    UPDATE catalogo_1.cotizacion 
                    SET titulo_proyecto = $1 
                    WHERE id_cotizacion = $2
                `, [tituloCorregido, cotizacion.id_cotizacion]);
                
                corregidas++;
            } else {
                // Verificar si ya es válido
                const tituloValido = titulosValidos.rows.find(t => t.titulo_proyecto === tituloActual);
                if (tituloValido) {
                    console.log(`   ✅ Ya válido: "${tituloActual}"`);
                } else {
                    console.log(`   ⚠️ Sin mapeo: "${tituloActual}"`);
                }
            }
        }

        console.log(`\n📊 Total corregidas: ${corregidas}`);

        // 4. Verificar resultado
        console.log('\n4. ✅ VERIFICACIÓN FINAL:');
        const resultadoFinal = await pool.query(`
            SELECT 
                c.id_cotizacion,
                c.numero_cotizacion,
                c.titulo_proyecto,
                tp.foto_titulo,
                tpro.foto_tipo,
                CASE 
                    WHEN tp.titulo_proyecto IS NOT NULL THEN '✅ VÁLIDO'
                    ELSE '❌ INVÁLIDO'
                END as estado
            FROM catalogo_1.cotizacion c
            LEFT JOIN catalogo_1.titulo_proyecto tp ON c.titulo_proyecto = tp.titulo_proyecto
            LEFT JOIN catalogo_1.tipo_proyecto tpro ON c.tipo_proyecto = tpro.tipo_proyecto
            ORDER BY c.fecha_creacion DESC;
        `);

        console.log('Estado final:');
        resultadoFinal.rows.forEach(row => {
            const foto = row.foto_titulo || row.foto_tipo || 'sin foto';
            console.log(`   ${row.estado} ${row.numero_cotizacion}: "${row.titulo_proyecto}" → ${foto}`);
        });

        // 5. Resumen
        const validas = resultadoFinal.rows.filter(r => r.estado.includes('VÁLIDO')).length;
        const invalidas = resultadoFinal.rows.filter(r => r.estado.includes('INVÁLIDO')).length;
        
        console.log(`\n📈 RESUMEN FINAL:`);
        console.log(`   ✅ Válidas: ${validas}`);
        console.log(`   ❌ Inválidas: ${invalidas}`);
        console.log(`   📊 Total: ${resultadoFinal.rows.length}`);

        if (validas === resultadoFinal.rows.length) {
            console.log('\n🎉 ¡TODAS LAS COTIZACIONES TIENEN TÍTULOS VÁLIDOS!');
        } else {
            console.log('\n⚠️ Aún hay cotizaciones con títulos inválidos que requieren atención manual.');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

fixCotizacionTitulosFinal(); 