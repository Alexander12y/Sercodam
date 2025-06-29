# 📋 Documentación del Webhook de Make.com - SERCODAM

## 🎯 Descripción General

Este webhook permite a Make.com enviar datos de órdenes de producción directamente al sistema SERCODAM, creando automáticamente órdenes de producción con todos sus detalles, materiales y herramientas.

## 🔗 Endpoints Disponibles

### 1. Crear Orden de Producción
- **URL:** `POST /api/v1/webhook/make/orden-produccion`
- **Descripción:** Recibe datos de Make.com y crea una orden de producción automáticamente

### 2. Health Check
- **URL:** `GET /api/v1/webhook/make/health`
- **Descripción:** Verifica el estado del servicio de webhook

### 3. Configuración
- **URL:** `GET /api/v1/webhook/make/config`
- **Descripción:** Obtiene información sobre la configuración del webhook

## 🔐 Autenticación

### API Keys
El webhook utiliza autenticación mediante API keys en el header:

```
x-api-key: sercodam_make_webhook_2025
```

**API Keys disponibles:**
- **Producción:** `sercodam_make_webhook_2025`
- **Pruebas:** `sercodam_test_webhook_2025`

### Headers Requeridos
```
Content-Type: application/json
x-api-key: [API_KEY]
```

## 📦 Estructura de Datos

### Campos Requeridos
```json
{
  "cliente": "string - Nombre del cliente",
  "descripcion_trabajo": "string - Descripción del trabajo",
  "panos": "array - Array de paños con sus especificaciones"
}
```

### Campos Opcionales
```json
{
  "observaciones": "string - Observaciones adicionales",
  "prioridad": "string - baja, media, alta, urgente",
  "fecha_entrega": "string - Fecha de entrega (YYYY-MM-DD)",
  "direccion_instalacion": "string - Dirección de instalación",
  "contacto_cliente": "string - Contacto del cliente",
  "telefono_cliente": "string - Teléfono del cliente",
  "materiales": "array - Materiales adicionales",
  "herramientas": "array - Herramientas requeridas",
  "precio_total": "number - Precio total sin IVA",
  "iva": "number - Monto del IVA",
  "total_con_iva": "number - Precio total con IVA",
  "flete": "string - Información del flete"
}
```

### Estructura de Paños
```json
{
  "largo": "number - Largo en metros",
  "ancho": "number - Ancho en metros",
  "cantidad": "number - Cantidad de tramos",
  "tipo_red": "string - Tipo de red (nylon, lona, etc.)",
  "calibre": "string - Calibre de la red",
  "cuadro": "string - Tamaño del cuadro",
  "torsion": "string - Tipo de torsión",
  "refuerzo": "string - Tipo de refuerzo",
  "color": "string - Color de la red",
  "precio_m2": "number - Precio por metro cuadrado"
}
```

### Estructura de Materiales
```json
{
  "id_item": "number - ID del material en el inventario",
  "cantidad": "number - Cantidad requerida",
  "notas": "string - Notas adicionales"
}
```

### Estructura de Herramientas
```json
{
  "id_item": "number - ID de la herramienta en el inventario",
  "cantidad": "number - Cantidad requerida",
  "notas": "string - Notas adicionales"
}
```

## 📝 Ejemplo Completo

```json
{
  "cliente": "LH - IK",
  "descripcion_trabajo": "255.00 m2 de Red de Nylon",
  "observaciones": "CON REFUERZO EN LAS ORILLAS",
  "prioridad": "media",
  "fecha_entrega": "2025-05-15",
  "direccion_instalacion": "Av. Principal 123, Ciudad de México",
  "contacto_cliente": "Juan Pérez",
  "telefono_cliente": "55-1234-5678",
  "panos": [
    {
      "largo": 50.00,
      "ancho": 1.70,
      "cantidad": 3,
      "tipo_red": "nylon",
      "calibre": "18",
      "cuadro": "1\"",
      "torsion": "torcida",
      "refuerzo": "con refuerzo",
      "color": "teñida",
      "precio_m2": 100.00
    }
  ],
  "materiales": [
    {
      "id_item": 1,
      "cantidad": 10,
      "notas": "Cables de sujeción"
    }
  ],
  "herramientas": [
    {
      "id_item": 1,
      "cantidad": 2,
      "notas": "Taladros para instalación"
    }
  ],
  "precio_total": 25500.00,
  "iva": 4080.00,
  "total_con_iva": 29580.00,
  "flete": "por cobrar"
}
```

