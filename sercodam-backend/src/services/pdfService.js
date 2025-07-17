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

    // Verificar si hay espacio suficiente en la página actual
    checkPageSpace(doc, requiredHeight) {
        const pageHeight = doc.page.height;
        const margins = { top: 50, bottom: 50 };
        const availableHeight = pageHeight - margins.top - margins.bottom;
        const currentY = doc.y;
        const remainingSpace = availableHeight - currentY;
        
        return remainingSpace >= requiredHeight;
    }

    // Agregar nueva página si es necesario
    addPageIfNeeded(doc, requiredHeight) {
        if (!this.checkPageSpace(doc, requiredHeight)) {
            doc.addPage();
            return true; // Se agregó nueva página
        }
        return false; // No se necesitó nueva página
    }

    // Generar PDF de orden de producción
    async generateOrdenProduccionPDF(ordenData) {
        return new Promise((resolve, reject) => {
            let doc = null;
            let stream = null;
            try {
                logger.info('Iniciando generación de PDF con datos:', {
                    ordenId: ordenData?.id_op,
                    numeroOp: ordenData?.numero_op,
                    hasPanos: !!ordenData?.panos?.length,
                    hasMateriales: !!ordenData?.materiales?.length,
                    hasHerramientas: !!ordenData?.herramientas?.length
                });
                
                if (!ordenData || !ordenData.numero_op) {
                    throw new Error('Datos de orden inválidos o faltantes');
                }
                
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

                // Asegurar que todo el texto sea negro
                doc.fillColor('#000000');

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
                
                // Siempre mostrar sección de paños, incluso si está vacía
                doc.moveDown(1);
                doc.fontSize(12).font('Helvetica-Bold')
                    .text('PAÑOS SOLICITADOS:', 50, doc.y + 10);

                if (bloquesPanos.length === 0) {
                    doc.fontSize(10).font('Helvetica')
                        .text('No hay paños registrados para esta orden.', 70, doc.y + 5);
                } else {
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
                        // Forzar conversión a número para el precio
                        const precioM2Num = parseFloat(panosGrupo[0]?.precio_m2) || 0;
                        
                        panosGrupo.forEach((pano) => {
                            let areaIndividual;
                            // Forzar conversión a número para las dimensiones
                            const largo = parseFloat(pano.largo_m) || 0;
                            const ancho = parseFloat(pano.ancho_m) || 0;
                            const cantidad = parseFloat(pano.cantidad) || 1;

                            areaIndividual = largo * ancho;
                            areaGrupo += areaIndividual * cantidad;
                            subtotalGrupo += (areaIndividual * cantidad) * precioM2Num;
                            pano._pdf_largo = largo;
                            pano._pdf_ancho = ancho;
                            pano._pdf_area = areaIndividual;
                        });
                        
                        totalArea += areaGrupo;
                        totalPaños += panosGrupo.reduce((sum, p) => sum + (parseFloat(p.cantidad) || 0), 0);
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
                        const precioUnitario = parseFloat(mat.precioxunidad) || 0;
                        const subtotal = (mat.cantidad || 0) * precioUnitario;
                        const iva = subtotal * 0.16;
                        const total = subtotal + iva;
                        totalMateriales += subtotal;
                        totalMaterialesIVA += iva;
                        doc.fontSize(10).font('Helvetica')
                            .text(`- ${mat.descripcion || mat.nombre || 'Material'}: ${mat.cantidad} ${mat.unidad || ''} x $${precioUnitario.toFixed(2)} = $${subtotal.toFixed(2)} + IVA $${iva.toFixed(2)} = $${total.toFixed(2)}`, 70, doc.y + 5);
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

                // INSTRUCCIONES DE CORTE - CON PAGINACIÓN INTELIGENTE
                if (ordenData.cuts && Array.isArray(ordenData.cuts) && ordenData.cuts.length > 0) {
                    // Verificar espacio para el título de la sección
                    const sectionTitleHeight = 30; // Espacio para título + margen
                    this.addPageIfNeeded(doc, sectionTitleHeight);
                    
                    doc.moveDown(1);
                    doc.fontSize(12).font('Helvetica-Bold').text('INSTRUCCIONES DE CORTE GUILLOTINA:', 50, doc.y + 10);
                    
                    ordenData.cuts.forEach((cut, idx) => {
                        // Calcular altura requerida para este corte completo
                        const cutInfoHeight = 80; // Texto de información del corte
                        const diagramHeight = 250; // Altura del diagrama completo
                        const totalCutHeight = cutInfoHeight + diagramHeight + 20; // +20 para espaciado
                        
                        // Verificar si necesitamos nueva página para este corte
                        this.addPageIfNeeded(doc, totalCutHeight);
                        
                        doc.fontSize(10).font('Helvetica-Bold')
                            .text(`Corte ${idx + 1}:`, 70, doc.y + 5);
                        
                        doc.fontSize(9).font('Helvetica')
                            .text(`• Paño ID: ${cut.id_item}`, 90, doc.y + 3)
                            .text(`• Dimensiones del paño original: ${cut.pano_original.largo} m x ${cut.pano_original.ancho} m`, 90, doc.y + 3)
                            .text(`• Dimensiones requeridas: ${cut.altura_req} m x ${cut.ancho_req} m`, 90, doc.y + 3)
                            .text(`• Área requerida: ${(cut.altura_req * cut.ancho_req).toFixed(2)} m²`, 90, doc.y + 3);
                        
                        if (cut.plans && Array.isArray(cut.plans)) {
                            doc.text(`• Plan de corte guillotina:`, 90, doc.y + 3);
                            cut.plans.forEach((plan, planIdx) => {
                                const planType = plan.rol_pieza === 'Objetivo' ? 'Pieza Principal' : `Remanente ${planIdx}`;
                                const area = (plan.altura_plan * plan.ancho_plan).toFixed(2);
                                doc.text(`  - ${planType}: ${plan.altura_plan} m x ${plan.ancho_plan} m = ${area} m²`, 110, doc.y + 3);
                            });
                        }
                        
                        // Dibujo simple del corte - centrado
                        const pageWidth = 595; // A4 width in points
                        const diagramX = (pageWidth - 300) / 2; // Center the 300px wide diagram
                        this.drawCutDiagram(doc, cut, diagramX, doc.y + 5);
                        
                        doc.moveDown(1);
                    });
                } else {
                    doc.moveDown(1);
                    doc.fontSize(12).font('Helvetica-Bold').text('INSTRUCCIONES DE CORTE:', 50, doc.y + 10);
                    doc.fontSize(10).font('Helvetica').text('No hay instrucciones de corte registradas para esta orden.', 70, doc.y + 5);
                }

                // SOBRANTES (REMANTS)
                if (ordenData.sobrantes && Array.isArray(ordenData.sobrantes) && ordenData.sobrantes.length > 0) {
                    // Verificar espacio para la sección de sobrantes
                    const sobrantesHeight = 30 + (ordenData.sobrantes.length * 15); // Título + cada sobrante
                    this.addPageIfNeeded(doc, sobrantesHeight);
                    
                    doc.moveDown(1);
                    doc.fontSize(12).font('Helvetica-Bold').text('SOBRANTES GENERADOS:', 50, doc.y + 10);
                    
                    ordenData.sobrantes.forEach((sobrante, idx) => {
                        const area = (sobrante.altura_m * sobrante.ancho_m).toFixed(2);
                        doc.fontSize(10).font('Helvetica')
                            .text(`• Sobrante ${idx + 1}: ${sobrante.altura_m} m x ${sobrante.ancho_m} m = ${area} m²`, 70, doc.y + 5);
                    });
                }

                // TOTALES GENERALES
                const subtotalPaños = parseFloat(totalPañosPrecio) || 0;
                const subtotalMateriales = parseFloat(totalMateriales) || 0;

                const subtotalGeneral = subtotalPaños + subtotalMateriales;
                const ivaGeneral = subtotalGeneral * 0.16;
                const totalGeneral = subtotalGeneral + ivaGeneral;
                
                // Verificar espacio para totales
                const totalesHeight = 80; // Espacio para título + 4 líneas de totales
                this.addPageIfNeeded(doc, totalesHeight);
                
                doc.moveDown(1);
                doc.fontSize(12).font('Helvetica-Bold').text('RESUMEN DE TOTALES:', 50, doc.y + 10);
                doc.fontSize(10).font('Helvetica')
                    .text(`Subtotal Paños: $${subtotalPaños.toFixed(2)}`, 70, doc.y + 5)
                    .text(`Subtotal Materiales: $${subtotalMateriales.toFixed(2)}`, 70, doc.y + 5)
                    .text(`IVA (16%): $${ivaGeneral.toFixed(2)}`, 70, doc.y + 5)
                    .text(`Total General: $${totalGeneral.toFixed(2)}`, 70, doc.y + 5);

                // ENTREGA Y FOOTER
                this.generateDeliveryInfo(doc, ordenData);

                // Asegurar que hay al menos una página
                if (doc.y <= 100) {
                    doc.moveDown(2);
                    doc.fontSize(10).font('Helvetica').text('Documento generado automáticamente', 50, doc.y + 10);
                }

                // Agregar footer simple en la página actual
                doc.moveDown(2);
                doc.fontSize(8).font('Helvetica')
                   .text('SERCODAM - Sistema de Órdenes de Producción', 50, doc.y + 10, { align: 'center' })
                   .text(`Generado el: ${new Date().toLocaleString('es-ES')}`, 50, doc.y + 5, { align: 'center' });

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

    // Modificada: Generar detalles de paños con instrucciones de corte y dibujos
    generatePanosDetails(doc, ordenData) {
        if (!ordenData.panos || ordenData.panos.length === 0) {
            doc.moveDown(1);
            doc.fontSize(12).font('Helvetica-Bold').text('SIN PAÑOS REGISTRADOS', 50, doc.y + 10);
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

        // Nueva sección: Instrucciones de corte por paño
        doc.moveDown(1);
        doc.fontSize(12).font('Helvetica-Bold').text('INSTRUCCIONES DE CORTE:', 50, doc.y + 10);

        ordenData.panos.forEach((pano, index) => {
            doc.fontSize(10).font('Helvetica')
                .text(`Paño #${pano.id_item}: Cortar ${pano.largo_m}x${pano.ancho_m} de ${pano.tipo_red}`, 70, doc.y + 5);

            // Dibujar paño original como rectángulo
            const drawX = 70;
            const drawY = doc.y + 10;
            const scale = 5; // Escala para visualización (ajustar según tamaño)
            const panoWidth = pano.original_ancho * scale; // Asumir original dimensions in data
            const panoHeight = pano.original_largo * scale;
            doc.rect(drawX, drawY, panoWidth, panoHeight).stroke();

            // Dibujar líneas de corte basadas en remanentes
            if (pano.cuts && pano.cuts.remnants) {
                // Ejemplo para 2 remanentes: corte en esquina
                doc.moveTo(drawX + (pano.ancho_m * scale), drawY)
                   .lineTo(drawX + (pano.ancho_m * scale), drawY + panoHeight)
                   .stroke();
                doc.moveTo(drawX, drawY + (pano.largo_m * scale))
                   .lineTo(drawX + panoWidth, drawY + (pano.largo_m * scale))
                   .stroke();

                // Etiquetas para piezas
                doc.text('Pieza Principal', drawX + 5, drawY + 5);
                pano.cuts.remnants.forEach((rem, idx) => {
                    doc.text(`Remanente ${idx+1}: ${rem.altura_m}x${rem.ancho_m}`, drawX + 5, drawY + (idx+1)*15 + (pano.largo_m * scale) + 5);
                });
            }

            // Instrucciones textuales
            doc.text(`Cortar desde esquina. Descartar remanentes < ${pano.umbral_sobrante_m2 || 5} m².`, 70, drawY + panoHeight + 10);

            doc.moveDown(2);
        });
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
        // Obtener el número total de páginas
        const pageCount = doc.bufferedPageRange().count;
        
        // Solo agregar footer si hay páginas
        if (pageCount > 0) {
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

    // Dibujar diagrama simple del corte
    drawCutDiagram(doc, cut, x, y) {
        const diagramWidth = 300; // Más espacio horizontal
        const diagramHeight = 200; // Más espacio vertical
        const margin = 15;
        
        // Marco del diagrama
        doc.rect(x, y, diagramWidth, diagramHeight)
           .stroke();
        
        // Título del diagrama
        doc.fontSize(9).font('Helvetica-Bold')
           .text('Diagrama de Corte Guillotina', x + 5, y + 5);
        
        // Dimensiones del paño original
        const originalWidth = diagramWidth - 80; // Más espacio para ejes
        const originalHeight = 100; // Más altura para el diagrama
        const originalX = x + 50; // Más espacio para eje Y
        const originalY = y + 30;
        
        // Dibujar paño original
        doc.rect(originalX, originalY, originalWidth, originalHeight)
           .fill('#f0f0f0')
           .stroke();
        
        // Texto del paño original en negro
        doc.fontSize(8).font('Helvetica')
           .fillColor('#000000')
           .text(`Original: ${cut.pano_original.largo}m x ${cut.pano_original.ancho}m`, 
                 originalX + 5, originalY + 5);
        
        // Líneas de corte si hay planes - ALGORITMO GUILLOTINA PERFECTO
        if (cut.plans && cut.plans.length > 0) {
            const objetivo = cut.plans.find(p => p.rol_pieza === 'Objetivo');
            const remanentes = cut.plans.filter(p => p.rol_pieza !== 'Objetivo');
            
            if (objetivo) {
                // Obtener dimensiones reales y determinar cuál es mayor
                const H = parseFloat(cut.pano_original.largo);
                const W = parseFloat(cut.pano_original.ancho);
                const Hreq = parseFloat(cut.altura_req);
                const Wreq = parseFloat(cut.ancho_req);
                
                // Determinar cuál es la dimensión mayor y cuál es la menor
                const dimensionMayor = Math.max(H, W);
                const dimensionMenor = Math.min(H, W);
                
                // Calcular escala para el dibujo (manteniendo proporción)
                // X-axis (width) representa la dimensión mayor, Y-axis (height) representa la dimensión menor
                const scaleX = originalWidth / dimensionMayor;
                const scaleY = originalHeight / dimensionMenor;
                
                // NUEVO ENFOQUE: Objetivo desde la esquina inferior izquierda
                // Ancho (dimensión mayor) va en el eje X (horizontal)
                // Altura (dimensión menor) va en el eje Y (vertical)
                const objetivoX = originalX;  // Empezar desde la izquierda
                const objetivoY = originalY + originalHeight - (Hreq * scaleY);  // Posición Y desde abajo, alineado con escala
                const objetivoWidth = Wreq * scaleX;  // Ancho del objetivo (ancho requerido en X)
                const objetivoHeight = Hreq * scaleY; // Alto del objetivo (altura requerida en Y)
                
                // Dibujar pieza objetivo
                doc.rect(objetivoX, objetivoY, objetivoWidth, objetivoHeight)
                   .fill('#ff6b6b')
                   .stroke();
                
                // Texto del objetivo más pequeño para que quepa
                doc.fontSize(6).font('Helvetica-Bold')
                   .fillColor('#ffffff')
                   .text('OBJ', objetivoX + 3, objetivoY + 3);
                doc.fontSize(5).font('Helvetica')
                   .text(`${parseFloat(Hreq || 0).toFixed(3)}x${parseFloat(Wreq || 0).toFixed(3)}`, objetivoX + 3, objetivoY + 10);
                
                // Algoritmo de líneas de corte guillotina
                doc.strokeColor('#000000')
                   .lineWidth(3); // Líneas más gruesas para mejor visibilidad
                
                // Solo dibujar líneas si hay remanentes (no coinciden las dimensiones)
                let needsVerticalCut = false;
                let needsHorizontalCut = false;
                
                // Verificar si necesitamos corte vertical (dimensión mayor != ancho requerido)
                if (Math.abs(dimensionMayor - Wreq) > 0.01) {
                    needsVerticalCut = true;
                    // Línea vertical de corte en x = objetivoX + objetivoWidth
                    doc.moveTo(objetivoX + objetivoWidth, originalY)
                       .lineTo(objetivoX + objetivoWidth, originalY + originalHeight)
                       .stroke();
                }
                
                // Verificar si necesitamos corte horizontal (dimensión menor != altura requerida)
                if (Math.abs(dimensionMenor - Hreq) > 0.01) {
                    needsHorizontalCut = true;
                    // Línea horizontal de corte en y = objetivoY
                    doc.moveTo(originalX, objetivoY)
                       .lineTo(originalX + originalWidth, objetivoY)
                       .stroke();
                }
                
                // Restaurar color
                doc.strokeColor('#000000');
                
                // Dibujar remanentes usando las dimensiones calculadas del sistema
                remanentes.forEach((remanente, idx) => {
                    let remanenteX, remanenteY, remanenteWidth, remanenteHeight;
                    
                    // Usar las dimensiones reales del remanente del sistema
                    const remH = parseFloat(remanente.altura_plan || 0);
                    const remW = parseFloat(remanente.ancho_plan || 0);
                    
                    if (idx === 0 && needsHorizontalCut) {
                        // Remanente 1: Franja superior (corte horizontal)
                        // Ocupa todo el ancho (X) pero solo la parte superior del alto (Y)
                        remanenteX = originalX;
                        remanenteY = originalY;
                        remanenteWidth = originalWidth;
                        remanenteHeight = originalHeight - (Hreq * scaleY);
                    } else if ((idx === 1 && needsHorizontalCut && needsVerticalCut) || 
                              (idx === 0 && !needsHorizontalCut && needsVerticalCut)) {
                        // Remanente 2: Franja derecha (corte vertical)
                        // Ocupa solo la parte derecha del ancho (X) pero todo el alto (Y)
                        remanenteX = objetivoX + objetivoWidth;
                        remanenteY = originalY;
                        remanenteWidth = (dimensionMayor - Wreq) * scaleX;
                        remanenteHeight = originalHeight;
                    }
                    
                    if (remanenteWidth > 0 && remanenteHeight > 0) {
                        doc.rect(remanenteX, remanenteY, remanenteWidth, remanenteHeight)
                           .fill('#90EE90')
                           .stroke();
                        
                        // Texto del remanente en negro
                        doc.fontSize(6).font('Helvetica-Bold')
                           .fillColor('#000000')
                           .text(`REM ${idx + 1}`, remanenteX + 3, remanenteY + 3);
                        doc.fontSize(5).font('Helvetica')
                           .text(`${Math.max(remH, remW).toFixed(3)}x${Math.min(remH, remW).toFixed(3)}`, remanenteX + 3, remanenteY + 12);
                    }
                });
                
                // Agregar líneas punteadas para separar remanentes si hay 2
                if (remanentes.length === 2) {
                    doc.strokeColor('#000000')
                       .lineWidth(1)
                       .dash(3, { space: 2 }); // Línea punteada
                    
                    if (needsHorizontalCut && needsVerticalCut) {
                        // Si hay ambos cortes, dibujar línea punteada en la esquina
                        const dottedX = objetivoX + objetivoWidth;
                        const dottedY = objetivoY;
                        
                        // Línea punteada vertical desde la esquina hacia arriba
                        doc.moveTo(dottedX, originalY)
                           .lineTo(dottedX, dottedY)
                           .stroke();
                        
                        // Línea punteada horizontal desde la esquina hacia la izquierda
                        doc.moveTo(originalX, dottedY)
                           .lineTo(dottedX, dottedY)
                           .stroke();
                    }
                    
                    // Restaurar línea sólida
                    doc.undash();
                }
            }
        }
        
        // DIBUJAR EJES DE COORDENADAS
        doc.strokeColor('#000000')
           .lineWidth(1);
        
        // Eje Y (vertical) - a la izquierda del diagrama - CORREGIDO: de abajo hacia arriba
        const axisYStart = originalY + originalHeight; // Comienza desde abajo
        const axisYEnd = originalY; // Termina arriba
        const axisY = originalX - 5;
        doc.moveTo(axisY, axisYStart)
           .lineTo(axisY, axisYEnd)
           .stroke();
        
        // Flecha del eje Y (apunta hacia arriba)
        doc.moveTo(axisY - 3, axisYEnd + 3)
           .lineTo(axisY, axisYEnd)
           .lineTo(axisY + 3, axisYEnd + 3)
           .stroke();
        
        // Eje X (horizontal) - debajo del diagrama
        const axisXStart = originalX;
        const axisXEnd = originalX + originalWidth;
        const axisX = originalY + originalHeight + 5;
        doc.moveTo(axisXStart, axisX)
           .lineTo(axisXEnd, axisX)
           .stroke();
        
        // Flecha del eje X
        doc.moveTo(axisXEnd - 3, axisX - 3)
           .lineTo(axisXEnd, axisX)
           .lineTo(axisXEnd - 3, axisX + 3)
           .stroke();
        
        // Etiquetas de los ejes - REVERTIDO: sistema original
        doc.fontSize(7).font('Helvetica-Bold')
           .fillColor('#000000')
           .text('Y (Ancho)', axisY - 15, axisYEnd - 15) // Y es ancho (dimensión menor)
           .text('X (Altura)', axisXEnd + 10, axisX + 5); // X es altura (dimensión mayor) - más espacio
        
        // Marcas de escala en los ejes - CORREGIDO: determinar cuál es mayor
        const H = parseFloat(cut.pano_original.largo);
        const W = parseFloat(cut.pano_original.ancho);
        
        // Determinar cuál es la dimensión mayor y cuál es la menor
        const dimensionMayor = Math.max(H, W);
        const dimensionMenor = Math.min(H, W);
        
        // Marcas en eje Y (ancho - dimensión menor) - de abajo hacia arriba
        for (let i = 0; i <= 5; i++) {
            const markY = axisYStart - (i * originalHeight / 5); // Invertido para empezar desde abajo
            const valueY = (i * dimensionMenor / 5).toFixed(1);
            doc.moveTo(axisY - 2, markY)
               .lineTo(axisY + 2, markY)
               .stroke();
            doc.fontSize(6).font('Helvetica')
               .text(valueY, axisY - 15, markY - 3);
        }
        
        // Marcas en eje X (altura - dimensión mayor) - de izquierda a derecha
        for (let i = 0; i <= 5; i++) {
            const markX = axisXStart + (i * originalWidth / 5);
            const valueX = (i * dimensionMayor / 5).toFixed(1);
            doc.moveTo(markX, axisX - 2)
               .lineTo(markX, axisX + 2)
               .stroke();
            doc.fontSize(6).font('Helvetica')
               .text(valueX, markX - 8, axisX + 10);
        }
        
        // Texto del objetivo debajo del diagrama (más pequeño)
        doc.fontSize(7).font('Helvetica-Bold')
           .fillColor('#000000')
           .text(`Objetivo: ${parseFloat(cut.altura_req || 0).toFixed(3)}m x ${parseFloat(cut.ancho_req || 0).toFixed(3)}m - Color Rojo`, x + 5, y + diagramHeight - 45);
        
        // Leyenda en negro
        doc.fontSize(7).font('Helvetica')
           .fillColor('#000000')
           .text('Rojo: Pieza Objetivo', x + 5, y + diagramHeight - 28)
           .text('Verde: Remanentes', x + 5, y + diagramHeight - 21)
           .text('Líneas Negras: Cortes Guillotina', x + 5, y + diagramHeight - 14);
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