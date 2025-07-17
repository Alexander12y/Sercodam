const db = require('./src/config/database');
const pdfService = require('./src/services/pdfService');
const logger = require('./src/config/logger');

async function testPDFDirect() {
    try {
        console.log('🔍 Probando generación directa de PDF...');
        
        // Verificar conexión
        await db.raw('SELECT 1');
        console.log('✅ Conexión a BD establecida');
        
        // Buscar una orden existente
        const orden = await db('orden_produccion').first();
        if (!orden) {
            console.log('❌ No hay órdenes en la base de datos');
            return;
        }
        
        console.log(`📋 Orden encontrada: ${orden.numero_op} (ID: ${orden.id_op})`);
        
        // Obtener detalles de paños
        const panos = await db('orden_produccion_detalle as opd')
            .leftJoin('pano as p', 'opd.id_item', 'p.id_item')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
            .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
            .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
            .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
            .where('opd.id_op', orden.id_op)
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
                'n.calibre as nylon_calibre',
                'n.cuadro as nylon_cuadro',
                'n.torsion as nylon_torsion',
                'n.refuerzo as nylon_refuerzo',
                'l.color as lona_color',
                'l.presentacion as lona_presentacion',
                'pp.grosor as polipropileno_grosor',
                'pp.cuadro as polipropileno_cuadro',
                'ms.color_tipo_red as malla_color_tipo_red',
                'ms.presentacion as malla_presentacion'
            );
        
        console.log(`📏 Paños encontrados: ${panos.length}`);
        
        // Obtener datos de cortes
        const cutJobs = await db('trabajo_corte').where('id_op', orden.id_op).select('*');
        console.log(`✂️ Trabajos de corte encontrados: ${cutJobs.length}`);
        
        for (const job of cutJobs) {
            job.plans = await db('plan_corte_pieza').where('job_id', job.job_id).select('*');
            console.log(`  - Job ${job.job_id}: ${job.plans.length} planes de corte`);
        }
        
        // Agrupar paños por id_item para combinar largo y ancho
        const panosAgrupados = {};
        panos.forEach(pano => {
            const id_item = pano.id_item;
            if (!panosAgrupados[id_item]) {
                panosAgrupados[id_item] = {
                    id_item,
                    tipo_red: pano.tipo_red,
                    precio_x_unidad: pano.precio_x_unidad,
                    registros: [],
                    nylon_calibre: pano.nylon_calibre,
                    nylon_cuadro: pano.nylon_cuadro,
                    nylon_torsion: pano.nylon_torsion,
                    nylon_refuerzo: pano.nylon_refuerzo,
                    lona_color: pano.lona_color,
                    lona_presentacion: pano.lona_presentacion,
                    polipropileno_grosor: pano.polipropileno_grosor,
                    polipropileno_cuadro: pano.polipropileno_cuadro,
                    malla_color_tipo_red: pano.malla_color_tipo_red,
                    malla_presentacion: pano.malla_presentacion
                };
            }
            panosAgrupados[id_item].registros.push(pano);
        });
        
        // Procesar cada grupo de paños para extraer dimensiones
        const panosParaPDF = [];
        Object.values(panosAgrupados).forEach(grupo => {
            let largo_solicitado = 0;
            let ancho_solicitado = 0;
            
            grupo.registros.forEach(registro => {
                const notas = registro.notas || '';
                const cantidad = registro.cantidad || 0;
                
                if (notas.includes('largo')) {
                    largo_solicitado = cantidad;
                } else if (notas.includes('ancho')) {
                    ancho_solicitado = cantidad;
                }
            });
            
            if (largo_solicitado > 0 && ancho_solicitado > 0) {
                let calibre, cuadro, torsion, refuerzo, color, presentacion, grosor, color_tipo_red;
                switch ((grupo.tipo_red || '').toLowerCase()) {
                    case 'nylon':
                        calibre = grupo.nylon_calibre;
                        cuadro = grupo.nylon_cuadro;
                        torsion = grupo.nylon_torsion;
                        refuerzo = grupo.nylon_refuerzo;
                        break;
                    case 'lona':
                        color = grupo.lona_color;
                        presentacion = grupo.lona_presentacion;
                        break;
                    case 'polipropileno':
                        grosor = grupo.polipropileno_grosor;
                        cuadro = grupo.polipropileno_cuadro;
                        break;
                    case 'malla sombra':
                        color_tipo_red = grupo.malla_color_tipo_red;
                        presentacion = grupo.malla_presentacion;
                        break;
                }
                
                panosParaPDF.push({
                    id_item: grupo.id_item,
                    largo_m: largo_solicitado,
                    ancho_m: ancho_solicitado,
                    cantidad: 1,
                    tipo_red: grupo.tipo_red || 'nylon',
                    area_m2: largo_solicitado * ancho_solicitado,
                    precio_m2: grupo.precio_x_unidad,
                    calibre,
                    cuadro,
                    torsion,
                    refuerzo,
                    color,
                    presentacion,
                    grosor,
                    color_tipo_red
                });
            }
        });
        
        console.log(`📋 Paños procesados para PDF: ${panosParaPDF.length}`);
        panosParaPDF.forEach(pano => {
            console.log(`  - ${pano.largo_m}m x ${pano.ancho_m}m = ${pano.area_m2}m²`);
        });
        
        // Preparar datos para el PDF
        const ordenData = {
            ...orden,
            panos: panosParaPDF,
            materiales: [],
            herramientas: [],
            cuts: cutJobs.map(job => ({
                id_item: job.id_item,
                altura_req: job.altura_req,
                ancho_req: job.ancho_req,
                plans: job.plans.map(plan => ({
                    rol_pieza: plan.rol_pieza,
                    altura_plan: plan.altura_plan,
                    ancho_plan: plan.ancho_plan,
                    seq: plan.seq
                }))
            }))
        };
        
        console.log(`✂️ Cortes para PDF: ${ordenData.cuts.length}`);
        ordenData.cuts.forEach(cut => {
            console.log(`  - Paño ${cut.id_item}: ${cut.altura_req}m x ${cut.ancho_req}m`);
            cut.plans.forEach(plan => {
                console.log(`    * ${plan.rol_pieza}: ${plan.altura_plan}m x ${plan.ancho_plan}m`);
            });
        });
        
        // Generar PDF
        console.log('\n📄 Generando PDF...');
        const { filepath, filename } = await pdfService.generateOrdenProduccionPDF(ordenData);
        
        console.log(`✅ PDF generado: ${filename}`);
        console.log(`📁 Ruta: ${filepath}`);
        
        // Verificar que el archivo existe y tiene contenido
        const fs = require('fs');
        const stats = fs.statSync(filepath);
        console.log(`📊 Tamaño del archivo: ${stats.size} bytes`);
        
        if (stats.size > 0) {
            console.log('✅ PDF generado correctamente con contenido');
        } else {
            console.log('❌ PDF está vacío');
        }
        
    } catch (error) {
        console.error('❌ Error en prueba directa de PDF:', error);
        logger.error('Error en prueba directa de PDF:', error);
    } finally {
        await db.destroy();
        console.log('🔌 Conexión cerrada');
    }
}

console.log('🚀 Iniciando prueba directa de PDF...\n');
testPDFDirect(); 