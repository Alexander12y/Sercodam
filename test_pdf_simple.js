const CotizacionPdfService = require('./sercodam-backend/src/services/cotizacionPdfService');
const fs = require('fs');
const path = require('path');

async function testPDFSimple() {
  console.log('🧪 Probando PDF simple...');
  
  try {
    // Datos de prueba sin dependencias de BD
    const cotizacion = {
      id_cotizacion: 1,
      numero_cotizacion: 'COT-2024-001',
      nombre_cliente: 'Empresa ABC S.A. de C.V.',
      empresa_cliente: 'Empresa ABC',
      email_cliente: 'contacto@empresaabc.com',
      telefono_cliente: '(55) 1234-5678',
      titulo_proyecto: 'Sistema de Protección Perimetral',
      tipo_proyecto: 'sistema_proteccion',
      incluye_instalacion: true,
      subtotal: 40000.00,
      iva: 6400.00,
      total: 46400.00,
      condiciones_pago: 'Pago al 50% al confirmar la orden y 50% al entregar el proyecto.',
      condiciones_envio: 'Entrega en obra o en nuestras instalaciones según se acuerde.',
      fecha_creacion: new Date()
    };

    // Detalle simple sin id_item para evitar consultas a BD
    const detalle = [
      {
        id_detalle: 20,
        id_cotizacion: 17,
        id_item: null, // Sin ID para evitar consulta a BD
        cantidad: '1.00',
        precio_unitario: '10000.00',
        subtotal: '10000.00',
        notas: 'Red de nylon',
        caracteristicas: 'Tipo: Nylon, Dimensiones: 10.00m × 10.00m, Área: 100.00m², Precio/m²: $100.00, Especificaciones: Calibre: 30 Cuadro: 7/8" Torsión: Torcida Refuerzo: No',
        partida: 'A',
        orden_index: 1,
        catalogo: 'CATALOGO_1',
        tipo_item: 'SERVICIO',
        estado: 'por aprobar'
      },
      {
        id_detalle: 21,
        id_cotizacion: 17,
        id_item: null,
        cantidad: '3.00',
        precio_unitario: '10000.00',
        subtotal: '30000.00',
        notas: 'Tubos de acero de 7.5m c/u',
        caracteristicas: 'Tubos de acero',
        partida: 'B',
        orden_index: 2,
        catalogo: 'CATALOGO_3',
        tipo_item: 'SERVICIO',
        estado: 'por aprobar'
      }
    ];

    console.log('📋 Generando PDF...');
    
    // Generar el PDF
    const pdfBuffer = await CotizacionPdfService.generateCotizacionPDF(cotizacion, detalle);
    
    // Guardar el PDF
    const outputPath = path.join(__dirname, 'test_pdf_simple.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log('✅ PDF generado exitosamente:', outputPath);
    console.log('📊 Tamaño del archivo:', (pdfBuffer.length / 1024).toFixed(2), 'KB');
    
  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Ejecutar la prueba
testPDFSimple(); 