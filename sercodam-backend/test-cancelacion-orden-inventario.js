const db = require('./src/config/database');
const logger = require('./src/config/logger');

async function testCancelacionOrdenInventario() {
    console.log('🧪 Iniciando prueba de cancelación de orden y restauración de inventario...');
    const panoId = 562;
    const materialId = 1;
    const herramientaId = 274;
    let idOp = null;
    let panoAntes = null;
    let materialAntes = null;
    try {
        // 1. Leer inventario original
        const pano = await db('pano').where('id_item', panoId).first();
        const material = await db('materiales_extras').where('id_item', materialId).first();
        const herramienta = await db('herramientas').where('id_item', herramientaId).first();
        if (!pano || !material || !herramienta) {
            console.log('❌ No se encontró paño, material o herramienta con los IDs indicados.');
            return;
        }
        panoAntes = { ...pano };
        materialAntes = { ...material };
        console.log(`\nInventario original:`);
        console.log(`- Paño area_m2: ${panoAntes.area_m2}`);
        console.log(`- Material cantidad_disponible: ${materialAntes.cantidad_disponible}`);
        console.log(`- Herramienta cantidad_disponible: ${herramienta.cantidad_disponible}`);

        // 2. Crear orden de producción
        const [{ id_op }] = await db('orden_produccion').insert({
            cliente: 'Prueba Cancelación',
            observaciones: 'Orden de prueba para cancelación',
            prioridad: 'media',
            fecha_inicio: new Date(),
            fecha_fin: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            estado: 'en_proceso',
            fecha_op: new Date(),
            fecha_creacion: new Date(),
            numero_op: `TEST-CANCEL-${Date.now()}`
        }).returning('id_op');
        idOp = id_op;
        await db('orden_produccion_detalle').insert({
            id_op,
            id_item: panoId,
            tipo_item: 'PANO',
            cantidad: 1,
            largo_tomar: pano.largo_m,
            ancho_tomar: pano.ancho_m,
            area_tomar: pano.largo_m * pano.ancho_m,
            notas: 'Prueba paño',
            estado: 'en_proceso'
        });
        await db('orden_produccion_detalle').insert({
            id_op,
            id_item: materialId,
            tipo_item: 'EXTRA',
            cantidad: 1,
            notas: 'Prueba material',
            estado: 'en_proceso'
        });
        await db('herramienta_ordenada').insert({
            id_op,
            id_item: herramientaId,
            tipo_movimiento: 'ASIGNACION',
            cantidad: 1,
            notas: 'Prueba herramienta',
            estado: 'en_proceso'
        });
        // Descontar stock manualmente (simula lógica real)
        await db('pano').where('id_item', panoId).decrement('area_m2', pano.largo_m * pano.ancho_m);
        await db('materiales_extras').where('id_item', materialId).decrement('cantidad_disponible', 1);

        // 3. Inventario después de crear la orden
        const panoDespues = await db('pano').where('id_item', panoId).first();
        const materialDespues = await db('materiales_extras').where('id_item', materialId).first();
        const herramientaDespues = await db('herramientas').where('id_item', herramientaId).first();
        console.log(`\nInventario después de crear la orden:`);
        console.log(`- Paño area_m2: ${panoDespues.area_m2}`);
        console.log(`- Material cantidad_disponible: ${materialDespues.cantidad_disponible}`);
        console.log(`- Herramienta cantidad_disponible: ${herramientaDespues.cantidad_disponible}`);

        // 4. Cambiar estado a 'cancelada' (esto debe restaurar inventario)
        await db('orden_produccion').where('id_op', idOp).update({ estado: 'cancelada' });
        // Esperar un poco para que el trigger/restauración se ejecute
        await new Promise(res => setTimeout(res, 1000));

        // 5. Inventario después de cancelar la orden
        const panoFinal = await db('pano').where('id_item', panoId).first();
        const materialFinal = await db('materiales_extras').where('id_item', materialId).first();
        const herramientaFinal = await db('herramientas').where('id_item', herramientaId).first();
        console.log(`\nInventario después de cancelar la orden:`);
        console.log(`- Paño area_m2: ${panoFinal.area_m2}`);
        console.log(`- Material cantidad_disponible: ${materialFinal.cantidad_disponible}`);
        console.log(`- Herramienta cantidad_disponible: ${herramientaFinal.cantidad_disponible}`);
        console.log(`\n¿Paño restaurado? ${panoFinal.area_m2 === panoAntes.area_m2 ? '✅ SÍ' : '❌ NO'}`);
        console.log(`¿Material restaurado? ${materialFinal.cantidad_disponible === materialAntes.cantidad_disponible ? '✅ SÍ' : '❌ NO'}`);
        console.log(`¿Herramienta igual? ${herramientaFinal.cantidad_disponible === herramienta.cantidad_disponible ? '✅ SÍ' : '❌ NO (debería ser igual)'}`);
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
        logger.error('Error en prueba de cancelación de orden:', error);
    } finally {
        // Limpiar datos de prueba
        if (idOp) {
            await db('herramienta_ordenada').where('id_op', idOp).del();
            await db('orden_produccion_detalle').where('id_op', idOp).del();
            await db('orden_produccion').where('id_op', idOp).del();
        }
        await db.destroy();
        console.log('\n🧹 Datos de prueba eliminados y conexión cerrada.');
    }
}

testCancelacionOrdenInventario(); 