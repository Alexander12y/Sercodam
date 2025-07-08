# 📄 Generación Automática de PDF - SERCODAM OP

## 🎯 Descripción

El sistema ahora incluye **generación automática de PDF** cuando se crea una orden de producción, y **envío automático del PDF** a Make.com a través del webhook cuando la orden cambia a estado "en_proceso".

## ✨ Funcionalidades Implementadas

### 1. Generación Automática de PDF
- **Trigger**: Al crear una nueva orden de producción
- **Ejecución**: En background (no bloquea la respuesta)
- **Ubicación**: Directorio `temp/` del servidor
- **Tracking**: Se registra en la base de datos

### 2. Envío Automático a Make.com
- **Trigger**: Al cambiar estado de orden a "en_proceso"
- **Contenido**: Datos JSON + archivo PDF adjunto
- **Formato**: Multipart/form-data
- **Fallback**: Si no hay PDF, envía solo datos JSON

## 🔧 Configuración Requerida

### 1. Instalar Dependencias
```bash
npm install form-data
```

### 2. Ejecutar Migración
```bash
npm run migrate
```

### 3. Verificar Configuración de Make.com
```bash
npm run setup-webhook
```

## 📊 Campos Nuevos en Base de Datos

La tabla `orden_produccion` ahora incluye:

```sql
-- Campos para tracking de PDF
pdf_generado BOOLEAN DEFAULT FALSE
pdf_filename VARCHAR(255) NULL
pdf_generado_at TIMESTAMP NULL

-- Índices para optimización
INDEX (pdf_generado)
INDEX (pdf_generado_at)
```

## 🔄 Flujo de Trabajo Completo

### 1. Creación de Orden
```
Usuario crea orden → Sistema valida stock → Crea orden → 
Genera PDF automáticamente → Guarda referencia en BD
```

### 2. Cambio de Estado
```
Usuario cambia a "en_proceso" → Sistema envía webhook → 
Incluye PDF adjunto → Make.com recibe datos + archivo
```

## 🧪 Pruebas

### Prueba Completa
```bash
npm run test-pdf-automatico
```

Esta prueba verifica:
- ✅ Creación de orden de producción
- ✅ Generación automática de PDF
- ✅ Envío de webhook con PDF adjunto
- ✅ Limpieza de datos de prueba

### Pruebas Individuales
```bash
# Solo generación de PDF
npm run test-pdf

# Solo webhook a Make.com
npm run test-make

# Prueba completa de webhook
npm run test-webhook
```

## 📁 Estructura de Archivos

### Archivos Modificados
- `src/controllers/ordenesController.js` - Generación automática de PDF
- `src/services/makeWebhookService.js` - Envío con PDF adjunto
- `package.json` - Nueva dependencia form-data

### Archivos Nuevos
- `src/migrations/20250629000000_add_pdf_fields_to_orden_produccion.js`
- `test-pdf-webhook-automatico.js`
- `PDF_AUTOMATICO_DOCUMENTATION.md`

## 🔍 Logs y Monitoreo

### Logs de Generación de PDF
```javascript
logger.info('PDF generado automáticamente al crear orden', {
    ordenId: id_op,
    numeroOp: numero_op,
    filepath,
    filename
});
```

### Logs de Webhook con PDF
```javascript
logger.info('Enviando webhook con PDF adjunto', {
    ordenId: ordenData.id_op,
    pdfFileName,
    pdfSize: fs.statSync(pdfFilePath).size
});
```

## ⚠️ Consideraciones Importantes

### 1. Espacio en Disco
- Los PDFs se guardan en `temp/`
- Se limpian automáticamente después de descarga
- Monitorear espacio disponible

### 2. Tamaño de Archivos
- Los PDFs pueden ser grandes
- Make.com puede tener límites de tamaño
- Considerar compresión si es necesario

### 3. Fallbacks
- Si falla la generación de PDF, el webhook se envía sin archivo
- Si falla el webhook, no afecta el flujo principal
- Todos los errores se registran en logs

### 4. Rendimiento
- La generación de PDF es asíncrona
- No bloquea la respuesta de creación de orden
- Usar `setImmediate()` para ejecutar en background

## 🛠️ Troubleshooting

### PDF No Se Genera
1. Verificar directorio `temp/` existe y tiene permisos
2. Revisar logs de error
3. Verificar datos de la orden
4. Comprobar dependencias instaladas

### Webhook No Incluye PDF
1. Verificar que el PDF se generó correctamente
2. Revisar campo `pdf_filename` en la base de datos
3. Verificar que el archivo existe en `temp/`
4. Revisar logs de webhook

### Error de FormData
1. Verificar que `form-data` está instalado
2. Revisar versión de Node.js (requiere >=18.0.0)
3. Verificar configuración de Make.com

## 📈 Métricas y Monitoreo

### Campos Útiles para Monitoreo
```sql
-- Órdenes con PDF generado
SELECT COUNT(*) FROM orden_produccion WHERE pdf_generado = true;

-- PDFs generados hoy
SELECT COUNT(*) FROM orden_produccion 
WHERE pdf_generado = true 
AND DATE(pdf_generado_at) = CURRENT_DATE;

-- Tamaño promedio de archivos (requiere consulta adicional)
```

### Logs a Monitorear
- `logs/api.log` - Logs generales
- `logs/error.log` - Errores específicos
- Buscar patrones: "PDF generado automáticamente", "webhook con PDF adjunto"

## 🔐 Seguridad

### Consideraciones
- Los PDFs contienen información sensible
- Verificar permisos de archivos
- Considerar encriptación si es necesario
- Limpiar archivos temporales regularmente

### Recomendaciones
- Implementar rotación de logs
- Monitorear acceso a archivos PDF
- Considerar autenticación adicional para descargas

## 🚀 Próximas Mejoras

### Posibles Extensiones
1. **Compresión de PDFs** para reducir tamaño
2. **Almacenamiento en la nube** (S3, Google Drive)
3. **Plantillas personalizables** de PDF
4. **Notificaciones por email** con PDF adjunto
5. **Dashboard de monitoreo** de generación de PDFs

### Optimizaciones
1. **Cache de plantillas** PDF
2. **Generación en lotes** para múltiples órdenes
3. **Compresión automática** según tamaño
4. **Limpieza automática** de archivos antiguos

---

**Versión**: 1.0.0  
**Fecha**: Enero 2025  
**Sistema**: SERCODAM - Orden de Producción  
**Autor**: Equipo de Desarrollo SERCODAM 