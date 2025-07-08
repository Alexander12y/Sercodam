// Cargar variables de entorno
require('dotenv').config();

const db = require('./src/config/database');
const logger = require('./src/config/logger');

async function testOrdenDetalle() {
    console.log('🔍 Verificando tabla orden_produccion_detalle y generación de notas...');
    
    const panoId = 562; // Usar un paño existente
    const materialId = 1; // Usar un material existente
    let idOp = null;
    
    try {
        // 0. Verificar conexión
        console.log('\n🔌 Verificando conexión...');
        await db.raw('SELECT 1');
        console.log('✅ Conexión establecida');
        
        // 1. Verificar datos iniciales
        console.log('\n📋 Verificando datos iniciales...');
        const pano = await db('pano').where('id_item', panoId).first();
        const material = await db('materiales_extras').where('id_item', materialId).first();
        
        if (!pano || !material) {
            console.log('❌ No se encontraron los datos necesarios');
            return;
        }
        
        console.log(`✅ Paño ID ${panoId}: ${pano.largo_m}m x ${pano.ancho_m}m`);
        console.log(`✅ Material ID ${materialId}: ${material.cantidad_disponible} ${material.unidad} disponibles`);
        
        // 2. Verificar stock de material
        if (material.cantidad_disponible < 2) {
            console.log(`⚠️  Material no tiene suficiente stock (${material.cantidad_disponible} < 2)`);
            const materialAlternativo = await db('materiales_extras')
                .where('cantidad_disponible', '>=', 2)
                .first();
            
            if (materialAlternativo) {
                console.log(`✅ Usando material alternativo: ID ${materialAlternativo.id_item} con ${materialAlternativo.cantidad_disponible} disponibles`);
                material = materialAlternativo;
                materialId = materialAlternativo.id_item;
            } else {
                console.log('❌ No se encontró material con stock suficiente');
                return;
            }
        }
        
        // 3. Crear orden de producción
        console.log('\n🔄 Creando orden de producción...');
        const [{ id_op }] = await db('orden_produccion').insert({
            cliente: 'Prueba Detalle',
            observaciones: 'Orden para verificar tabla orden_produccion_detalle',
            prioridad: 'media',
            fecha_inicio: new Date(),
            fecha_fin: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            estado: 'en_proceso',
            fecha_op: new Date(),
            fecha_creacion: new Date(),
            numero_op: `TEST-DETALLE-${Date.now()}`
        }).returning('id_op');
        idOp = id_op;
        console.log(`✅ Orden creada con ID: ${idOp}`);
        
        // 4. Procesar paño
        console.log('\n📏 Procesando paño...');
        try {
            await db.raw('SELECT fn_procesar_pano_orden(?, ?, ?, ?, ?)', [
                idOp,
                panoId,
                1.5, // largo_tomar
                1.0, // ancho_tomar
                1    // cantidad
            ]);
            console.log('✅ Paño procesado correctamente');
        } catch (error) {
            console.error('❌ Error procesando paño:', error.message);
        }
        
        // 5. Procesar material
        console.log('\n📦 Procesando material...');
        try {
            await db.raw('SELECT fn_procesar_material_extra_orden(?, ?, ?)', [
                idOp,
                materialId,
                2 // cantidad
            ]);
            console.log('✅ Material procesado correctamente');
        } catch (error) {
            console.error('❌ Error procesando material:', error.message);
        }
        
        // 6. Verificar registros en orden_produccion_detalle
        console.log('\n📊 Verificando registros en orden_produccion_detalle...');
        
        const detalles = await db('orden_produccion_detalle')
            .where('id_op', idOp)
            .orderBy('id_detalle');
        
        console.log(`✅ Total de registros creados: ${detalles.length}`);
        
        detalles.forEach((detalle, index) => {
            console.log(`\n📝 Registro ${index + 1}:`);
            console.log(`   ID: ${detalle.id_detalle}`);
            console.log(`   ID Item: ${detalle.id_item}`);
            console.log(`   Tipo: ${detalle.tipo_item}`);
            console.log(`   Cantidad: ${detalle.cantidad}`);
            console.log(`   Catálogo: ${detalle.catalogo}`);
            console.log(`   Estado: ${detalle.estado}`);
            console.log(`   Notas: "${detalle.notas}"`);
        });
        
        // 7. Verificar estructura de la tabla
        console.log('\n🏗️  Verificando estructura de la tabla...');
        const columnas = await db.raw(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'orden_produccion_detalle' 
            AND table_schema = 'catalogo_1'
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Columnas de orden_produccion_detalle:');
        columnas.rows.forEach(col => {
            console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
        });
        
        // 8. Verificar que las columnas eliminadas ya no existen
        console.log('\n🗑️  Verificando que las columnas eliminadas no existen...');
        const columnasEliminadas = ['largo_tomar', 'ancho_tomar', 'area_tomar'];
        
        for (const columna of columnasEliminadas) {
            const existe = columnas.rows.some(col => col.column_name === columna);
            console.log(`   ${columna}: ${existe ? '❌ EXISTE (ERROR)' : '✅ NO EXISTE (CORRECTO)'}`);
        }
        
        // 9. Verificar autogeneración del campo catalogo
        console.log('\n🔧 Verificando autogeneración del campo catalogo...');
        const catalogosUsados = [...new Set(detalles.map(d => d.catalogo))];
        console.log(`   Catálogos utilizados: ${catalogosUsados.join(', ')}`);
        
        // 10. Verificar movimientos de inventario
        console.log('\n📋 Verificando movimientos de inventario...');
        const movimientos = await db('movimiento_inventario')
            .where('id_op', idOp)
            .orderBy('fecha');
        
        console.log(`✅ Movimientos registrados: ${movimientos.length}`);
        movimientos.forEach((mov, index) => {
            console.log(`   ${index + 1}. ${mov.tipo_mov}: ${mov.cantidad} ${mov.unidad} - ${mov.notas}`);
        });
        
        console.log('\n🎉 Verificación completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error en la verificación:', error);
        logger.error('Error en verificación de orden_produccion_detalle:', error);
    } finally {
        // Limpiar datos de prueba
        if (idOp) {
            try {
                await db('orden_produccion_detalle').where('id_op', idOp).del();
                await db('orden_produccion').where('id_op', idOp).del();
                await db('movimiento_inventario').where('id_op', idOp).del();
                console.log('\n🧹 Datos de prueba eliminados');
            } catch (cleanupError) {
                console.error('⚠️ Error limpiando datos:', cleanupError.message);
            }
        }
        
        try {
            await db.destroy();
            console.log('🔌 Conexión cerrada');
        } catch (closeError) {
            console.error('⚠️ Error cerrando conexión:', closeError.message);
        }
    }
}

testOrdenDetalle(); 