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
                // Validar datos de entrada
                if (!ordenData || !ordenData.numero_op) {
                    throw new Error('Datos de orden inválidos o faltantes');
                }

                logger.info('Iniciando generación de PDF', {
                    ordenId: ordenData.id_op,
                    numeroOp: ordenData.numero_op
                });

                doc = new PDFDocument({
                    size: 'A4',
                    margins: {
                        top: 50,
                        bottom: 50,
                        left: 50,
                        right: 50
                    }
                });

                const filename = `orden_produccion_${ordenData.numero_op.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
                const filepath = path.join(this.outputPath, filename);
                
                logger.info('Creando archivo PDF:', filepath);
                
                stream = fs.createWriteStream(filepath);

                doc.pipe(stream);

                // Configurar fuentes
                doc.font('Helvetica');

                // Generar contenido del PDF
                this.generateHeader(doc, ordenData);
                this.generateClientInfo(doc, ordenData);
                this.generateWorkDescription(doc, ordenData);
                this.generatePanosDetails(doc, ordenData);
                this.generateTechnicalSpecs(doc, ordenData);
                this.generatePricingInfo(doc, ordenData);
                this.generateDeliveryInfo(doc, ordenData);
                this.generateFooter(doc, ordenData);

                // Finalizar documento
                doc.end();

                // Manejar eventos del stream
                stream.on('finish', () => {
                    logger.info('PDF generado exitosamente', { 
                        filename, 
                        ordenId: ordenData.id_op,
                        filepath 
                    });
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
                
                // Limpiar recursos en caso de error
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
            doc.text('PENDIENTE', 70, doc.y + 5);
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
}

module.exports = new PDFService(); 