const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
const OpenAI = require('openai');

class CotizacionPdfService {
  constructor() {
    // Estilos centralizados
    this.styles = {
      margin: 50,
      headerHeight: 80,
      footerHeight: 60,
      colors: { 
        primary: '#8B0000',
        secondary: '#666666',
        background: '#F8F9FA',
        zebra: '#FAFAFA'
      },
      fonts: { 
        regular: 'Helvetica', 
        bold: 'Helvetica-Bold' 
      }
    };
    
    this.fontPath = path.join(__dirname, '../../public/fonts');
    this.imagePath = path.join(__dirname, '../../public/images/public/images');
    
    // Inicializar OpenAI
    this.openai = null;
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    
    // Verificar que el directorio de imágenes existe
    if (!fs.existsSync(this.imagePath)) {
      console.warn(`Directorio de imágenes no encontrado: ${this.imagePath}`);
      // Intentar con path alternativo
      this.imagePath = path.join(__dirname, '../../../public/images/public/images');
      if (!fs.existsSync(this.imagePath)) {
        console.warn(`Directorio de imágenes alternativo no encontrado: ${this.imagePath}`);
      }
    }
    
    // Listar archivos en el directorio para debug
    try {
      const files = fs.readdirSync(this.imagePath);
      console.log('Archivos encontrados en el directorio de imágenes:', files);
    } catch (error) {
      console.warn('No se pudo leer el directorio de imágenes:', error.message);
    }
  }

  /**
   * Genera el PDF de una cotización
   * @param {Object} cotizacion - Datos de la cotización
   * @param {Array} detalle - Items de la cotización
   * @param {Object} fichaTecnica - Ficha técnica del producto (opcional)
   * @returns {Buffer} - Buffer del PDF generado
   */
  async generateCotizacionPDF(cotizacion, detalle = [], fichaTecnica = null) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Configurar footer en todas las páginas
        doc.on('pageAdded', () => {
          this.addFooterToPage(doc);
        });

        // Configurar fuentes
        this.setupFonts(doc);

        // Generar contenido del PDF
        this.generateHeader(doc, { ...cotizacion, detalle });
        const descripcionEndY = await this.generateDescripcionProyecto(doc, cotizacion, fichaTecnica);
        
        // Generar tabla de productos con totales en nueva página
        const tablaConTotalesEndY = this.generateTablaConTotales(doc, detalle, cotizacion);
        
        // Generar ficha técnica debajo de la tabla
        const fichaTecnicaEndY = await this.generateFichaTecnica(doc, detalle, tablaConTotalesEndY);
        
        // Generar condiciones de pago pegadas
        const condicionesEndY = this.generateCondicionesPago(doc, cotizacion, fichaTecnicaEndY);
        
        // Generar sección de instalación (opcional) pegada
        const instalacionEndY = this.generateSeccionInstalacion(doc, cotizacion, condicionesEndY);
        
        // Generar sección de garantía pegada
        this.generateSeccionGarantia(doc, instalacionEndY);
        
        if (cotizacion.observaciones) {
          this.generateSeccionObservaciones(doc, cotizacion);
        }
        
        if (cotizacion.no_incluye) {
          this.generateSeccionNoIncluye(doc, cotizacion);
        }
        
        if (cotizacion.notas) {
          this.generateSeccionNotas(doc, cotizacion);
        }
        
        if (cotizacion.conceptos_extra) {
          this.generateSeccionConceptosExtra(doc, cotizacion);
        }
        
        if (cotizacion.titulo_clausula_personalizada) {
          this.generateSeccionClausulaPersonalizada(doc, cotizacion);
        }

        this.generateFooter(doc);

