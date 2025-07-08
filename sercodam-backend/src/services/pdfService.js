const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

class PDFService {
    constructor() {
        this.fontPath = path.join(__dirname, '../../assets/fonts');
        this.outputPath = path.join(__dirname, '../../temp');
        
        // Crear directorio temporal si no existe
        if (!fs.existsSync(this.outputPath)) {
            try {
                fs.mkdirSync(this.outputPath, { recursive: true });
                logger.info('Directorio temporal creado:', this.outputPath);
            } catch (error) {
                logger.error('Error creando directorio temporal:', error);
                // Usar directorio temporal del sistema como fallback
                this.outputPath = require('os').tmpdir();
            }
        }
    }

    // Generar PDF de orden de producción
    async generateOrdenProduccionPDF(ordenData) {
        return new Promise((resolve, reject) => {
            let doc = null;
            let stream = null;
            try {
                if (!ordenData || !ordenData.numero_op) {
                    throw new Error('Datos de orden inválidos o faltantes');
                }
                
                logger.info('Iniciando generación de PDF', {
                    ordenId: ordenData.id_op,
                    numeroOp: ordenData.numero_op
                });
                
                // Crear documento PDF
                doc = new PDFDocument({
                    size: 'A4',
                    margins: { top: 50, bottom: 50, left: 50, right: 50 }
                });
                
                const filename = `orden_produccion_OP_${ordenData.id_op}_${Date.now()}.pdf`;
                const filepath = path.join(this.outputPath, filename);
                
                logger.info('Creando archivo PDF:', filepath);
                
                // Crear stream de escritura
                stream = fs.createWriteStream(filepath);
                
                // Conectar documento al stream
                doc.pipe(stream);
                
                // Configurar fuente
                doc.font('Helvetica');

                // HEADER
                this.generateHeader(doc, ordenData);
                this.generateClientInfo(doc, ordenData);

                // Agrupar paños por tipo de red y especificaciones
                const panosPorTipo = {};
                if (ordenData.panos && Array.isArray(ordenData.panos)) {
                    for (const pano of ordenData.panos) {
                        const tipo = (pano.tipo_red || 'SIN TIPO').toUpperCase();
                        if (!panosPorTipo[tipo]) panosPorTipo[tipo] = [];
                        panosPorTipo[tipo].push(pano);
                    }
                }

                let totalArea = 0;
                let totalPaños = 0;
                let totalPañosPrecio = 0;
                let bloquesPanos = Object.entries(panosPorTipo);
                
                if (bloquesPanos.length === 0) {
                    // Siempre mostrar aunque no haya paños
                    doc.moveDown(1);
                    doc.fontSize(12).font('Helvetica-Bold')
                        .text('SIN PAÑOS REGISTRADOS', 50, doc.y + 10);
                }
                
                for (const [tipo, panos] of bloquesPanos) {
                    // Agrupar paños por especificaciones técnicas únicas
                    const specsMap = new Map();
                    for (const pano of panos) {
                        const specs = this.generateDynamicSpecs(pano);
                        const key = specs.join('|');
                        if (!specsMap.has(key)) specsMap.set(key, { specs, panos: [] });
                        specsMap.get(key).panos.push(pano);
                    }
                    
                    for (const [specKey, { specs, panos: panosGrupo }] of specsMap.entries()) {
                        let areaGrupo = 0;
                        let subtotalGrupo = 0;
                        const precioM2 = panosGrupo[0]?.precio_m2 || 0;
                        const precioM2Num = Number(precioM2) || 0;
                        
                        panosGrupo.forEach((pano) => {
                            // Usar las dimensiones del paño (las columnas largo_tomar, ancho_tomar, area_tomar ya no existen)
                            let areaIndividual;
                            let largo, ancho;
                            largo = pano.largo_m;
                            ancho = pano.ancho_m;
                            areaIndividual = Number(largo) * Number(ancho);
                            areaGrupo += areaIndividual * (Number(pano.cantidad) || 1);
                            subtotalGrupo += (areaIndividual * (Number(pano.cantidad) || 1)) * precioM2Num;
                            pano._pdf_largo = largo;
                            pano._pdf_ancho = ancho;
                            pano._pdf_area = areaIndividual;
                        });
                        
                        totalArea += areaGrupo;
                        totalPaños += panosGrupo.reduce((sum, p) => sum + (p.cantidad || 0), 0);
                        totalPañosPrecio += subtotalGrupo;

                        // Título de bloque
                        doc.moveDown(1);
                        doc.fontSize(12).font('Helvetica-Bold')
                            .text(`${areaGrupo.toFixed(2)} m2 de Red de ${tipo} EN (${panosGrupo.length}) PAÑO${panosGrupo.length > 1 ? 'S' : ''} DE LAS SIGUIENTE MEDIDA:`, 50, doc.y + 10);

                        // Detalles de cada paño
                        panosGrupo.forEach((pano, idx) => {
                            doc.fontSize(10).font('Helvetica')
                                .text(`(${pano.cantidad}) Tramo de ${pano._pdf_largo} m de largo x ${pano._pdf_ancho} m de alto = ${pano._pdf_area.toFixed(2)} m2 c/u`, 70, doc.y + 5);
                        });

                        doc.fontSize(11).font('Helvetica-Bold')
                            .text(`Total = ${areaGrupo.toFixed(2)} m2`, 50, doc.y + 10);

                        // Especificaciones técnicas dinámicas por grupo
                        if (specs.length > 0) {
                            doc.fontSize(10).font('Helvetica')
                                .text('Especificaciones: ' + specs.join(', '), 50, doc.y + 10);
                        }
                        doc.moveDown(0.5);
                        // Precios por grupo
                        doc.fontSize(10).font('Helvetica')
                            .text(`A razón de $${precioM2Num.toFixed(2)} el m2 x ${areaGrupo.toFixed(2)} m2 = $${subtotalGrupo.toFixed(2)}`, 50, doc.y + 10);
                    }
                }

                // MATERIALES EXTRA
                let totalMateriales = 0;
                let totalMaterialesIVA = 0;
                if (!ordenData.materiales || !Array.isArray(ordenData.materiales) || ordenData.materiales.length === 0) {
                    doc.moveDown(1);
                    doc.fontSize(12).font('Helvetica-Bold').text('MATERIALES EXTRA:', 50, doc.y + 10);
                    doc.fontSize(10).font('Helvetica').text('Ningún material extra registrado.', 70, doc.y + 5);
                } else {
                    doc.moveDown(1);
                    doc.fontSize(12).font('Helvetica-Bold').text('MATERIALES EXTRA:', 50, doc.y + 10);
                    ordenData.materiales.forEach((mat, idx) => {
                        const subtotal = (mat.cantidad || 0) * (mat.precioxunidad || 0);
                        const iva = subtotal * 0.16;
                        const total = subtotal + iva;
                        totalMateriales += subtotal;
                        totalMaterialesIVA += iva;
                        doc.fontSize(10).font('Helvetica')
                            .text(`- ${mat.descripcion || mat.nombre || 'Material'}: ${mat.cantidad} ${mat.unidad || ''} x $${(mat.precioxunidad || 0).toFixed(2)} = $${subtotal.toFixed(2)} + IVA $${iva.toFixed(2)} = $${total.toFixed(2)}`, 70, doc.y + 5);
                    });
                }

                // HERRAMIENTAS
                if (!ordenData.herramientas || !Array.isArray(ordenData.herramientas) || ordenData.herramientas.length === 0) {
                    doc.moveDown(1);
                    doc.fontSize(12).font('Helvetica-Bold').text('HERRAMIENTAS:', 50, doc.y + 10);
                    doc.fontSize(10).font('Helvetica').text('Ninguna herramienta registrada.', 70, doc.y + 5);
                } else {
                    doc.moveDown(1);
                    doc.fontSize(12).font('Helvetica-Bold').text('HERRAMIENTAS:', 50, doc.y + 10);
                    ordenData.herramientas.forEach((herr, idx) => {
                        doc.fontSize(10).font('Helvetica')
                            .text(`- ${herr.descripcion || herr.nombre || 'Herramienta'}: ${herr.cantidad || 1} ${herr.unidad || ''}`, 70, doc.y + 5);
                    });
                }

                // TOTALES GENERALES
                const subtotalGeneral = totalPañosPrecio + totalMateriales;
                const ivaGeneral = subtotalGeneral * 0.16;
                const totalGeneral = subtotalGeneral + ivaGeneral;
                doc.moveDown(1);
                doc.fontSize(12).font('Helvetica-Bold').text('RESUMEN DE TOTALES:', 50, doc.y + 10);
                doc.fontSize(10).font('Helvetica')
                    .text(`Subtotal Paños: $${totalPañosPrecio.toFixed(2)}`, 70, doc.y + 5)
                    .text(`Subtotal Materiales: $${totalMateriales.toFixed(2)}`, 70, doc.y + 5)
                    .text(`IVA (16%): $${ivaGeneral.toFixed(2)}`, 70, doc.y + 5)
                    .text(`Total General: $${totalGeneral.toFixed(2)}`, 70, doc.y + 5);

                // ENTREGA Y FOOTER
                this.generateDeliveryInfo(doc, ordenData);
                this.generateFooter(doc, ordenData);

                // Finalizar documento
                doc.end();
                
                // Manejar eventos del stream
                stream.on('finish', () => {
                    logger.info('PDF generado exitosamente', { filename, ordenId: ordenData.id_op, filepath });
                    resolve({ filepath, filename });
                });
                
                stream.on('error', (error) => {
                    logger.error('Error en stream de PDF:', error);
                    reject(new Error(`Error en stream: ${error.message}`));
                });
                
                doc.on('error', (error) => {
                    logger.error('Error en documento PDF:', error);
                    reject(new Error(`Error en documento: ${error.message}`));
                });
                
            } catch (error) {
                logger.error('Error en generación de PDF:', error);
                if (stream) { 
                    try { 
                        stream.destroy(); 
                    } catch (cleanupError) { 
                        logger.error('Error limpiando stream:', cleanupError); 
                    } 
                }
                if (doc) { 
                    try { 
                        doc.destroy(); 
                    } catch (cleanupError) { 
                        logger.error('Error destruyendo documento:', cleanupError); 
                    } 
                }
                reject(new Error(`Error generando PDF: ${error.message}`));
            }
        });
    }