## 📤 Respuestas

### Respuesta Exitosa (201 Created)
```json
{
  "success": true,
  "message": "Orden de producción creada exitosamente",
  "data": {
    "id_op": 123,
    "numero_op": "20250115001 SD",
    "cliente": "LH - IK",
    "fecha_creacion": "2025-01-15T10:30:00.000Z",
    "estado": "pendiente",
    "total_panos": 1,
    "total_materiales": 1,
    "total_herramientas": 1
  },
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Respuesta de Error (400 Bad Request)
```json
{
  "success": false,
  "message": "Estructura de datos inválida",
  "requiredFields": ["cliente", "descripcion_trabajo", "panos"],
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

### Respuesta de Error (401 Unauthorized)
```json
{
  "success": false,
  "message": "API key inválida o faltante",
  "timestamp": "2025-01-15T10:30:00.000Z"
}
```

## 🔄 Flujo de Procesamiento

1. **Validación de API Key:** Verifica que la API key sea válida
2. **Validación de Datos:** Verifica que todos los campos requeridos estén presentes
3. **Transformación:** Convierte los datos al formato interno del sistema
4. **Creación de Orden:** Crea la orden de producción en la base de datos
5. **Procesamiento de Paños:** Busca paños disponibles en inventario y los asigna
6. **Procesamiento de Materiales:** Verifica disponibilidad y actualiza stock
7. **Procesamiento de Herramientas:** Asigna herramientas disponibles
8. **Respuesta:** Retorna confirmación con detalles de la orden creada

## 🧪 Pruebas

### Script de Prueba
```bash
cd sercodam-backend
node test-webhook.js
```

### Prueba Manual con cURL
```bash
curl -X POST http://localhost:4000/api/v1/webhook/make/orden-produccion \
  -H "Content-Type: application/json" \
  -H "x-api-key: sercodam_make_webhook_2025" \
  -d @test-data.json
```

### Health Check
```bash
curl http://localhost:4000/api/v1/webhook/make/health
```

## ⚠️ Consideraciones Importantes

### Inventario
- El sistema verificará automáticamente la disponibilidad de paños, materiales y herramientas
- Si no hay stock suficiente, se registrará un warning pero la orden se creará
- Los movimientos de inventario se registran automáticamente

### Numeración de Órdenes
- Las órdenes se numeran automáticamente con el formato: `YYYYMMDD-XXX SD`
- Ejemplo: `20250115-001 SD`

### Estados
- Las órdenes creadas por webhook inician en estado `pendiente`
- Se pueden cambiar manualmente desde el sistema

### Logs
- Todas las operaciones se registran en los logs del sistema
- En desarrollo, se registran detalles adicionales para debugging

## 🚀 Configuración en Make.com

### 1. Configurar HTTP Request
- **Method:** POST
- **URL:** `https://tu-dominio.com/api/v1/webhook/make/orden-produccion`
- **Headers:**
  - `Content-Type: application/json`
  - `x-api-key: sercodam_make_webhook_2025`

### 2. Mapear Datos
Mapear los campos de Make.com a la estructura esperada:
- `cliente` → Nombre del cliente
- `descripcion_trabajo` → Descripción del trabajo
- `panos` → Array de paños con especificaciones
- etc.

### 3. Manejo de Respuestas
- **200-299:** Orden creada exitosamente
- **400:** Error en datos enviados
- **401:** API key inválida
- **500:** Error interno del servidor

## 📞 Soporte

Para soporte técnico o preguntas sobre la implementación:
- Revisar logs del sistema
- Verificar configuración de API keys
- Probar con el script de prueba incluido
- Contactar al equipo de desarrollo

---

**Versión:** 1.0.0  
**Última actualización:** Enero 2025  
**Sistema:** SERCODAM - Orden de Producción 

# Documentación de Webhooks - SERCODAM OP

## Descripción General

El sistema SERCODAM OP incluye funcionalidades de webhook para integración con Make.com, permitiendo:
1. **Recepción de datos** desde Make.com para crear órdenes de producción
2. **Envío automático** de notificaciones a Make.com cuando una orden cambie a estado "en proceso"
3. **Generación de PDFs** de órdenes de producción

## Configuración

### Variables de Entorno Requeridas

```bash
# Configuración de Make.com Webhook
MAKE_WEBHOOK_URL=https://hook.eu1.make.com/your-webhook-url
MAKE_API_KEY=your-make-api-key
```

### Verificar Configuración

```bash
GET /api/v1/webhook/make-config
```

Respuesta:
```json
{
  "success": true,
  "message": "Configuración de Make.com",
  "data": {
    "webhookUrl": "https://hook.eu1.make.com/your-webhook-url",
    "apiKey": "Configurado",
    "timeout": 30000
  }
}
```

## 1. Webhook de Entrada (Make.com → SERCODAM)

### Endpoint
```
POST /api/v1/webhook/orden
```

### Autenticación
- **Header**: `Authorization: Bearer {API_KEY}`
- **API Key**: Configurada en `WEBHOOK_API_KEY`

### Formato de Datos de Entrada

```json
{
  "cliente": "Nombre del Cliente",
  "descripcion_trabajo": "Descripción del trabajo a realizar",
  "observaciones": "Observaciones adicionales",
  "prioridad": "alta|media|baja",
  "fecha_inicio": "2024-01-15",
  "fecha_fin": "2024-01-20",
  "direccion_instalacion": "Dirección de instalación",
  "contacto_cliente": "Nombre del contacto",
  "telefono_cliente": "123-456-7890",
  "panos": [
    {
      "largo_m": 10.5,
      "ancho_m": 3.2,
      "cantidad": 2,
      "tipo_red": "nylon",
      "calibre": "18",
      "cuadro": "1\"",
      "torsion": "torcida",
      "refuerzo": "con refuerzo",
      "color": "teñida",
      "precio_m2": 25.50
    }
  ],
  "materiales": [
    {
      "descripcion": "Cable de acero",
      "categoria": "Sujeción",
      "cantidad": 50,
      "unidad": "metros",
      "precio_unitario": 2.50
    }
  ],
  "herramientas": [
    {
      "nombre": "Taladro",
      "descripcion": "Taladro eléctrico",
      "categoria": "Herramientas eléctricas",
      "cantidad": 1
    }
  ]
}
```

### Respuesta Exitosa

```json
{
  "success": true,
  "message": "Orden de producción creada exitosamente",
  "data": {
    "id_op": 123,
    "numero_op": "OP-2024-001",
    "cliente": "Nombre del Cliente",
    "estado": "pendiente",
    "fecha_creacion": "2024-01-15T10:30:00Z",
    "panos_agregados": 1,
    "materiales_agregados": 1,
    "herramientas_asignadas": 1
  }
}
```

### Respuesta de Error

```json
{
  "success": false,
  "message": "Error validando datos",
  "errors": [
    {
      "field": "cliente",
      "message": "El cliente es requerido"
    }
  ]
}
```

## 2. Webhook de Salida (SERCODAM → Make.com)

### Trigger Automático

El webhook se envía **automáticamente** cuando una orden cambia de estado a **"en_proceso"**.

### Endpoint de Destino
```
POST {MAKE_WEBHOOK_URL}
```

### Headers
```
Content-Type: application/json
Authorization: Bearer {MAKE_API_KEY}
User-Agent: Sercodam-OP/1.0
```

### Formato de Datos Enviados

```json
{
  "evento": "orden_en_proceso",
  "timestamp": "2024-01-15T10:30:00Z",
  "orden": {
    "id_op": 123,
    "numero_op": "OP-2024-001",
    "cliente": "Nombre del Cliente",
    "descripcion_trabajo": "Descripción del trabajo",
    "observaciones": "Observaciones adicionales",
    "prioridad": "alta",
    "fecha_creacion": "2024-01-15T10:30:00Z",
    "fecha_inicio": "2024-01-15",
    "fecha_fin": "2024-01-20",
    "direccion_instalacion": "Dirección de instalación",
    "contacto_cliente": "Nombre del contacto",
    "telefono_cliente": "123-456-7890",
    "estado": "en_proceso",
    "panos": [
      {
        "largo_m": 10.5,
        "ancho_m": 3.2,
        "cantidad": 2,
        "tipo_red": "nylon",
        "area_m2": 33.6
      }
    ],
    "materiales": [
      {
        "descripcion": "Cable de acero",
        "categoria": "Sujeción",
        "cantidad": 50,
        "unidad": "metros"
      }
    ],
    "herramientas": [
      {
        "nombre": "Taladro",
        "descripcion": "Taladro eléctrico",
        "categoria": "Herramientas eléctricas",
        "cantidad": 1
      }
    ]
  }
}
```

### Prueba Manual del Webhook

```bash
POST /api/v1/webhook/test-make
```

Respuesta:
```json
{
  "success": true,
  "message": "Prueba de webhook exitosa",
  "data": {
    "status": 200,
    "data": "Respuesta de Make.com"
  }
}
```

## 3. Generación de PDFs

### Endpoint
```
GET /api/v1/ordenes/{id}/pdf
```

### Autenticación
- **Header**: `Authorization: Bearer {JWT_TOKEN}`

### Respuesta
- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="orden_produccion_OP-2024-001_1234567890.pdf"`

### Características del PDF
- Formato A4
- Incluye información completa de la orden
- Detalles de paños con cálculos de área
- Especificaciones técnicas
- Información de precios
- Datos de entrega

## Endpoints de Utilidad

### Health Check
```bash
GET /api/v1/webhook/health
```

### Configuración
```bash
GET /api/v1/webhook/config
```

## Manejo de Errores

### Códigos de Estado HTTP
- `200`: Operación exitosa
- `400`: Datos inválidos
- `401`: No autorizado
- `404`: Recurso no encontrado
- `429`: Demasiadas solicitudes
- `500`: Error interno del servidor

### Logs
Todos los eventos de webhook se registran en:
- `logs/api.log`: Logs generales
- `logs/error.log`: Errores específicos

## Ejemplos de Uso

### 1. Crear Orden desde Make.com

```javascript
const response = await fetch('http://localhost:4000/api/v1/webhook/orden', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-key'
  },
  body: JSON.stringify({
    cliente: "Empresa ABC",
    descripcion_trabajo: "Instalación de red de nylon",
    panos: [
      {
        largo_m: 15.0,
        ancho_m: 4.0,
        cantidad: 3,
        tipo_red: "nylon"
      }
    ]
  })
});

