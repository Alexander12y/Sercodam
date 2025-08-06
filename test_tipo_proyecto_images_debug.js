require('dotenv').config({ path: './sercodam-backend/.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sercodam_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'P@chiicolipAt024!',
});

async function debugTipoProyectoImages() {
    try {
        console.log('🔍 === DEBUG IMÁGENES TIPO PROYECTO ===\n');

        // 1. Verificar datos en tipo_proyecto
        console.log('1. 📊 DATOS EN TABLA TIPO_PROYECTO:');
        const tipoProyectoResult = await pool.query(`
            SELECT tipo_proyecto, foto_tipo 
            FROM catalogo_1.tipo_proyecto 
            ORDER BY tipo_proyecto;
        `);
        console.log(tipoProyectoResult.rows);
        console.log('');

        // 2. Verificar datos en titulo_proyecto
        console.log('2. 📊 DATOS EN TABLA TITULO_PROYECTO:');
        const tituloProyectoResult = await pool.query(`
            SELECT titulo_proyecto, foto_titulo, tipo_proyecto 
            FROM catalogo_1.titulo_proyecto 
            ORDER BY tipo_proyecto, titulo_proyecto;
        `);
        console.log(tituloProyectoResult.rows);
        console.log('');

        // 3. Verificar cotizaciones existentes
        console.log('3. 📊 COTIZACIONES EXISTENTES:');
        const cotizacionesResult = await pool.query(`
            SELECT id_cotizacion, numero_cotizacion, titulo_proyecto, tipo_proyecto 
            FROM catalogo_1.cotizacion 
            ORDER BY fecha_creacion DESC 
            LIMIT 5;
        `);
        console.log(cotizacionesResult.rows);
        console.log('');

        // 4. Simular la consulta que hace obtenerImagenProyecto
        console.log('4. 🔍 SIMULANDO CONSULTA obtenerImagenProyecto:');
        for (const cotizacion of cotizacionesResult.rows) {
            if (cotizacion.titulo_proyecto) {
                const imagenResult = await pool.query(`
                    SELECT tp.foto_titulo, tpro.foto_tipo
                    FROM catalogo_1.titulo_proyecto as tp
                    JOIN catalogo_1.tipo_proyecto as tpro ON tp.tipo_proyecto = tpro.tipo_proyecto
                    WHERE tp.titulo_proyecto = $1
                `, [cotizacion.titulo_proyecto]);
                
                console.log(`   📋 Cotización ${cotizacion.numero_cotizacion}:`);
                console.log(`      - Título: ${cotizacion.titulo_proyecto}`);
                console.log(`      - Tipo: ${cotizacion.tipo_proyecto}`);
                if (imagenResult.rows.length > 0) {
                    const fotoTitulo = imagenResult.rows[0].foto_titulo;
                    const fotoTipo = imagenResult.rows[0].foto_tipo;
                    const fotoAUsar = fotoTitulo || fotoTipo;
                    console.log(`      - foto_titulo: ${fotoTitulo || 'NULL'}`);
                    console.log(`      - foto_tipo: ${fotoTipo || 'NULL'}`);
                    console.log(`      - foto_a_usar: ${fotoAUsar || 'NULL'}`);
                } else {
                    console.log(`      - ❌ No se encontró registro en titulo_proyecto`);
                }
                console.log('');
            }
        }

        // 5. Verificar archivos de imagen disponibles
        console.log('5. 🖼️ ARCHIVOS DE IMAGEN DISPONIBLES:');
        const imagePath = path.join(__dirname, 'sercodam-backend/public/images/public/images/networks');
        console.log(`   📁 Directorio: ${imagePath}`);
        
        if (fs.existsSync(imagePath)) {
            const files = fs.readdirSync(imagePath);
            console.log(`   📋 Archivos encontrados (${files.length}):`);
            files.forEach(file => {
                console.log(`      - ${file}`);
            });
        } else {
            console.log('   ❌ Directorio no existe');
        }
        console.log('');

        // 6. Verificar rutas específicas de imágenes
        console.log('6. 🔍 VERIFICANDO RUTAS ESPECÍFICAS:');
        const imagenesTest = ['Industrial.png', 'construccion.png', 'deportivo.png'];
        
        for (const imagen of imagenesTest) {
            const rutaNetworks = path.join(imagePath, imagen);
            const existeNetworks = fs.existsSync(rutaNetworks);
            console.log(`   📋 ${imagen}:`);
            console.log(`      - Ruta networks: ${rutaNetworks}`);
            console.log(`      - Existe: ${existeNetworks ? '✅' : '❌'}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

debugTipoProyectoImages(); 