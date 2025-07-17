const axios = require('axios');

const API_BASE = 'http://localhost:4000/api/v1';

async function testCutJobs() {
    try {
        // First, login as operator
        const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
            username: 'operador',
            password: 'Admin123!'
        });
        
        const token = loginResponse.data.token;
        console.log('✅ Login successful');
        
        // Test getCutJobs endpoint
        const jobsResponse = await axios.get(`${API_BASE}/ordenes/cut-jobs`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Cut jobs response:', jobsResponse.data);
        
        if (jobsResponse.data.data && jobsResponse.data.data.length > 0) {
            const job = jobsResponse.data.data[0];
            console.log('📋 Found job:', job);
            
            // Test getCutJobPlans endpoint
            const plansResponse = await axios.get(`${API_BASE}/ordenes/cut-jobs/${job.job_id}/plans`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('✅ Cut job plans response:', plansResponse.data);
        } else {
            console.log('ℹ️ No cut jobs found');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testCutJobs(); 