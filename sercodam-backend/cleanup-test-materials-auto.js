const axios = require('axios');

const API_BASE_URL = 'http://localhost:4000/api/v1';

async function login() {
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        return response.data.token;
    } catch (error) {
        console.error('Error en login:', error.response?.data || error.message);
        throw error;
    }
}

async function getTestMaterials(token) {
    try {
        // Obtener todos los materiales para encontrar los de prueba
        const response = await axios.get(`${API_BASE_URL}/inventario/materiales?limit=50`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const testMaterials = response.data.materiales.filter(material => 
            material.id_material_extra && material.id_material_extra.startsWith('MAT_')
        );
        
        return testMaterials;
    } catch (error) {
        console.error('Error obteniendo materiales de prueba:', error.response?.data || error.message);
        throw error;
    }
}

async function deleteMaterial(token, materialId) {
    try {
        await axios.delete(`${API_BASE_URL}/inventario/materiales/${materialId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return true;
    } catch (error) {
        console.error(`Error eliminando material ${materialId}:`, error.response?.data || error.message);
        return false;
    }
}

async function cleanupTestMaterials() {
    console.log('🧹 Iniciando limpieza automática de materiales de prueba...');
    
    try {
        // 1. Login
        console.log('🔐 Iniciando sesión...');
        const token = await login();
        console.log('✅ Login exitoso');
        
        // 2. Obtener materiales de prueba
        console.log('🔍 Buscando materiales de prueba...');
        const testMaterials = await getTestMaterials(token);
        console.log(`📋 Encontrados ${testMaterials.length} materiales de prueba:`);
        
        testMaterials.forEach(material => {
            console.log(`  - ${material.id_material_extra}: ${material.descripcion}`);
        });
        
        if (testMaterials.length === 0) {
            console.log('✅ No se encontraron materiales de prueba para eliminar');
            return;
        }
        
        // 3. Eliminar materiales automáticamente
        console.log('\n🗑️  Eliminando materiales de prueba...');
        let successCount = 0;
        let errorCount = 0;
        
        for (const material of testMaterials) {
            console.log(`   Eliminando ${material.id_material_extra}...`);
            const success = await deleteMaterial(token, material.id_item);
            if (success) {
                successCount++;
                console.log(`   ✅ ${material.id_material_extra} eliminado`);
            } else {
                errorCount++;
                console.log(`   ❌ Error eliminando ${material.id_material_extra}`);
            }
            
            // Pequeña pausa entre eliminaciones
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('\n📊 Resumen de limpieza:');
        console.log(`   ✅ Materiales eliminados: ${successCount}`);
        console.log(`   ❌ Errores: ${errorCount}`);
        console.log(`   📋 Total procesados: ${testMaterials.length}`);
        
        if (successCount > 0) {
            console.log('\n🎉 Limpieza completada exitosamente');
        }
        
    } catch (error) {
        console.error('💥 Error durante la limpieza:', error.message);
    }
}

// Ejecutar limpieza automática
cleanupTestMaterials().catch(console.error); 