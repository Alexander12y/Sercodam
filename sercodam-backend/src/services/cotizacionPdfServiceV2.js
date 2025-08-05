const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
const OpenAI = require('openai');

/**
 * Servicio v2 para la generación de PDFs de cotizaciones.
 *  - Arquitectura completamente modular.
 *  - Soporte de paginado y control de espacios en cada sección.
 *  - Estilos y helpers centralizados.
 *  - Basado en los requerimientos definidos en REPORTE_COTIZACIONES_SERCODAM.md
 */
class CotizacionPdfServiceV2 {
  constructor () {
    /* ------------------------- Estilos globales ------------------------- */
    this.styles = {
      margin: 50,
      headerHeight: 80,
      footerHeight: 60,
      rowHeight: 20,
      colors: {
        primary: '#CE0A0A',
        secondary: '#666666',
        zebra: '#F7F7F7',
        header: '#333333',
        border: '#CCCCCC'
      },
      fonts: {
        regular: 'Helvetica',
        bold: 'Helvetica-Bold'
      }
    };

    /* ------------------- Rutas de recursos estáticos ------------------- */
    this.fontPath = path.join(__dirname, '../../public/fonts');
    this.imagePath = path.join(__dirname, '../../public/images/public/images');

    if (!fs.existsSync(this.imagePath)) {
      // Fallback si se ejecuta desde otro directorio
      this.imagePath = path.join(__dirname, '../../../public/images/public/images');
    }

    /* ----------------------- Inicializar OpenAI ------------------------ */
    this.openai = null;
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    /* ----------------------- Cache en memoria ------------------------ */
    this.cache = {
      descriptions: new Map(),
      fichasTecnicas: new Map()
    };
  }

  /* -------------------------------------------------------------------------- */
  /*                                Entrada pública                              */
  /* -------------------------------------------------------------------------- */

