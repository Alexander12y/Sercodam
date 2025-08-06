const CotizacionPdfServiceV2 = require('./sercodam-backend/src/services/cotizacionPdfServiceV2');
const fs = require('fs');
const path = require('path');

async function testTipoProyectoFotos() {
  try {
    console.log('🧪 Iniciando prueba de fotos de tipo de proyecto...');
    
    // Datos de prueba para diferentes tipos de proyecto
    const testCases = [
      {
        titulo_proyecto: 'Redes para Racks Selectivos',
        tipo_proyecto: 'Redes Industriales',
        nombre_cliente: 'Cliente Industrial Test',
        empresa_cliente: 'Empresa Industrial S.A.',
        email_cliente: 'test@industrial.com',
        telefono_cliente: '555-1234',
        fecha_creacion: new Date(),
        subtotal: 50000,
        iva: 8000,
        total: 58000
      },
      {
        titulo_proyecto: 'Red perimetral Sistema V (Horca)',
        tipo_proyecto: 'Redes de Construcción',
        nombre_cliente: 'Cliente Construcción Test',
        empresa_cliente: 'Constructora Test S.A.',
        email_cliente: 'test@construccion.com',
        telefono_cliente: '555-5678',
        fecha_creacion: new Date(),
        subtotal: 75000,
        iva: 12000,
        total: 87000
      },
      {
        titulo_proyecto: 'Redes para Golf',
        tipo_proyecto: 'Redes Deportivas',
        nombre_cliente: 'Cliente Deportivo Test',
        empresa_cliente: 'Club Deportivo Test',
        email_cliente: 'test@deportivo.com',
        telefono_cliente: '555-9012',
        fecha_creacion: new Date(),
        subtotal: 30000,
        iva: 4800,
        total: 34800
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n📋 Generando PDF para: ${testCase.titulo_proyecto} (${testCase.tipo_proyecto})`);
      
      // Generar PDF
      const pdfBuffer = await CotizacionPdfServiceV2.generateCotizacionPDF(testCase, []);
      
      // Guardar PDF
      const outputPath = path.join(__dirname, `test_tipo_proyecto_${i + 1}_${testCase.tipo_proyecto.replace(/\s+/g, '_')}.pdf`);
      fs.writeFileSync(outputPath, pdfBuffer);
      
      console.log(`✅ PDF generado: ${outputPath}`);
      console.log(`   - Tamaño: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    }
    
    console.log('\n🎉 Prueba completada exitosamente!');
    console.log('📁 Revisa los archivos PDF generados para verificar que las fotos aparecen correctamente.');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testTipoProyectoFotos(); 