const result = await response.json();
console.log(result);
```

### 2. Cambiar Estado de Orden (Trigger Webhook)

```javascript
const response = await fetch('http://localhost:4000/api/v1/ordenes/123/estado', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-jwt-token'
  },
  body: JSON.stringify({
    estado: 'en_proceso',
    notas: 'Iniciando producción'
  })
});

const result = await response.json();
console.log(result.data.webhook_enviado); // true si se envió webhook
```

### 3. Generar PDF

```javascript
const response = await fetch('http://localhost:4000/api/v1/ordenes/123/pdf', {
  headers: {
    'Authorization': 'Bearer your-jwt-token'
  }
});

if (response.ok) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'orden_produccion.pdf';
  a.click();
}
```

## Notas Importantes

1. **Webhook Automático**: Se envía automáticamente al cambiar estado a "en_proceso"
2. **Manejo Asíncrono**: El webhook se envía de forma asíncrona para no bloquear la respuesta
3. **Reintentos**: No hay reintentos automáticos en caso de fallo
4. **Logs**: Todos los eventos se registran para auditoría
5. **Seguridad**: Validación de API keys y JWT tokens
6. **Rate Limiting**: Aplicado a todos los endpoints

## Troubleshooting

### Error 500 en Generación de PDF
- Verificar que el directorio `temp/` existe y tiene permisos de escritura
- Revisar logs en `logs/error.log`
- Verificar que la orden existe y tiene datos válidos

### Webhook No Se Envía
- Verificar configuración de `MAKE_WEBHOOK_URL` y `MAKE_API_KEY`
- Revisar logs para errores de conexión
- Probar endpoint `/api/v1/webhook/test-make`

### Error de Autenticación
- Verificar API key en headers
- Verificar JWT token para endpoints protegidos
- Revisar configuración de JWT_SECRET 