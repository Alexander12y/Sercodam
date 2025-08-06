require('dotenv').config({ path: './sercodam-backend/.env' });
const CotizacionPdfServiceV2 = require('./sercodam-backend/src/services/cotizacionPdfServiceV2');
const fs = require('fs');
const path = require('path');

async function testPdfImagesFixed() {
    try {
        console.log('🧪 === PRUEBA DE IMÁGENES EN PDF CORREGIDAS ===\n');

        // Datos de prueba con cotizaciones reales corregidas
        const testCases = [
            {
                id_cotizacion: 28,
                numero_cotizacion: 'COT-20250806-952',
                titulo_proyecto: 'Redes Antica¡da',
                tipo_proyecto: 'Redes Industriales',
                nombre_cliente: 'Cliente Industrial Test',
                empresa_cliente: 'Empresa Industrial S.A.',
                email_cliente: 'test@industrial.com',
                telefono_cliente: '555-1234',
                fecha_creacion: new Date(),
                subtotal: 50000,
                iva: 8000,
                total: 58000,
                expected_foto: 'Industrial.png'
            },
            {
                id_cotizacion: 27,
                numero_cotizacion: 'COT-20250805-885',
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
                expected_foto: 'construccion.png'
            },
            {
                id_cotizacion: 23,
                numero_cotizacion: 'COT-20250804-389',
                titulo_proyecto: 'Redes para F£tbol',
                tipo_proyecto: 'Redes Deportivas',
                nombre_cliente: 'Cliente Deportivo Test',
                empresa_cliente: 'Club Deportivo Test',
                email_cliente: 'test@deportivo.com',
                telefono_cliente: '555-9012',
                fecha_creacion: new Date(),
                subtotal: 30000,
                iva: 4800,
                total: 34800,
                expected_foto: 'deportivo.png'
            }
        ];

        for (let i = 0; i < testCases.length; i++) {
            const testCase = testCases[i];
            console.log(`📋 Generando PDF para: ${testCase.numero_cotizacion}`);
            console.log(`   - Título: ${testCase.titulo_proyecto}`);
            console.log(`   - Tipo: ${testCase.tipo_proyecto}`);
            console.log(`   - Foto esperada: ${testCase.expected_foto}`);
            
            try {
                // Generar PDF
                const pdfBuffer = await CotizacionPdfServiceV2.generateCotizacionPDF(testCase, []);
                
                // Guardar PDF
                const outputPath = path.join(__dirname, `test_pdf_images_fixed_${i + 1}_${testCase.tipo_proyecto.replace(/\s+/g, '_')}.pdf`);
                fs.writeFileSync(outputPath, pdfBuffer);
                
                console.log(`   ✅ PDF generado: ${outputPath}`);
                console.log(`   📊 Tamaño: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
                console.log('');
                
            } catch (error) {
                console.log(`   ❌ Error generando PDF: ${error.message}`);
                console.log('');
            }
        }
        
        console.log('🎉 Prueba completada!');
        console.log('📁 Revisa los archivos PDF generados para verificar que las imágenes aparecen correctamente.');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

testPdfImagesFixed(); 