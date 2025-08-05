const CotizacionPdfService = require('./src/services/cotizacionPdfService');
const fs = require('fs');
const path = require('path');

async function testCotizacionPdfMejorado() {
  console.log('🧪 Probando PDF de cotización mejorado...');
  
  try {
    // Datos de prueba para la cotización
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
      observaciones: 'Instalación en horario de 8:00 AM a 6:00 PM.',
      no_incluye: 'No incluye cimentación ni preparación del terreno.',
      fecha_creacion: new Date()
    };

    // Detalle de productos
    const detalle = [
      {
        partida: 'A',
        concepto: 'Red de Nylon para Protección',
        cantidad: 100.00,
        unidad: 'm²',
        precio_unitario: 100.00,
        subtotal: 10000.00,
        caracteristicas: 'Tipo: Nylon, Dimensiones: 10.00m x 10.00m, Área: 100.00m², Precio/m²: $100.00, Especificaciones: Calibre: 30 Cuadro: 7/8" Torsión: Torcida Refuerzo: No'
      },
      {
        partida: 'B',
        concepto: 'Tubos de Acero Galvanizado',
        cantidad: 3.00,
        unidad: 'pza',
        precio_unitario: 10000.00,
        subtotal: 30000.00,
        caracteristicas: 'Tubos de acero galvanizado de 2" de diámetro, 3 metros de altura, con base de concreto'
      }
    ];

    console.log('📋 Generando PDF de cotización...');
    
    // Generar el PDF
    const pdfBuffer = await CotizacionPdfService.generateCotizacionPDF(cotizacion, detalle);
    
    // Guardar el PDF
    const outputPath = path.join(__dirname, 'test_cotizacion_mejorada.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log('✅ PDF generado exitosamente:', outputPath);
    console.log('📊 Tamaño del archivo:', (pdfBuffer.length / 1024).toFixed(2), 'KB');
    
    // Verificar que el archivo se creó correctamente
    if (fs.existsSync(outputPath)) {
      const stats = fs.statSync(outputPath);
      console.log('✅ Archivo creado correctamente');
      console.log('📏 Tamaño del archivo:', (stats.size / 1024).toFixed(2), 'KB');
    } else {
      console.log('❌ Error: El archivo no se creó');
    }
    
  } catch (error) {
    console.error('❌ Error generando PDF:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Ejecutar la prueba
testCotizacionPdfMejorado(); 