        doc.end();
      } catch (error) {
        logger.error('Error generando PDF de cotización:', error);
        reject(error);
      }
    });
  }

  /**
   * Configura las fuentes del documento
   */
  setupFonts(doc) {
    // Usar fuentes por defecto de PDFKit
    doc.font(this.styles.fonts.regular);
    doc.fontSize(10);
    doc.fillColor('#000000');
  }

  /**
   * Calcula la altura del texto dinámicamente
   */
  calculateTextHeight(text, width, fontSize, lineGap = 1.2) {
    const avgCharWidth = fontSize * 0.6;
    const charsPerLine = Math.floor(width / avgCharWidth);
    const words = text.split(' ');
    let lines = 1, currentLen = 0;
    words.forEach(w => {
      if (currentLen + w.length > charsPerLine) {
        lines++;
        currentLen = w.length + 1;
      } else {
        currentLen += w.length + 1;
      }
    });
    return lines * fontSize * lineGap;
  }

  /**
   * Verifica si hay espacio suficiente en la página actual
   */
  checkPageSpace(doc, requiredHeight) {
    const spaceLeft = doc.page.height - doc.y - this.styles.margin - this.styles.footerHeight;
    return spaceLeft >= requiredHeight;
  }

  /**
   * Agrega nueva página si es necesario
   */
  addPageIfNeeded(doc, requiredHeight) {
    if (!this.checkPageSpace(doc, requiredHeight)) {
      doc.addPage();
      return true; // Se agregó nueva página
    }
    return false; // No se necesitó nueva página
  }

  /**
   * Renderiza una sección con título y contenido
   */
  renderSection(doc, title, content, options = {}) {
    doc.moveDown(1);
    
    // Título de la sección
    doc.font(this.styles.fonts.bold)
       .fontSize(12)
       .fillColor(this.styles.colors.primary)
       .text(title, 50, doc.y + 10)
       .fillColor('#000000');
    
    doc.moveDown(0.5);
    
    // Calcular altura del contenido
    const availableWidth = doc.page.width - 2 * this.styles.margin;
    const blockHeight = this.calculateTextHeight(content, availableWidth, 10);
    
    // Verificar espacio disponible
    this.addPageIfNeeded(doc, blockHeight + 30);
    
    // Contenido
    doc.font(this.styles.fonts.regular)
       .fontSize(10)
       .text(content, 70, doc.y + 5, {
         width: availableWidth - 40,
         align: options.align || 'justify'
       });
    
    return doc.y + 20;
  }

  /**
   * Renderiza un cuadro con borde y línea roja izquierda
   */
  renderBox(doc, content, options = {}) {
    const textHeight = this.calculateTextHeight(content, 480, 10);
    const boxHeight = Math.max(60, textHeight + 20);
    
    // Dibujar cuadro
    doc.rect(50, doc.y - 5, 500, boxHeight)
       .stroke();
    
    // Línea roja vertical izquierda
    doc.strokeColor(this.styles.colors.primary)
       .lineWidth(3)
       .moveTo(50, doc.y - 5)
       .lineTo(50, doc.y + boxHeight - 5)
       .stroke()
       .strokeColor('#000000')
       .lineWidth(1);
    
    // Contenido del cuadro
    doc.font(this.styles.fonts.regular)
       .fontSize(10)
       .text(content, 60, doc.y + 10, { 
         width: 480, 
         align: options.align || 'justify' 
       });
    
    return doc.y + boxHeight + 20;
  }

  /**
   * Genera el header del PDF
   */
  generateHeader(doc, cotizacion) {
    // Header de Sercodam
    const headerPath = path.join(this.imagePath, 'header-sercodam.png');
    console.log('🔍 Buscando header en:', headerPath);
    console.log('🔍 Directorio de imágenes:', this.imagePath);
    
    if (fs.existsSync(headerPath)) {
      console.log('✅ Header encontrado, agregando al PDF');
      doc.image(headerPath, 50, 30, { width: 500 });
    } else {
      console.log('❌ Header no encontrado, usando fallback');
      // Fallback si no existe la imagen del header
      // Logo de Sercodam
      const logoPath = path.join(this.imagePath, 'logo-sercodam.png');
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 30, { width: 120 });
      }

      // Información de la empresa
      doc.fontSize(10)
         .text('SERCODAM', 200, 30)
         .fontSize(8)
         .text('Especialistas en Redes Deportivas y Sistemas de Protección', 200, 45)
         .text('Tel: (55) 1234-5678 | Email: info@sercodam.com', 200, 60)
         .text('www.sercodam.com', 200, 75);
    }

    // Calcular altura del header para posicionar el contenido
    const headerHeight = fs.existsSync(headerPath) ? 100 : 80;
    const startY = 30 + headerHeight;
    
    // Extraer datos automáticamente
    const nombreCliente = cotizacion.nombre_cliente || 'N/A';
    const fecha = new Date(cotizacion.fecha_creacion).toLocaleDateString('es-MX');
    const tituloProyecto = this.generarTituloProyecto(cotizacion);
    const tipoProyecto = cotizacion.tipo_proyecto || 'Proyecto Sercodam';
    
    // Formato según la imagen: Nombre a la izquierda, fecha y título a la derecha
    const leftX = 50;
    const rightX = 300;
    const centerX = 175; // Punto medio para la línea separadora
    
    // Cliente (izquierda, arriba)
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('cliente', leftX, startY);
    
    // Información del cliente (izquierda, abajo)
    doc.fontSize(10)
       .font('Helvetica')
       .text(`Nombre: ${nombreCliente}`, leftX, startY + 20)
       .text(`Empresa: ${cotizacion.empresa_cliente || 'N/A'}`, leftX, startY + 35)
       .text(`Email: ${cotizacion.email_cliente || 'N/A'}`, leftX, startY + 50)
       .text(`Teléfono: ${cotizacion.telefono_cliente || 'N/A'}`, leftX, startY + 65);
    
    // Línea separadora vertical
    doc.moveTo(centerX, startY - 5)
       .lineTo(centerX, startY + 80)
       .stroke();
    
    // Fecha (derecha, arriba)
    doc.fontSize(10)
       .font('Helvetica')
       .text(fecha, rightX, startY, { align: 'right' });
    
    // "COTIZACIÓN" (derecha, medio)
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .text('COTIZACIÓN', rightX, startY + 20, { align: 'right' });
    
    // Título del proyecto (derecha, abajo)
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text(tituloProyecto, rightX, startY + 40, { align: 'right' });

    doc.moveDown(3);
  }

  /**
   * Genera el título del proyecto basado en los productos de la cotización
   */
  generarTituloProyecto(cotizacion) {
    // Si ya existe un título del proyecto, usarlo
    if (cotizacion.titulo_proyecto) {
      return cotizacion.titulo_proyecto;
    }
    
    // Si no existe, generar uno basado en los productos
    const productos = cotizacion.detalle || [];
    const tiposProductos = new Set();
    let incluyeInstalacion = false;
    
    productos.forEach(item => {
      // Detectar tipo de producto basado en el concepto o nombre
      const concepto = (item.concepto || item.nombre_producto || '').toLowerCase();
      
      // Mapear conceptos a tipos de productos
      if (concepto.includes('red') || concepto.includes('malla')) {
        if (concepto.includes('deportiva') || concepto.includes('futbol') || concepto.includes('tenis')) {
          tiposProductos.add('Red Deportiva');
        } else if (concepto.includes('perimetral') || concepto.includes('seguridad')) {
          tiposProductos.add('Red Perimetral');
        } else if (concepto.includes('industrial')) {
          tiposProductos.add('Red Industrial');
        } else {
          tiposProductos.add('Red');
        }
      } else if (concepto.includes('poste') || concepto.includes('tubo')) {
        tiposProductos.add('Postes');
      } else if (concepto.includes('cable') || concepto.includes('tensor')) {
        tiposProductos.add('Cables');
      } else if (concepto.includes('herramienta') || concepto.includes('equipo')) {
        tiposProductos.add('Herramientas');
      } else if (concepto.includes('material') || concepto.includes('accesorio')) {
        tiposProductos.add('Materiales');
      }
      
      // Verificar si incluye instalación
      if (concepto.includes('instalación') || concepto.includes('instalacion')) {
        incluyeInstalacion = true;
      }
    });
    
    // Generar título basado en los tipos de productos
    let titulo = '';
    if (tiposProductos.size > 0) {
      const tiposArray = Array.from(tiposProductos);
      // Ordenar tipos para consistencia
      const ordenTipos = ['Red Deportiva', 'Red Perimetral', 'Red Industrial', 'Red', 'Postes', 'Cables', 'Herramientas', 'Materiales'];
      const tiposOrdenados = tiposArray.sort((a, b) => {
        const indexA = ordenTipos.indexOf(a);
        const indexB = ordenTipos.indexOf(b);
        return indexA - indexB;
      });
      titulo = tiposOrdenados.join(' / ');
    } else {
      titulo = 'Proyecto Sercodam';
    }
    
    // Agregar instalación si aplica
    if (incluyeInstalacion || cotizacion.incluye_instalacion) {
      titulo += ' / Instalación';
    }
    
    return titulo;
  }

  // Las funciones generateClienteInfo y generateProyectoInfo se eliminaron
  // ya que su contenido se integró en generateHeader

  /**
   * Genera la descripción del proyecto (Parte 4 del reporte)
   */
  async generateDescripcionProyecto(doc, cotizacion, fichaTecnica) {
    // Usar la posición actual del documento
    const startY = doc.y + 20;
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('DESCRIPCIÓN DEL PROYECTO', 50, startY);

    // Generar texto descriptivo personalizado con ChatGPT
    const textoDescriptivo = await this.generarTextoDescriptivo(cotizacion, cotizacion.detalle || []);

    doc.fontSize(10)
       .font('Helvetica')
       .text(textoDescriptivo, 50, startY + 20, { width: 500, align: 'justify' });

    // Calcular la altura del texto para posicionar correctamente la tabla
    const textHeight = this.calculateTextHeight(textoDescriptivo, 500, 10);
    const descripcionEndY = startY + 20 + textHeight + 20; // 20px de margen

    return descripcionEndY;
  }

  /**
   * Genera la tabla de productos con totales en una nueva página
   */
  generateTablaConTotales(doc, detalle, cotizacion) {
    // Crear nueva página para la tabla
    doc.addPage();
    
    const tableTop = 50;
    
    // Definir las columnas alineadas a la izquierda y más grandes
    const startX = 50; // Alineado a la izquierda
    const tableWidth = 520; // Tabla más ancha
    
    const columns = {
      partida: { x: startX, width: 40 },
      cantidad: { x: startX + 50, width: 70 },
      producto: { x: startX + 130, width: 150 },
      caracteristicas: { x: startX + 290, width: 150 },
      precioUnitario: { x: startX + 450, width: 80 },
      subtotal: { x: startX + 540, width: 80 }
    };

    // Header de la tabla
    doc.fontSize(9)
       .font('Helvetica-Bold')
       .fillColor('#8B0000'); // Color vino
    
    doc.text('Partida', columns.partida.x, tableTop)
       .text('Cantidad', columns.cantidad.x, tableTop)
       .text('Producto / Concepto', columns.producto.x, tableTop)
       .text('Características / Descripción', columns.caracteristicas.x, tableTop)
       .text('Precio Unit.', columns.precioUnitario.x, tableTop)
       .text('Subtotal', columns.subtotal.x, tableTop);
    
    doc.fillColor('#000000');

    // Línea separadora
    doc.moveTo(startX, tableTop + 15)
       .lineTo(startX + tableWidth, tableTop + 15)
       .stroke();

    let currentY = tableTop + 25;

    // Items de la tabla
    detalle.forEach((item, index) => {
      // Renderizar el item
      this.renderTableItemSimple(doc, item, index, columns, currentY);
      
      // Calcular altura dinámica basada en el contenido
      const itemHeight = this.calculateItemHeight(item);
      currentY += Math.max(25, itemHeight); // Mínimo 25px, máximo según contenido
    });

    // Línea final de la tabla
    doc.moveTo(startX, currentY)
       .lineTo(startX + tableWidth, currentY)
       .stroke();

    // Generar totales debajo de la tabla
    const totalesY = currentY + 30;
    
    // Línea separadora antes de los totales
    doc.moveTo(startX, totalesY - 10)
       .lineTo(startX + tableWidth, totalesY - 10)
       .stroke();
    
    // Totales alineados con la tabla
    const labelX = startX + 450; // Alineado con la columna de precios
    const valueX = startX + 540; // Alineado con la columna de subtotales
    const lineHeight = 20;
    
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .fillColor('#8B0000') // Color vino
       .text('SUBTOTAL:', labelX, totalesY)
       .text('IVA (16%):', labelX, totalesY + lineHeight)
       .text('TOTAL:', labelX, totalesY + (lineHeight * 2))
       .fillColor('#000000')
       .fontSize(10)
       .font('Helvetica')
       .text(this.formatCurrency(cotizacion.subtotal), valueX, totalesY)
       .text(this.formatCurrency(cotizacion.iva), valueX, totalesY + lineHeight)
       .fontSize(12)
       .font('Helvetica-Bold')
       .text(this.formatCurrency(cotizacion.total), valueX, totalesY + (lineHeight * 2));

    return totalesY + (lineHeight * 3) + 10; // Retornar la posición final
  }

  /**
   * Genera la tabla de productos (Parte 5 del reporte) - Diseño elegante
   */
  generateTablaProductos(doc, detalle, startY = null) {
    const headerPath = path.join(this.imagePath, 'header-sercodam.png');
    const headerHeight = fs.existsSync(headerPath) ? 100 : 80;
    const footerHeight = 80; // Altura del footer
    const pageHeight = doc.page.height;
    const availableHeight = pageHeight - footerHeight - 50; // 50px de margen inferior
    
    // Si no se proporciona startY, usar la posición por defecto
    if (!startY) {
      startY = 500 + headerHeight;
    }
    
    const tableTop = startY;
    
    // Definir las columnas con diseño elegante y mejor espaciado
    const columns = {
      partida: { x: 50, width: 35 },
      cantidad: { x: 95, width: 65 },
      producto: { x: 170, width: 110 },
      caracteristicas: { x: 290, width: 130 },
      precioUnitario: { x: 430, width: 75 },
      subtotal: { x: 515, width: 75 }
    };

    // Función para dibujar el header de la tabla
    const drawTableHeader = (y) => {
      // Fondo del header
      doc.rect(50, y - 5, 540, 25)
         .fill('#F8F9FA');
      
      // Títulos del header
      doc.fontSize(9)
         .font('Helvetica-Bold')
         .fillColor('#FF0000');
      
      doc.text('Partida', columns.partida.x, y)
         .text('Cantidad', columns.cantidad.x, y)
         .text('Producto / Concepto', columns.producto.x, y)
         .text('Características / Descripción', columns.caracteristicas.x, y)
         .text('Precio Unit.', columns.precioUnitario.x, y)
         .text('Subtotal', columns.subtotal.x, y);
      
      // Restaurar color negro
      doc.fillColor('#000000');
      
      // Línea inferior del header
      doc.moveTo(50, y + 20)
         .lineTo(590, y + 20)
         .stroke();
    };

    // Dibujar header inicial
    drawTableHeader(tableTop);

    let currentY = tableTop + 30;
    let currentPage = 0;
    let isFirstPage = true;

    // Items de la tabla
    detalle.forEach((item, index) => {
      // Verificar si necesitamos una nueva página
      const itemHeight = this.calculateItemHeight(item);
      if (currentY + itemHeight > availableHeight) {
        doc.addPage();
        currentY = 50;
        currentPage++;
        isFirstPage = false;
        
        // Dibujar header en nueva página
        drawTableHeader(currentY);
        currentY += 30;
      }

      // Renderizar el item con diseño elegante
      this.renderTableItemElegante(doc, item, index, columns, currentY);
      currentY += itemHeight;
    });

    // Línea final de la tabla
    doc.moveTo(50, currentY)
       .lineTo(590, currentY)
       .stroke();

    return currentY + 20; // Retornar la posición final para el siguiente elemento
  }

  /**
   * Calcula la altura necesaria para un item de la tabla
   */
  calculateItemHeight(item) {
    const baseHeight = 25;
    const caracteristicas = item.caracteristicas || item.notas || '';
    const caracteristicasHeight = this.calculateTextHeight(caracteristicas, 130, 8);
    return Math.max(baseHeight, caracteristicasHeight + 15);
  }

  /**
   * Renderiza un item individual de la tabla de manera simple
   */
  renderTableItemSimple(doc, item, index, columns, y) {
    const partida = item.partida || String.fromCharCode(65 + index);
    const cantidad = `${item.cantidad} ${item.unidad || 'pza'}`;
    
    // Obtener el nombre del producto correctamente
    let producto = 'Producto';
    if (item.concepto) {
      producto = item.concepto;
    } else if (item.nombre_producto) {
      producto = item.nombre_producto;
    } else if (item.notas) {
      producto = item.notas;
    }
    
    const caracteristicas = item.caracteristicas || 'Sin especificaciones';
    const precioUnitario = this.formatCurrency(item.precio_unitario);
    const subtotal = this.formatCurrency(item.subtotal);

    doc.fontSize(8)
       .font('Helvetica');

    // Partida - Centrada
    doc.font('Helvetica-Bold')
       .text(partida, columns.partida.x, y, { 
         width: columns.partida.width,
         align: 'center'
       });
    
    // Cantidad - Centrada
    doc.font('Helvetica')
       .text(cantidad, columns.cantidad.x, y, { 
         width: columns.cantidad.width,
         align: 'center'
       });
    
    // Producto/Concepto - Izquierda
    doc.font('Helvetica-Bold')
       .text(producto, columns.producto.x, y, { 
         width: columns.producto.width,
         align: 'left'
       });
    
    // Características/Descripción - Justificado
    doc.font('Helvetica')
       .text(caracteristicas, columns.caracteristicas.x, y, { 
         width: columns.caracteristicas.width,
         align: 'justify'
       });
    
    // Precio Unitario - Derecha
    doc.font('Helvetica')
       .text(precioUnitario, columns.precioUnitario.x, y, { 
         width: columns.precioUnitario.width,
         align: 'right'
       });
    
    // Subtotal - Derecha
    doc.font('Helvetica-Bold')
       .text(subtotal, columns.subtotal.x, y, { 
         width: columns.subtotal.width,
         align: 'right'
       });
  }

  /**
   * Renderiza un item individual de la tabla con diseño elegante
   */
  renderTableItemElegante(doc, item, index, columns, y) {
    const partida = item.partida || String.fromCharCode(65 + index);
    const cantidad = `${item.cantidad} ${item.unidad || 'pza'}`;
    
    // Obtener el nombre del producto correctamente
    let producto = 'Producto';
    if (item.concepto) {
      producto = item.concepto;
    } else if (item.nombre_producto) {
      producto = item.nombre_producto;
    } else if (item.notas) {
      producto = item.notas;
    }
    
    const caracteristicas = item.caracteristicas || 'Sin especificaciones';
    const precioUnitario = this.formatCurrency(item.precio_unitario);
    const subtotal = this.formatCurrency(item.subtotal);

    // Fondo alternado para filas (zebra striping)
    if (index % 2 === 0) {
      doc.rect(50, y - 2, 540, 20)
         .fill('#FAFAFA');
    }

    doc.fontSize(8)
       .font('Helvetica');

    // Partida - Centrada y con estilo
    doc.font('Helvetica-Bold')
       .text(partida, columns.partida.x, y, { 
         width: columns.partida.width,
         align: 'center'
       });
    
    // Cantidad
    doc.font('Helvetica')
       .text(cantidad, columns.cantidad.x, y, { 
         width: columns.cantidad.width,
         align: 'center'
       });
    
    // Producto/Concepto
    doc.font('Helvetica-Bold')
       .text(producto, columns.producto.x, y, { 
         width: columns.producto.width,
         align: 'left'
       });
    
    // Características/Descripción
    doc.font('Helvetica')
       .text(caracteristicas, columns.caracteristicas.x, y, { 
         width: columns.caracteristicas.width,
         align: 'justify'
       });
    
    // Precio Unitario - Alineado a la derecha
    doc.font('Helvetica')
       .text(precioUnitario, columns.precioUnitario.x, y, { 
         width: columns.precioUnitario.width,
         align: 'right'
       });
    
    // Subtotal - Alineado a la derecha y en negrita
    doc.font('Helvetica-Bold')
       .text(subtotal, columns.subtotal.x, y, { 
         width: columns.subtotal.width,
         align: 'right'
       });
  }

  /**
   * Genera la ficha técnica (Parte 6 del reporte)
   */
  async generateFichaTecnica(doc, detalle, startY = null) {
    console.log('🔍 Generando ficha técnica...');
    console.log('📋 Detalle recibido:', detalle);
    
    if (!detalle || detalle.length === 0) {
      console.log('❌ No hay detalle para generar ficha técnica');
      return startY;
    }

    // Obtener la ficha técnica del tipo de red más común en la cotización
    const fichaTecnica = await this.obtenerFichaTecnica(detalle);
    console.log('📄 Ficha técnica obtenida:', fichaTecnica ? 'Sí' : 'No');
    
    // Si se proporciona startY, establecer la posición
    if (startY) {
      doc.y = startY;
    }
    
    doc.moveDown(1);

    // Título principal de la sección
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#8B0000') // Color vino
       .text('Características de la Red:', 50, doc.y + 10)
       .fillColor('#000000');

    // Subtítulo de especificaciones técnicas
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#8B0000') // Color vino
       .text('Especificaciones Técnicas', 50, doc.y + 15)
       .fillColor('#000000');

    doc.moveDown(0.5);
    
    // Cuadro de ficha técnica debajo de especificaciones técnicas
    let contentY = doc.y + 10;
    
    // Si no hay ficha técnica, mostrar mensaje en cuadro
    if (!fichaTecnica) {
      // Dibujar cuadro con borde rojo izquierdo
      doc.rect(50, contentY - 5, 500, 60)
         .stroke();
      
      // Línea roja vertical izquierda
      doc.strokeColor('#8B0000') // Color vino
         .lineWidth(3)
         .moveTo(50, contentY - 5)
         .lineTo(50, contentY + 55)
         .stroke()
         .strokeColor('#000000')
         .lineWidth(1);
      
      // Contenido del cuadro
      doc.fontSize(10)
         .font('Helvetica-Bold')
         .fillColor('#666666')
         .text('Sin especificar:', 60, contentY);
      
      doc.fontSize(10)
         .font('Helvetica')
         .fillColor('#888888')
         .text('Red Deportiva/Industrial', 60, contentY + 15);
      
      doc.fontSize(10)
         .font('Helvetica')
         .fontStyle('italic')
         .fillColor('#999999')
         .text('Descripción técnica no especificada', 60, contentY + 30);
      
      contentY += 70;
    } else {
      // Dibujar cuadro con borde rojo izquierdo para la ficha técnica
      const fichaTextHeight = fichaTecnica.ficha_tecnica ? 
        this.calculateTextHeight(fichaTecnica.ficha_tecnica, 480, 10) : 60;
      const imageHeight = (fichaTecnica.foto && fs.existsSync(path.join(this.imagePath, fichaTecnica.foto))) ? 180 : 0;
      const boxHeight = Math.max(60, fichaTextHeight + imageHeight + 20);
      
      doc.rect(50, contentY - 5, 500, boxHeight)
         .stroke();
      
      // Línea roja vertical izquierda
      doc.strokeColor('#8B0000') // Color vino
         .lineWidth(3)
         .moveTo(50, contentY - 5)
         .lineTo(50, contentY + boxHeight - 5)
         .stroke()
         .strokeColor('#000000')
         .lineWidth(1);
      
      let boxContentY = contentY + 10;
      
      // Imagen del producto si existe
      if (fichaTecnica.foto && fs.existsSync(path.join(this.imagePath, fichaTecnica.foto))) {
        doc.image(path.join(this.imagePath, fichaTecnica.foto), 60, boxContentY, { width: 150 });
        boxContentY += 160; // Espacio para la imagen
      }

      // Ficha técnica completa
      if (fichaTecnica.ficha_tecnica) {
        doc.fontSize(10)
           .font('Helvetica')
           .text(fichaTecnica.ficha_tecnica, 60, boxContentY, { 
             width: 480, 
             align: 'justify' 
           });
      }
      
      contentY += boxHeight + 20;
    }

    doc.moveDown(1);
    
    // Título de producto para la foto
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#8B0000') // Color vino
       .text('Producto:', 50, doc.y + 10)
       .fillColor('#000000');
    
    // Aquí se puede agregar la foto del producto si es necesario
    // Por ahora solo retornamos la posición final
    return doc.y + 30;
  }

  /**
   * Calcula la altura necesaria para la ficha técnica
   */
  calculateFichaTecnicaHeight(fichaTecnica) {
    let height = 100; // Altura base para títulos
    
    if (fichaTecnica && fichaTecnica.foto) {
      height += 180; // Espacio para imagen
    }
    
    if (fichaTecnica && fichaTecnica.ficha_tecnica) {
      height += this.calculateTextHeight(fichaTecnica.ficha_tecnica, 500, 10);
    }
    
    return height + 30; // Margen adicional
  }

  /**
   * Verifica y agrega los campos de ficha técnica a la tabla red_producto si no existen
   */
  async verificarCamposFichaTecnica() {
    try {
      const knex = require('../config/database');
      
      // Verificar si los campos existen
      const columns = await knex.raw(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'catalogo_1' 
        AND table_name = 'red_producto' 
        AND column_name IN ('ficha_tecnica', 'foto')
      `);
      
      const existingColumns = columns.rows.map(row => row.column_name);
      const missingColumns = ['ficha_tecnica', 'foto'].filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        logger.info('Agregando campos de ficha técnica a red_producto:', missingColumns);
        
        // Agregar campos faltantes
        for (const column of missingColumns) {
          if (column === 'ficha_tecnica') {
            await knex.raw('ALTER TABLE catalogo_1.red_producto ADD COLUMN ficha_tecnica TEXT');
          } else if (column === 'foto') {
            await knex.raw('ALTER TABLE catalogo_1.red_producto ADD COLUMN foto TEXT');
          }
        }
        
        logger.info('✅ Campos de ficha técnica agregados exitosamente');
      } else {
        logger.info('✅ Campos de ficha técnica ya existen en red_producto');
      }
      
    } catch (error) {
      logger.error('Error verificando campos de ficha técnica:', error);
    }
  }

  /**
   * Obtiene la ficha técnica basada en el id_mcr del producto
   */
  async obtenerFichaTecnica(detalle) {
    try {
      console.log('🔍 Buscando ficha técnica...');
      
      // Verificar que los campos existan
      await this.verificarCamposFichaTecnica();
      
      // Buscar productos que tengan id_item (paños) o que sean de red
      const productosConId = detalle.filter(item => {
        // Si tiene id_item, es un paño
        if (item.id_item) return true;
        
        // Si no tiene id_item, verificar si es un producto de red
        const concepto = (item.concepto || item.nombre_producto || '').toLowerCase();
        return concepto.includes('red') || concepto.includes('malla') || concepto.includes('nylon');
      });

      console.log('📋 Productos con ID encontrados:', productosConId.length);
      console.log('📋 Productos:', productosConId.map(p => ({
        concepto: p.concepto || p.nombre_producto,
        id_item: p.id_item,
        tipo_item: p.tipo_item
      })));

      if (productosConId.length === 0) {
        console.log('❌ No se encontraron productos con ID');
        return null;
      }

      // Obtener el primer producto con id_item (paño)
      const productoPaño = productosConId.find(item => item.id_item);
      
      if (productoPaño && productoPaño.id_item) {
        console.log('🎯 Producto paño encontrado con ID:', productoPaño.id_item);
        
        // Consultar la base de datos para obtener el id_mcr del paño
        const knex = require('../config/database');
        const pano = await knex('catalogo_1.pano')
          .where('id_item', productoPaño.id_item)
          .first();
        
        if (pano && pano.id_mcr) {
          console.log('📄 Paño encontrado con id_mcr:', pano.id_mcr);
          
          // Obtener la ficha técnica usando el id_mcr
          const fichaTecnica = await knex('catalogo_1.red_producto')
            .where('id_mcr', pano.id_mcr)
            .first();
          
          console.log('📄 Ficha técnica encontrada en BD:', fichaTecnica ? 'Sí' : 'No');
          if (fichaTecnica) {
            console.log('📄 Datos de ficha técnica:', {
              id_mcr: fichaTecnica.id_mcr,
              tipo_red: fichaTecnica.tipo_red,
              tiene_ficha: !!fichaTecnica.ficha_tecnica,
              tiene_foto: !!fichaTecnica.foto
            });
          }
          
          return fichaTecnica;
        } else {
          console.log('❌ Paño no encontrado o sin id_mcr');
          console.log('📄 Datos del paño:', pano);
        }
      }

      // Si no hay paño con id_item, buscar por tipo de red
      console.log('🔍 Buscando por tipo de red...');
      const productosRed = productosConId.filter(item => {
        const concepto = (item.concepto || item.nombre_producto || '').toLowerCase();
        return concepto.includes('red') || concepto.includes('malla') || concepto.includes('nylon');
      });

      if (productosRed.length > 0) {
        // Obtener el tipo de red más común
        const tiposRed = {};
        productosRed.forEach(item => {
          const concepto = (item.concepto || item.nombre_producto || '').toLowerCase();
          let tipoRed = 'nylon'; // Por defecto
          
          if (concepto.includes('polipropileno')) tipoRed = 'polipropileno';
          else if (concepto.includes('lona')) tipoRed = 'lona';
          else if (concepto.includes('malla sombra')) tipoRed = 'malla sombra';
          
          tiposRed[tipoRed] = (tiposRed[tipoRed] || 0) + 1;
        });

        const tipoRedMasComun = Object.keys(tiposRed).reduce((a, b) => 
          tiposRed[a] > tiposRed[b] ? a : b
        );

        console.log('🎯 Tipo de red más común:', tipoRedMasComun);

        // Consultar la base de datos para obtener la ficha técnica
        const knex = require('../config/database');
        const fichaTecnica = await knex('catalogo_1.red_producto')
          .where('tipo_red', tipoRedMasComun)
          .first();

        console.log('📄 Ficha técnica encontrada en BD:', fichaTecnica ? 'Sí' : 'No');
        return fichaTecnica;
      }

      console.log('❌ No se encontró ficha técnica');
      return null;

    } catch (error) {
      logger.error('Error obteniendo ficha técnica:', error);
      return null;
    }
  }

  /**
   * Genera los totales (Parte 7 del reporte)
   */
  generateTotales(doc, cotizacion, startY = null) {
    const headerPath = path.join(this.imagePath, 'header-sercodam.png');
    const headerHeight = fs.existsSync(headerPath) ? 100 : 80;
    
    // Si no se proporciona startY, usar la posición por defecto
    if (!startY) {
      startY = 650 + headerHeight;
    }
    
    // Verificar si hay espacio suficiente para los totales
    const pageHeight = doc.page.height;
    const footerHeight = 80;
    const availableHeight = pageHeight - footerHeight - 50;
    const totalesHeight = 80; // Espacio necesario para totales
    
    if (startY + totalesHeight > availableHeight) {
      doc.addPage();
      startY = 50;
    }
    
    const totalsY = startY;
    
    // Línea separadora antes de los totales
    doc.moveTo(50, totalsY - 10)
       .lineTo(550, totalsY - 10)
       .stroke();
    
    // Totales con mejor formato y alineación - Ajustados para evitar desbordamiento
    const labelX = 350;
    const valueX = 450;
    const lineHeight = 25;
    
    doc.fontSize(11)
       .font('Helvetica-Bold')
       .fillColor('#FF0000')
       .text('SUBTOTAL:', labelX, totalsY)
       .text('IVA (16%):', labelX, totalsY + lineHeight)
       .text('TOTAL:', labelX, totalsY + (lineHeight * 2))
       .fillColor('#000000')
       .fontSize(11)
       .font('Helvetica')
       .text(this.formatCurrency(cotizacion.subtotal), valueX, totalsY)
       .text(this.formatCurrency(cotizacion.iva), valueX, totalsY + lineHeight)
       .fontSize(13)
       .font('Helvetica-Bold')
       .text(this.formatCurrency(cotizacion.total), valueX, totalsY + (lineHeight * 2));

    return totalsY + (lineHeight * 3) + 20; // Retornar la posición final
  }

  /**
   * Genera las condiciones de pago (Parte 9 del reporte)
   */
  generateCondicionesPago(doc, cotizacion, startY = null) {
    // Si se proporciona startY, establecer la posición
    if (startY) {
      doc.y = startY;
    }
    
    doc.moveDown(1);
    
    // Condiciones de pago
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#8B0000') // Color vino
       .text('Condiciones de pago:', 50, doc.y + 10)
       .fillColor('#000000')
       .fontSize(10)
       .font('Helvetica')
       .text(cotizacion.condiciones_pago || 'Pago al 50% al confirmar la orden y 50% al entregar el proyecto.', 70, doc.y + 5, { width: 480, align: 'justify' });
    
    doc.moveDown(0.5);
    
    // Flete
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#8B0000') // Color vino
       .text('Flete:', 50, doc.y + 10)
       .fillColor('#000000')
       .fontSize(10)
       .font('Helvetica')
       .text(cotizacion.condiciones_envio || 'Entrega en obra o en nuestras instalaciones según se acuerde.', 70, doc.y + 5, { width: 480, align: 'justify' });
    
    doc.moveDown(0.5);
    
    // Tiempo de entrega
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#8B0000') // Color vino
       .text('Tiempo de entrega:', 50, doc.y + 10)
       .fillColor('#000000')
       .fontSize(10)
       .font('Helvetica')
       .text(cotizacion.tiempo_entrega || 'A convenir según la complejidad del proyecto.', 70, doc.y + 5, { width: 480, align: 'justify' });
    
    doc.moveDown(0.5);
    
    // Tiempo de instalación
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor('#8B0000') // Color vino
       .text('Tiempo de Instalación:', 50, doc.y + 10)
       .fillColor('#000000')
       .fontSize(10)
       .font('Helvetica')
       .text(cotizacion.tiempo_instalacion || 'A convenir según la complejidad del proyecto.', 70, doc.y + 5, { width: 480, align: 'justify' });

    return doc.y + 20; // Retornar posición final
  }

  /**
   * Genera el mensaje de cierre (Parte 10 del reporte)
   */
  generateMensajeCierre(doc) {
    // Función vacía - se eliminó el contenido no deseado
    return;
  }

  /**
   * Genera la imagen del equipo según el tipo de proyecto (Parte 11 del reporte)
   */
  generateImagenEquipo(doc, tipoProyecto) {
    let imagenEquipo = 'equipo-general.jpg';
    
    // Seleccionar imagen según el tipo de proyecto
    switch (tipoProyecto) {
      case 'red_deportiva':
        imagenEquipo = 'equipo-deportivo.jpg';
        break;
      case 'sistema_proteccion':
        imagenEquipo = 'equipo-proteccion.jpg';
        break;
      case 'red_industrial':
        imagenEquipo = 'equipo-industrial.jpg';
        break;
      default:
        imagenEquipo = 'equipo-general.jpg';
    }

    const imagenPath = path.join(this.imagePath, imagenEquipo);
    if (fs.existsSync(imagenPath)) {
      doc.image(imagenPath, 50, 280, { width: 200 });
    }

    doc.moveDown(2);
  }

  /**
   * Genera los datos de contacto (Parte 12 del reporte)
   */
  generateDatosContacto(doc) {
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('DATOS DE CONTACTO', 300, 280)
       .fontSize(9)
       .font('Helvetica')
       .text('Manager de Ventas: Lic. Juan Pérez', 300, 300)
       .text('Teléfono: (55) 1234-5678 ext. 101', 300, 315)
       .text('WhatsApp: +52 55 1234-5678', 300, 330)
       .text('Email: ventas@sercodam.com', 300, 345);

    doc.moveDown(2);
  }

  /**
   * Genera los datos bancarios (Parte 13 del reporte)
   */
  generateDatosBancarios(doc) {
    doc.fontSize(10)
       .font('Helvetica-Bold')
       .text('DATOS BANCARIOS', 50, 400)
       .fontSize(9)
       .font('Helvetica')
       .text('Banco: BBVA Bancomer', 50, 420)
       .text('Cuenta: 0123456789', 50, 435)
       .text('CLABE: 012345678901234567', 50, 450)
       .text('Beneficiario: Sercodam S.A. de C.V.', 50, 465)
       .text('RFC: SER-123456-ABC', 50, 480);

    doc.moveDown(2);
  }

  /**
   * Genera la sección de instalación (Parte 14 - opcional)
   */
  generateSeccionInstalacion(doc, cotizacion, startY = null) {
    // Solo generar si incluye instalación
    if (!cotizacion.incluye_instalacion) {
      return startY;
    }
    
    // Si se proporciona startY, establecer la posición
    if (startY) {
      doc.y = startY;
    }
    
    const instalacionContent = `Nuestro servicio de instalación incluye:
• Visita técnica al sitio de instalación
• Preparación del terreno y cimentación
• Instalación profesional del sistema
• Pruebas de funcionamiento
• Capacitación básica para el mantenimiento
• Garantía de instalación por 1 año

Tiempo estimado de instalación: 3 días`;
    
    return this.renderSection(doc, 'SERVICIO DE INSTALACIÓN', instalacionContent);
  }

  /**
   * Genera la sección de garantía (Parte 15 - opcional)
   */
  generateSeccionGarantia(doc, startY = null) {
    // Si se proporciona startY, establecer la posición
    if (startY) {
      doc.y = startY;
    }
    
    // Título de garantía
    doc.font(this.styles.fonts.bold)
       .fontSize(12)
       .fillColor(this.styles.colors.primary)
       .text('GARANTÍA', 50, doc.y + 10)
       .fillColor('#000000');
    
    doc.moveDown(0.5);
    
    // Cuadro de garantía usando la función renderBox
    const garantiaText = 'Nuestros trabajos cuentan con la garantía contra cualquier defecto de mano de obra y materiales utilizados para su correcta ejecución, quedando exentos de condiciones climatológicas o de cualquier naturaleza o por actos de abuso humano que se originen ajenos a nuestra mano de obra calificada, considerando que están estimados y planificados para durar la vida útil de la red, recomendando dar un mantenimiento anual.';
    
    return this.renderBox(doc, garantiaText);
  }

  /**
   * Genera la sección de observaciones (Parte 16 - opcional)
   */
  generateSeccionObservaciones(doc, cotizacion) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('OBSERVACIONES', 50, 400)
       .fontSize(10)
       .font('Helvetica')
       .text(cotizacion.observaciones, 50, 420, { width: 500, align: 'justify' });

    doc.moveDown(2);
  }

  /**
   * Genera la sección de "No Incluye" (Parte 17 - opcional)
   */
  generateSeccionNoIncluye(doc, cotizacion) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('NO INCLUYE', 50, 450)
       .fontSize(10)
       .font('Helvetica')
       .text(cotizacion.no_incluye, 50, 470, { width: 500, align: 'justify' });

    doc.moveDown(2);
  }

  /**
   * Genera la sección de notas (Parte 18 - opcional)
   */
  generateSeccionNotas(doc, cotizacion) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('NOTAS', 50, 500)
       .fontSize(10)
       .font('Helvetica')
       .text(cotizacion.notas, 50, 520, { width: 500, align: 'justify' });

    doc.moveDown(2);
  }

  /**
   * Genera la sección de conceptos extra (Parte 19 - opcional)
   */
  generateSeccionConceptosExtra(doc, cotizacion) {
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text('CONCEPTOS EXTRA', 50, 550)
       .fontSize(10)
       .font('Helvetica')
       .text(cotizacion.conceptos_extra, 50, 570, { width: 500, align: 'justify' });

    doc.moveDown(2);
  }

  /**
   * Genera la sección de cláusula personalizada (Parte 20 - opcional)
   */
  generateSeccionClausulaPersonalizada(doc, cotizacion) {
    doc.addPage();
    
    doc.fontSize(12)
       .font('Helvetica-Bold')
       .text(cotizacion.titulo_clausula_personalizada, 50, 50)
       .fontSize(10)
       .font('Helvetica')
       .text(cotizacion.descripcion_clausula_personalizada, 50, 70, { width: 500, align: 'justify' });

    doc.moveDown(2);
  }

  /**
   * Agrega el footer a una página específica
   */
  addFooterToPage(doc) {
    try {
      // Footer de Sercodam
      const footerPath = path.join(this.imagePath, 'footer-sercodam.png');
      console.log('🔍 Buscando footer en:', footerPath);
      
      if (fs.existsSync(footerPath)) {
        console.log('✅ Footer encontrado, agregando al PDF');
        // Calcular la posición Y para el footer (cerca del final de la página)
        const pageHeight = doc.page.height;
        const footerHeight = 80; // Altura estimada del footer
        const footerY = pageHeight - footerHeight - 50; // 50px de margen inferior
        
        doc.image(footerPath, 50, footerY, { width: 500 });
      } else {
        console.log('❌ Footer no encontrado, usando fallback');
        // Fallback si no existe la imagen del footer
        // Agregar una línea separadora
        doc.moveTo(50, pageHeight - 100)
           .lineTo(550, pageHeight - 100)
           .stroke();
        
        // Información del footer
        doc.fontSize(8)
           .font('Helvetica')
           .text('Sercodam - Especialistas en Redes Deportivas y Sistemas de Protección', 50, pageHeight - 90)
           .text('Tel: (55) 1234-5678 | Email: info@sercodam.com | www.sercodam.com', 50, pageHeight - 80);
      }
         
    } catch (error) {
      // Si hay error, simplemente lo ignoramos
      console.warn('Error al agregar footer a la página:', error.message);
    }
  }

  /**
   * Genera el footer del PDF (para la primera página)
   */
  generateFooter(doc) {
    this.addFooterToPage(doc);
  }

  /**
   * Genera texto descriptivo personalizado usando ChatGPT
   */
  async generarTextoDescriptivo(cotizacion, detalle) {
    try {
      if (!this.openai) {
        logger.warn('OpenAI no configurado, usando texto descriptivo por defecto');
        return this.generarTextoDescriptivoPorDefecto(cotizacion, detalle);
      }

      // Construir el contexto para ChatGPT
      const contexto = this.construirContextoParaChatGPT(cotizacion, detalle);
      
      const prompt = `Eres un experto técnico en redes de protección y sistemas industriales de Sercodam. 
Tu tarea es generar una descripción completa y concisa en UN SOLO PÁRRAFO para una cotización.

CONTEXTO DE LA COTIZACIÓN:
${contexto}

INSTRUCCIONES:
- Genera UN SOLO PÁRRAFO que explique qué incluye la cotización
- Menciona el tipo de material/red que se usa en el proyecto
- Incluye especificaciones técnicas relevantes
- SIEMPRE incluye la norma oficial mexicana (NOM-009-STPS-2011)
- Explica qué incluye la cotización (estructura, herrajes, mordazas, etc.)
- Usa un lenguaje técnico pero comprensible
- Mantén un tono profesional y confiable
- NO inventes información que no esté en el contexto
- Basa toda la información únicamente en los productos de la cotización

EJEMPLO DE FORMATO:
"DE ACUERDO CON SU AMABLE SOLICITUD, NOS PERMITIMOS PRESENTAR A USTEDES EL PRESUPUESTO DE SUMINISTRO E INSTALACIÓN DE SISTEMA "T" ANTI-CAIDA, CON REDES DE PROTECCIÓN PERIMETRAL 100% NYLON DE MULTIFILAMENTO DE ALTA TENACIDAD PARA LA PROTECCIÓN DE UN ÁREA DE 313.00 ML x 3 MT EXTERIORES, CERTIFICADAS CON NORMA OFICIAL MEXICANA (NOM-009-STPS-2011). EL DENOMINADO SISTEMA "V" INCLUYE LA ESTRUCTURA DE LOS HERRAJES, MORDAZAS, RED ANTI-CAIDA Y TODOS SUS UTENSILIOS Y HERRAMIENTAS PARA COLOCACIÓN A LOZA."

Genera el texto basado únicamente en la información proporcionada en el contexto.`;

      const response = await this.openai.responses.create({
        model: "gpt-4o-mini",
        input: prompt
      });

      const textoGenerado = response.output_text.trim();
      logger.info('✅ Texto descriptivo generado con ChatGPT exitosamente');
      
      return textoGenerado;

    } catch (error) {
      logger.error('Error generando texto descriptivo con ChatGPT:', error);
      return this.generarTextoDescriptivoPorDefecto(cotizacion, detalle);
    }
  }

  /**
   * Construye el contexto para ChatGPT basado en la cotización
   */
  construirContextoParaChatGPT(cotizacion, detalle) {
    const productos = detalle || [];
    const sistemaTipo = cotizacion.sistema_tipo || 'T'; // T o U
    
    let contexto = `TIPO DE SISTEMA: ${sistemaTipo}\n`;
    contexto += `CLIENTE: ${cotizacion.nombre_cliente}\n`;
    contexto += `TIPO DE PROYECTO: ${cotizacion.tipo_proyecto}\n`;
    contexto += `INCLUYE INSTALACIÓN: ${cotizacion.incluye_instalacion ? 'Sí' : 'No'}\n\n`;
    
    contexto += `PRODUCTOS INCLUIDOS:\n`;
    productos.forEach((item, index) => {
      contexto += `${index + 1}. ${item.concepto || item.nombre_producto}\n`;
      contexto += `   - Cantidad: ${item.cantidad} ${item.unidad || 'pza'}\n`;
      contexto += `   - Precio unitario: ${this.formatCurrency(item.precio_unitario)}\n`;
      if (item.especificaciones) {
        contexto += `   - Especificaciones: ${item.especificaciones}\n`;
      }
      contexto += `\n`;
    });

    // Agregar información de dimensiones si está disponible
    if (cotizacion.dimensiones) {
      contexto += `DIMENSIONES: ${cotizacion.dimensiones}\n`;
    }

    // Agregar información de área si está disponible
    if (cotizacion.area_proteccion) {
      contexto += `ÁREA DE PROTECCIÓN: ${cotizacion.area_proteccion}\n`;
    }

    return contexto;
  }

  /**
   * Genera texto descriptivo por defecto cuando ChatGPT no está disponible
   */
  generarTextoDescriptivoPorDefecto(cotizacion, detalle) {
    const sistemaTipo = cotizacion.sistema_tipo || 'T';
    const productos = detalle || [];
    
    // Detectar tipo de material principal
    let tipoMaterial = 'NYLON';
    let certificacion = 'NOM-009-STPS-2011';
    
    productos.forEach(item => {
      const concepto = (item.concepto || item.nombre_producto || '').toLowerCase();
      if (concepto.includes('polipropileno')) {
        tipoMaterial = 'POLIPROPILENO';
      } else if (concepto.includes('lona')) {
        tipoMaterial = 'LONA';
      } else if (concepto.includes('malla sombra')) {
        tipoMaterial = 'MALLA SOMBRA';
      }
    });

    // Calcular área total si hay productos con área
    let areaTotal = 0;
    productos.forEach(item => {
      if (item.area) {
        areaTotal += parseFloat(item.area) || 0;
      }
    });

    const texto = `DE ACUERDO CON SU AMABLE SOLICITUD, NOS PERMITIMOS PRESENTAR A USTEDES EL PRESUPUESTO DE SUMINISTRO E INSTALACIÓN DE SISTEMA "${sistemaTipo}" ANTI-CAIDA, CON REDES DE PROTECCIÓN PERIMETRAL 100% ${tipoMaterial} DE MULTIFILAMENTO DE ALTA TENACIDAD PARA LA PROTECCIÓN DE UN ÁREA DE ${areaTotal > 0 ? areaTotal.toFixed(2) + ' m²' : 'ESPECIFICADA'} EXTERIORES, CERTIFICADAS CON NORMA OFICIAL MEXICANA (${certificacion}). EL DENOMINADO SISTEMA INCLUYE LA ESTRUCTURA DE LOS HERRAJES, MORDAZAS, RED ANTI-CAIDA Y TODOS SUS UTENSILIOS Y HERRAMIENTAS PARA COLOCACIÓN A LOZA.`;

    return texto;
  }

  /**
   * Calcula la altura aproximada del texto
   */
  calculateTextHeight(text, width, fontSize) {
    const words = text.split(' ');
    const charsPerLine = Math.floor(width / (fontSize * 0.6)); // Aproximación de caracteres por línea
    let lines = 0;
    let currentLine = 0;
    
    words.forEach(word => {
      if (currentLine + word.length > charsPerLine) {
        lines++;
        currentLine = word.length + 1;
      } else {
        currentLine += word.length + 1;
      }
    });
    
    if (currentLine > 0) lines++;
    
    return lines * fontSize * 1.2; // 1.2 es el line height
  }

  /**
   * Formatea una cantidad como moneda mexicana
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  }
}

module.exports = new CotizacionPdfService(); 