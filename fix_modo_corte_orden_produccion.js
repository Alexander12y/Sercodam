const fs = require('fs');
const path = require('path');

// Ruta del archivo a modificar
const filePath = path.join(__dirname, 'sercodam-backend/src/controllers/ordenesController.js');

// Leer el archivo
let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar todas las ocurrencias de job.modo_corte por orden.modo_corte
const oldPattern = /modo_corte: job\.modo_corte \|\| 'simple'/g;
const newPattern = "modo_corte: orden.modo_corte || 'simple'";

content = content.replace(oldPattern, newPattern);

// Escribir el archivo modificado
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Archivo modificado exitosamente');
console.log('📝 Cambios realizados:');
console.log('   - Reemplazado job.modo_corte por orden.modo_corte en todas las funciones de PDF');
console.log('   - Ahora el modo_corte se obtiene de la tabla orden_produccion');

// Verificar los cambios
const matches = content.match(/modo_corte: orden\.modo_corte \|\| 'simple'/g);
console.log(`🔍 Se encontraron ${matches ? matches.length : 0} ocurrencias actualizadas`); 