// Cargar variables de entorno
require('dotenv').config({ path: './sercodam-backend/.env' });

const CotizacionPdfServiceV2 = require('./sercodam-backend/src/services/cotizacionPdfServiceV2');
const fs = require('fs');
const path = require('path');

async function testNormalizedFotos() {
  try {
    console.log('🧪 Iniciando prueba con estructura normalizada...');
    
    // Datos de prueba para diferentes escenarios
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
        total: 58000,
        expected_foto: 'Industrial.png' // foto_tipo (no tiene foto_titulo)
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
        total: 87000,
        expected_foto: 'construccion.png' // foto_tipo (no tiene foto_titulo)
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
        total: 34800,
        expected_foto: 'deportivo.png' // foto_tipo (no tiene foto_titulo)
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n📋 Generando PDF para: ${testCase.titulo_proyecto} (${testCase.tipo_proyecto})`);
      console.log(`   - Foto esperada: ${testCase.expected_foto}`);
      
      // Generar PDF
      const pdfBuffer = await CotizacionPdfServiceV2.generateCotizacionPDF(testCase, []);
      
      // Guardar PDF
      const outputPath = path.join(__dirname, `test_normalized_${i + 1}_${testCase.tipo_proyecto.replace(/\s+/g, '_')}.pdf`);
      fs.writeFileSync(outputPath, pdfBuffer);
      
      console.log(`✅ PDF generado: ${outputPath}`);
      console.log(`   - Tamaño: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    }
    
    console.log('\n🎉 Prueba completada exitosamente!');
    console.log('📁 Revisa los archivos PDF generados para verificar que las fotos aparecen correctamente.');
    console.log('🔍 Verifica que cada PDF muestra la foto correspondiente al tipo de proyecto.');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testNormalizedFotos(); 