import PyPDF2
import json
import sys
import os

def extract_pdf_text(pdf_path):
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text_content = ""
            
            print(f"Total pages: {len(pdf_reader.pages)}")
            
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                page_text = page.extract_text()
                text_content += f"\n--- PAGE {page_num + 1} ---\n"
                text_content += page_text
            
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
                r"CREATE TABLE\s+([a-zA-Z_][a-zA-Z0-9_]*)",
                r"Table:\s*([a-zA-Z_][a-zA-Z0-9_]*)",
                r"Tabla:\s*([a-zA-Z_][a-zA-Z0-9_]*)"
            ]
            
            for pattern in table_patterns:
                matches = re.findall(pattern, text_content, re.IGNORECASE)
                architecture_info["database_tables"].extend(matches)
            
            # Buscar funcionalidades
            feature_keywords = ["cotizacion", "cliente", "orden", "produccion", "factura", "pago", "liquidacion"]
            for feature in feature_keywords:
                if feature.lower() in text_content.lower():
                    architecture_info["features"].append(feature)
            
            return {
                "text_content": text_content[:3000],  # Primeros 3000 caracteres
                "architecture_info": architecture_info
            }
            
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Buscar el archivo PDF en el directorio actual
    pdf_files = [f for f in os.listdir('.') if f.endswith('.pdf')]
    
    if pdf_files:
        pdf_path = pdf_files[0]  # Tomar el primer PDF encontrado
        print(f"Found PDF: {pdf_path}")
        result = extract_pdf_text(pdf_path)
        
        # Guardar resultado en archivo JSON
        with open('pdf_analysis_result.json', 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print("Analysis completed. Results saved to pdf_analysis_result.json")
    else:
        print("No PDF files found in current directory") 