  /**
   * Genera el PDF de una cotización
   * @param {Object} cotizacion  Datos de la cotización
   * @param {Array}  detalle     Items de la cotización
   * @returns {Promise<Buffer>}
   */
  async generateCotizacionPDF (cotizacion, detalle = []) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: this.styles.margin,
            bottom: this.styles.margin,
            left: this.styles.margin,
            right: this.styles.margin
          }
        });

        // Recoger los chunks a medida que se genera el PDF
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        /* ---------------------------- Hook pageAdded --------------------------- */
        doc.on('pageAdded', () => {
          this.drawFooter(doc);
          // Reset vertical cursor
          doc.y = this.styles.margin;
        });

        /* --------------------------- Configurar fuentes ------------------------ */
        this.setupFonts(doc);

        /* ------------------------------ Encabezado ----------------------------- */
        this.drawHeader(doc, cotizacion);

        /* --------------------------- Descripción IA --------------------------- */
        await this.drawDescripcionProyecto(doc, cotizacion, detalle);

        /* --------------------------- Tabla productos --------------------------- */
        await this.drawCenteredTable(doc, detalle);

        /* ------------------------------- Totales -------------------------------- */
        this.drawTotales(doc, cotizacion);

        /* ------------------------ Ficha técnica y producto ---------------------- */
        await this.drawFichaTecnicaSection(doc, detalle);

        /* ------------------------ Condiciones de pago y entrega ------------------ */
        this.drawCondicionesSection(doc, cotizacion);

        /* ------------------------- Secciones opcionales ------------------------- */
        if (cotizacion.incluye_instalacion_seccion) {
          this.drawSection(doc, 'SERVICIO DE INSTALACIÓN', cotizacion.instalacion_texto || 'Instalación profesional según especificaciones.');
        }
        if (cotizacion.incluye_garantia) {
          this.drawGarantiaSection(doc);
        }
        if (cotizacion.observaciones) {
          this.drawSection(doc, 'OBSERVACIONES', cotizacion.observaciones);
        }
        if (cotizacion.no_incluye) {
          this.drawSection(doc, 'NO INCLUYE', cotizacion.no_incluye);
        }
        if (cotizacion.notas) {
          this.drawSection(doc, 'NOTAS', cotizacion.notas);
        }
        if (cotizacion.conceptos_extra_list) {
          this.drawConceptosExtraSection(doc, cotizacion);
        }
        if (cotizacion.titulo_clausula_personalizada && cotizacion.descripcion_clausula_personalizada) {
          this.drawSection(doc, cotizacion.titulo_clausula_personalizada, cotizacion.descripcion_clausula_personalizada);
        }

        /* ------------------------- Mensaje final y foto del proyecto ------------------------- */
        this.drawMensajeFinal(doc);
        await this.drawImagenProyecto(doc, cotizacion);

        /* --------------------------------- Footer ------------------------------ */
        this.drawFooter(doc);

        doc.end();
      } catch (error) {
        logger.error('Error generando PDF de cotización (v2):', error);
        reject(error);
      }
    });
  }

  /* -------------------------------------------------------------------------- */
  /*                                 Helper methods                             */
  /* -------------------------------------------------------------------------- */

  setupFonts (doc) {
    doc.font(this.styles.fonts.regular).fontSize(10).fillColor('#000000');
  }

  /** Verifica si hay espacio para un bloque de altura "height" y crea nueva página si es necesario */
  addPageIfNeeded (doc, height) {
    const spaceLeft = doc.page.height - doc.y - this.styles.footerHeight - this.styles.margin;
    if (spaceLeft < height) {
      doc.addPage();
    }
  }

  /* -------------------------------- Encabezado ------------------------------- */
  drawHeader (doc, cotizacion) {
    const { margin, headerHeight } = this.styles;
    // Imagen de cabecera (logo o banner)
    const headerPath = path.join(this.imagePath, 'header-sercodam.png');
    if (fs.existsSync(headerPath)) {
      doc.image(headerPath, margin, doc.y, { width: doc.page.width - margin * 2 });
    } else {
      // Fallback tipográfico si la imagen no existe
      doc.font(this.styles.fonts.bold)
        .fontSize(16)
        .fillColor(this.styles.colors.primary)
        .text('SERCODAM', margin, doc.y);
    }

    // Ajustar cursor después del banner
    doc.y += headerHeight;

    /* ------------------------- Datos Cliente (izq) ------------------------- */
    const nombreCliente = cotizacion.nombre_cliente || 'N/A';
    const empresaCliente = cotizacion.empresa_cliente || 'N/A';
    const emailCliente = cotizacion.email_cliente || 'N/A';
    const telefonoCliente = cotizacion.telefono_cliente || 'N/A';

    const leftX = margin;
    const infoStartY = doc.y;

    doc
      .font(this.styles.fonts.bold)
      .fontSize(12)
      .fillColor('#000000')
      .text('cliente', leftX, infoStartY);

    const detailsY = infoStartY + 15;
    doc
      .font(this.styles.fonts.regular)
      .fontSize(10)
      .text(`Nombre: ${nombreCliente}`, leftX, detailsY)
      .text(`Empresa: ${empresaCliente}`, leftX, detailsY + 15)
      .text(`Email: ${emailCliente}`, leftX, detailsY + 30)
      .text(`Teléfono: ${telefonoCliente}`, leftX, detailsY + 45);

    /* -------------------------- Datos Cotización (der) ------------------------- */
    const rightBoxWidth = 200;
    const rightX = doc.page.width - margin - rightBoxWidth;

    const fecha = cotizacion.fecha_creacion
      ? new Date(cotizacion.fecha_creacion).toLocaleDateString('es-MX')
      : new Date().toLocaleDateString('es-MX');

    const tituloProyecto = this.computeProjectTitle(cotizacion);

    doc
      .font(this.styles.fonts.regular)
      .fontSize(10)
      .text(fecha, rightX, infoStartY, { width: rightBoxWidth, align: 'right' });

    doc
      .font(this.styles.fonts.bold)
      .fontSize(14)
      .text('COTIZACIÓN', rightX, infoStartY + 20, { width: rightBoxWidth, align: 'right' });

    doc
      .font(this.styles.fonts.bold)
      .fontSize(12)
      .text(tituloProyecto, rightX, infoStartY + 40, { width: rightBoxWidth, align: 'right' });

    // Asegurar que doc.y esté después del bloque más alto
    const blockHeight = Math.max(80, headerHeight);
    doc.y = infoStartY + blockHeight + 10;
  }

  /* --------------------------------- Footer ---------------------------------- */
  drawFooter (doc) {
    const { margin, footerHeight } = this.styles;
    const footerPath = path.join(this.imagePath, 'footer-sercodam.png');
    const y = doc.page.height - footerHeight - margin / 2;
    if (fs.existsSync(footerPath)) {
      doc.image(footerPath, margin, y, { width: doc.page.width - margin * 2 });
    } else {
      doc.fontSize(8).fillColor('#000000').text('Sercodam - www.sercodam.com', margin, y + 20, {
        align: 'center',
        width: doc.page.width - margin * 2
      });
    }
  }

  /* --------------------------- Descripción de proyecto ----------------------- */
  async drawDescripcionProyecto (doc, cotizacion, detalle) {
    const description = await this.generateDescription(cotizacion, detalle);
    this.drawSection(doc, 'DESCRIPCIÓN DEL PROYECTO', description);
  }

  async generateDescription (cotizacion, detalle) {
    try {
      if (!this.openai) {
        logger.warn('OpenAI no configurado, usando descripción por defecto');
        return this.generateDefaultDescription(cotizacion, detalle);
      }

      // Construir contexto detallado de la cotización
      const contexto = this.buildChatGPTContext(cotizacion, detalle);
      
      // Verificar caché usando hash del contexto
      const contextHash = require('crypto').createHash('md5').update(contexto).digest('hex');
      if (this.cache.descriptions.has(contextHash)) {
        logger.info('✅ Descripción obtenida del caché');
        return this.cache.descriptions.get(contextHash);
      }

      // Prompt más estricto para evitar información inventada y adaptar el texto al proyecto real
      const prompt = `Eres un especialista técnico de Sercodam encargado de redactar descripciones de proyectos para cotizaciones.\n\n` +
        `Debes generar UN SOLO PÁRRAFO (máx. 320 palabras) utilizando SOLO la información del contexto.\n` +
        `Tono profesional, claro y confiable.\n\n` +
        `Reglas obligatorias (síguelas al pie de la letra):\n` +
        `1. Describe qué se incluye (suministro e instalación, o solo suministro) de acuerdo con el indicador INCLUDE_INSTALLATION.\n` +
        `   - Si INCLUDE_INSTALLATION es "Sí", menciona que incluye instalación profesional.\n` +
        `   - Si es "No", no menciones servicios de instalación.\n` +
        `2. Menciona el tipo de material/red principal y, si existen, sus especificaciones técnicas (calibre, luz de malla, etc.).\n` +
        `3. Incluye siempre la referencia a la norma oficial mexicana NOM-009-STPS-2011.\n` +
        `4. No incluyas precios, costos, montos ni totales.\n` +
        `5. No inventes estructuras o "sistemas tipo T" a menos que "TIPO_SISTEMA" exista y coincida.\n` +
        `6. No inventes cantidades ni características que no estén en el contexto.\n` +
        `7. No uses listas, solo un párrafo corrido.
         8. Siempre inicia con algo asi: Presentamos a su amable consideración...\n\n` +
        `Contexto:\n${contexto}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto técnico de Sercodam especializado en redes de protección. Genera descripciones precisas y profesionales basándote ÚNICAMENTE en la información proporcionada.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });

      const textoGenerado = response.choices[0].message.content.trim();
      
      // Guardar en caché para futuras llamadas
      this.cache.descriptions.set(contextHash, textoGenerado);
      
      logger.info('✅ Descripción de proyecto generada con ChatGPT y guardada en caché');
      return textoGenerado;
    } catch (error) {
      logger.error('Error generando descripción con ChatGPT (v2):', error);
      return this.generateDefaultDescription(cotizacion, detalle);
    }
  }

  /**
   * Construye un contexto detallado para enviar a ChatGPT
   */
  buildChatGPTContext (cotizacion, detalle) {
    const productos = detalle || [];

    // Detectar material principal a partir de los nombres de producto
    const materialesDetectados = productos.map(p => (p.concepto || p.nombre_producto || '').toLowerCase());
    let materialPrincipal = 'nylon';
    if (materialesDetectados.some(t => t.includes('polipropileno'))) materialPrincipal = 'polipropileno';
    if (materialesDetectados.some(t => t.includes('polietileno'))) materialPrincipal = 'polietileno';
    if (materialesDetectados.some(t => t.includes('lona'))) materialPrincipal = 'lona';

    const ctxLines = [];
    ctxLines.push(`PROJECT_NAME: ${cotizacion.titulo_proyecto || 'N/A'}`);
    ctxLines.push(`PROJECT_TYPE: ${cotizacion.tipo_proyecto || 'N/A'}`);
    ctxLines.push(`TIPO_SISTEMA: ${cotizacion.sistema_tipo || 'N/A'}`);
    ctxLines.push(`INCLUDE_INSTALLATION: ${cotizacion.incluye_instalacion ? 'Sí' : 'No'}`);
    ctxLines.push(`MAIN_MATERIAL: ${materialPrincipal}`);
    if (cotizacion.dimensiones) ctxLines.push(`DIMENSIONS: ${cotizacion.dimensiones}`);
    if (cotizacion.area_proteccion) ctxLines.push(`AREA: ${cotizacion.area_proteccion}`);
    ctxLines.push(`PRODUCT_COUNT: ${productos.length}`);

    ctxLines.push('PRODUCT_LIST:');
    productos.forEach((item, idx) => {
      ctxLines.push(`${idx + 1}. ${item.concepto || item.nombre_producto} - ${item.cantidad} ${item.unidad || 'pza'}`);
    });

    return ctxLines.join('\n');
  }

  /**
   * Genera un texto descriptivo genérico si ChatGPT no está disponible
   */
  generateDefaultDescription (cotizacion, detalle) {
    const material = (cotizacion.tipo_material_principal || 'NYLON').toUpperCase();
    const areaText = cotizacion.area_proteccion ? `${cotizacion.area_proteccion} m²` : 'el área especificada';
    return `De acuerdo con su amable solicitud, nos permitimos presentar a ustedes el presupuesto de suministro ` +
      `e instalación del sistema tipo ${cotizacion.sistema_tipo || 'T'} con redes de protección 100% ${material} ` +
      `para la protección de ${areaText}, certificadas con la norma oficial mexicana (NOM-009-STPS-2011). ` +
      `El sistema incluye la estructura de los herrajes, mordazas, red y todos los accesorios necesarios para su correcta colocación.`;
  }

  /* --------------------------------- Tablas ---------------------------------- */
  async drawCenteredTable (doc, items) {
    const { margin, rowHeight } = this.styles;
    const pageWidth = doc.page.width;
    const usableWidth = pageWidth - margin * 2;

    // Definición de columnas solicitadas
    const columns = [
      { header: 'Part.',    key: 'partida',            width: 35,  align: 'center' },
      { header: 'Cant.',    key: 'cantidad',           width: 50,  align: 'center' },
      { header: 'Producto', key: 'producto',           width: 100, align: 'left'   },
      { header: 'Especific.', key: 'caracteristicas', width: 140, align: 'left' },
      { header: 'P.Unit.',  key: 'precio_unitario',   width: 60,  align: 'right' },
      { header: 'Subtotal', key: 'subtotal',          width: 60,  align: 'right' }
    ];

    const tableWidth = columns.reduce((s, c) => s + c.width, 0);
    const startX = margin + (usableWidth - tableWidth) / 2;

    /* --------------------------- Encabezado tabla --------------------------- */
    const drawHeader = () => {
      const headerY = doc.y; // Fijar Y para todo el header
      
      doc
        .font(this.styles.fonts.bold)
        .fontSize(9)
        .fillColor('#FFFFFF')
        .rect(startX, headerY, tableWidth, rowHeight)
        .fill(this.styles.colors.header)
        .fillColor('#FFFFFF');

      let x = startX;
      columns.forEach(col => {
        doc.text(col.header, x + 4, headerY + 5, {
          width: col.width - 8,
          align: col.align,
          lineBreak: false // Evitar que PDFKit cambie doc.y
        });
        x += col.width;
      });

      doc.y = headerY + rowHeight; // Mover Y manualmente
      doc.moveTo(startX, doc.y).lineTo(startX + tableWidth, doc.y).stroke(this.styles.colors.border);
    };

    drawHeader();

    // Restaurar color de texto para filas
    doc.fillColor('#000000');

    /* ------------------------------- Filas ---------------------------------- */
    items.forEach((item, i) => {
      // Calcular altura dinámica para la descripción
      const descText = (item.caracteristicas || '').substring(0, 200); // limitar descripción
      const descHeight = this.calculateTextHeight(descText, columns[3].width - 8, 8);
      const currentRowHeight = Math.max(rowHeight, descHeight + 6);

      // Verificar espacio y agregar página si es necesario
      this.addPageIfNeeded(doc, currentRowHeight);

      // Fondo alternado
      if (i % 2 === 0) {
        doc.rect(startX, doc.y, tableWidth, currentRowHeight).fill(this.styles.colors.zebra).fillColor('#000000');
      }

      const startRowY = doc.y; // Fijar Y al inicio de la fila
      let x = startX;
      columns.forEach(col => {
        let value = '';
        switch (col.key) {
          case 'partida':
            value = item.partida || String.fromCharCode(65 + i);
            break;
          case 'cantidad':
            value = `${item.cantidad} ${item.unidad || 'pza'}`;
            break;
          case 'producto':
            value = item.concepto || item.nombre_producto || item.notas || 'Producto';
            break;
          case 'caracteristicas':
            value = descText; // Usar texto limitado
            break;
          case 'precio_unitario':
            value = this.formatCurrency(item.precio_unitario);
            break;
          case 'subtotal':
            value = this.formatCurrency(item.subtotal);
            break;
          default:
            value = String(item[col.key] || '');
        }

        doc.text(value, x + 4, startRowY + 4, {
          width: col.width - 8,
          align: col.align,
          lineBreak: false // Evitar que PDFKit cambie doc.y
        });
        x += col.width;
      });

      doc.y += currentRowHeight;
      doc.moveTo(startX, doc.y).lineTo(startX + tableWidth, doc.y).stroke('#EEEEEE');
    });
  }

  /* --------------------------------- Totales --------------------------------- */
  drawTotales (doc, cotizacion) {
    const { margin, rowHeight } = this.styles;
    this.addPageIfNeeded(doc, rowHeight * 3 + 20);

    const labelWidth = 100;
    const valueWidth = 100;
    const startX = doc.page.width - margin - labelWidth - valueWidth;
    const yStart = doc.y + 10;

    doc.font(this.styles.fonts.bold).fontSize(10).fillColor(this.styles.colors.primary);
    doc.text('SUBTOTAL:', startX, yStart);
    doc.text('IVA (16%):', startX, yStart + rowHeight);
    doc.text('TOTAL:', startX, yStart + rowHeight * 2);

    const valueX = startX + labelWidth;
    doc.font(this.styles.fonts.regular).fillColor('#000000');
    doc.text(this.formatCurrency(cotizacion.subtotal), valueX, yStart, { width: valueWidth, align: 'right' });
    doc.text(this.formatCurrency(cotizacion.iva), valueX, yStart + rowHeight, { width: valueWidth, align: 'right' });
    doc.font(this.styles.fonts.bold).fontSize(12);
    doc.text(this.formatCurrency(cotizacion.total), valueX, yStart + rowHeight * 2, { width: valueWidth, align: 'right' });

    doc.y = yStart + rowHeight * 3 + 10;
  }

  /* ------------------------------- Secciones --------------------------------- */
  drawSection (doc, title, content) {
    const availableWidth = doc.page.width - this.styles.margin * 2;
    const textHeight = this.calculateTextHeight(content, availableWidth - 20, 10);
    const blockHeight = textHeight + 30; // Reducir padding

    this.addPageIfNeeded(doc, blockHeight);

    // Título
    doc.font(this.styles.fonts.bold).fontSize(12).fillColor(this.styles.colors.primary).text(title, this.styles.margin, doc.y);

    // Contenido
    doc.font(this.styles.fonts.regular).fontSize(10).fillColor('#000000').text(content, this.styles.margin + 20, doc.y + 20, {
      width: availableWidth - 40,
      align: 'justify'
    });

    doc.moveDown(5);
  }

  /* ------------------------ Sección de garantía con caja elegante ------------------------ */
  drawGarantiaSection (doc) {
    const garantiaText = 'Nuestros trabajos cuentan con la garantía contra cualquier defecto de mano de obra y materiales utilizados para su correcta ejecución, quedando exentos de condiciones climatológicas o de cualquier naturaleza o por actos de abuso humano que se originen ajenos a nuestra mano de obra calificada, considerando que están estimados y planificados para durar la vida útil de la red, recomendando dar un mantenimiento anual.';
    
    // Calcular dimensiones necesarias
    const boxWidth = doc.page.width - this.styles.margin * 2;
    const textPadding = 25;
    const availableTextWidth = boxWidth - textPadding;
    
    // Calcular altura del texto dinámicamente
    const textHeight = this.calculateTextHeight(garantiaText, availableTextWidth, 10);
    const boxHeight = Math.max(80, textHeight + 30); // Mínimo 80px, o texto + padding
    
    // Verificar si hay espacio suficiente, si no agregar nueva página
    this.addPageIfNeeded(doc, boxHeight + 50); // +50 para título y spacing
    
    // Título principal
    doc.font(this.styles.fonts.bold)
       .fontSize(14)
       .fillColor(this.styles.colors.primary)
       .text('GARANTÍA', this.styles.margin, doc.y + 15);

    // Posición del cuadro
    const boxY = doc.y + 10;

    // Dibujar cuadro con sombra (mismo estilo que ficha técnica)
    doc.rect(this.styles.margin + 2, boxY + 2, boxWidth, boxHeight).fill('#CCCCCC'); // Sombra
    doc.rect(this.styles.margin, boxY, boxWidth, boxHeight).fill('#FFFFFF').stroke('#DDDDDD'); // Cuadro principal
    
    // Línea izquierda de color (marca de Sercodam)
    doc.rect(this.styles.margin, boxY, 4, boxHeight).fill(this.styles.colors.primary);
    
    // Texto de garantía
    doc.font(this.styles.fonts.regular)
       .fontSize(10)
       .fillColor('#000000')
       .text(garantiaText, this.styles.margin + 15, boxY + 15, {
         width: availableTextWidth,
         align: 'justify'
       });

    // Actualizar posición del documento
    doc.y = boxY + boxHeight + 20;
  }

  /* ------------------------ Sección de conceptos extra con precios ------------------------ */
  drawConceptosExtraSection (doc, cotizacion) {
    // Obtener conceptos desde la lista JSON
    let conceptosList = [];
    
    if (cotizacion.conceptos_extra_list) {
      try {
        const parsedList = typeof cotizacion.conceptos_extra_list === 'string' 
          ? JSON.parse(cotizacion.conceptos_extra_list) 
          : cotizacion.conceptos_extra_list;
        conceptosList = Array.isArray(parsedList) ? parsedList : [];
      } catch (error) {
        logger.warn('Error parsing conceptos_extra_list JSON:', error);
        conceptosList = [];
      }
    }
    
    if (conceptosList.length === 0) {
      return; // No hay conceptos para mostrar
    }
    
    // Calcular espacio necesario
    const lineHeight = 18;
    const conceptHeight = conceptosList.length * (lineHeight + 20); // Espacio para concepto + precio
    const totalHeight = conceptHeight + 50; // Título + padding
    
    this.addPageIfNeeded(doc, totalHeight);
    
    // Título principal
    doc.font(this.styles.fonts.bold)
       .fontSize(14)
       .fillColor(this.styles.colors.primary)
       .text('CONCEPTOS EXTRAS:', this.styles.margin, doc.y + 15);
    
    let currentY = doc.y + 25;
    
    // Dibujar cada concepto con su precio individual
    conceptosList.forEach(conceptoItem => {
      if (conceptoItem.concepto && conceptoItem.concepto.trim()) {
        // Nombre del concepto
        doc.font(this.styles.fonts.regular)
           .fontSize(10)
           .fillColor('#000000')
           .text(`${conceptoItem.concepto.trim()}.`, this.styles.margin, currentY, {
             width: doc.page.width - this.styles.margin * 2,
             align: 'left'
           });
        
        currentY += lineHeight;
        
        // Precio individual si está definido
        if (conceptoItem.precio > 0) {
          const precioFormateado = this.formatCurrency(conceptoItem.precio);
          const precioTexto = `Precio servicio c/u: ${precioFormateado} + IVA (Opcional).`;
          
          doc.font(this.styles.fonts.regular)
             .fontSize(10)
             .fillColor('#000000')
             .text(precioTexto, this.styles.margin, currentY, {
               width: doc.page.width - this.styles.margin * 2,
               align: 'left'
             });
          
          currentY += 15; // Espacio extra después del precio
        }
        
        currentY += 5; // Espacio entre conceptos
      }
    });
    
    // Actualizar posición del documento
    doc.y = currentY + 10;
  }

  /* ------------------------ Mensaje final fijo ------------------------ */
  drawMensajeFinal (doc) {
    const mensajeFinal = 'En espera de su pedido y anticipo, estamos a sus órdenes para cualquier aclaración y/o comentario.';
    
    // Verificar espacio suficiente
    this.addPageIfNeeded(doc, 80);
    
    // Agregar espacio antes del mensaje
    doc.y += 20;
    
    // Dibujar cuadro elegante para el mensaje
    const boxWidth = doc.page.width - this.styles.margin * 2;
    const boxHeight = 60;
    const boxY = doc.y;

    // Cuadro con sombra y borde
    doc.rect(this.styles.margin + 2, boxY + 2, boxWidth, boxHeight).fill('#CCCCCC'); // Sombra
    doc.rect(this.styles.margin, boxY, boxWidth, boxHeight).fill('#F8F9FA').stroke('#DDDDDD'); // Cuadro principal
    
    // Línea superior de color
    doc.rect(this.styles.margin, boxY, boxWidth, 4).fill(this.styles.colors.primary);
    
    // Texto del mensaje centrado
    doc.font(this.styles.fonts.bold)
       .fontSize(11)
       .fillColor('#000000')
       .text(mensajeFinal, this.styles.margin + 20, boxY + 20, {
         width: boxWidth - 40,
         align: 'center'
       });

    // Actualizar posición
    doc.y = boxY + boxHeight + 15;
  }

  /* ------------------------ Imagen del proyecto según título ------------------------ */
  async drawImagenProyecto (doc, cotizacion) {
    try {
      // Obtener imagen desde la base de datos
      const imagenData = await this.obtenerImagenProyecto(cotizacion.titulo_proyecto);
      
      if (imagenData && imagenData.foto) {
        // Verificar espacio suficiente para la imagen
        this.addPageIfNeeded(doc, 200);
        
        // Construir ruta de la imagen
        const imagePath = path.join(this.imagePath, imagenData.foto);
        
        if (fs.existsSync(imagePath)) {
          // Centrar la imagen
          const imageWidth = 200;
          const imageHeight = 150;
          const centerX = (doc.page.width - imageWidth) / 2;
          
          doc.image(imagePath, centerX, doc.y, {
            width: imageWidth,
            height: imageHeight
          });
          
          // Actualizar posición
          doc.y += imageHeight + 20;
          
          logger.info(`✅ Imagen del proyecto agregada: ${imagenData.foto}`);
        } else {
          logger.warn(`⚠️ Imagen no encontrada en: ${imagePath}`);
          this.drawImagenPlaceholder(doc);
        }
      } else {
        logger.warn(`⚠️ No se encontró imagen para el proyecto: ${cotizacion.titulo_proyecto}`);
        this.drawImagenPlaceholder(doc);
      }
    } catch (error) {
      logger.error('Error cargando imagen del proyecto:', error);
      this.drawImagenPlaceholder(doc);
    }
  }

  /**
   * Dibuja un placeholder cuando no hay imagen disponible
   */
  drawImagenPlaceholder (doc) {
    const boxWidth = 200;
    const boxHeight = 150;
    const centerX = (doc.page.width - boxWidth) / 2;
    const boxY = doc.y;

    // Cuadro placeholder
    doc.rect(centerX, boxY, boxWidth, boxHeight)
       .fill('#F5F5F5')
       .stroke('#CCCCCC');
    
    // Texto placeholder
    doc.font(this.styles.fonts.regular)
       .fontSize(10)
       .fillColor('#666666')
       .text('Imagen del proyecto\nno disponible', centerX + 10, boxY + boxHeight/2 - 10, {
         width: boxWidth - 20,
         align: 'center'
       });

    // Actualizar posición
    doc.y = boxY + boxHeight + 20;
  }

  /**
   * Obtiene la imagen del proyecto desde la base de datos
   */
  async obtenerImagenProyecto (tituloProyecto) {
    try {
      const knex = require('../config/database');
      
      const imagenProyecto = await knex('catalogo_1.titulo_proyecto')
        .select('foto')
        .where('titulo_proyecto', tituloProyecto)
        .first();
      
      return imagenProyecto;
    } catch (error) {
      logger.error('Error obteniendo imagen del proyecto:', error);
      return null;
    }
  }

  /* ------------------------------ Utilidades --------------------------------- */
  calculateTextHeight (text, width, fontSize) {
    // Validación de entrada
    if (!text || typeof text !== 'string') {
      return fontSize * 1.2; // Altura de una línea por defecto
    }
    
    const words = text.split(' ');
    const charsPerLine = Math.floor(width / (fontSize * 0.6));
    let lines = 0;
    let currentLineLen = 0;
    words.forEach(word => {
      if (currentLineLen + word.length > charsPerLine) {
        lines++;
        currentLineLen = word.length + 1;
      } else {
        currentLineLen += word.length + 1;
      }
    });
    if (currentLineLen > 0) lines++;
    return lines * fontSize * 1.2;
  }

  computeProjectTitle (cotizacion) {
    return cotizacion.titulo_proyecto || cotizacion.tipo_proyecto || 'Proyecto Sercodam';
  }

  formatCurrency (amount) {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
  }

  /* ------------------------ Condiciones de pago y entrega ------------------- */
  drawCondicionesSection (doc, cotizacion) {
    this.addPageIfNeeded(doc, 150);

    const lineHeight = 18; // Reducir espaciado
    const leftX = this.styles.margin;
    const rightX = this.styles.margin + 200;

    let currentY = doc.y + 15;

    // Condiciones de pago
    doc.font(this.styles.fonts.bold)
       .fontSize(12)
       .fillColor(this.styles.colors.primary)
       .text('Condiciones de pago:', leftX, currentY, { lineBreak: false });
    
    doc.font(this.styles.fonts.regular)
       .fontSize(10)
       .fillColor('#000000')
       .text(cotizacion.condiciones_pago || 'No especificadas', rightX, currentY, { lineBreak: false });

    currentY += lineHeight;

    // Flete
    doc.font(this.styles.fonts.bold)
       .fontSize(12)
       .fillColor(this.styles.colors.primary)
       .text('Flete:', leftX, currentY, { lineBreak: false });
    
    doc.font(this.styles.fonts.regular)
       .fontSize(10)
       .fillColor('#000000')
       .text(cotizacion.condiciones_envio || 'No especificadas', rightX, currentY, { lineBreak: false });

    currentY += lineHeight;

    // Tiempo de entrega
    doc.font(this.styles.fonts.bold)
       .fontSize(12)
       .fillColor(this.styles.colors.primary)
       .text('Tiempo de entrega:', leftX, currentY, { lineBreak: false });
    
    doc.font(this.styles.fonts.regular)
       .fontSize(10)
       .fillColor('#000000')
       .text(cotizacion.tiempo_entrega || 'No especificado', rightX, currentY, { lineBreak: false });

    currentY += lineHeight;

    // Tiempo de instalación
    doc.font(this.styles.fonts.bold)
       .fontSize(12)
       .fillColor(this.styles.colors.primary)
       .text('Tiempo de Instalación:', leftX, currentY, { lineBreak: false });
    
    doc.font(this.styles.fonts.regular)
       .fontSize(10)
       .fillColor('#000000')
       .text(cotizacion.tiempo_instalacion || 'No especificado', rightX, currentY, { lineBreak: false });

    currentY += lineHeight;

    // Vigencia de cotización
    doc.font(this.styles.fonts.bold)
       .fontSize(12)
       .fillColor(this.styles.colors.primary)
       .text('Vigencia de cotización:', leftX, currentY, { lineBreak: false });
    
    const vigenciaText = `${cotizacion.dias_validez || 15} días a partir de la fecha de emisión`;
    doc.font(this.styles.fonts.regular)
       .fontSize(10)
       .fillColor('#000000')
       .text(vigenciaText, rightX, currentY, { lineBreak: false });

    currentY += lineHeight + 10;

    // Dibujar sección de instalación detallada
    this.drawInstalacionSection(doc, cotizacion, leftX, currentY);
    
    // Actualizar doc.y 
    doc.y += 40;
  }

  /* ------------------------ Sección de instalación detallada ------------------------ */
  drawInstalacionSection (doc, cotizacion, startX, startY) {
    let currentY = startY;
    const margin = this.styles.margin;
    const lineHeight = 18;

    // Verificar si incluye instalación
    if (!cotizacion.incluye_instalacion_seccion && !cotizacion.incluye_instalacion) {
      // Solo mostrar el indicador de no incluir instalación
      const checkSymbol = 'X';
      const checkText = 'Instalación no incluida en esta cotización';
      
      doc.font(this.styles.fonts.bold)
         .fontSize(12)
         .fillColor('#000000')
         .text('INSTALACIÓN', startX, currentY, { lineBreak: false });
      
      currentY += 20;
      
      doc.font(this.styles.fonts.regular)
         .fontSize(10)
         .fillColor('#000000')
         .text(`${checkSymbol} ${checkText}`, startX, currentY, { lineBreak: false });
      
      doc.y = currentY + 20;
      return;
    }

    // Título principal de INSTALACIÓN
    doc.font(this.styles.fonts.bold)
       .fontSize(14)
       .fillColor('#000000')
       .text('INSTALACIÓN', startX, currentY, { lineBreak: false });
    
    currentY += 25;

    // Subtítulo "Incluye:"
    doc.font(this.styles.fonts.bold)
       .fontSize(12)
       .fillColor('#000000')
       .text('Incluye:', startX, currentY, { lineBreak: false });
    
    currentY += 20;

    // Contenido de lo que incluye la instalación
    const instalacionData = this.extractInstalacionData(cotizacion);
    
    if (instalacionData.incluye && instalacionData.incluye.length > 0) {
      instalacionData.incluye.forEach(item => {
        this.addPageIfNeeded(doc, 25);
        
        doc.font(this.styles.fonts.regular)
           .fontSize(10)
           .fillColor('#000000')
           .text(`• ${item.toUpperCase()}`, startX + 10, currentY, { 
             width: 500,
             lineBreak: true 
           });
        
        currentY += this.calculateTextHeight(item, 500, 10) + 5;
      });
    } else {
      // Texto por defecto si no hay contenido específico
      const defaultIncludes = [
        'MANO DE OBRA CERTIFICADA PARA TRABAJOS A GRAN ALTURA (DC-3)',
        'HERRAMIENTA Y EQUIPOS COMPLETO PARA LA CORRECTA INSTALACIÓN',
        'MATERIALES DE FIJACIÓN Y SUJECIÓN NECESARIOS',
        'TRASLADO HASTA LA UBICACIÓN DEL PROYECTO'
      ];
      
      defaultIncludes.forEach(item => {
        this.addPageIfNeeded(doc, 25);
        
        doc.font(this.styles.fonts.regular)
           .fontSize(10)
           .fillColor('#000000')
           .text(`• ${item}`, startX + 10, currentY, { lineBreak: false });
        
        currentY += lineHeight;
      });
    }

    currentY += 15;

    // Sección "No Incluye:" si hay contenido
    if (instalacionData.noIncluye && instalacionData.noIncluye.length > 0) {
      doc.font(this.styles.fonts.bold)
         .fontSize(12)
         .fillColor('#000000')
         .text('No Incluye:', startX, currentY, { lineBreak: false });
      
      currentY += 20;

      instalacionData.noIncluye.forEach(item => {
        this.addPageIfNeeded(doc, 25);
        
        doc.font(this.styles.fonts.regular)
           .fontSize(10)
           .fillColor('#000000')
           .text(`• ${item.toUpperCase()}`, startX + 10, currentY, { 
             width: 500,
             lineBreak: true 
           });
        
        currentY += this.calculateTextHeight(item, 500, 10) + 5;
      });
    }

    // Actualizar posición del documento
    doc.y = currentY;
  }

  /**
   * Extrae datos de instalación desde la base de datos (optimizado)
   */
  extractInstalacionData (cotizacion) {
    // PRIORIDAD 1: Usar datos reales desde la base de datos
    if (cotizacion.instalacion_incluye || cotizacion.instalacion_no_incluye) {
      logger.info('✅ Usando datos de instalación desde BD');
      return {
        incluye: cotizacion.instalacion_incluye ? 
          cotizacion.instalacion_incluye.split('\n').filter(line => line.trim()) : [],
        noIncluye: cotizacion.instalacion_no_incluye ? 
          cotizacion.instalacion_no_incluye.split('\n').filter(line => line.trim()) : []
      };
    }

    // PRIORIDAD 2: Datos por defecto cuando incluye instalación pero no hay datos específicos
    if (cotizacion.incluye_instalacion || cotizacion.incluye_instalacion_seccion) {
      logger.warn('⚠️ Usando datos por defecto para instalación (campos BD vacíos)');
      
      const defaultIncluye = [
        'MANO DE OBRA CERTIFICADA PARA TRABAJOS A GRAN ALTURA (DC-3)',
        'HERRAMIENTA Y EQUIPOS COMPLETO PARA LA CORRECTA INSTALACIÓN',
        'MATERIALES DE FIJACIÓN Y SUJECIÓN NECESARIOS',
        'TRASLADO HASTA LA UBICACIÓN DEL PROYECTO'
      ];

      return { incluye: defaultIncluye, noIncluye: [] };
    }

    logger.info('ℹ️ No incluye instalación - retornando datos vacíos');
    return { incluye: [], noIncluye: [] };
  }

  /* ------------------------ Ficha técnica y producto ------------------------ */
  async drawFichaTecnicaSection (doc, detalle) {
    const fichaTecnica = await this.obtenerFichaTecnica(detalle);
    
    // Verificar espacio necesario
    this.addPageIfNeeded(doc, 200);

    // Título principal
    doc.font(this.styles.fonts.bold)
       .fontSize(14)
       .fillColor(this.styles.colors.primary)
       .text('Características de la Red:', this.styles.margin, doc.y + 15);

    // Subtítulo
    doc.font(this.styles.fonts.bold)
       .fontSize(12)
       .fillColor(this.styles.colors.primary)
       .text('Especificaciones Técnicas', this.styles.margin, doc.y + 20);

    // Cuadro elegante con ficha técnica
    const boxY = doc.y + 10;
    const boxHeight = 80;
    const boxWidth = doc.page.width - this.styles.margin * 2;

    if (fichaTecnica && fichaTecnica.ficha_tecnica) {
      // Dibujar cuadro con sombra
      doc.rect(this.styles.margin + 2, boxY + 2, boxWidth, boxHeight).fill('#CCCCCC'); // Sombra
      doc.rect(this.styles.margin, boxY, boxWidth, boxHeight).fill('#FFFFFF').stroke('#DDDDDD'); // Cuadro principal
      
      // Línea izquierda de color
      doc.rect(this.styles.margin, boxY, 4, boxHeight).fill(this.styles.colors.primary);
      
      // Texto de ficha técnica
      doc.font(this.styles.fonts.regular)
         .fontSize(10)
         .fillColor('#000000')
         .text(fichaTecnica.ficha_tecnica, this.styles.margin + 15, boxY + 15, {
           width: boxWidth - 25,
           align: 'justify'
         });
    } else {
      // Cuadro por defecto si no hay ficha técnica
      doc.rect(this.styles.margin + 2, boxY + 2, boxWidth, boxHeight).fill('#CCCCCC'); // Sombra
      doc.rect(this.styles.margin, boxY, boxWidth, boxHeight).fill('#FFFFFF').stroke('#DDDDDD'); // Cuadro principal
      doc.rect(this.styles.margin, boxY, 4, boxHeight).fill(this.styles.colors.primary);
      
      doc.font(this.styles.fonts.regular)
         .fontSize(10)
         .fillColor('#666666')
         .text('Especificaciones técnicas no disponibles para este producto.', this.styles.margin + 15, boxY + 30, {
           width: boxWidth - 25,
           align: 'center'
         });
    }

    doc.y = boxY + boxHeight + 20;

    // Sección de producto
    doc.font(this.styles.fonts.bold)
       .fontSize(12)
       .fillColor(this.styles.colors.primary)
       .text('Producto:', this.styles.margin, doc.y);

    // Imagen del producto
    if (fichaTecnica && fichaTecnica.foto) {
      const imagePath = path.join(this.imagePath, fichaTecnica.foto);
      if (fs.existsSync(imagePath)) {
        doc.image(imagePath, this.styles.margin, doc.y + 10, { width: 200 });
        doc.y += 160; // Espacio para la imagen
      } else {
        doc.font(this.styles.fonts.regular)
           .fontSize(10)
           .fillColor('#666666')
           .text('Imagen del producto no disponible.', this.styles.margin, doc.y + 15);
        doc.y += 30;
      }
    } else {
      doc.font(this.styles.fonts.regular)
         .fontSize(10)
         .fillColor('#666666')
         .text('Imagen del producto no disponible.', this.styles.margin, doc.y + 15);
      doc.y += 30;
    }
  }

  async obtenerFichaTecnica (detalle) {
    try {
      const knex = require('../config/database');
      
      // Buscar productos que tengan id_item (paños)
      const productosConId = detalle.filter(item => item.id_item);

      if (productosConId.length === 0) {
        return null;
      }

      // Obtener el primer producto con id_item
      const producto = productosConId[0];
      
      if (producto && producto.id_item) {
        // Verificar caché
        const cacheKey = `item_${producto.id_item}`;
        if (this.cache.fichasTecnicas.has(cacheKey)) {
          logger.info('✅ Ficha técnica obtenida del caché');
          return this.cache.fichasTecnicas.get(cacheKey);
        }

        // Optimización: usar JOIN para obtener ficha técnica en una sola consulta
        const fichaTecnica = await knex('catalogo_1.pano as p')
          .join('catalogo_1.red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
          .select('rp.*')
          .where('p.id_item', producto.id_item)
          .first();
        
        // Guardar en caché
        if (fichaTecnica) {
          this.cache.fichasTecnicas.set(cacheKey, fichaTecnica);
        }
          
        return fichaTecnica;
      }

      return null;
    } catch (error) {
      logger.error('Error obteniendo ficha técnica:', error);
      return null;
    }
  }
}

module.exports = new CotizacionPdfServiceV2();