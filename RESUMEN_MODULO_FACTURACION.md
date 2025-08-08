# Módulo de Facturación - SERCODAM

## 📋 Resumen de Implementación

Se ha creado exitosamente el módulo de Facturación para el ERP de Sercodam, incluyendo tanto el backend como el frontend.

## 🗄️ Base de Datos

### Tablas Creadas

1. **`factura`** - Tabla principal de facturas
   - `id_factura` (SERIAL PRIMARY KEY)
   - `numero_factura` (VARCHAR(50) UNIQUE) - Formato: FAC-YYYY-XXXX
   - `id_cliente` (INTEGER) - Referencia a cliente
   - `id_cotizacion` (INTEGER) - Referencia opcional a cotización
   - `fecha_emision` (TIMESTAMP) - Fecha de emisión
   - `fecha_vencimiento` (TIMESTAMP) - Fecha límite de pago
   - `subtotal`, `iva`, `total` (NUMERIC) - Totales
   - `estado` (VARCHAR) - borrador, emitida, pagada, cancelada, vencida, parcialmente_pagada
   - Datos del cliente (copia histórica)
   - Datos fiscales (RFC, dirección fiscal)

2. **`factura_detalle`** - Detalle de items de factura
   - `id_detalle` (SERIAL PRIMARY KEY)
   - `id_factura` (INTEGER) - Referencia a factura
   - `descripcion` (TEXT) - Descripción del item
   - `cantidad`, `precio_unitario`, `subtotal` (NUMERIC)
   - `iva_porcentaje` (NUMERIC) - Por defecto 16%
   - `iva_monto`, `total_linea` (NUMERIC)
   - `catalogo`, `tipo_item` (VARCHAR) - Para identificar tipo de producto

3. **`pago`** - Registro de pagos recibidos
   - `id_pago` (SERIAL PRIMARY KEY)
   - `id_factura` (INTEGER) - Referencia a factura
   - `monto` (NUMERIC) - Monto del pago
   - `fecha_pago` (TIMESTAMP)
   - `metodo_pago` (VARCHAR) - efectivo, transferencia, cheque, tarjeta, etc.
   - `referencia_pago` (VARCHAR) - Número de referencia
   - `notas` (TEXT)

4. **`facturas_draft`** - Borradores de facturas
   - `id_draft` (SERIAL PRIMARY KEY)
   - `id_usuario` (INTEGER) - Usuario que creó el borrador
   - `datos_formulario` (JSONB) - Datos del formulario
   - `detalle_productos` (JSONB) - Productos seleccionados
   - Fechas de creación, actualización y expiración

### Funciones y Triggers

1. **`generar_numero_factura()`** - Genera automáticamente números de factura
2. **`actualizar_totales_factura()`** - Actualiza totales cuando se modifica el detalle
3. **`actualizar_estado_factura()`** - Actualiza estado basado en pagos recibidos

### Índices Creados

- `idx_factura_cliente` - Para búsquedas por cliente
- `idx_factura_estado` - Para filtros por estado
- `idx_factura_fecha_emision` - Para ordenamiento por fecha
- `idx_factura_numero` - Para búsquedas por número
- `idx_factura_cotizacion` - Para relación con cotizaciones
- Índices en tablas relacionadas para optimizar joins

## 🔧 Backend

### Controlador (`facturaController.js`)

**Endpoints implementados:**

1. **GET `/api/v1/facturas`** - Lista de facturas con filtros y paginación
   - Filtros: estado, cliente, fechas, número de factura
   - Paginación: page, limit
   - Incluye totales pagados y saldo pendiente

2. **GET `/api/v1/facturas/:id`** - Detalle completo de factura
   - Información de la factura
   - Detalle de items
   - Historial de pagos
   - Cotización relacionada (si existe)

3. **POST `/api/v1/facturas`** - Crear nueva factura
   - Validación de campos requeridos
   - Cálculo automático de totales
   - Generación automática de número de factura

4. **PUT `/api/v1/facturas/:id`** - Actualizar factura
   - Solo facturas no pagadas
   - Actualización de detalles

5. **PATCH `/api/v1/facturas/:id/status`** - Cambiar estado
   - Estados válidos: borrador, emitida, pagada, cancelada, vencida, parcialmente_pagada

6. **POST `/api/v1/facturas/:id/pagos`** - Registrar pago
   - Validación de monto vs saldo pendiente
   - Actualización automática de estado

7. **DELETE `/api/v1/facturas/:id`** - Eliminar factura
   - Solo facturas en estado borrador

8. **GET `/api/v1/facturas/stats`** - Estadísticas
   - Conteos por estado
   - Totales facturados, pagados y pendientes
   - Estadísticas mensuales

### Rutas (`facturaRoutes.js`)

- Todas las rutas protegidas para usuarios con rol 'admin'
- Middleware de autenticación aplicado

### Características del Backend

