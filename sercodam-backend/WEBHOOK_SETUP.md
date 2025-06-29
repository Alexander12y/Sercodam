# Configuración Rápida de Webhooks - SERCODAM OP

## 🚀 Configuración Automática

### 1. Ejecutar Configuración Interactiva

```bash
npm run setup-webhook
```

Este comando te pedirá:
- 🔗 URL del webhook de Make.com
- 🔑 API Key de Make.com

### 2. Reiniciar el Servidor

```bash
npm run dev
```

### 3. Probar la Configuración

```bash
npm run test-webhook
```

## 🔧 Configuración Manual

### Variables de Entorno Requeridas

Agregar al archivo `.env`:

```bash
# Configuración de Make.com Webhook
MAKE_WEBHOOK_URL=https://hook.eu1.make.com/your-webhook-url
MAKE_API_KEY=your-make-api-key
```

## 📋 Funcionalidades Implementadas

### ✅ Webhook de Entrada (Make.com → SERCODAM)
- **Endpoint**: `POST /api/v1/webhook/orden`
- **Función**: Crear órdenes de producción desde Make.com
- **Autenticación**: API Key

### ✅ Webhook de Salida (SERCODAM → Make.com)
- **Trigger**: Automático al cambiar estado a "en_proceso"
- **Función**: Notificar a Make.com que la producción ha iniciado
- **Datos**: Información completa de la orden

### ✅ Generación de PDFs
- **Endpoint**: `GET /api/v1/ordenes/{id}/pdf`
- **Función**: Generar PDF profesional de la orden
- **Formato**: A4 con diseño empresarial

## 🧪 Pruebas Disponibles

### Probar Generación de PDF
```bash
npm run test-pdf
```

### Probar Webhook a Make.com
```bash
npm run test-make
```

### Probar Todo
```bash
npm run test-webhook
```

## 📊 Endpoints de Verificación

### Verificar Configuración
```bash
GET /api/v1/webhook/make-config
```

### Health Check
```bash
GET /api/v1/webhook/health
```

### Probar Webhook Manualmente
```bash
POST /api/v1/webhook/test-make
```

## 🔄 Flujo de Trabajo

1. **Make.com envía datos** → `POST /api/v1/webhook/orden`
2. **Sistema crea orden** → Estado: "pendiente"
3. **Usuario cambia estado** → "en_proceso" (botón "Iniciar Producción")
4. **Sistema envía webhook** → Make.com recibe notificación automática
5. **Usuario genera PDF** → `GET /api/v1/ordenes/{id}/pdf`

## 🛠️ Troubleshooting

### Error 500 en PDF
- Verificar directorio `temp/` existe
- Revisar logs en `logs/error.log`
- Verificar datos de la orden

### Webhook no se envía
- Verificar `MAKE_WEBHOOK_URL` y `MAKE_API_KEY`
- Probar con `npm run test-make`
- Revisar logs de conexión

### Error de autenticación
- Verificar API keys
- Verificar JWT tokens
- Revisar configuración de seguridad

## 📝 Logs

Los eventos se registran en:
- `logs/api.log` - Logs generales
- `logs/error.log` - Errores específicos

## 🔐 Seguridad

- Validación de API keys
- Rate limiting aplicado
- Logs de auditoría
- Manejo seguro de errores

## 📚 Documentación Completa

Ver `WEBHOOK_DOCUMENTATION.md` para detalles completos de la API. 