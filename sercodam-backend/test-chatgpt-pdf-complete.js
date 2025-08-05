const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '.env') });

const CotizacionPdfService = require('./src/services/cotizacionPdfService');

async function testChatGPTPDFComplete() {
  try {
    console.log('🧪 === PRUEBA COMPLETA DE CHATGPT EN PDF ===');
    
    // Datos de prueba con los nuevos tipos de proyectos
    const cotizacion = {
      nombre_cliente: 'URIEL LACARRIER',
      fecha_creacion: new Date(),
      tipo_proyecto: 'REDES_CONSTRUCCION',
      titulo_proyecto: 'Red anticaidas Sistema T (Bandeja)',
      incluye_instalacion: true,
      sistema_tipo: 'T', // Nuevo campo para sistema T/U
      dimensiones: '313.00 ML x 3 MT',
      area_proteccion: '939 m²'
    };

    const detalle = [
      {
        concepto: 'Red de Protección Perimetral Nylon',
        cantidad: 1,
        unidad: 'lote',
        precio_unitario: 150000,
        subtotal: 150000,
        especificaciones: 'Calibre 18, Luz de malla 5cm, Color verde'
      },
      {
        concepto: 'Postes de Anclaje',
        cantidad: 20,
        unidad: 'pza',
        precio_unitario: 2500,
        subtotal: 50000,
        especificaciones: 'Tubo galvanizado 2" x 3m'
      },
      {
        concepto: 'Herrajes y Mordazas',
        cantidad: 1,
        unidad: 'lote',
        precio_unitario: 25000,
        subtotal: 25000,
        especificaciones: 'Incluye tensores, abrazaderas y accesorios'
      }
    ];

    console.log('📋 Datos de prueba configurados');
    console.log('🔑 OpenAI API Key configurada:', !!process.env.OPENAI_API_KEY);
    console.log('📊 Tipo de proyecto:', cotizacion.tipo_proyecto);
    console.log('📊 Título del proyecto:', cotizacion.titulo_proyecto);
    console.log('📊 Sistema tipo:', cotizacion.sistema_tipo);

    // Probar generación de texto descriptivo
    console.log('\n🤖 Probando generación de texto descriptivo...');
    const textoDescriptivo = await CotizacionPdfService.generarTextoDescriptivo(cotizacion, detalle);
    
    console.log('\n📝 TEXTO DESCRIPTIVO GENERADO:');
    console.log('=' .repeat(80));
    console.log(textoDescriptivo);
    console.log('=' .repeat(80));

    // Probar generación completa del PDF
    console.log('\n📄 Probando generación completa del PDF...');
    const pdfBuffer = await CotizacionPdfService.generateCotizacionPDF(cotizacion, detalle);
    
    console.log('✅ PDF generado exitosamente');
    console.log('📊 Tamaño del PDF:', pdfBuffer.length, 'bytes');

    // Guardar PDF de prueba
    const fs = require('fs');
    const testPdfPath = path.join(__dirname, 'test-chatgpt-pdf-complete.pdf');
    fs.writeFileSync(testPdfPath, pdfBuffer);
    console.log('💾 PDF guardado en:', testPdfPath);

    // Probar con diferentes tipos de proyectos
    console.log('\n🔄 Probando con diferentes tipos de proyectos...');
    
    const tiposProyectos = [
      {
        tipo: 'REDES_INDUSTRIALES',
        titulo: 'Redes Anticaída',
        sistema: 'T'
      },
      {
        tipo: 'REDES_DEPORTIVAS',
        titulo: 'Redes para Golf',
        sistema: 'U'
      },
      {
        tipo: 'ARTICULOS_DEPORTIVOS',
        titulo: 'Redes de Tenis y Pádel',
        sistema: 'T'
      }
    ];

    for (const proyecto of tiposProyectos) {
      console.log(`\n📋 Probando: ${proyecto.tipo} - ${proyecto.titulo}`);
      
      const cotizacionTest = {
        ...cotizacion,
        tipo_proyecto: proyecto.tipo,
        titulo_proyecto: proyecto.titulo,
        sistema_tipo: proyecto.sistema
      };

      const textoTest = await CotizacionPdfService.generarTextoDescriptivo(cotizacionTest, detalle);
      console.log('✅ Texto generado para:', proyecto.titulo);
      console.log('📝 Fragmento:', textoTest.substring(0, 100) + '...');
    }

    console.log('\n✅ Todas las pruebas completadas exitosamente');

  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar prueba
testChatGPTPDFComplete(); 