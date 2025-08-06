// Cargar variables de entorno
require('dotenv').config({ path: './sercodam-backend/.env' });

const CotizacionPdfServiceV2 = require('./sercodam-backend/src/services/cotizacionPdfServiceV2');
const fs = require('fs');
const path = require('path');

async function testTablaDimensionesPrecio() {
  try {
    console.log('🧪 Iniciando prueba de tabla con dimensiones y precios...');
    
    // Datos de prueba con diferentes tipos de productos
    const testCase = {
      titulo_proyecto: 'Redes para Racks Selectivos',
      tipo_proyecto: 'Redes Industriales',
      nombre_cliente: 'Cliente Industrial Test',
      empresa_cliente: 'Empresa Industrial S.A.',
      email_cliente: 'test@industrial.com',
      telefono_cliente: '555-1234',
      fecha_creacion: new Date(),
      subtotal: 150000,
      iva: 24000,
      total: 174000
    };

    // Crear detalle con diferentes tipos de productos
    const detalle = [
      {
        // Producto 1: Red con dimensiones específicas
        id_mcr: 'TEST001',
        concepto: 'Red de protección industrial',
        cantidad: 1,
        unidad: 'pza',
        precio_unitario: 50000,
        subtotal: 50000,
        tipo_item: 'RED_PRODUCTO',
        metadata: {
          red_data: {
            id_mcr: 'TEST001',
            largo: 10.5,
            ancho: 8.2,
            especificaciones: {
              calibre: '18x1',
              cuadro: '3/4"',
              torsion: 'Torcida',
              color: 'Verde'
            }
          }
        }
      },
      {
        // Producto 2: Material personalizado con precio por unidad
        concepto: 'Postes de acero galvanizado',
        cantidad: 4,
        unidad: 'pza',
        precio_unitario: 2500,
        subtotal: 10000,
        tipo_item: 'MATERIAL',
        largo: 3.0,
        ancho: 0.1
      },
      {
        // Producto 3: Herramienta sin dimensiones
        concepto: 'Kit de instalación profesional',
        cantidad: 1,
        unidad: 'kit',
        precio_unitario: 15000,
        subtotal: 15000,
        tipo_item: 'HERRAMIENTA'
      }
    ];
    
    console.log(`\n📋 Generando PDF para: ${testCase.titulo_proyecto}`);
    console.log(`   - Productos en detalle: ${detalle.length}`);
    console.log(`   - Verificar que muestra dimensiones y precios correctos`);
    
    // Generar PDF
    const pdfBuffer = await CotizacionPdfServiceV2.generateCotizacionPDF(testCase, detalle);
    
    // Guardar PDF
    const outputPath = path.join(__dirname, `test_tabla_dimensiones_precio.pdf`);
    fs.writeFileSync(outputPath, pdfBuffer);
    
    console.log(`✅ PDF generado: ${outputPath}`);
    console.log(`   - Tamaño: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   - Verificar en la tabla:`);
    console.log(`     * Red: dimensiones específicas + "Precio x m²"`);
    console.log(`     * Material: dimensiones + "Precio x unidad"`);
    console.log(`     * Herramienta: solo "Precio x unidad"`);
    
    console.log('\n🎉 Prueba completada exitosamente!');
    console.log('📁 Revisa el PDF generado para verificar que la tabla muestra:');
    console.log('   - Dimensiones específicas de la red seleccionada');
    console.log('   - Precios diferenciados (m² vs unidad)');
    console.log('   - Información completa en la columna de especificaciones');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  }
}

// Ejecutar la prueba
testTablaDimensionesPrecio(); 