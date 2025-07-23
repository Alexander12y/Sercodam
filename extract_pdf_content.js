const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function extractPDFContent() {
    return new Promise((resolve, reject) => {
        const pythonScript = `
import PyPDF2
import json
import sys

def extract_pdf_text(pdf_path):
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text_content = ""
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text_content += f"\\n--- PÁGINA {page_num + 1} ---\\n"
                text_content += page.extract_text()
            
            # Buscar información específica de arquitectura
            architecture_info = {
                "total_pages": len(pdf_reader.pages),
                "technologies": [],
                "database_tables": [],
                "patterns": [],
                "features": [],
                "structure": {}
            }
            
            # Buscar tecnologías mencionadas
            tech_keywords = ["Node.js", "React", "PostgreSQL", "MongoDB", "Express", "Angular", "Vue", "Python", "Django", "Flask", "Java", "Spring", "PHP", "Laravel"]
            for tech in tech_keywords:
                if tech.lower() in text_content.lower():
                    architecture_info["technologies"].append(tech)
            
            # Buscar patrones de diseño
            pattern_keywords = ["MVC", "MVVM", "Repository", "Service Layer", "Factory", "Singleton", "Observer", "Strategy", "Adapter"]
            for pattern in pattern_keywords:
                if pattern.lower() in text_content.lower():
                    architecture_info["patterns"].append(pattern)
            
            # Buscar tablas de base de datos
            import re
            table_patterns = [
                r"CREATE TABLE\\s+([a-zA-Z_][a-zA-Z0-9_]*)",
                r"Table:\\s*([a-zA-Z_][a-zA-Z0-9_]*)",
                r"Tabla:\\s*([a-zA-Z_][a-zA-Z0-9_]*)"
            ]
            
            for pattern in table_patterns:
                matches = re.findall(pattern, text_content, re.IGNORECASE)
                architecture_info["database_tables"].extend(matches)
            
            # Buscar funcionalidades
            feature_keywords = ["cotización", "cotizacion", "cliente", "orden", "producción", "produccion", "factura", "pago", "liquidación", "liquidacion"]
            for feature in feature_keywords:
                if feature.lower() in text_content.lower():
                    architecture_info["features"].append(feature)
            
            return {
                "text_content": text_content[:5000],  # Primeros 5000 caracteres
                "architecture_info": architecture_info
            }
            
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    pdf_path = sys.argv[1] if len(sys.argv) > 1 else "📋 ARQUITECTURA COMPLETA DEL PROYECTO - ANÁLISIS EXHAUSTIVO.pdf"
    result = extract_pdf_text(pdf_path)
    print(json.dumps(result, ensure_ascii=False, indent=2))
`;

        const pythonProcess = spawn('python', ['-c', pythonScript]);
        let output = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    resolve(result);
                } catch (e) {
                    reject(new Error('Error parsing JSON output: ' + e.message));
                }
            } else {
                reject(new Error('Python process failed: ' + error));
            }
        });
    });
}

async function analyzeArchitectureComparison() {
    try {
        console.log('🔍 Extrayendo contenido del PDF...');
        const pdfContent = await extractPDFContent();
        
        if (pdfContent.error) {
            console.error('❌ Error extrayendo PDF:', pdfContent.error);
            return;
        }

        console.log('\n📊 INFORMACIÓN EXTRAÍDA DEL PDF:');
        console.log('==================================');
        console.log(`📄 Total de páginas: ${pdfContent.architecture_info.total_pages}`);
        
        console.log('\n🛠️ TECNOLOGÍAS IDENTIFICADAS:');
        console.log('-----------------------------');
        if (pdfContent.architecture_info.technologies.length > 0) {
            pdfContent.architecture_info.technologies.forEach(tech => {
                console.log(`  - ${tech}`);
            });
        } else {
            console.log('  No se identificaron tecnologías específicas');
        }
        
        console.log('\n🏗️ PATRONES DE DISEÑO:');
        console.log('----------------------');
        if (pdfContent.architecture_info.patterns.length > 0) {
            pdfContent.architecture_info.patterns.forEach(pattern => {
                console.log(`  - ${pattern}`);
            });
        } else {
            console.log('  No se identificaron patrones específicos');
        }
        
        console.log('\n🗄️ TABLAS DE BASE DE DATOS:');
        console.log('---------------------------');
        if (pdfContent.architecture_info.database_tables.length > 0) {
            pdfContent.architecture_info.database_tables.forEach(table => {
                console.log(`  - ${table}`);
            });
        } else {
            console.log('  No se identificaron tablas específicas');
        }
        
        console.log('\n🎯 FUNCIONALIDADES IDENTIFICADAS:');
        console.log('--------------------------------');
        if (pdfContent.architecture_info.features.length > 0) {
            pdfContent.architecture_info.features.forEach(feature => {
                console.log(`  - ${feature}`);
            });
        } else {
            console.log('  No se identificaron funcionalidades específicas');
        }
        
        console.log('\n📝 CONTENIDO EXTRAÍDO (primeros 1000 caracteres):');
        console.log('=================================================');
        console.log(pdfContent.text_content.substring(0, 1000));
        console.log('...');
        
        // Guardar el contenido extraído para análisis posterior
        fs.writeFileSync('pdf_content_analysis.json', JSON.stringify(pdfContent, null, 2));
        console.log('\n💾 Contenido guardado en pdf_content_analysis.json');
        
        // Análisis comparativo
        console.log('\n🔍 ANÁLISIS COMPARATIVO CON NUESTRO SISTEMA:');
        console.log('============================================');
        
        const ourTechnologies = ['Node.js', 'React', 'PostgreSQL', 'Express'];
        const ourPatterns = ['MVC', 'Repository', 'Service Layer'];
        const ourTables = ['usuario', 'cliente', 'orden_produccion', 'inventario_item'];
        
        console.log('\n🔄 COMPATIBILIDAD DE TECNOLOGÍAS:');
        console.log('---------------------------------');
        const commonTech = ourTechnologies.filter(tech => 
            pdfContent.architecture_info.technologies.includes(tech)
        );
        if (commonTech.length > 0) {
            console.log('✅ Tecnologías compatibles:', commonTech.join(', '));
        } else {
            console.log('⚠️ No se encontraron tecnologías compatibles');
        }
        
        console.log('\n🔄 COMPATIBILIDAD DE PATRONES:');
        console.log('------------------------------');
        const commonPatterns = ourPatterns.filter(pattern => 
            pdfContent.architecture_info.patterns.includes(pattern)
        );
        if (commonPatterns.length > 0) {
            console.log('✅ Patrones compatibles:', commonPatterns.join(', '));
        } else {
            console.log('⚠️ No se encontraron patrones compatibles');
        }
        
        console.log('\n🔄 COMPATIBILIDAD DE TABLAS:');
        console.log('----------------------------');
        const commonTables = ourTables.filter(table => 
            pdfContent.architecture_info.database_tables.some(dbTable => 
                dbTable.toLowerCase().includes(table.toLowerCase())
            )
        );
        if (commonTables.length > 0) {
            console.log('✅ Tablas compatibles:', commonTables.join(', '));
        } else {
            console.log('⚠️ No se encontraron tablas compatibles');
        }
        
    } catch (error) {
        console.error('❌ Error en el análisis:', error);
    }
}

// Ejecutar análisis
analyzeArchitectureComparison(); 