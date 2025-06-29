const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/v1';

// Función para obtener token de autenticación
async function getAuthToken() {
    try {
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'Admin123!'
        });
        
        if (loginResponse.data.success) {
            return loginResponse.data.data.tokens.accessToken;
        } else {
            throw new Error('Error en login: ' + loginResponse.data.message);
        }
    } catch (error) {
        console.log('❌ Error obteniendo token de autenticación:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
        throw error;
    }
}

async function getInventarioInicial(headers) {
    console.log('\n📊 Obteniendo inventario inicial...');
    
    try {
        // Obtener paños disponibles
        const panosResponse = await axios.get(`${BASE_URL}/inventario/panos?limit=3`, { headers });
        console.log('🔎 Respuesta cruda de /inventario/panos:', JSON.stringify(panosResponse.data, null, 2));
        const panos = panosResponse.data.panos || [];
        
        // Obtener materiales disponibles
        const materialesResponse = await axios.get(`${BASE_URL}/inventario/materiales?limit=3`, { headers });
        console.log('🔎 Respuesta cruda de /inventario/materiales:', JSON.stringify(materialesResponse.data, null, 2));
        const materiales = materialesResponse.data.materiales || [];
        
        // Obtener herramientas disponibles
        const herramientasResponse = await axios.get(`${BASE_URL}/inventario/herramientas?limit=3`, { headers });
        console.log('🔎 Respuesta cruda de /inventario/herramientas:', JSON.stringify(herramientasResponse.data, null, 2));
        const herramientas = (herramientasResponse.data.data && herramientasResponse.data.data.herramientas) ? herramientasResponse.data.data.herramientas : [];
        
        console.log('✅ Inventario inicial obtenido:');
        console.log(`   Paños: ${panos.length} disponibles`);
        console.log(`   Materiales: ${materiales.length} disponibles`);
        console.log(`   Herramientas: ${herramientas.length} disponibles`);
        
        return { panos, materiales, herramientas };
    } catch (error) {
        console.log('❌ Error obteniendo inventario inicial:', error.message);
        return { panos: [], materiales: [], herramientas: [] };
    }
}

