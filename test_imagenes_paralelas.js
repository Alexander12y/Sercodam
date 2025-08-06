// Cargar variables de entorno
require('dotenv').config({ path: './sercodam-backend/.env' });

const CotizacionPdfServiceV2 = require('./sercodam-backend/src/services/cotizacionPdfServiceV2');
const fs = require('fs');
const path = require('path');

async function testImagenesParalelas() {
  try {
    console.log('🧪 Iniciando prueba de imágenes en paralelo...');
    
    // Datos de prueba con productos que tienen id_mcr para mostrar ficha técnica
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
        expected_foto_tipo: 'Industrial.png'
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
        expected_foto_tipo: 'construccion.png'
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
        expected_foto_tipo: 'deportivo.png'
      }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      console.log(`\n📋 Generando PDF para: ${testCase.titulo_proyecto} (${testCase.tipo_proyecto})`);
      console.log(`   - Foto tipo esperada: ${testCase.expected_foto_tipo}`);
      
      // Crear detalle con un producto que tenga id_mcr para mostrar ficha técnica
      const detalle = [
        {
          id_mcr: 'TEST001', // ID de prueba
          concepto: 'Red de protección industrial',
          cantidad: 1,
          unidad: 'pza',
          precio_unitario: 50000,
          subtotal: 50000,
          tipo_item: 'RED_PRODUCTO',
          metadata: {
            red_data: {
              id_mcr: 'TEST001',
              especificaciones: {
                calibre: '18x1',
                cuadro: '3/4"',
                torsion: 'Torcida',
                color: 'Verde'
              }
            }
          }
        }
      ];
      
      // Generar PDF
      const pdfBuffer = await CotizacionPdfServiceV2.generateCotizacionPDF(testCase, detalle);
      
      // Guardar PDF
      const outputPath = path.join(__dirname, `test_imagenes_paralelas_${i + 1}_${testCase.tipo_proyecto.replace(/\s+/g, '_')}.pdf`);
      fs.writeFileSync(outputPath, pdfBuffer);
      
      console.log(`✅ PDF generado: ${outputPath}`);
      console.log(`   - Tamaño: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
      console.log(`   - Verificar que muestra 2 imágenes en paralelo en la sección de ficha técnica`);
    }
    
    console.log('\n🎉 Prueba completada exitosamente!');
    console.log('📁 Revisa los archivos PDF generados para verificar:');
    console.log('   - Sección "Características de la Red" con ficha técnica');
    console.log('   - Dos imágenes lado a lado: "Red Específica" y "Tipo de Proyecto"');
    console.log('   - Etiquetas debajo de cada imagen');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testImagenesParalelas(); 