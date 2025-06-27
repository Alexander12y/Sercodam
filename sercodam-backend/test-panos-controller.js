const db = require('./src/config/database');
const panosController = require('./src/controllers/inventario/panosController');

// Mock request y response para probar el controlador
const mockReq = {
    query: {
        page: 1,
        limit: 10
    }
};

const mockRes = {
    json: (data) => {
        console.log('✅ Respuesta del controlador:');
        console.log('Success:', data.success);
        console.log('Total de paños:', data.panos?.length || 0);
        console.log('Paginación:', data.pagination);
        
        if (data.panos && data.panos.length > 0) {
            console.log('\n📋 Paños encontrados:');
            data.panos.forEach((pano, index) => {
                console.log(`${index + 1}. ID: ${pano.id_item}, Tipo: ${pano.tipo_red}, Estado: ${pano.estado}, Área: ${pano.area_m2}m²`);
            });
        }
    }
};

async function testController() {
    try {
        console.log('🔍 Probando función getPanos del controlador...');
        await panosController.getPanos(mockReq, mockRes);
    } catch (error) {
        console.error('❌ Error en el controlador:', error);
    } finally {
        await db.destroy();
    }
}

testController(); 