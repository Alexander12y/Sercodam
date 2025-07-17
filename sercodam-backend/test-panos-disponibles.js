const axios = require('axios');
const knex = require('knex');
const knexfile = require('./knexfile');

// Database connection
const db = knex(knexfile.development);

// API configuration
const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';

async function testPanosDisponibles() {
    console.log('🧪 Testing available panos API filtering');
    
    try {
        // First check the database directly
        console.log('\n📊 Direct database check:');
        
        const allPanos = await db('pano as p')
            .select('p.id_item', 'p.largo_m', 'p.ancho_m', 'p.area_m2', 'p.estado_trabajo', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .orderBy('p.area_m2', 'desc')
            .limit(10);

        console.log('Top 10 panos by area:');
        allPanos.forEach(pano => {
            console.log(`ID: ${pano.id_item}, Dim: ${pano.largo_m}x${pano.ancho_m}, Estado: ${pano.estado_trabajo}, Tipo: ${pano.tipo_red}`);
        });

        const librePanos = await db('pano as p')
            .select('p.id_item', 'p.largo_m', 'p.ancho_m', 'p.area_m2', 'p.estado_trabajo', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('p.estado_trabajo', 'Libre')
            .orderBy('p.area_m2', 'desc');

        console.log(`\n✅ Panos with estado_trabajo = 'Libre' (${librePanos.length}):`);
        librePanos.forEach(pano => {
            console.log(`ID: ${pano.id_item}, Dim: ${pano.largo_m}x${pano.ancho_m}, Estado: ${pano.estado_trabajo}, Tipo: ${pano.tipo_red}`);
        });

        // Now test the API
        console.log('\n🌐 Testing API response:');
        
        // Login first to get auth token
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            username: 'admin@sercodam.com',
            password: 'Sercodam2024!'
        });

        const token = loginResponse.data.token;

        // Get panos from API
        const apiResponse = await axios.get(`${API_BASE}/inventario/panos?limit=1000`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const apiPanos = apiResponse.data.panos || apiResponse.data.data || [];
        
        console.log(`📡 API returned ${apiPanos.length} total panos`);
        
        // Check estado_trabajo distribution
        const estadoCounts = {};
        apiPanos.forEach(pano => {
            const estado = pano.estado_trabajo || 'null';
            estadoCounts[estado] = (estadoCounts[estado] || 0) + 1;
        });
        
        console.log('\n📊 Estado trabajo distribution in API response:');
        Object.entries(estadoCounts).forEach(([estado, count]) => {
            console.log(`${estado}: ${count} panos`);
        });

        // Show some examples of each state
        console.log('\n🔍 Example panos by estado_trabajo:');
        const estadosUnicos = [...new Set(apiPanos.map(p => p.estado_trabajo || 'null'))];
        
        estadosUnicos.forEach(estado => {
            const ejemplo = apiPanos.find(p => (p.estado_trabajo || 'null') === estado);
            if (ejemplo) {
                console.log(`${estado}: ID ${ejemplo.id_item}, ${ejemplo.largo_m}x${ejemplo.ancho_m}, Tipo: ${ejemplo.tipo_red}`);
            }
        });

        // Check for large available panos
        const largePanos = apiPanos.filter(p => 
            (p.estado_trabajo === 'Libre' || !p.estado_trabajo) && 
            p.area_m2 > 10
        ).sort((a, b) => b.area_m2 - a.area_m2);

        console.log(`\n🎯 Large available panos (area > 10m², ${largePanos.length} found):`);
        largePanos.slice(0, 5).forEach(pano => {
            console.log(`ID: ${pano.id_item}, Dim: ${pano.largo_m}x${pano.ancho_m}, Área: ${pano.area_m2}, Estado: ${pano.estado_trabajo}, Tipo: ${pano.tipo_red}`);
        });

    } catch (error) {
        if (error.response) {
            console.error('❌ API Error:', error.response.status, error.response.data);
        } else {
            console.error('❌ Error:', error.message);
        }
    } finally {
        await db.destroy();
        process.exit(0);
    }
}

testPanosDisponibles(); 