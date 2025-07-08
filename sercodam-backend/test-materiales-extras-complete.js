const db = require('./src/config/database');
const logger = require('./src/config/logger');

async function testMaterialesExtrasComplete() {
    console.log('🧪 Iniciando prueba completa de materiales extras...');
    
    try {
        // 1. Verificar que las funciones existen
        console.log('\n1. Verificando funciones...');
        const functions = [
            'fn_generar_nota_material_extra',
            'fn_restaurar_inventario_materiales_cancelada',
            'fn_restaurar_inventario_completo_cancelada'
        ];
        
        for (const funcName of functions) {
            const result = await db.raw(`
                SELECT routine_name 
                FROM information_schema.routines 
                WHERE routine_name = ? AND routine_schema = 'catalogo_1'
            `, [funcName]);
            
            if (result.rows.length > 0) {
                console.log(`✅ ${funcName} existe`);
            } else {
                console.log(`❌ ${funcName} NO existe`);
            }
        }
        
        // 2. Probar función de generación de notas
        console.log('\n2. Probando generación de notas...');
        const testNota = await db.raw('SELECT fn_generar_nota_material_extra(?, ?) as nota', [1, 5]);
        console.log('📝 Nota generada:', testNota.rows[0]?.nota || 'Error');
        
        // 3. Verificar materiales extras disponibles
        console.log('\n3. Verificando materiales extras disponibles...');
        const materiales = await db('materiales_extras')
            .select('id_item', 'descripcion', 'cantidad_disponible', 'unidad')
            .limit(3);
        
        console.log('📦 Materiales disponibles:', materiales.length);
        materiales.forEach(m => {
            console.log(`   - ID: ${m.id_item}, ${m.descripcion} (${m.cantidad_disponible} ${m.unidad})`);
        });
        
        if (materiales.length === 0) {
            console.log('⚠️  No hay materiales extras para probar');
            return;
        }
        
        // 4. Crear una orden de prueba con materiales extras
        console.log('\n4. Creando orden de prueba...');
        const materialTest = materiales[0];
        const cantidadTest = Math.min(2, materialTest.cantidad_disponible);
        
        const ordenTest = await db('orden_produccion').insert({
            numero_op: 'TEST-MAT-' + Date.now(),
            fecha_op: new Date(),
            cliente: 'Cliente de Prueba',
            observaciones: 'Orden de prueba para materiales extras',
            prioridad: 'media',
            estado: 'en_proceso',
            fecha_creacion: new Date()
        }).returning('id_op');
        
        const idOp = ordenTest[0].id_op;
        console.log(`📋 Orden creada con ID: ${idOp}`);
        
        // 5. Agregar material extra a la orden
        console.log('\n5. Agregando material extra a la orden...');
        const notaGenerada = await db.raw('SELECT fn_generar_nota_material_extra(?, ?) as nota', [
            materialTest.id_item, 
            cantidadTest
        ]);
        
        await db('orden_produccion_detalle').insert({
            id_op: idOp,
            id_item: materialTest.id_item,
            tipo_item: 'EXTRA',
            cantidad: cantidadTest,
            catalogo: 'CATALOGO_2',
            estado: 'en_proceso',
            notas: notaGenerada.rows[0]?.nota || 'Nota de prueba'
        });
        
        console.log(`📝 Detalle agregado: ${cantidadTest} ${materialTest.unidad} de ${materialTest.descripcion}`);
        console.log(`📝 Nota generada: ${notaGenerada.rows[0]?.nota}`);
        
        // 6. Verificar que se descontó del inventario
        console.log('\n6. Verificando descuento de inventario...');
        const materialDespues = await db('materiales_extras')
            .where('id_item', materialTest.id_item)
            .select('cantidad_disponible')
            .first();
        
        console.log(`📊 Cantidad antes: ${materialTest.cantidad_disponible}`);
        console.log(`📊 Cantidad después: ${materialDespues.cantidad_disponible}`);
        console.log(`📊 Diferencia: ${materialTest.cantidad_disponible - materialDespues.cantidad_disponible}`);
        
        // 7. Cancelar la orden y verificar restauración
        console.log('\n7. Cancelando orden y verificando restauración...');
        await db('orden_produccion')
            .where('id_op', idOp)
            .update({ estado: 'cancelada' });
        
        // Ejecutar restauración manualmente
        await db.raw('SELECT fn_restaurar_inventario_materiales_cancelada(?)', [idOp]);
        
        // 8. Verificar que se restauró el inventario
        console.log('\n8. Verificando restauración de inventario...');
        const materialRestaurado = await db('materiales_extras')
            .where('id_item', materialTest.id_item)
            .select('cantidad_disponible')
            .first();
        
        console.log(`📊 Cantidad después de cancelar: ${materialRestaurado.cantidad_disponible}`);
        console.log(`📊 ¿Se restauró correctamente? ${materialRestaurado.cantidad_disponible === materialTest.cantidad_disponible ? '✅ SÍ' : '❌ NO'}`);
        
        // 9. Verificar que se eliminaron los detalles
        console.log('\n9. Verificando eliminación de detalles...');
        const detallesRestantes = await db('orden_produccion_detalle')
            .where('id_op', idOp)
            .where('tipo_item', 'EXTRA')
            .count('* as total');
        
        console.log(`🗑️  Detalles restantes: ${detallesRestantes[0].total}`);
        console.log(`🗑️  ¿Se eliminaron correctamente? ${detallesRestantes[0].total === '0' ? '✅ SÍ' : '❌ NO'}`);
        
        // 10. Limpiar datos de prueba
        console.log('\n10. Limpiando datos de prueba...');
        await db('orden_produccion').where('id_op', idOp).del();
        console.log('🧹 Datos de prueba eliminados');
        
        console.log('\n🎉 ¡Prueba completada exitosamente!');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
        logger.error('Error en prueba de materiales extras:', error);
    } finally {
        await db.destroy();
    }
}

// Ejecutar la prueba
testMaterialesExtrasComplete(); 