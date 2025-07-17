const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testCompleteWorkflow() {
    try {
        // 1. Login as admin
        console.log('🔐 Logging in as admin...');
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful');
        
        // 2. Create a test order with panos
        console.log('📋 Creating test order...');
        const orderData = {
            cliente: 'Cliente Test',
            observaciones: 'Orden de prueba para workflow completo',
            prioridad: 'media',
            panos: [
                {
                    altura_req: 2.0,
                    ancho_req: 1.5,
                    tipo_red: 'nylon',
                    umbral_sobrante_m2: 3.0
                }
            ],
            materiales: [],
            herramientas: []
        };
        
        const createResponse = await axios.post(`${API_BASE}/ordenes`, orderData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Order created:', createResponse.data);
        const orderId = createResponse.data.data.id_op;
        
        // 3. Check that the order is in 'por aprobar' state
        console.log('🔍 Checking order state...');
        const orderResponse = await axios.get(`${API_BASE}/ordenes/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('📊 Order state:', orderResponse.data.data.estado);
        
        // 4. Check if trabajo_corte was created
        console.log('🔍 Checking if cut jobs were created...');
        const cutJobsResponse = await axios.get(`${API_BASE}/ordenes/cut-jobs`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('📋 Cut jobs found:', cutJobsResponse.data.data.length);
        
        // 5. Approve the order
        console.log('✅ Approving order...');
        const approveResponse = await axios.post(`${API_BASE}/ordenes/${orderId}/approve`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Order approved:', approveResponse.data);
        
        // 6. Check order state after approval
        console.log('🔍 Checking order state after approval...');
        const orderAfterResponse = await axios.get(`${API_BASE}/ordenes/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('📊 Order state after approval:', orderAfterResponse.data.data.estado);
        
        // 7. Check cut jobs after approval
        console.log('🔍 Checking cut jobs after approval...');
        const cutJobsAfterResponse = await axios.get(`${API_BASE}/ordenes/cut-jobs`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('📋 Cut jobs after approval:', cutJobsAfterResponse.data.data.length);
        
        if (cutJobsAfterResponse.data.data.length > 0) {
            const job = cutJobsAfterResponse.data.data[0];
            console.log('📋 Job details:', {
                job_id: job.job_id,
                id_item: job.id_item,
                altura_req: job.altura_req,
                ancho_req: job.ancho_req,
                estado: job.estado
            });
            
            // 8. Check plans for this job
            console.log('🔍 Checking cut plans...');
            const plansResponse = await axios.get(`${API_BASE}/ordenes/cut-jobs/${job.job_id}/plans`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('📋 Plans found:', plansResponse.data.data.length);
            plansResponse.data.data.forEach((plan, idx) => {
                console.log(`  Plan ${idx + 1}:`, {
                    seq: plan.seq,
                    rol_pieza: plan.rol_pieza,
                    altura_plan: plan.altura_plan,
                    ancho_plan: plan.ancho_plan
                });
            });
        }
        
        console.log('🎉 Complete workflow test finished successfully!');
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testCompleteWorkflow(); 