const axios = require('axios');

// Configuración de la API
const API_BASE_URL = 'http://localhost:4000/api/v1';

async function testPanoUpdate() {
    try {
        console.log('🔍 Iniciando prueba de actualización de paño...');
        
        // 0. Hacer login para obtener token
        console.log('🔐 Haciendo login...');
        const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        
        if (!loginResponse.data.success) {
            console.log('❌ Error en login:', loginResponse.data);
            return;
        }
        
        const token = loginResponse.data.data.tokens.accessToken;
        console.log('🔑 Token recibido:', token ? 'Token válido' : 'Token inválido');
        console.log('✅ Login exitoso');
        
        // Configurar axios para usar el token
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // 1. Obtener lista de paños para encontrar uno de nylon
        console.log('📋 Obteniendo lista de paños...');
        const panosResponse = await axios.get(`${API_BASE_URL}/inventario/panos?tipo_red=nylon&limit=1`);
        
        console.log('📊 Respuesta de paños:', panosResponse.data);
        
        if (!panosResponse.data.success || !panosResponse.data.panos || panosResponse.data.panos.length === 0) {
            console.log('❌ No se encontraron paños de nylon');
            return;
        }
        
        const pano = panosResponse.data.panos[0];
        console.log('📝 Paño encontrado:', {
            id_item: pano.id_item,
            id_mcr: pano.id_mcr,
            tipo_red: pano.tipo_red,
            calibre: pano.calibre,
            cuadro: pano.cuadro,
            torsion: pano.torsion,
            refuerzo: pano.refuerzo
        });
        
        // 2. Obtener detalles específicos del paño
        console.log('🔍 Obteniendo detalles del paño...');
        const panoDetailResponse = await axios.get(`${API_BASE_URL}/inventario/panos/${pano.id_item}`);
        
        if (!panoDetailResponse.data.success) {
            console.log('❌ Error obteniendo detalles del paño');
            return;
        }
        
        const panoDetail = panoDetailResponse.data.data;
        console.log('📊 Detalles del paño antes de actualizar:', {
            calibre: panoDetail.calibre,
            cuadro: panoDetail.cuadro,
            torsion: panoDetail.torsion,
            refuerzo: panoDetail.refuerzo,
            largo_m: panoDetail.largo_m,
            ancho_m: panoDetail.ancho_m
        });
        
        // 3. Preparar datos de actualización
        const updateData = {
            id_mcr: pano.id_mcr,
            largo_m: parseFloat(panoDetail.largo_m) + 0.5, // Cambiar dimensión
            ancho_m: parseFloat(panoDetail.ancho_m),
            estado: panoDetail.estado,
            ubicacion: panoDetail.ubicacion || 'Bodega CDMX',
            precio_x_unidad: parseFloat(panoDetail.precio_x_unidad || 100),
            stock_minimo: parseFloat(panoDetail.stock_minimo || 0),
            // Incluir especificaciones específicas
            tipo_red: panoDetail.tipo_red,
            calibre: panoDetail.calibre,
            cuadro: panoDetail.cuadro,
            torsion: panoDetail.torsion,
            refuerzo: panoDetail.refuerzo === true || panoDetail.refuerzo === 't' ? 'No' : 'Sí' // Cambiar refuerzo
        };
        
        console.log('📝 Datos que se van a enviar para actualizar:', updateData);
        
        // 4. Actualizar paño
        console.log('🔄 Actualizando paño...');
        const updateResponse = await axios.put(`${API_BASE_URL}/inventario/panos/${pano.id_item}`, updateData);
        
        if (!updateResponse.data.success) {
            console.log('❌ Error actualizando paño:', updateResponse.data);
            return;
        }
        
        console.log('✅ Paño actualizado exitosamente');
        
        // 5. Verificar la actualización obteniendo los datos nuevamente
        console.log('🔍 Verificando actualización...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // Esperar 3 segundos para consistency
        
        const verifyResponse = await axios.get(`${API_BASE_URL}/inventario/panos/${pano.id_item}`);
        
        if (!verifyResponse.data.success) {
            console.log('❌ Error verificando actualización');
            return;
        }
        
        const updatedPano = verifyResponse.data.data;
        console.log('📊 Datos del paño después de actualizar:', {
            calibre: updatedPano.calibre,
            cuadro: updatedPano.cuadro,
            torsion: updatedPano.torsion,
            refuerzo: updatedPano.refuerzo,
            largo_m: updatedPano.largo_m,
            ancho_m: updatedPano.ancho_m
        });
        
        // 6. Comparar cambios
        console.log('📊 Comparación de cambios:');
        console.log(`   Largo: ${panoDetail.largo_m} → ${updatedPano.largo_m} ${panoDetail.largo_m !== updatedPano.largo_m ? '✅ CAMBIÓ' : '❌ NO CAMBIÓ'}`);
        console.log(`   Refuerzo: ${panoDetail.refuerzo} → ${updatedPano.refuerzo} ${panoDetail.refuerzo !== updatedPano.refuerzo ? '✅ CAMBIÓ' : '❌ NO CAMBIÓ'}`);
        
        console.log('🎉 Prueba completada');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.response?.data || error.message);
        console.error('❌ Stack trace:', error.stack);
    }
}

// Ejecutar la prueba
testPanoUpdate();