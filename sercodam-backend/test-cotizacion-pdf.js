const cotizacionPdfService = require('./src/services/cotizacionPdfService');
const fs = require('fs');
const path = require('path');

// Datos de prueba para generar un PDF
const cotizacionPrueba = {
  id_cotizacion: 1,
  numero_cotizacion: 'COT-20250101-001',
  id_cliente: 1,
  titulo_proyecto: 'Red Deportiva para Cancha de Fútbol',
  tipo_proyecto: 'red_deportiva',
  incluye_instalacion: true,
  nombre_cliente: 'Juan Pérez',
  empresa_cliente: 'Club Deportivo Los Leones',
  email_cliente: 'juan.perez@clubleones.com',
  telefono_cliente: '(55) 1234-5678',
  subtotal: 50000.00,
  iva: 8000.00,
  total: 58000.00,
  condiciones_pago: 'Pago al 50% al confirmar la orden y 50% al entregar el proyecto.',
  condiciones_envio: 'Entrega en obra con instalación incluida.',
  tiempo_entrega: '15 días hábiles',
  tiempo_instalacion: '3 días hábiles',
  dias_validez: 15,
  valido_hasta: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
  incluye_garantia: true,
  incluye_instalacion_seccion: true,
  observaciones: 'Instalación en horario de 8:00 AM a 6:00 PM.',
  no_incluye: 'Cimentación y preparación del terreno.',
  notas: 'Material con garantía de 2 años.',
  conceptos_extra: 'Accesorios adicionales según especificaciones.',
  titulo_clausula_personalizada: 'Cláusula de Mantenimiento',
  descripcion_clausula_personalizada: 'Incluye mantenimiento preventivo por 6 meses después de la instalación.',
  estado: 'por aprobar',
  fecha_creacion: new Date(),
  id_usuario_creador: 1
};

const detallePrueba = [
  {
    id_item: 1,
    partida: 'A',
    orden_index: 1,
    nombre_producto: 'Red Deportiva Nylon Profesional',
    concepto: 'Red deportiva de nylon de alta resistencia',
    cantidad: 200,
    unidad: 'm²',
    precio_unitario: 150.00,
    subtotal: 30000.00,
    caracteristicas: 'Nylon de alta resistencia, tratado contra UV',
    descripcion_tecnica: 'Red deportiva fabricada con nylon de alta resistencia, tratada contra rayos UV y hongos.',
    catalogo: 'deportiva',
    tipo_item: 'pano',
    estado: 'por aprobar'
  },
  {
    id_item: 2,
    partida: 'B',
    orden_index: 2,
    nombre_producto: 'Postes de Acero Galvanizado',
    concepto: 'Postes de acero galvanizado para instalación',
    cantidad: 8,
    unidad: 'pzas',
    precio_unitario: 1500.00,
    subtotal: 12000.00,
    caracteristicas: 'Acero galvanizado, 3 metros de altura',
    descripcion_tecnica: 'Postes de acero galvanizado de 3 metros de altura para instalación de red deportiva.',
    catalogo: 'accesorios',
    tipo_item: 'material',
    estado: 'por aprobar'
  },
  {
    id_item: 3,
    partida: 'C',
    orden_index: 3,
    nombre_producto: 'Servicio de Instalación',
    concepto: 'Instalación profesional de red deportiva',
    cantidad: 1,
    unidad: 'servicio',
    precio_unitario: 8000.00,
    subtotal: 8000.00,
    caracteristicas: 'Instalación completa con garantía',
    descripcion_tecnica: 'Servicio de instalación profesional incluyendo montaje, pruebas y capacitación.',
    catalogo: 'servicios',
    tipo_item: 'servicio',
    estado: 'por aprobar'
  }
];

const fichaTecnicaPrueba = {
  nombre_red: 'Red Deportiva Profesional',
  tipo_red: 'nylon',
  codigo_producto: 'RD-NYL-001',
  calibre: 'No. 60 x 4"',
  luz_malla: '10 cm x 10 cm',
  resistencia: '1,400 - 1,600 KG por m2',
  certificacion: 'UNE EN – 1263-12004',
  material: 'Nylon de alta resistencia',
  color: 'Verde',
  tratamiento: 'UV y anti-hongos',
  propiedades: 'Resistente a la intemperie, anti-hongos, UV protegido',
  ficha_tecnica_completa: 'Red deportiva fabricada con nylon de alta resistencia, tratada contra rayos UV y hongos. Cumple con las especificaciones técnicas internacionales para uso deportivo profesional. Ideal para canchas de fútbol, tenis y otros deportes.',
  ruta_imagen: 'producto-red-deportiva.jpg',
  categorias: ['deportiva', 'proteccion'],
  activo: true
};

async function testPdfGeneration() {
  try {
    console.log('🚀 Iniciando prueba de generación de PDF...');
    
    // Verificar que el servicio existe
    console.log('📋 Verificando servicio de PDF...');
    if (!cotizacionPdfService) {
      throw new Error('El servicio de PDF no se pudo cargar');
    }
    
    console.log('✅ Servicio de PDF cargado correctamente');
    
    // Verificar que el método existe
    if (typeof cotizacionPdfService.generateCotizacionPDF !== 'function') {
      throw new Error('El método generateCotizacionPDF no existe');
    }
    
    console.log('✅ Método generateCotizacionPDF encontrado');
    
    // Verificar datos de prueba
    console.log('📊 Datos de prueba:');
    console.log('- Cotización:', cotizacionPrueba.numero_cotizacion);
    console.log('- Cliente:', cotizacionPrueba.nombre_cliente);
    console.log('- Items:', detallePrueba.length);
    console.log('- Total:', cotizacionPrueba.total);
    
    // Generar PDF
    console.log('🔄 Generando PDF...');
    const pdfBuffer = await cotizacionPdfService.generateCotizacionPDF(
      cotizacionPrueba,
      detallePrueba,
      fichaTecnicaPrueba
    );
    
    console.log('✅ PDF generado exitosamente');
    console.log('📏 Tamaño del PDF:', pdfBuffer.length, 'bytes');
    
    // Guardar PDF de prueba
    const outputPath = path.join(__dirname, 'cotizacion-prueba.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log('💾 PDF guardado en:', outputPath);
    console.log('🎉 Prueba completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    console.error('Stack trace:', error.stack);
    
    // Información adicional para debugging
    console.log('\n🔍 Información de debugging:');
    console.log('- Node.js version:', process.version);
    console.log('- Platform:', process.platform);
    console.log('- Current directory:', process.cwd());
    
    // Verificar dependencias
    try {
      const PDFDocument = require('pdfkit');
      console.log('- PDFKit version:', require('pdfkit/package.json').version);
    } catch (e) {
      console.log('- PDFKit no está instalado o hay un error:', e.message);
    }
  }
}

// Ejecutar la prueba
testPdfGeneration(); 