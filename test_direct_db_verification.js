require('dotenv').config({ path: './sercodam-backend/.env' });
const { Pool } = require('pg');
const axios = require('axios');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sercodam_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function testDirectDBVerification() {
    try {
        const API_BASE_URL = 'http://localhost:4000/api/v1';
        
        // Login
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.data.tokens.accessToken;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        console.log('🔍 === VERIFICACIÓN DIRECTA DE BD ===\n');
        
        // 1. Obtener datos iniciales vía API
        console.log('1. 📊 DATOS INICIALES VÍA API:');
        const initialResponse = await axios.get(`${API_BASE_URL}/inventario/panos/856`);
        const initialData = initialResponse.data.data;
        console.log('   📋 API:', {
            largo_m: initialData.largo_m,
            cuadro: initialData.cuadro,
            refuerzo: initialData.refuerzo
        });
        
        // 2. Obtener datos iniciales directo de BD
        console.log('\n2. 📊 DATOS INICIALES DIRECTO DE BD:');
        const initialDBResult = await pool.query(`
            SELECT 
                p.largo_m, p.ancho_m, p.estado,
                n.cuadro, n.refuerzo, n.calibre
            FROM catalogo_1.pano p
            LEFT JOIN catalogo_1.nylon n ON p.id_mcr = n.id_mcr
            WHERE p.id_item = 856;
        `);
        const initialDBData = initialDBResult.rows[0];
        console.log('   📋 BD Directa:', {
            largo_m: initialDBData?.largo_m,
            cuadro: initialDBData?.cuadro,
            refuerzo: initialDBData?.refuerzo
        });
        
        // 3. Actualizar vía API
        const timestamp = Date.now();
        const uniqueLargo = 2000 + (timestamp % 1000);
        const uniqueCuadro = `${timestamp % 10}"`;
        
        console.log('\n3. 🔄 ACTUALIZANDO VÍA API...');
        console.log(`   🎯 Nuevo largo: ${uniqueLargo}, Nuevo cuadro: ${uniqueCuadro}`);
        
        const updateData = {
            largo_m: uniqueLargo,
            ancho_m: 50,
            estado: 'bueno',
            ubicacion: 'Bodega CDMX',
            precio_x_unidad: 100,
            stock_minimo: 10,
            tipo_red: 'Nylon',
            calibre: '18',
            cuadro: uniqueCuadro,
            torsion: 'Torcida',
            refuerzo: 'No'
        };
        
        const updateResponse = await axios.put(`${API_BASE_URL}/inventario/panos/856`, updateData);
        console.log('   ✅ Respuesta de actualización:', updateResponse.data);
        
        // 4. Verificar inmediatamente vía API
        console.log('\n4. ⚡ VERIFICANDO VÍA API (INMEDIATO):');
        const immediateResponse = await axios.get(`${API_BASE_URL}/inventario/panos/856?_t=${Date.now()}`);
        const immediateData = immediateResponse.data.data;
        console.log('   📋 API:', {
            largo_m: immediateData.largo_m,
            cuadro: immediateData.cuadro,
            refuerzo: immediateData.refuerzo
        });
        
        // 5. Verificar inmediatamente directo de BD
        console.log('\n5. ⚡ VERIFICANDO DIRECTO DE BD (INMEDIATO):');
        const immediateDBResult = await pool.query(`
            SELECT 
                p.largo_m, p.ancho_m, p.estado,
                n.cuadro, n.refuerzo, n.calibre
            FROM catalogo_1.pano p
            LEFT JOIN catalogo_1.nylon n ON p.id_mcr = n.id_mcr
            WHERE p.id_item = 856;
        `);
        const immediateDBData = immediateDBResult.rows[0];
        console.log('   📋 BD Directa:', {
            largo_m: immediateDBData?.largo_m,
            cuadro: immediateDBData?.cuadro,
            refuerzo: immediateDBData?.refuerzo
        });
        
        // 6. Análisis de resultados
        console.log('\n6. 📊 ANÁLISIS DE RESULTADOS:');
        console.log(`   🎯 Valores esperados: largo=${uniqueLargo}, cuadro=${uniqueCuadro}, refuerzo=false`);
        console.log(`   📋 API: largo=${immediateData.largo_m}, cuadro=${immediateData.cuadro}, refuerzo=${immediateData.refuerzo}`);
        console.log(`   📋 BD: largo=${immediateDBData?.largo_m}, cuadro=${immediateDBData?.cuadro}, refuerzo=${immediateDBData?.refuerzo}`);
        
        const apiCorrect = immediateData.largo_m == uniqueLargo && immediateData.cuadro == uniqueCuadro;
        const dbCorrect = immediateDBData?.largo_m == uniqueLargo && immediateDBData?.cuadro == uniqueCuadro;
        
        console.log(`\n   ${apiCorrect ? '✅' : '❌'} API ${apiCorrect ? 'CORRECTO' : 'INCORRECTO'}`);
        console.log(`   ${dbCorrect ? '✅' : '❌'} BD Directa ${dbCorrect ? 'CORRECTO' : 'INCORRECTO'}`);
        
        if (!apiCorrect && dbCorrect) {
            console.log('\n   🎯 CONCLUSIÓN: Los datos SÍ se actualizaron en la BD, pero la API no los lee correctamente');
        } else if (!apiCorrect && !dbCorrect) {
            console.log('\n   🎯 CONCLUSIÓN: Los datos NO se actualizaron en la BD');
        } else {
            console.log('\n   🎯 CONCLUSIÓN: Todo funciona correctamente');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    } finally {
        await pool.end();
    }
}

testDirectDBVerification(); 