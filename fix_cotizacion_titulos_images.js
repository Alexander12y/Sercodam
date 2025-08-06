require('dotenv').config({ path: './sercodam-backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sercodam_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'P@chiicolipAt024!',
});

async function fixCotizacionTitulos() {
    try {
        console.log('🔧 === CORRIGIENDO TÍTULOS DE COTIZACIONES ===\n');

        // 1. Obtener todos los títulos válidos de titulo_proyecto
        console.log('1. 📊 OBTENIENDO TÍTULOS VÁLIDOS:');
        const titulosValidos = await pool.query(`
            SELECT titulo_proyecto, tipo_proyecto, foto_titulo 
            FROM catalogo_1.titulo_proyecto 
            ORDER BY tipo_proyecto, titulo_proyecto;
        `);
        
        console.log('Títulos válidos disponibles:');
        titulosValidos.rows.forEach(row => {
            console.log(`   - ${row.titulo_proyecto} (${row.tipo_proyecto})`);
        });
        console.log('');

        // 2. Obtener cotizaciones con problemas
        console.log('2. 📊 COTIZACIONES CON PROBLEMAS:');
        const cotizaciones = await pool.query(`
            SELECT id_cotizacion, numero_cotizacion, titulo_proyecto, tipo_proyecto 
            FROM catalogo_1.cotizacion 
            ORDER BY fecha_creacion DESC;
        `);

        console.log('Cotizaciones encontradas:');
        cotizaciones.rows.forEach(row => {
            console.log(`   - ${row.numero_cotizacion}: "${row.titulo_proyecto}" (${row.tipo_proyecto || 'sin tipo'})`);
        });
        console.log('');

        // 3. Mapear y corregir títulos
        console.log('3. 🔧 CORRIGIENDO TÍTULOS:');
        
        const mapeoTitulos = {
            'Redes Antica¡da': 'Redes Anticaída',
            'Redes Anticaφda': 'Redes Anticaída',
            'Redes Antica├¡da': 'Redes Anticaída',
            'Redes para F£tbol': 'Redes para Fútbol',
            'Redes para F·tbol': 'Redes para Fútbol',
            'Redes para F├║tbol': 'Redes para Fútbol',
            'Test Project Simple': 'Redes Anticaída'
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
                // Verificar si el título ya es válido
                const tituloValido = titulosValidos.rows.find(t => t.titulo_proyecto === tituloActual);
                if (tituloValido) {
                    console.log(`   ✅ Título válido: "${tituloActual}"`);
                } else {
                    console.log(`   ⚠️ Título sin mapeo: "${tituloActual}"`);
                }
            }
        }

        console.log(`\n📊 Total de títulos corregidos: ${corregidas}`);

        // 4. Verificar resultado final
        console.log('\n4. ✅ VERIFICANDO RESULTADO FINAL:');
        const resultadoFinal = await pool.query(`
            SELECT 
                c.id_cotizacion,
                c.numero_cotizacion,
                c.titulo_proyecto,
                c.tipo_proyecto,
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

        console.log('Estado final de las cotizaciones:');
        resultadoFinal.rows.forEach(row => {
            const foto = row.foto_titulo || row.foto_tipo || 'sin foto';
            console.log(`   ${row.estado} ${row.numero_cotizacion}: "${row.titulo_proyecto}" → ${foto}`);
        });

        // 5. Resumen estadístico
        const validas = resultadoFinal.rows.filter(r => r.estado.includes('VÁLIDO')).length;
        const invalidas = resultadoFinal.rows.filter(r => r.estado.includes('INVÁLIDO')).length;
        
        console.log(`\n📈 RESUMEN:`);
        console.log(`   ✅ Cotizaciones con títulos válidos: ${validas}`);
        console.log(`   ❌ Cotizaciones con títulos inválidos: ${invalidas}`);
        console.log(`   📊 Total: ${resultadoFinal.rows.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

fixCotizacionTitulos(); 