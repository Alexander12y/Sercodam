// Cargar variables de entorno
require('dotenv').config();

const db = require('./src/config/database');
const logger = require('./src/config/logger');

async function testPDFData() {
    console.log('🔍 Verificando datos para PDF...');
    
    let idOp = null;
    
    try {
        // 0. Verificar conexión
        console.log('\n🔌 Verificando conexión...');
        await db.raw('SELECT 1');
        console.log('✅ Conexión establecida');
        
        // 1. Obtener una orden existente con datos
        console.log('\n📋 Buscando orden con datos...');
        const ordenes = await db('orden_produccion')
            .select('*')
            .limit(5);
            
        if (ordenes.length === 0) {
            console.log('❌ No hay órdenes disponibles');
            return;
        }
        
        // Buscar una orden que tenga paños y materiales
        let ordenConDatos = null;
        for (const orden of ordenes) {
            const panos = await db('orden_produccion_detalle')
                .where('id_op', orden.id_op)
                .where('tipo_item', 'PANO')
                .count('* as count');
                
            const materiales = await db('orden_produccion_detalle')
                .where('id_op', orden.id_op)
                .where('tipo_item', 'EXTRA')
                .count('* as count');
                
            if (panos[0].count > 0 || materiales[0].count > 0) {
                ordenConDatos = orden;
                break;
            }
        }
        
        if (!ordenConDatos) {
            console.log('❌ No se encontró orden con datos');
            return;
        }
        
        idOp = ordenConDatos.id_op;
        console.log(`✅ Usando orden: ${ordenConDatos.numero_op} (ID: ${idOp})`);
        
        // 2. Obtener datos completos como lo hace el controlador
        console.log('\n📊 Obteniendo datos completos...');
        
        // Obtener orden básica
        const orden = await db('orden_produccion as op')
            .where('op.id_op', idOp)
            .select('op.*')
            .first();
            
        console.log('✅ Orden básica obtenida');
        
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
        panos.forEach((pano, idx) => {
            console.log(`   Paño ${idx + 1}: ${pano.largo_m}m x ${pano.ancho_m}m = ${pano.area_m2}m², Cantidad: ${pano.cantidad}, Tipo: ${pano.tipo_red}`);
        });
        
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
        materiales.forEach((material, idx) => {
            console.log(`   Material ${idx + 1}: ${material.descripcion}, Cantidad: ${material.cantidad} ${material.unidad}, Precio: $${material.precioxunidad}`);
        });
        
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
        herramientas.forEach((herramienta, idx) => {
            console.log(`   Herramienta ${idx + 1}: ${herramienta.descripcion}, Cantidad: ${herramienta.cantidad}`);
        });
        
        // 3. Preparar datos para el PDF como lo hace el controlador
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
        
        // 4. Mostrar datos preparados
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
        
        // Mostrar detalles de materiales
        if (ordenData.materiales.length > 0) {
            console.log('\n🔧 Detalles de materiales:');
            ordenData.materiales.forEach((material, idx) => {
                console.log(`   Material ${idx + 1}:`);
                console.log(`     Descripción: ${material.descripcion}`);
                console.log(`     Cantidad: ${material.cantidad} ${material.unidad}`);
                console.log(`     Precio unitario: $${material.precio_unitario}`);
                console.log(`     Precio total: $${material.precio_total}`);
            });
        }
        
        // Mostrar detalles de herramientas
        if (ordenData.herramientas.length > 0) {
            console.log('\n🛠️ Detalles de herramientas:');
            ordenData.herramientas.forEach((herramienta, idx) => {
                console.log(`   Herramienta ${idx + 1}:`);
                console.log(`     Nombre: ${herramienta.nombre}`);
                console.log(`     Descripción: ${herramienta.descripcion}`);
                console.log(`     Cantidad: ${herramienta.cantidad}`);
            });
        }
        
        // 5. Calcular totales
        console.log('\n💰 Cálculo de totales:');
        let totalAreaPaños = 0;
        let totalPrecioPaños = 0;
        
        ordenData.panos.forEach(pano => {
            const area = Number(pano.largo_m) * Number(pano.ancho_m) * Number(pano.cantidad);
            const precio = area * Number(pano.precio_m2);
            totalAreaPaños += area;
            totalPrecioPaños += precio;
            console.log(`   Paño: ${pano.largo_m}m x ${pano.ancho_m}m x ${pano.cantidad} = ${area.toFixed(2)}m² = $${precio.toFixed(2)}`);
        });
        
        let totalMateriales = 0;
        ordenData.materiales.forEach(material => {
            const subtotal = Number(material.cantidad) * Number(material.precio_unitario);
            totalMateriales += subtotal;
            console.log(`   Material: ${material.cantidad} x $${material.precio_unitario} = $${subtotal.toFixed(2)}`);
        });
        
        const subtotalGeneral = totalPrecioPaños + totalMateriales;
        const iva = subtotalGeneral * 0.16;
        const totalGeneral = subtotalGeneral + iva;
        
        console.log(`\n   Total área paños: ${totalAreaPaños.toFixed(2)}m²`);
        console.log(`   Subtotal paños: $${totalPrecioPaños.toFixed(2)}`);
        console.log(`   Subtotal materiales: $${totalMateriales.toFixed(2)}`);
        console.log(`   IVA (16%): $${iva.toFixed(2)}`);
        console.log(`   Total general: $${totalGeneral.toFixed(2)}`);
        
        console.log('\n🎉 Verificación de datos completada');
        
    } catch (error) {
        console.error('❌ Error en la verificación:', error);
        logger.error('Error en verificación de datos PDF:', error);
    } finally {
        try {
            await db.destroy();
            console.log('🔌 Conexión cerrada');
        } catch (closeError) {
            console.error('⚠️ Error cerrando conexión:', closeError.message);
        }
    }
}

testPDFData(); 