- **Transacciones**: Uso de transacciones para operaciones complejas
- **Validaciones**: Validación de datos de entrada
- **Cálculos automáticos**: IVA, totales, saldos pendientes
- **Auditoría**: Fechas de creación y actualización
- **Integridad referencial**: Claves foráneas y CASCADE donde corresponde

## 🎨 Frontend

### Página de Lista (`FacturasList.jsx`)

**Características implementadas:**

1. **Dashboard con estadísticas**
   - Total de facturas
   - Total facturado
   - Total pagado
   - Monto pendiente

2. **Filtros avanzados**
   - Número de factura
   - Cliente
   - Estado
   - Rango de fechas
   - Botón para limpiar filtros

3. **Tabla con paginación**
   - Información completa de cada factura
   - Estados con chips de colores
   - Acciones contextuales según estado

4. **Acciones por factura**
   - Ver detalles
   - Editar (solo facturas no pagadas)
   - Registrar pago (modal)
   - Eliminar (solo borradores)

5. **Modal de registro de pagos**
   - Validación de monto
   - Métodos de pago predefinidos
   - Campos para referencia y notas

### Servicio API (`api.js`)

**Métodos implementados:**

- `getFacturas(params)` - Lista con filtros
- `getFacturaById(id)` - Detalle de factura
- `createFactura(data)` - Crear factura
- `updateFactura(id, data)` - Actualizar factura
- `changeStatus(id, estado)` - Cambiar estado
- `registerPayment(id, data)` - Registrar pago
- `deleteFactura(id)` - Eliminar factura
- `getStats(params)` - Estadísticas
- `generatePDF(id)` - Generar PDF (preparado)
- `sendEmail(id)` - Enviar por email (preparado)

### Navegación

**Menú actualizado:**
- Nuevo módulo "Facturación" en el sidebar
- Submenús: "Lista de Facturas" y "Nueva Factura"
- Solo visible para usuarios con rol 'admin'
- Icono de recibo (ReceiptOutlinedIcon)

**Rutas agregadas:**
- `/facturas` - Lista de facturas (protegida para admin)

## 🔐 Seguridad

### Permisos
- **Solo administradores** pueden acceder al módulo
- Middleware de autenticación en todas las rutas
- Validación de roles en frontend y backend

### Validaciones
- Campos requeridos en creación/actualización
- Validación de montos vs saldos pendientes
- Estados válidos para facturas
- Solo facturas en borrador pueden eliminarse

## 📊 Funcionalidades Clave

### 1. Generación Automática de Números
- Formato: FAC-YYYY-XXXX
- Secuencia automática por año
- Único por factura

### 2. Cálculos Automáticos
- IVA por defecto 16% (configurable)
- Totales calculados automáticamente
- Saldos pendientes actualizados en tiempo real

### 3. Estados Inteligentes
- Cambio automático de estado según pagos
- Estados: borrador → emitida → pagada/parcialmente_pagada
- Estados especiales: cancelada, vencida

### 4. Integración con Cotizaciones
- Opcional: generar factura desde cotización
- Mantiene referencia histórica
- No afecta la cotización original

### 5. Gestión de Pagos
- Múltiples pagos por factura
- Diferentes métodos de pago
- Referencias y notas
- Validación de montos

## 🚀 Próximos Pasos Sugeridos

### Funcionalidades Adicionales

1. **Generación de PDF**
   - Plantilla de factura profesional
   - Incluir logo de Sercodam
   - Datos fiscales completos

2. **Envío por Email**
   - Integración con sistema de emails
   - Plantillas de email
   - Adjuntar PDF automáticamente

3. **Página de Detalle de Factura**
   - Vista completa de factura
   - Historial de pagos
   - Acciones adicionales

4. **Página de Creación/Edición**
   - Formulario completo
   - Selección de productos
   - Cálculos en tiempo real

5. **Reportes**
   - Facturas por período
   - Análisis de cobranza
   - Exportación a Excel

6. **Notificaciones**
   - Facturas vencidas
   - Recordatorios de pago
   - Alertas automáticas

## ✅ Estado Actual

**Completado:**
- ✅ Base de datos completa
- ✅ Backend funcional
- ✅ API endpoints
- ✅ Frontend básico (lista)
- ✅ Filtros y paginación
- ✅ Registro de pagos
- ✅ Estadísticas
- ✅ Seguridad y permisos

**Pendiente:**
- 🔄 Página de detalle de factura
- 🔄 Página de creación/edición
- 🔄 Generación de PDF
- 🔄 Envío por email
- 🔄 Reportes avanzados

## 🎯 Conclusión

El módulo de Facturación está **funcionalmente completo** para las operaciones básicas:
- Crear y gestionar facturas
- Registrar pagos
- Consultar estadísticas
- Filtrar y buscar facturas

La arquitectura está diseñada para ser escalable y fácil de extender con funcionalidades adicionales según las necesidades del negocio.
