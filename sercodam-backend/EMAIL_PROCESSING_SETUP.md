# 📧 Configuración del Procesamiento Automático de Emails

Este sistema permite procesar automáticamente emails de leads que llegan a la cuenta de Gmail de Sercodam, convirtiéndolos en leads en la base de datos.

## 🚀 Características

- ✅ **Procesamiento automático** cada 10 minutos (configurable)
- ✅ **Integración con Gmail API** usando OAuth2
- ✅ **Procesamiento con IA** (OpenAI) opcional
- ✅ **Parsing manual** como respaldo
- ✅ **Filtros inteligentes** para identificar emails de leads
- ✅ **Marcado automático** de emails procesados
- ✅ **Estructuración de datos** en JSON

## 📋 Requisitos Previos

1. **Cuenta de Gmail** para Sercodam
2. **Proyecto en Google Cloud Console**
3. **API Key de OpenAI** (opcional)
4. **Variables de entorno** configuradas

## 🔧 Configuración de Google Cloud Console

### 1. Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Gmail API**

### 2. Configurar OAuth2

1. Ve a **APIs & Services > Credentials**
2. Crea **OAuth 2.0 Client ID**
3. Configura las URIs de redirección:
   - `http://localhost:3000/api/auth/callback/google` (desarrollo)
   - `https://tu-dominio.com/api/auth/callback/google` (producción)

### 3. Obtener Refresh Token

1. Ejecuta el script de autorización:
```bash
node scripts/get-gmail-token.js
```

2. Sigue las instrucciones para autorizar la aplicación
3. Copia el refresh token generado

## 🔑 Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```env
# ========== CONFIGURACIÓN DE GMAIL ==========
GOOGLE_CLIENT_ID=tu_google_client_id
GOOGLE_CLIENT_SECRET=tu_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
GOOGLE_REFRESH_TOKEN=tu_google_refresh_token

# ========== CONFIGURACIÓN DE OPENAI ==========
OPENAI_API_KEY=tu_openai_api_key

# ========== CONFIGURACIÓN DE EMAIL ==========
EMAIL_PROCESSING_INTERVAL_MINUTES=10
EMAIL_AUTO_PROCESSING_ENABLED=true
```

## 📦 Instalación de Dependencias

```bash
npm install googleapis openai
```

## 🧪 Pruebas

### 1. Probar Configuración

```bash
node test_email_processing.js
```

### 2. Probar Manualmente

```bash
# Procesar todos los emails
curl -X POST http://localhost:3000/api/v1/leads/process-emails \
  -H "Authorization: Bearer tu_token"

# Ver estado del procesamiento
curl -X GET http://localhost:3000/api/v1/leads/email-status \
  -H "Authorization: Bearer tu_token"

# Ver emails de Gmail
curl -X GET http://localhost:3000/api/v1/leads/gmail-emails \
  -H "Authorization: Bearer tu_token"
```

## 🔄 Funcionamiento

### Procesamiento Automático

1. **Cada 10 minutos** el sistema busca emails nuevos
2. **Filtra emails** usando criterios específicos:
   - `subject:"Contacto desde landing page"`
   - `subject:"Cotización Nueva (Buddify)"`
   - `subject:"Nuevo Contacto"`
   - `subject:"Solicitud de Cotización"`
   - Contiene palabras clave: `cotización`, `presupuesto`, `proyecto`, `redes`, `protección`, `industrial`

3. **Procesa cada email**:
   - Extrae información del cliente
   - Usa IA si está disponible, sino parsing manual
   - Crea lead en la base de datos
   - Marca email como leído
   - Agrega etiqueta "Sercodam-Procesado"

### Estructura de Datos

Los leads se crean con esta estructura:

```json
{
  "email_remitente": "cliente@ejemplo.com",
  "nombre_remitente": "Juan Pérez",
  "asunto_email": "Cotización para proyecto",
  "contenido_email": "Contenido completo del email",
  "contenido_interpretado": "Resumen del proyecto",
  "datos_estructurados": {
    "gmail_info": {
      "id": "gmail_message_id",
      "thread_id": "thread_id",
      "labels": ["INBOX", "UNREAD"],
      "snippet": "Primeras líneas del email"
    },
    "ai_analysis": {
      "analysis": "Análisis del email",
      "sentiment": "0.8",
      "priority": "0.9",
      "intent": "cotización"
    },
    "extracted_data": {
      "phone": "+521234567890",
      "company": "Empresa ABC",
      "budget": "50000",
      "location": "Ciudad de México",
      "project_type": "Redes de protección"
    }
  },
  "telefono": "+521234567890",
  "empresa": "Empresa ABC",
  "requerimientos": "Descripción del proyecto",
  "presupuesto_estimado": "50000.00",
  "fuente": "email",
  "estado": "nuevo"
}
```

## 🎛️ Control Manual

### Endpoints Disponibles

- `POST /api/v1/leads/process-emails` - Procesar todos los emails
- `POST /api/v1/leads/process-email/:emailId` - Procesar email específico
- `GET /api/v1/leads/email-status` - Estado del procesamiento
- `GET /api/v1/leads/gmail-emails` - Listar emails de Gmail

### Control del Scheduler

```javascript
const emailScheduler = require('./src/services/emailScheduler');

// Iniciar procesamiento
emailScheduler.start(10); // Cada 10 minutos

// Detener procesamiento
emailScheduler.stop();

// Cambiar intervalo
emailScheduler.setInterval(5); // Cada 5 minutos

// Ver estado
const status = emailScheduler.getStatus();
```

## 🔍 Monitoreo

### Logs

El sistema genera logs detallados:

```
🚀 Iniciando procesamiento automático de emails cada 10 minutos
📧 Encontrados 5 emails para procesar
✅ Nuevo lead creado automáticamente: 15 - cliente@ejemplo.com
⏰ Ejecutando procesamiento programado de emails...
✅ Procesamiento programado completado: 3 procesados, 2 creados
```

### Métricas

- Emails procesados por sesión
- Leads creados
- Errores de procesamiento
- Tiempo de procesamiento

## 🚨 Solución de Problemas

### Error de Autenticación Gmail

```
❌ Error conectando con Gmail: invalid_grant
```

**Solución:**
1. Verifica que el refresh token sea válido
2. Regenera el refresh token si es necesario
3. Asegúrate de que la cuenta tenga permisos

### Error de OpenAI

```
❌ Error processing email with AI: API key not found
```

**Solución:**
1. Verifica la API key de OpenAI
2. El sistema usará parsing manual como respaldo

### Emails No Procesados

**Verificar:**
1. Que los filtros coincidan con los subjects
2. Que los emails no estén ya procesados
3. Que la cuenta de Gmail tenga los emails

## 🔄 Migración desde Make.com

Si ya tienes Make.com configurado:

1. **Mantén el webhook** para compatibilidad
2. **Configura el procesamiento automático**
3. **Prueba ambos sistemas** en paralelo
4. **Migra gradualmente** al sistema local

## 📈 Próximas Mejoras

- [ ] **Webhook en tiempo real** para Gmail
- [ ] **Análisis de sentimiento** más avanzado
- [ ] **Clasificación automática** de urgencia
- [ ] **Respuestas automáticas** personalizadas
- [ ] **Integración con WhatsApp** Business API
- [ ] **Dashboard de métricas** en tiempo real