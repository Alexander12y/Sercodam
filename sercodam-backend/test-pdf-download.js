// Cargar variables de entorno
require('dotenv').config();

const db = require('./src/config/database');
const logger = require('./src/config/logger');
const pdfService = require('./src/services/pdfService');
const fs = require('fs');
const path = require('path');

async function testPDFDownload() {
    console.log('🔍 Probando generación y descarga de PDF...');
    
    let idOp = null;
    
    try {
        // 0. Verificar conexión
        console.log('\n🔌 Verificando conexión...');
        await db.raw('SELECT 1');
        console.log('✅ Conexión establecida');
        
        // 1. Crear una orden de prueba
        console.log('\n🔄 Creando orden de prueba...');
        const [{ id_op }] = await db('orden_produccion').insert({
            cliente: 'Prueba PDF',
            observaciones: 'Orden para probar generación y descarga de PDF',
            prioridad: 'media',
            fecha_inicio: new Date(),
            fecha_fin: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
            estado: 'en_proceso',
            fecha_op: new Date(),
            fecha_creacion: new Date(),
            numero_op: `TEST-PDF-${Date.now()}`
        }).returning('id_op');
        idOp = id_op;
        console.log(`✅ Orden creada con ID: ${idOp}`);
        
        // 2. Agregar algunos detalles de prueba
        console.log('\n📝 Agregando detalles de prueba...');
        
        // Agregar un paño
        await db.raw('SELECT fn_procesar_pano_orden(?, ?, ?, ?, ?)', [
            idOp,
            562, // ID del paño
            2.0, // largo
            1.5, // ancho
            1    // cantidad
        ]);
        
        // Agregar un material
        await db.raw('SELECT fn_procesar_material_extra_orden(?, ?, ?)', [
            idOp,
            1, // ID del material
            3  // cantidad
        ]);
        
        console.log('✅ Detalles agregados');
        
        // 3. Obtener datos completos de la orden
        console.log('\n📊 Obteniendo datos completos de la orden...');
        const orden = await db('orden_produccion')
            .where('id_op', idOp)
            .first();
            
        // Obtener paños
        const panos = await db('orden_produccion_detalle as opd')
            .leftJoin('pano as p', 'opd.id_item', 'p.id_item')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where('opd.id_op', idOp)
            .where('opd.tipo_item', 'PANO')
            .select(
                'opd.*',
                'p.largo_m',
                'p.ancho_m',
                'p.area_m2',
                'p.precio_x_unidad',
                'rp.tipo_red'
            );
            
        // Obtener materiales
        const materiales = await db('orden_produccion_detalle as opd')
            .leftJoin('materiales_extras as me', 'opd.id_item', 'me.id_item')
            .where('opd.id_op', idOp)
            .where('opd.tipo_item', 'EXTRA')
            .select(
                'opd.*',
                'me.descripcion',
                'me.categoria',
                'me.unidad',
                'me.precioxunidad'
            );
            
        const ordenData = {
            ...orden,
            panos: panos.map(pano => ({
                largo_m: pano.largo_m,
                ancho_m: pano.ancho_m,
                cantidad: pano.cantidad,
                tipo_red: pano.tipo_red || 'nylon',
                area_m2: pano.area_m2,
                precio_m2: pano.precio_x_unidad
            })),
            materiales: materiales.map(material => ({
                descripcion: material.descripcion || 'Material',
                categoria: material.categoria || 'General',
                cantidad: material.cantidad || 0,
                unidad: material.unidad || 'unidad',
                precioxunidad: material.precioxunidad || 0
            }))
        };
        
        console.log(`✅ Datos obtenidos: ${panos.length} paños, ${materiales.length} materiales`);
        
        // 4. Generar PDF
        console.log('\n📄 Generando PDF...');
        const { filepath, filename } = await pdfService.generateOrdenProduccionPDF(ordenData);
        console.log(`✅ PDF generado: ${filename}`);
        console.log(`📁 Ruta: ${filepath}`);
        
        // 5. Verificar que el archivo existe
        console.log('\n🔍 Verificando archivo generado...');
        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            console.log(`✅ Archivo existe, tamaño: ${stats.size} bytes`);
        } else {
            console.log('❌ Archivo no encontrado');
        }
        
        // 6. Probar búsqueda por ID de orden
        console.log('\n🔍 Probando búsqueda de PDF por ID...');
        const pdfInfo = pdfService.findPDFByOrderId(idOp);
        if (pdfInfo) {
            console.log(`✅ PDF encontrado: ${pdfInfo.filename}`);
            console.log(`📁 Ruta: ${pdfInfo.filepath}`);
        } else {
            console.log('❌ PDF no encontrado por ID');
        }
        
        // 7. Listar archivos en directorio temp
        console.log('\n📋 Archivos en directorio temp:');
        const tempDir = path.join(__dirname, 'temp');
        if (fs.existsSync(tempDir)) {
            const files = fs.readdirSync(tempDir);
            const pdfFiles = files.filter(f => f.endsWith('.pdf'));
            pdfFiles.forEach(file => {
                const filepath = path.join(tempDir, file);
                const stats = fs.statSync(filepath);
                console.log(`   📄 ${file} (${stats.size} bytes)`);
            });
        } else {
            console.log('❌ Directorio temp no existe');
        }
        
        console.log('\n🎉 Prueba completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
        logger.error('Error en prueba de PDF:', error);
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

testPDFDownload(); 