    // Generar header del PDF
    generateHeader(doc, ordenData) {
        // Título principal
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .text('O.C.', 50, 50)
           .fontSize(14)
           .text(`# ${ordenData.numero_op}`, 80, 50);

        // Fecha
        const fecha = new Date(ordenData.fecha_op || ordenData.fecha_creacion);
        const fechaFormateada = `${fecha.getDate()} / ${this.getMonthName(fecha.getMonth())} / ${fecha.getFullYear()}`;
        doc.fontSize(14)
           .text(fechaFormateada, 400, 50, { align: 'right' });

        // Información de la empresa
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('DE: SERCODAM', 50, 80);

        // Cliente
        doc.fontSize(12)
           .text(`Cliente: ${ordenData.cliente}`, 400, 80, { align: 'right' });

        doc.moveDown(0.5);
    }

    // Generar información del cliente
    generateClientInfo(doc, ordenData) {
        if (ordenData.contacto_cliente || ordenData.telefono_cliente) {
            doc.fontSize(10)
               .font('Helvetica')
               .text('Información de Contacto:', 50, doc.y + 10);
            
            if (ordenData.contacto_cliente) {
                doc.text(`Contacto: ${ordenData.contacto_cliente}`, 70, doc.y + 5);
            }
            
            if (ordenData.telefono_cliente) {
                doc.text(`Teléfono: ${ordenData.telefono_cliente}`, 70, doc.y + 5);
            }
            
            doc.moveDown(0.5);
        }
    }