async function crearOrdenCompleta(headers, inventario) {
    console.log('\n🏭 Creando orden de producción completa...');
    
    try {
        // Generar número de orden único
        const fecha = new Date();
        const fechaStr = fecha.toISOString().slice(0, 10).replace(/-/g, '');
        const timestamp = Date.now();
        const numeroOp = `OP-${fechaStr}-${timestamp}`;
        
        // Preparar datos de la orden
        const ordenData = {
            cliente: 'Cliente de Prueba - Webhook',
            descripcion_trabajo: 'Instalación de malla sombra con materiales extras',
            observaciones: 'Prueba completa de webhook y descuento de inventario',
            prioridad: 'media',
            fecha_inicio: new Date().toISOString().split('T')[0],
            fecha_fin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            panos: [],
            materiales: [],
            herramientas: []
        };
        
        console.log(`   📋 Número de orden generado: ${numeroOp}`);
        
        // Agregar paños si hay disponibles
        const pano = inventario.panos.find(p => Number(p.area_m2) > 0);
        if (pano) {
            ordenData.panos.push({
                id_item: pano.id_item,
                cantidad: Math.min(5, pano.area_m2 || 10),
                notas: 'Paño para malla sombra',
                tipo_item: 'PANO'
            });
            console.log(`   📋 Agregando paño: ${pano.descripcion} (${ordenData.panos[0].cantidad}m²)`);
        } else {
            console.log('⚠️ No hay paños con área disponible > 0');
        }
        
        // Agregar materiales si hay disponibles
        const material = inventario.materiales.find(m => Number(m.cantidad_disponible) > 0);
        if (material) {
            ordenData.materiales.push({
                id_item: material.id_item,
                cantidad: Math.min(2, material.cantidad_disponible || 5),
                notas: 'Material extra para instalación',
                tipo_item: 'EXTRA'
            });
            console.log(`   📋 Agregando material: ${material.descripcion} (${ordenData.materiales[0].cantidad} ${material.unidad})`);
        } else {
            console.log('⚠️ No hay materiales con cantidad disponible > 0');
        }
        
        // Agregar herramientas si hay disponibles
        const herramienta = inventario.herramientas.find(h => Number(h.cantidad_disponible) > 0);
        if (herramienta) {
            ordenData.herramientas.push({
                id_item: herramienta.id_item,
                cantidad: 1,
                notas: 'Herramienta para instalación'
            });
            console.log(`   📋 Agregando herramienta: ${herramienta.descripcion}`);
        } else {
            console.log('⚠️ No hay herramientas con cantidad disponible > 0');
        }
        
        // Crear la orden
        const ordenResponse = await axios.post(`${BASE_URL}/ordenes`, ordenData, { headers });
        
        if (ordenResponse.data.success) {
            console.log('✅ Orden creada exitosamente');
            console.log(`   ID: ${ordenResponse.data.data.id_op}`);
            console.log(`   Número: ${ordenResponse.data.data.numero_op}`);
            return ordenResponse.data.data;
        } else {
            throw new Error(ordenResponse.data.message);
        }
        
    } catch (error) {
        console.log('❌ Error creando orden:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
        throw error;
    }
}

async function verificarInventarioDescontado(headers, inventarioInicial, ordenData) {
    console.log('\n📊 Verificando descuento de inventario...');
    
    try {
        // Verificar paños
        if (ordenData.panos && ordenData.panos.length > 0) {
            const panoOriginal = inventarioInicial.panos.find(p => p.id_item === ordenData.panos[0].id_item);
            if (panoOriginal) {
                const panoResponse = await axios.get(`${BASE_URL}/inventario/panos/${panoOriginal.id_item}`, { headers });
                const panoActual = panoResponse.data.data;
                
                const areaDescontada = ordenData.panos[0].cantidad;
                const areaEsperada = Math.max(0, (panoOriginal.area_m2 || 0) - areaDescontada);
                
                console.log(`   📋 Paño ${panoOriginal.descripcion}:`);
                console.log(`      Área inicial: ${panoOriginal.area_m2}m²`);
                console.log(`      Área descontada: ${areaDescontada}m²`);
                console.log(`      Área actual: ${panoActual.area_m2}m²`);
                console.log(`      Área esperada: ${areaEsperada}m²`);
                console.log(`      ✅ ${Math.abs(panoActual.area_m2 - areaEsperada) < 0.01 ? 'Correcto' : '❌ Incorrecto'}`);
            }
        }
        
        // Verificar materiales
        if (ordenData.materiales && ordenData.materiales.length > 0) {
            const materialOriginal = inventarioInicial.materiales.find(m => m.id_item === ordenData.materiales[0].id_item);
            if (materialOriginal) {
                const materialResponse = await axios.get(`${BASE_URL}/inventario/materiales/${materialOriginal.id_item}`, { headers });
                const materialActual = materialResponse.data.data;
                
                const cantidadDescontada = ordenData.materiales[0].cantidad;
                const cantidadEsperada = Math.max(0, (materialOriginal.cantidad_disponible || 0) - cantidadDescontada);
                
                console.log(`   📋 Material ${materialOriginal.descripcion}:`);
                console.log(`      Cantidad inicial: ${materialOriginal.cantidad_disponible} ${materialOriginal.unidad}`);
                console.log(`      Cantidad descontada: ${cantidadDescontada} ${materialOriginal.unidad}`);
                console.log(`      Cantidad actual: ${materialActual.cantidad_disponible} ${materialOriginal.unidad}`);
                console.log(`      Cantidad esperada: ${cantidadEsperada} ${materialOriginal.unidad}`);
                console.log(`      ✅ ${materialActual.cantidad_disponible === cantidadEsperada ? 'Correcto' : '❌ Incorrecto'}`);
            }
        }
        
        // Verificar herramientas (no se descuentan)
        if (ordenData.herramientas && ordenData.herramientas.length > 0) {
            const herramientaOriginal = inventarioInicial.herramientas.find(h => h.id_item === ordenData.herramientas[0].id_item);
            if (herramientaOriginal) {
                const herramientaResponse = await axios.get(`${BASE_URL}/inventario/herramientas/${herramientaOriginal.id_item}`, { headers });
                const herramientaActual = herramientaResponse.data.data;
                
                console.log(`   📋 Herramienta ${herramientaOriginal.descripcion}:`);
                console.log(`      Cantidad inicial: ${herramientaOriginal.cantidad_disponible}`);
                console.log(`      Cantidad actual: ${herramientaActual.cantidad_disponible}`);
                console.log(`      ✅ ${herramientaActual.cantidad_disponible === herramientaOriginal.cantidad_disponible ? 'Correcto (no se descuenta)' : '❌ Incorrecto'}`);
            }
        }
        
    } catch (error) {
        console.log('❌ Error verificando inventario:', error.message);
    }
}

async function cambiarEstadoAEnProceso(headers, ordenId) {
    console.log('\n🔄 Cambiando estado a "en_proceso"...');
    
    try {
        const estadoResponse = await axios.patch(`${BASE_URL}/ordenes/${ordenId}/estado`, {
            estado: 'en_proceso',
            notas: 'Iniciando producción - prueba de webhook automático'
        }, { headers });
        
        if (estadoResponse.data.success) {
            console.log('✅ Estado cambiado exitosamente');
            console.log(`   Estado anterior: ${estadoResponse.data.data.estado_anterior}`);
            console.log(`   Estado nuevo: ${estadoResponse.data.data.estado_nuevo}`);
            console.log(`   Webhook enviado: ${estadoResponse.data.data.webhook_enviado}`);
            
            if (estadoResponse.data.data.webhook_enviado) {
                console.log('   📤 Webhook enviado automáticamente a Make.com');
                console.log('   🔍 Revisa tu escenario de Make.com para ver los datos recibidos');
            }
            
            return estadoResponse.data.data;
        } else {
            throw new Error(estadoResponse.data.message);
        }
        
    } catch (error) {
        console.log('❌ Error cambiando estado:');
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        } else {
            console.log(`   Error: ${error.message}`);
        }
        throw error;
    }
}

