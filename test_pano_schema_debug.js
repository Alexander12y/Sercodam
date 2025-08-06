require('dotenv').config({ path: './sercodam-backend/.env' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sercodam_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function debugPanoSchema() {
    try {
        console.log('🔍 === ANÁLISIS DE ESQUEMAS Y DATOS ===\n');

        // 1. Verificar esquemas que tienen tabla pano
        console.log('1. 📊 ESQUEMAS CON TABLA PANO:');
        const schemasResult = await pool.query(`
            SELECT schemaname, tablename 
            FROM pg_tables 
            WHERE tablename = 'pano'
            ORDER BY schemaname;
        `);
        console.log(schemasResult.rows);
        console.log('');

        // 2. Buscar paño 856 en todos los esquemas
        console.log('2. 🔍 PAÑO 856 EN DIFERENTES ESQUEMAS:');
        
        for (const row of schemasResult.rows) {
            const schema = row.schemaname;
            try {
                const panoResult = await pool.query(`
                    SELECT id_item, id_mcr, largo_m, ancho_m, estado, ubicacion
                    FROM "${schema}".pano 
                    WHERE id_item = 856;
                `);
                
                if (panoResult.rows.length > 0) {
                    console.log(`   📋 Esquema ${schema}:`, panoResult.rows[0]);
                }
            } catch (error) {
                console.log(`   ❌ Error en esquema ${schema}:`, error.message);
            }
        }
        console.log('');

        // 3. Verificar registros en nylon para el id_mcr específico
        console.log('3. 🔍 REGISTROS EN TABLA NYLON:');
        const nylonResult = await pool.query(`
            SELECT * FROM catalogo_1.nylon 
            WHERE id_mcr = 'MCR-18-2 1/8-TO';
        `);
        console.log('   📋 Nylon MCR-18-2 1/8-TO:', nylonResult.rows);
        console.log('');

        // 4. Hacer la consulta exacta que hace getPanos
        console.log('4. 🔍 CONSULTA EXACTA DE GETPANOS:');
        const getPanosResult = await pool.query(`
            SELECT 
                p.*,
                rp.tipo_red,
                rp.unidad,
                rp.marca,
                rp.descripcion,
                n.calibre,
                n.cuadro,
                n.torsion,
                n.refuerzo
            FROM catalogo_1.pano as p
            LEFT JOIN catalogo_1.red_producto as rp ON p.id_mcr = rp.id_mcr
            LEFT JOIN catalogo_1.nylon as n ON p.id_mcr = n.id_mcr
            WHERE p.id_item = 856;
        `);
        console.log('   📋 Resultado getPanos para paño 856:', getPanosResult.rows[0]);
        console.log('');

        // 5. Verificar qué pasa si hacemos update directo
        console.log('5. 🔍 TEST DE UPDATE DIRECTO:');
        
        // Obtener valores actuales
        const beforeUpdate = await pool.query(`
            SELECT cuadro, refuerzo FROM catalogo_1.nylon WHERE id_mcr = 'MCR-18-2 1/8-TO';
        `);
        console.log('   📊 ANTES del update:', beforeUpdate.rows[0]);

        // Hacer update
        const updateResult = await pool.query(`
            UPDATE catalogo_1.nylon 
            SET cuadro = '6"', refuerzo = false 
            WHERE id_mcr = 'MCR-18-2 1/8-TO';
        `);
        console.log('   🔄 Update ejecutado, filas afectadas:', updateResult.rowCount);

        // Verificar cambios
        const afterUpdate = await pool.query(`
            SELECT cuadro, refuerzo FROM catalogo_1.nylon WHERE id_mcr = 'MCR-18-2 1/8-TO';
        `);
        console.log('   📊 DESPUÉS del update:', afterUpdate.rows[0]);

        // Rollback
        await pool.query(`
            UPDATE catalogo_1.nylon 
            SET cuadro = '2 1/8"', refuerzo = true 
            WHERE id_mcr = 'MCR-18-2 1/8-TO';
        `);
        console.log('   🔙 Rollback ejecutado');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

debugPanoSchema();