    // Generar descripción del trabajo
    generateWorkDescription(doc, ordenData) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(ordenData.descripcion_trabajo || 'Descripción del trabajo', 50, doc.y + 10);

        if (ordenData.observaciones) {
            doc.fontSize(10)
               .font('Helvetica')
               .text(ordenData.observaciones, 50, doc.y + 5);
        }

        doc.moveDown(0.5);
    }

    // Generar detalles de paños
    generatePanosDetails(doc, ordenData) {
        if (!ordenData.panos || ordenData.panos.length === 0) {
            return;
        }

        // Calcular área total
        const areaTotal = ordenData.panos.reduce((total, pano) => {
            return total + (pano.largo_m * pano.ancho_m * pano.cantidad);
        }, 0);

        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(`${areaTotal.toFixed(2)} m2 de Red de Nylon`, 50, doc.y + 10);

        // Detalles de cada paño
        ordenData.panos.forEach((pano, index) => {
            const areaPano = pano.largo_m * pano.ancho_m;
            const areaTotalPano = areaPano * pano.cantidad;
            
            doc.fontSize(10)
               .font('Helvetica')
               .text(`(${pano.cantidad}) Tramo de ${pano.largo_m} m de largo x ${pano.ancho_m} m de alto = ${areaPano.toFixed(2)} m2 c/u`, 70, doc.y + 5);
        });

        doc.fontSize(11)
           .font('Helvetica-Bold')
           .text(`Total = ${areaTotal.toFixed(2)} m2`, 50, doc.y + 10);

        doc.moveDown(0.5);
    }

    // Generar especificaciones técnicas
    generateTechnicalSpecs(doc, ordenData) {
        if (ordenData.panos && ordenData.panos.length > 0) {
            const primerPano = ordenData.panos[0];
            
            doc.fontSize(10)
               .font('Helvetica')
               .text(`EN CALIBRE # No. ${primerPano.calibre || '18'} x ${primerPano.cuadro || '1"'} EN SQ (cuadrada) ${primerPano.torsion || 'TORCIDA'}, ${primerPano.color || 'TEÑIDA'} Y TRATADA,`, 50, doc.y + 10);

            if (primerPano.refuerzo) {
                doc.text(`${primerPano.refuerzo.toUpperCase()} EN LAS ORILLAS.`, 50, doc.y + 5);
            }
        }

        doc.moveDown(0.5);
    }

    // Generar información de precios
    generatePricingInfo(doc, ordenData) {
        const areaTotal = ordenData.panos ? ordenData.panos.reduce((total, pano) => {
            return total + (pano.largo_m * pano.ancho_m * pano.cantidad);
        }, 0) : 0;

        const precioM2 = ordenData.panos && ordenData.panos.length > 0 ? ordenData.panos[0].precio_m2 || 0 : 0;
        const subtotal = areaTotal * precioM2;
        const iva = subtotal * 0.16; // 16% IVA
        const total = subtotal + iva;

        doc.fontSize(10)
           .font('Helvetica')
           .text(`A Razon de $${precioM2.toFixed(2)} el m2 x ${areaTotal.toFixed(2)} m2`, 50, doc.y + 10)
           .text(`= $${subtotal.toFixed(2)}`, 400, doc.y - 10, { align: 'right' });

        doc.text(`+Iva = $${iva.toFixed(2)}`, 400, doc.y + 5, { align: 'right' });
        doc.font('Helvetica-Bold')
           .text(`Total = $${total.toFixed(2)}`, 400, doc.y + 5, { align: 'right' });

        doc.moveDown(0.5);
    }

    // Generar información de entrega
    generateDeliveryInfo(doc, ordenData) {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('FLETE X COBRAR', 50, doc.y + 10);

        doc.fontSize(10)
           .font('Helvetica')
           .text('Dirección de entrega:', 50, doc.y + 5);

        if (ordenData.direccion_instalacion) {
            doc.text(ordenData.direccion_instalacion, 70, doc.y + 5);
        } else {
            doc.text('EN PROCESO', 70, doc.y + 5);
        }

        doc.moveDown(1);
    }

    // Generar footer
    generateFooter(doc, ordenData) {
        const pageCount = doc.bufferedPageRange().count;
        
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            
            // Número de página
            doc.fontSize(8)
               .font('Helvetica')
               .text(`Página ${i + 1} de ${pageCount}`, 50, doc.page.height - 50, { align: 'center' });
            
            // Información de la empresa
            doc.text('SERCODAM - Sistema de Órdenes de Producción', 50, doc.page.height - 35, { align: 'center' });
            doc.text(`Generado el: ${new Date().toLocaleString('es-ES')}`, 50, doc.page.height - 20, { align: 'center' });
        }
    }

    // Obtener nombre del mes en español
    getMonthName(month) {
        const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return months[month];
    }

    // Limpiar archivos temporales
    async cleanupTempFiles() {
        try {
            const files = fs.readdirSync(this.outputPath);
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 horas

            for (const file of files) {
                const filepath = path.join(this.outputPath, file);
                const stats = fs.statSync(filepath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filepath);
                    logger.info('Archivo temporal eliminado:', file);
                }
            }
        } catch (error) {
            logger.error('Error limpiando archivos temporales:', error);
        }
    }

    // Genera especificaciones técnicas dinámicas según el tipo de red y atributos presentes
    generateDynamicSpecs(pano) {
        const specs = [];
        switch ((pano.tipo_red || '').toLowerCase()) {
            case 'nylon':
                if (pano.calibre) specs.push(`Calibre: ${pano.calibre}`);
                if (pano.cuadro) specs.push(`Cuadro: ${pano.cuadro}`);
                if (pano.torsion) specs.push(`Torsión: ${pano.torsion}`);
                if (pano.refuerzo !== undefined && pano.refuerzo !== null) {
                    specs.push(`Refuerzo: ${pano.refuerzo === true || pano.refuerzo === 't' || pano.refuerzo === 'Sí' ? 'Sí' : 'No'}`);
                }
                break;
            case 'lona':
                if (pano.color) specs.push(`Color: ${pano.color}`);
                if (pano.presentacion) specs.push(`Presentación: ${pano.presentacion}`);
                break;
            case 'polipropileno':
                if (pano.grosor) specs.push(`Grosor: ${pano.grosor}`);
                if (pano.cuadro) specs.push(`Cuadro: ${pano.cuadro}`);
                break;
            case 'malla sombra':
                if (pano.color_tipo_red) specs.push(`Color/Tipo: ${pano.color_tipo_red}`);
                if (pano.presentacion) specs.push(`Presentación: ${pano.presentacion}`);
                break;
        }
        return specs;
    }

    // Obtener la ruta completa del archivo PDF
    getPDFPath(filename) {
        return path.join(this.outputPath, filename);
    }

    // Buscar archivo PDF por ID de orden
    findPDFByOrderId(orderId) {
        try {
            const files = fs.readdirSync(this.outputPath);
            const pdfFile = files.find(file => 
                file.startsWith(`orden_produccion_OP_${orderId}_`) && 
                file.endsWith('.pdf')
            );
            
            if (pdfFile) {
                return {
                    filename: pdfFile,
                    filepath: path.join(this.outputPath, pdfFile)
                };
            }
            
            return null;
        } catch (error) {
            logger.error('Error buscando PDF por ID de orden:', error);
            return null;
        }
    }

    // Limpiar archivos PDF antiguos (más de 7 días)
    async cleanupOldPDFs() {
        try {
            const files = fs.readdirSync(this.outputPath);
            const now = Date.now();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 días

            for (const file of files) {
                if (file.endsWith('.pdf')) {
                    const filepath = path.join(this.outputPath, file);
                    const stats = fs.statSync(filepath);
                    
                    if (now - stats.mtime.getTime() > maxAge) {
                        fs.unlinkSync(filepath);
                        logger.info('PDF antiguo eliminado:', file);
                    }
                }
            }
        } catch (error) {
            logger.error('Error limpiando PDFs antiguos:', error);
        }
    }
}

module.exports = new PDFService(); 