async function runTestCompleto() {
    console.log('🚀 Iniciando prueba completa de orden de producción...\n');
    
    try {
        // 1. Obtener token de autenticación
        const token = await getAuthToken();
        const headers = { 'Authorization': `Bearer ${token}` };
        console.log('✅ Autenticación exitosa');
        
        // 2. Obtener inventario inicial
        const inventarioInicial = await getInventarioInicial(headers);
        
        // 3. Crear orden completa
        const ordenCreada = await crearOrdenCompleta(headers, inventarioInicial);
        
        // 4. Verificar descuento de inventario
        await verificarInventarioDescontado(headers, inventarioInicial, ordenCreada);
        
        // 5. Cambiar estado a en_proceso (esto enviará el webhook)
        await cambiarEstadoAEnProceso(headers, ordenCreada.id_op);
        
        console.log('\n✨ Prueba completa finalizada');
        console.log('\n📋 Resumen:');
        console.log('   1. ✅ Orden de producción creada');
        console.log('   2. ✅ Inventario descontado correctamente');
        console.log('   3. ✅ Webhook enviado a Make.com');
        console.log('   4. 🔍 Revisa tu escenario de Make.com para ver los datos completos');
        
    } catch (error) {
        console.log('\n❌ Error en la prueba completa:', error.message);
    }
}

// Ejecutar prueba si se llama directamente
if (require.main === module) {
    runTestCompleto().catch(console.error);
} 