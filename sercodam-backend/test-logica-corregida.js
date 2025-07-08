// Cargar variables de entorno
require('dotenv').config();

const db = require('./src/config/database');
const logger = require('./src/config/logger');

async function testLogicaCorregida() {
    console.log('🧪 Probando lógica corregida del controlador...');
    console.log('🔧 Configuración de base de datos:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER
    });
    
    // Configurar timeout global para la prueba
    const timeout = setTimeout(() => {
        console.error('⏰ Timeout: La prueba tardó más de 60 segundos');
        process.exit(1);
    }, 60000); // 60 segundos
    
    const panoId = 562; // Usar un paño existente
    const materialId = 1; // Usar un material existente (verificar que tenga stock)
    const herramientaId = 274; // Usar una herramienta existente
    let idOp = null;
    
    try {
        // 0. Verificar conexión a la base de datos
        console.log('\n🔌 Verificando conexión a la base de datos...');
        await db.raw('SELECT 1');
        console.log('✅ Conexión a base de datos establecida');
        
        // 1. Verificar datos iniciales
        console.log('\n📋 Verificando datos iniciales...');
        const pano = await db('pano').where('id_item', panoId).first();
        const material = await db('materiales_extras').where('id_item', materialId).first();
        const herramienta = await db('herramientas').where('id_item', herramientaId).first();
        
        if (!pano || !material || !herramienta) {
            console.log('❌ No se encontraron los datos de prueba necesarios');
            return;
        }
        
        console.log(`✅ Paño: ${pano.largo_m}m x ${pano.ancho_m}m (área: ${pano.area_m2}m²)`);
        console.log(`✅ Material: ${material.cantidad_disponible} ${material.unidad} disponibles`);
        console.log(`✅ Herramienta: ${herramienta.cantidad_disponible} disponibles`);
        
        // Verificar que el material tenga stock suficiente
        if (material.cantidad_disponible < 5) {
            console.log(`⚠️  Material ID ${materialId} no tiene suficiente stock (${material.cantidad_disponible} < 5)`);
            console.log('🔍 Buscando otro material con stock suficiente...');
            
            const materialAlternativo = await db('materiales_extras')
                .where('cantidad_disponible', '>=', 5)
                .first();
            
            if (materialAlternativo) {
                console.log(`✅ Encontrado material alternativo: ID ${materialAlternativo.id_item} con ${materialAlternativo.cantidad_disponible} disponibles`);
                material = materialAlternativo;
                materialId = materialAlternativo.id_item;
            } else {
                console.log('❌ No se encontró ningún material con stock suficiente');
                return;
            }
        }
        
        // 2. Crear orden de producción con la nueva lógica
        console.log('\n🔄 Creando orden de producción...');
        const [{ id_op }] = await db('orden_produccion').insert({
            cliente: 'Prueba Lógica Corregida',
            observaciones: 'Orden de prueba para verificar lógica corregida',
            prioridad: 'media',
            fecha_inicio: new Date(),
            fecha_fin: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            estado: 'en_proceso',
            fecha_op: new Date(),
            fecha_creacion: new Date(),
            numero_op: `TEST-LOGIC-${Date.now()}`
        }).returning('id_op');
        idOp = id_op;
        
        // 3. Procesar paño usando la nueva función
        console.log('\n📏 Procesando paño con nueva función...');
        await db.raw('SELECT fn_procesar_pano_orden(?, ?, ?, ?, ?)', [
            idOp,
            panoId,
            2.0, // largo_tomar
            1.5, // ancho_tomar
            1    // cantidad
        ]);
        
        // 4. Procesar material extra usando la nueva función
        console.log('\n📦 Procesando material extra con nueva función...');
        await db.raw('SELECT fn_procesar_material_extra_orden(?, ?, ?)', [
            idOp,
            materialId,
            5 // cantidad
        ]);
        
        // 5. Procesar herramienta
        console.log('\n🔧 Procesando herramienta...');
        await db('herramienta_ordenada').insert({
            id_op: idOp,
            id_item: herramientaId,
            tipo_movimiento: 'ASIGNACION',
            cantidad: 1,
            notas: 'Prueba herramienta'
        });
        
        // 6. Verificar que se crearon los registros correctamente
        console.log('\n📊 Verificando registros creados...');
        
        // Verificar detalles de paño (deberían ser 2 registros: largo y ancho)
        const detallesPano = await db('orden_produccion_detalle')
            .where('id_op', idOp)
            .where('tipo_item', 'PANO')
            .orderBy('id_detalle');
        
        console.log(`✅ Registros de paño creados: ${detallesPano.length}`);
        detallesPano.forEach((detalle, index) => {
            console.log(`   ${index + 1}. Cantidad: ${detalle.cantidad}m, Notas: ${detalle.notas}`);
        });
        
        // Verificar detalles de material
        const detallesMaterial = await db('orden_produccion_detalle')
            .where('id_op', idOp)
            .where('tipo_item', 'EXTRA');
        
        console.log(`✅ Registros de material creados: ${detallesMaterial.length}`);
        detallesMaterial.forEach(detalle => {
            console.log(`   Cantidad: ${detalle.cantidad}, Notas: ${detalle.notas}`);
        });
        
        // Verificar herramientas
        const herramientas = await db('herramienta_ordenada')
            .where('id_op', idOp);
        
        console.log(`✅ Herramientas asignadas: ${herramientas.length}`);
        
        // 7. Verificar que se descontó el inventario
        console.log('\n📉 Verificando descuento de inventario...');
        
        const panoDespues = await db('pano').where('id_item', panoId).first();
        const materialDespues = await db('materiales_extras').where('id_item', materialId).first();
        
        console.log(`📏 Paño - Largo: ${pano.largo_m} → ${panoDespues.largo_m} (diferencia: ${pano.largo_m - panoDespues.largo_m}m)`);
        console.log(`📏 Paño - Ancho: ${pano.ancho_m} → ${panoDespues.ancho_m} (diferencia: ${pano.ancho_m - panoDespues.ancho_m}m)`);
        console.log(`📦 Material: ${material.cantidad_disponible} → ${materialDespues.cantidad_disponible} (diferencia: ${material.cantidad_disponible - materialDespues.cantidad_disponible})`);
        
        // 8. Verificar movimientos de inventario
        console.log('\n📋 Verificando movimientos de inventario...');
        const movimientos = await db('movimiento_inventario')
            .where('id_op', idOp)
            .orderBy('fecha');
        
        console.log(`✅ Movimientos registrados: ${movimientos.length}`);
        movimientos.forEach(mov => {
            console.log(`   ${mov.tipo_mov}: ${mov.cantidad} ${mov.unidad} - ${mov.notas}`);
        });
        
        // 9. Probar cancelación y restauración
        console.log('\n🔄 Probando cancelación y restauración...');
        await db('orden_produccion').where('id_op', idOp).update({ estado: 'cancelada' });
        
        // Esperar un poco para que el trigger se ejecute
        console.log('⏳ Esperando que se ejecute el trigger de restauración...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verificar que se restauró el inventario
        const panoRestaurado = await db('pano').where('id_item', panoId).first();
        const materialRestaurado = await db('materiales_extras').where('id_item', materialId).first();
        
        console.log(`📏 Paño restaurado - Largo: ${panoRestaurado.largo_m}, Ancho: ${panoRestaurado.ancho_m}`);
        console.log(`📦 Material restaurado: ${materialRestaurado.cantidad_disponible}`);
        
        console.log(`✅ ¿Paño restaurado correctamente? ${panoRestaurado.largo_m === pano.largo_m && panoRestaurado.ancho_m === pano.ancho_m ? 'SÍ' : 'NO'}`);
        console.log(`✅ ¿Material restaurado correctamente? ${materialRestaurado.cantidad_disponible === material.cantidad_disponible ? 'SÍ' : 'NO'}`);
        
        // 10. Verificar que se eliminaron los detalles
        const detallesRestantes = await db('orden_produccion_detalle')
            .where('id_op', idOp)
            .count('* as total');
        
        console.log(`🗑️  Detalles restantes después de cancelar: ${detallesRestantes[0].total}`);
        
        console.log('\n🎉 Prueba completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
        logger.error('Error en prueba de lógica corregida:', error);
    } finally {
        // Limpiar timeout
        clearTimeout(timeout);
        
        // Limpiar datos de prueba
        if (idOp) {
            try {
                await db('herramienta_ordenada').where('id_op', idOp).del();
                await db('orden_produccion_detalle').where('id_op', idOp).del();
                await db('orden_produccion').where('id_op', idOp).del();
                await db('movimiento_inventario').where('id_op', idOp).del();
                console.log('🧹 Datos de prueba eliminados correctamente');
            } catch (cleanupError) {
                console.error('⚠️ Error limpiando datos de prueba:', cleanupError.message);
            }
        }
        
        try {
            await db.destroy();
            console.log('🔌 Conexión a base de datos cerrada');
        } catch (closeError) {
            console.error('⚠️ Error cerrando conexión:', closeError.message);
        }
    }
}

testLogicaCorregida(); 