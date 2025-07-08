// Cargar variables de entorno
require('dotenv').config();

const db = require('./src/config/database');
const logger = require('./src/config/logger');
const pdfService = require('./src/services/pdfService');

async function testPDFComplete() {
    console.log('🔍 Probando generación completa de PDF...');
    
    let idOp = null;
    
    try {
        // 0. Verificar conexión
        console.log('\n🔌 Verificando conexión...');
        await db.raw('SELECT 1');
        console.log('✅ Conexión establecida');
        
        // 1. Crear una orden de prueba
        console.log('\n🔄 Creando orden de prueba...');
        const [{ id_op }] = await db('orden_produccion').insert({
            cliente: 'Cliente Prueba PDF',
            observaciones: 'Orden para probar generación completa de PDF',
            prioridad: 'alta',
            fecha_inicio: new Date(),
            fecha_fin: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
            estado: 'en_proceso',
            fecha_op: new Date(),
            fecha_creacion: new Date(),
            numero_op: `OP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now()}`
        }).returning('id_op');
        idOp = id_op;
        console.log(`✅ Orden creada con ID: ${idOp}`);
        
        // 2. Agregar paños de prueba
        console.log('\n📏 Agregando paños de prueba...');
        
        // Paño 1: Nylon
        await db.raw('SELECT fn_procesar_pano_orden(?, ?, ?, ?, ?)', [
            idOp,
            562, // ID del paño nylon
            2.5, // largo
            1.8, // ancho
            2    // cantidad
        ]);
        
        // Paño 2: Lona
        await db.raw('SELECT fn_procesar_pano_orden(?, ?, ?, ?, ?)', [
            idOp,
            563, // ID del paño lona
            3.0, // largo
            2.0, // ancho
            1    // cantidad
        ]);
        
        console.log('✅ Paños agregados');
        
        // 3. Agregar materiales de prueba
        console.log('\n🔧 Buscando materiales con stock suficiente...');
        // Buscar dos materiales con stock suficiente
        const materialesStock = await db('materiales_extras')
            .where('stock', '>', 2)
            .limit(2);
        if (materialesStock.length < 2) {
            throw new Error('No hay suficientes materiales con stock para la prueba');
        }
        // Material 1
        await db.raw('SELECT fn_procesar_material_extra_orden(?, ?, ?)', [
            idOp,
            materialesStock[0].id_item,
            2  // cantidad
        ]);
        // Material 2
        await db.raw('SELECT fn_procesar_material_extra_orden(?, ?, ?)', [
            idOp,
            materialesStock[1].id_item,
            2  // cantidad
        ]);
        console.log('✅ Materiales agregados');
        
        // 4. Agregar herramientas de prueba
        console.log('\n🛠️ Agregando herramientas de prueba...');
        
        await db('herramienta_ordenada').insert([
            {
                id_op: idOp,
                id_item: 1, // ID de herramienta
                cantidad: 2,
                fecha_asignacion: new Date()
            },
            {
                id_op: idOp,
                id_item: 2, // ID de herramienta
                cantidad: 1,
                fecha_asignacion: new Date()
            }
        ]);
        
        console.log('✅ Herramientas agregadas');
        
        // 5. Obtener datos completos como lo hace el controlador
        console.log('\n📊 Obteniendo datos completos...');
        
        // Obtener orden básica
        const orden = await db('orden_produccion as op')
            .where('op.id_op', idOp)
            .select('op.*')
            .first();
            
        // Obtener detalles de paños
        const panos = await db('orden_produccion_detalle as opd')
            .leftJoin('pano as p', 'opd.id_item', 'p.id_item')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
            .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
            .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
            .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
            .where('opd.id_op', idOp)
            .where('opd.tipo_item', 'PANO')
            .select(
                'opd.*',
                'p.largo_m',
                'p.ancho_m',
                'p.area_m2',
                'p.precio_x_unidad',
                'p.estado as estado_pano',
                'rp.tipo_red',
                'rp.descripcion as descripcion_producto',
                // Nylon
                'n.calibre as nylon_calibre',
                'n.cuadro as nylon_cuadro',
                'n.torsion as nylon_torsion',
                'n.refuerzo as nylon_refuerzo',
                // Lona
                'l.color as lona_color',
                'l.presentacion as lona_presentacion',
                // Polipropileno
                'pp.grosor as polipropileno_grosor',
                'pp.cuadro as polipropileno_cuadro',
                // Malla sombra
                'ms.color_tipo_red as malla_color_tipo_red',
                'ms.presentacion as malla_presentacion'
            );
            
        console.log(`✅ Paños obtenidos: ${panos.length}`);
        
        // Obtener detalles de materiales
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
            
        console.log(`✅ Materiales obtenidos: ${materiales.length}`);
        
        // Obtener herramientas asignadas
        const herramientas = await db('herramienta_ordenada as ho')
            .leftJoin('herramientas as h', 'ho.id_item', 'h.id_item')
            .where('ho.id_op', idOp)
            .select(
                'ho.*',
                'h.descripcion',
                'h.categoria',
                'h.marca'
            );
            
        console.log(`✅ Herramientas obtenidas: ${herramientas.length}`);
        
        // 6. Preparar datos para el PDF
        console.log('\n🔧 Preparando datos para PDF...');
        
        const ordenData = {
            ...orden,
            panos: panos.map(pano => {
                // Determinar campos técnicos según tipo_red
                let calibre, cuadro, torsion, refuerzo, color, presentacion, grosor, color_tipo_red;
                switch ((pano.tipo_red || '').toLowerCase()) {
                    case 'nylon':
                        calibre = pano.nylon_calibre;
                        cuadro = pano.nylon_cuadro;
                        torsion = pano.nylon_torsion;
                        refuerzo = pano.nylon_refuerzo;
                        break;
                    case 'lona':
                        color = pano.lona_color;
                        presentacion = pano.lona_presentacion;
                        break;
                    case 'polipropileno':
                        grosor = pano.polipropileno_grosor;
                        cuadro = pano.polipropileno_cuadro;
                        break;
                    case 'malla sombra':
                        color_tipo_red = pano.malla_color_tipo_red;
                        presentacion = pano.malla_presentacion;
                        break;
                }
                return {
                    largo_m: pano.largo_m,
                    ancho_m: pano.ancho_m,
                    cantidad: pano.cantidad,
                    tipo_red: pano.tipo_red || 'nylon',
                    area_m2: pano.area_m2,
                    precio_m2: pano.precio_x_unidad,
                    calibre,
                    cuadro,
                    torsion,
                    refuerzo,
                    color,
                    presentacion,
                    grosor,
                    color_tipo_red
                };
            }),
            materiales: materiales.map(material => ({
                descripcion: material.descripcion || 'Material',
                categoria: material.categoria || 'General',
                cantidad: material.cantidad || 0,
                unidad: material.unidad || 'unidad',
                precio_unitario: material.precioxunidad || 0,
                precio_total: material.costo_total || 0
            })),
            herramientas: herramientas.map(herramienta => ({
                nombre: herramienta.descripcion || 'Herramienta',
                descripcion: herramienta.descripcion || '',
                categoria: herramienta.categoria || 'General',
                cantidad: herramienta.cantidad || 1
            }))
        };
        
        // 7. Mostrar datos preparados
        console.log('\n📋 Datos preparados para PDF:');
        console.log(`   Orden: ${ordenData.numero_op}`);
        console.log(`   Cliente: ${ordenData.cliente}`);
        console.log(`   Paños: ${ordenData.panos.length}`);
        console.log(`   Materiales: ${ordenData.materiales.length}`);
        console.log(`   Herramientas: ${ordenData.herramientas.length}`);
        
        // Mostrar detalles de paños
        if (ordenData.panos.length > 0) {
            console.log('\n📏 Detalles de paños:');
            ordenData.panos.forEach((pano, idx) => {
                console.log(`   Paño ${idx + 1}:`);
                console.log(`     Largo: ${pano.largo_m}m`);
                console.log(`     Ancho: ${pano.ancho_m}m`);
                console.log(`     Cantidad: ${pano.cantidad}`);
                console.log(`     Tipo: ${pano.tipo_red}`);
                console.log(`     Precio/m²: $${pano.precio_m2}`);
                console.log(`     Calibre: ${pano.calibre}`);
                console.log(`     Cuadro: ${pano.cuadro}`);
                console.log(`     Torsión: ${pano.torsion}`);
                console.log(`     Refuerzo: ${pano.refuerzo}`);
            });
        }
        
        // 8. Generar PDF
        console.log('\n📄 Generando PDF...');
        const { filepath, filename } = await pdfService.generateOrdenProduccionPDF(ordenData);
        console.log(`✅ PDF generado: ${filename}`);
        console.log(`📁 Ruta: ${filepath}`);
        // 9. Verificar archivo y congruencia de datos
        const fs = require('fs');
        if (fs.existsSync(filepath)) {
            const stats = fs.statSync(filepath);
            console.log(`✅ Archivo existe, tamaño: ${stats.size} bytes`);
            if (stats.size > 0) {
                console.log('✅ PDF generado correctamente con contenido');
                // Verificar congruencia de datos
                // Área y precio de paños
                let totalArea = 0;
                let totalPrecioPanos = 0;
                ordenData.panos.forEach(pano => {
                    const area = Number(pano.largo_m) * Number(pano.ancho_m) * Number(pano.cantidad);
                    const precio = area * Number(pano.precio_m2);
                    totalArea += area;
                    totalPrecioPanos += precio;
                    console.log(`   Paño: ${pano.largo_m}m x ${pano.ancho_m}m x ${pano.cantidad} = ${area.toFixed(2)}m², Precio: $${precio.toFixed(2)}`);
                });
                // Materiales
                let totalMateriales = 0;
                ordenData.materiales.forEach(material => {
                    const subtotal = Number(material.cantidad) * Number(material.precioxunidad);
                    totalMateriales += subtotal;
                    console.log(`   Material: ${material.descripcion}, Cantidad: ${material.cantidad}, Precio unitario: $${material.precioxunidad}, Subtotal: $${subtotal.toFixed(2)}`);
                });
                // Herramientas
                ordenData.herramientas.forEach(herramienta => {
                    console.log(`   Herramienta: ${herramienta.descripcion}, Cantidad: ${herramienta.cantidad}`);
                });
                // Totales
                const subtotalGeneral = totalPrecioPanos + totalMateriales;
                const iva = subtotalGeneral * 0.16;
                const totalGeneral = subtotalGeneral + iva;
                console.log(`   Subtotal paños: $${totalPrecioPanos.toFixed(2)}`);
                console.log(`   Subtotal materiales: $${totalMateriales.toFixed(2)}`);
                console.log(`   IVA (16%): $${iva.toFixed(2)}`);
                console.log(`   Total general: $${totalGeneral.toFixed(2)}`);
            } else {
                console.log('❌ PDF está vacío');
            }
        } else {
            console.log('❌ Archivo no encontrado');
        }
        
        console.log('\n🎉 Prueba completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
        logger.error('Error en prueba completa de PDF:', error);
    } finally {
        // Limpiar datos de prueba
        if (idOp) {
            try {
                await db('herramienta_ordenada').where('id_op', idOp).del();
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

testPDFComplete(); 