# 📁 Imágenes para PDF de Cotizaciones

Esta carpeta contiene las imágenes necesarias para generar los PDFs de cotizaciones de Sercodam.

## 🖼️ Imágenes Requeridas

### **Header y Footer**
- `logo-sercodam.png` - Logo principal de Sercodam (120px de ancho recomendado)
- `footer-logo.png` - Logo para el footer del PDF (100px de ancho recomendado)

### **Imágenes de Equipo (Según tipo de proyecto)**
- `equipo-general.jpg` - Imagen general de equipo de trabajo
- `equipo-deportivo.jpg` - Equipo trabajando en redes deportivas
- `equipo-proteccion.jpg` - Equipo trabajando en sistemas de protección
- `equipo-industrial.jpg` - Equipo trabajando en redes industriales

### **Imágenes de Productos (Fichas Técnicas)**
- `producto-red-deportiva.jpg` - Imagen de red deportiva
- `producto-red-proteccion.jpg` - Imagen de red de protección
- `producto-red-industrial.jpg` - Imagen de red industrial
- `producto-malla-sombra.jpg` - Imagen de malla sombra

## 📋 Especificaciones

### **Formatos Soportados**
- PNG (recomendado para logos)
- JPG/JPEG (recomendado para fotos)

### **Tamaños Recomendados**
- **Logos**: 120px - 200px de ancho
- **Fotos de equipo**: 200px - 300px de ancho
- **Fotos de productos**: 200px - 250px de ancho

### **Calidad**
- **Logos**: PNG con transparencia
- **Fotos**: JPG con buena resolución (72-150 DPI)

## 🔧 Cómo Agregar Imágenes

1. Coloca las imágenes en esta carpeta
2. Asegúrate de que los nombres coincidan con los especificados en el código
3. Verifica que las imágenes tengan el formato y tamaño correctos
4. Reinicia el servidor backend para que reconozca las nuevas imágenes

## 📝 Notas

- Si una imagen no existe, el PDF se generará sin ella
- Las imágenes se redimensionan automáticamente en el PDF
- Se recomienda usar imágenes optimizadas para web (tamaño de archivo < 500KB)

## 🎨 Personalización

Para personalizar las imágenes:
1. Reemplaza las imágenes existentes con las nuevas
2. Mantén los mismos nombres de archivo
3. O modifica el código en `cotizacionPdfService.js` para usar diferentes nombres 