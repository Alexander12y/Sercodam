const axios = require('axios');
const knex = require('knex');
const knexfile = require('./knexfile');

// Database connection
const db = knex(knexfile.development);

// API configuration
const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';

async function testPanoFallback() {
    console.log('🧪 Testing pano fallback mechanism');
    
    try {
        // Check what panos are available first
        const availablePanos = await db('pano as p')
            .select('p.*', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('p.estado_trabajo', 'Libre')
            .whereRaw('(GREATEST(p.largo_m, p.ancho_m) >= ? AND LEAST(p.largo_m, p.ancho_m) >= ?)', [4, 3])
            .orderBy('p.area_m2', 'asc');

        console.log(`\n📊 Available panos for 4x3:`);
        availablePanos.forEach(pano => {
            console.log(`ID: ${pano.id_item}, Dim: ${pano.largo_m}x${pano.ancho_m}, Área: ${pano.area_m2}, Tipo: ${pano.tipo_red}`);
        });

        // Create a test order that requests nylon but should fallback to lona
        const testOrder = {
            cliente: 'Cliente Test Fallback',
            observaciones: 'Orden de prueba para verificar fallback de tipos de paño',
            prioridad: 'media',
            panos: [
                {
                    altura_req: 3.0,
                    ancho_req: 4.0,
                    tipo_red: 'nylon',  // This should fallback to lona
                    umbral_sobrante_m2: 1.0
                }
            ]
        };

        console.log('\n🚀 Attempting to create order with nylon request (should fallback to lona)...');
        
        // Login first to get auth token
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            username: 'admin@sercodam.com',
            password: 'Sercodam2024!'
        });

        const token = loginResponse.data.token;

        // Try to create the order
        const orderResponse = await axios.post(`${API_BASE}/ordenes`, testOrder, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (orderResponse.data.success) {
            console.log('✅ Order created successfully!');
            console.log(`📋 Order ID: ${orderResponse.data.data.id_op}`);
            console.log(`📋 Order Number: ${orderResponse.data.data.numero_op}`);
            
            // Check what pano was actually selected
            const workJobs = await db('trabajo_corte as tc')
                .join('pano as p', 'tc.id_item', 'p.id_item')
                .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                .where('tc.id_op', orderResponse.data.data.id_op)
                .select('tc.*', 'p.largo_m', 'p.ancho_m', 'p.area_m2', 'rp.tipo_red');
            
            console.log('\n🎯 Work job created:');
            workJobs.forEach(job => {
                console.log(`Job ID: ${job.job_id}, Pano ID: ${job.id_item}, Tipo: ${job.tipo_red}, Requested: ${job.altura_req}x${job.ancho_req}`);
                console.log(`Pano dimensions: ${job.largo_m}x${job.ancho_m} = ${job.area_m2}m²`);
            });
        } else {
            console.log('❌ Order creation failed:', orderResponse.data);
        }

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

testPanoFallback(); 