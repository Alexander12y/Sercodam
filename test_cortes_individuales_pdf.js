const axios = require('axios');

// Configuración
const BASE_URL = 'http://localhost:3001/api/v1';
const TEST_ORDER_ID = 1; // Cambiar por un ID de orden que tenga cortes individuales

async function testCortesIndividualesPDF() {
    try {
        console.log('🧪 Probando funcionalidad de cortes individuales en PDF...');
        
        // 1. Verificar que la orden existe
        console.log('\n1. Verificando orden...');
        const orderResponse = await axios.get(`${BASE_URL}/ordenes/${TEST_ORDER_ID}`);
        console.log('✅ Orden encontrada:', orderResponse.data.data.numero_op);
        
        // 2. Verificar trabajos de corte
        console.log('\n2. Verificando trabajos de corte...');
        const cutJobsResponse = await axios.get(`${BASE_URL}/ordenes/${TEST_ORDER_ID}/cut-jobs`);
        const cutJobs = cutJobsResponse.data.data;
        console.log(`✅ Encontrados ${cutJobs.length} trabajos de corte`);
        
        // 3. Verificar cortes individuales en cada trabajo
        console.log('\n3. Verificando cortes individuales...');
        for (const job of cutJobs) {
            console.log(`\n   Trabajo ${job.job_id} (Paño ${job.id_item}):`);
            console.log(`   - Dimensiones requeridas: ${job.altura_req}m x ${job.ancho_req}m`);
            console.log(`   - Estado: ${job.estado}`);
            
            // Verificar si tiene cortes individuales
            if (job.cortes_individuales && job.cortes_individuales.length > 0) {
                console.log(`   ✅ Tiene ${job.cortes_individuales.length} cortes individuales:`);
                job.cortes_individuales.forEach((corte, idx) => {
                    const area = (parseFloat(corte.largo) * parseFloat(corte.ancho)).toFixed(2);
                    console.log(`     - Corte ${corte.seq}: ${corte.largo}m x ${corte.ancho}m = ${area}m² (${corte.cantidad} pieza${corte.cantidad > 1 ? 's' : ''})`);
                });
            } else {
                console.log('   ℹ️  No tiene cortes individuales');
            }
        }
        
        // 4. Generar PDF
        console.log('\n4. Generando PDF...');
        const pdfResponse = await axios.get(`${BASE_URL}/ordenes/${TEST_ORDER_ID}/pdf`);
        console.log('✅ PDF generado exitosamente');
        
        // 5. Descargar PDF
        console.log('\n5. Descargando PDF...');
        const downloadResponse = await axios.get(`${BASE_URL}/ordenes/${TEST_ORDER_ID}/pdf/download`, {
            responseType: 'blob'
        });
        console.log('✅ PDF descargado exitosamente');
        console.log(`   Tamaño del archivo: ${(downloadResponse.data.size / 1024).toFixed(2)} KB`);
        
        console.log('\n🎉 Prueba completada exitosamente!');
        console.log('\n📋 Resumen:');
        console.log(`   - Orden: ${orderResponse.data.data.numero_op}`);
        console.log(`   - Trabajos de corte: ${cutJobs.length}`);
        console.log(`   - PDF generado y descargado correctamente`);
        
        // Verificar que el PDF contiene información de cortes individuales
        const totalCortesIndividuales = cutJobs.reduce((total, job) => {
            return total + (job.cortes_individuales ? job.cortes_individuales.length : 0);
        }, 0);
        
        if (totalCortesIndividuales > 0) {
            console.log(`   - Cortes individuales encontrados: ${totalCortesIndividuales}`);
            console.log('   ✅ El PDF debería mostrar las instrucciones de cortes individuales');
        } else {
            console.log('   ℹ️  No se encontraron cortes individuales en esta orden');
            console.log('   💡 Para probar completamente, crea una orden con cortes individuales');
        }
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.response?.data || error.message);
        
        if (error.response?.status === 401) {
            console.log('\n💡 Necesitas autenticarte. Ejecuta primero:');
            console.log('   node test_with_login.js');
        }
    }
}

// Ejecutar prueba
testCortesIndividualesPDF(); 