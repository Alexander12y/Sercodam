# REPORTE DETALLADO: SISTEMA DE ÓRDENES DE PRODUCCIÓN SERCODAM

## RESUMEN EJECUTIVO

El sistema de órdenes de producción de SERCODAM es una aplicación web completa que gestiona el ciclo de vida completo de las órdenes de producción, desde su creación hasta su finalización, incluyendo la gestión de inventario, cortes de materiales y seguimiento de procesos. El sistema está compuesto por un backend en Node.js con Express y un frontend en React.

---

## 1. ARQUITECTURA DEL SISTEMA

### 1.1 Componentes Principales
- **Backend**: Node.js + Express + Knex.js (PostgreSQL)
- **Frontend**: React + Material-UI + Redux
- **Base de Datos**: PostgreSQL con múltiples esquemas
- **Autenticación**: JWT + 2FA
- **Generación de PDF**: Automática para órdenes
- **Webhooks**: Integración con Make.com

### 1.2 Estructura de Base de Datos
```
orden_produccion (tabla principal)
├── orden_produccion_detalle (materiales y herramientas)
├── trabajo_corte (trabajos de corte por paño)
├── plan_corte_pieza (plan de cortes)
├── real_corte_pieza (cortes reales ejecutados)
├── cortes_individuales (cortes específicos)
├── panos_sobrantes (remanentes de cortes)
├── movimiento_inventario (auditoría de movimientos)
└── reporte_variacion (control de calidad)
```

---

## 2. FLUJO COMPLETO DE ÓRDENES DE PRODUCCIÓN

### 2.1 CREACIÓN DE ÓRDENES

#### 2.1.1 Proceso de Creación
1. **Datos Generales**:
   - Cliente (búsqueda automática o creación)
   - Observaciones y prioridad
   - Fechas de inicio y fin estimadas
   - Generación automática de número de orden (formato: OP-YYYYMMDD-XXX)

2. **Selección de Paños**:
   - Búsqueda por tipo de red (nylon, lona, polipropileno, malla sombra)
   - Filtros por calibre, cuadro, color, presentación
   - Cálculo automático de dimensiones recomendadas
   - Validación de stock disponible
   - Soporte para cortes individuales y simples

3. **Materiales Extras**:
   - Selección de materiales adicionales
   - Categorización por tipo
   - Validación de disponibilidad
   - Cálculo de costos

4. **Herramientas**:
   - Asignación de herramientas necesarias
   - Control de disponibilidad
   - Categorización por tipo

#### 2.1.2 Validaciones en Creación
- **Stock Disponible**: Verificación de paños, materiales y herramientas
- **Dimensiones**: Validación de que las dimensiones solicitadas quepan en los paños
- **Cliente**: Validación de datos del cliente
- **Draft System**: Guardado automático de borradores

### 2.2 APROBACIÓN DE ÓRDENES

#### 2.2.1 Proceso de Aprobación
1. **Validación de Locks**: Verificar que los paños no estén en otras órdenes aprobadas
2. **Cambio de Estado**: De "por aprobar" a "en_proceso"
3. **Reserva de Inventario**:
   - Paños: Estado cambia a "Reservado"
   - Materiales: Descuento inmediato del inventario
   - Herramientas: Asignación y descuento
4. **Generación de PDF**: Creación automática del documento de orden
5. **Webhook**: Envío a Make.com para notificaciones

#### 2.2.2 Estados de Órdenes
- `BORRADOR`: Orden en proceso de creación
- `por aprobar`: Orden creada, pendiente de aprobación
- `en_proceso`: Orden aprobada, en ejecución
- `completada`: Orden finalizada exitosamente
- `cancelada`: Orden cancelada
- `pausada`: Orden temporalmente suspendida

### 2.3 SISTEMA DE CORTES

#### 2.3.1 Tipos de Corte
1. **Corte Simple**: Un corte rectangular del paño
2. **Cortes Individuales**: Múltiples cortes específicos de un paño

#### 2.3.2 Algoritmo de Corte Guillotina
```javascript
// Función principal de cálculo de cortes
computeGuillotineCuts: (pano, altura_req, ancho_req) => {
    // Permite rotación para mejor aprovechamiento
    // Calcula remanentes y desperdicio
    // Retorna plan de cortes optimizado
}
```

#### 2.3.3 Proceso de Ejecución de Cortes
1. **Asignación a Operador**: Los cortes se asignan a operadores específicos
2. **Plan de Corte**: Generación automática del plan de piezas
3. **Ejecución**: Registro de cortes reales vs. planificados
4. **Control de Calidad**: Validación de tolerancias (±5%)
5. **Gestión de Remanentes**: Creación automática de sobrantes utilizables

#### 2.3.4 Estados de Trabajos de Corte
- `Planeado`: Corte planificado, pendiente de ejecución
- `En progreso`: Corte en ejecución
- `Confirmado`: Corte completado dentro de tolerancias
- `Desviado`: Corte fuera de tolerancias, requiere aprobación
- `Cancelado`: Corte cancelado

### 2.4 GESTIÓN DE INVENTARIO

#### 2.4.1 Tipos de Inventario
1. **Paños**: Materiales principales (nylon, lona, polipropileno, malla sombra)
2. **Materiales Extras**: Materiales adicionales (cuerdas, clips, etc.)
3. **Herramientas**: Equipos y herramientas de corte

#### 2.4.2 Estados de Paños
- `Libre`: Disponible para uso
- `Reservado`: Asignado a una orden aprobada
- `En progreso`: En proceso de corte
- `Consumido`: Completamente utilizado

#### 2.4.3 Movimientos de Inventario
- `ENTRADA`: Recepción de materiales
- `SALIDA`: Salida de materiales
- `CONSUMO`: Consumo por órdenes
- `AJUSTE_IN`: Ajuste positivo de inventario
- `AJUSTE_OUT`: Ajuste negativo (desperdicio)

### 2.5 COMPLETACIÓN DE ÓRDENES

#### 2.5.1 Validaciones para Completar
1. **Todos los paños consumidos**: Verificación de estado "Consumido"
2. **Todos los cortes confirmados**: Trabajos en estado "Confirmado" o "Desviado"
3. **Materiales procesados**: Verificación de consumo de materiales

#### 2.5.2 Proceso de Completación
1. **Liberación de Paños**: Cambio de estado a "Libre" para remanentes
2. **Creación de Remanentes**: Generación de nuevos paños de sobrantes
3. **Auditoría**: Registro de movimientos de inventario
4. **Notificaciones**: Envío de webhooks de completación

---

## 3. FUNCIONALIDADES TÉCNICAS DETALLADAS

### 3.1 GESTIÓN DE PAÑOS

#### 3.1.1 Búsqueda y Filtrado
```javascript
// Endpoints principales
GET /api/v1/inventario/panos
GET /api/v1/inventario/panos/catalogos/{tipo}
GET /api/v1/inventario/panos/calculate-dimensions
```

#### 3.1.2 Cálculo de Dimensiones Recomendadas
- Algoritmo que optimiza el aprovechamiento del paño
- Considera rotación para mejor fit
- Calcula dimensiones equilibradas (ratio largo/ancho)

#### 3.1.3 Gestión de Remanentes
- Umbral configurable para sobrantes (default: 5m²)
- Creación automática de nuevos paños de remanentes
- Clasificación como desperdicio si está bajo el umbral

### 3.2 SISTEMA DE CORTES INDIVIDUALES

#### 3.2.1 Estructura de Datos
```sql
-- Tabla de cortes individuales
cortes_individuales (
    job_id,
    seq,
    largo,
    ancho,
    cantidad,
    area_total
)
```

#### 3.2.2 Proceso de Corte Individual
1. **Planificación**: Creación de plan de cortes específicos
2. **Ejecución**: Registro de cortes reales
3. **Validación**: Control de tolerancias por corte
4. **Reporte**: Generación de reportes de variación

### 3.3 CONTROL DE CALIDAD

#### 3.3.1 Tolerancias
- **Tolerancia por defecto**: ±5% en área
- **Validación de conteo**: Número de piezas vs. esperado
- **Reportes de variación**: Registro de desviaciones

#### 3.3.2 Estados de Aprobación
- **Anulado**: Dentro de tolerancias, aprobado automáticamente
- **Abrir**: Fuera de tolerancias, requiere aprobación manual

### 3.4 GENERACIÓN DE PDF

#### 3.4.1 Contenido del PDF
- Datos de la orden y cliente
- Lista de paños con especificaciones técnicas
- Materiales y herramientas asignadas
- Plan de cortes detallado
- Información de remanentes

#### 3.4.2 Triggers de Generación
- Creación de orden (automático)
- Aprobación de orden
- Solicitud manual de descarga

### 3.5 SISTEMA DE WEBHOOKS

#### 3.5.1 Eventos Configurados
- Orden en proceso
- Orden completada
- Orden cancelada

#### 3.5.2 Integración con Make.com
- Envío automático de datos de orden
- Inclusión de PDF adjunto
- Notificaciones a sistemas externos

---

## 4. INTERFAZ DE USUARIO

### 4.1 ROLES Y PERMISOS

#### 4.1.1 Roles Definidos
- **admin**: Acceso completo al sistema
- **supervisor**: Gestión de inventario y órdenes
- **operador**: Ejecución de cortes y seguimiento

#### 4.1.2 Funcionalidades por Rol
- **Admin**: Todas las funcionalidades
- **Supervisor**: Creación, aprobación, gestión de inventario
- **Operador**: Ejecución de cortes, visualización de órdenes

### 4.2 PÁGINAS PRINCIPALES

#### 4.2.1 Dashboard
- Resumen de órdenes por estado
- Alertas de inventario
- Métricas de producción

#### 4.2.2 Gestión de Órdenes
- Lista de órdenes con filtros
- Creación de nuevas órdenes
- Detalle y edición de órdenes
- Aprobación de órdenes

#### 4.2.3 Ejecución de Cortes
- Lista de trabajos pendientes
- Formulario de ejecución de cortes
- Registro de cortes reales
- Visualización de planes de corte

#### 4.2.4 Gestión de Inventario
- Lista de paños disponibles
- Gestión de materiales extras
- Control de herramientas
- Movimientos de inventario

---

## 5. FUNCIONALIDADES AVANZADAS

### 5.1 SISTEMA DE BORRADORES

#### 5.1.1 Características
- Guardado automático de formularios
- Restauración de datos perdidos
- Gestión por usuario y paso

#### 5.1.2 Implementación
```javascript
// Hook personalizado para gestión de drafts
const useDraft = (userId, step) => {
    // Lógica de guardado y carga automática
}
```

### 5.2 CACHÉ Y OPTIMIZACIÓN

#### 5.2.1 Redis Cache
- Caché de catálogos
- Caché de consultas frecuentes
- Invalidación automática

#### 5.2.2 Optimización de Consultas
- Vistas materializadas para reportes
- Índices optimizados
- Paginación eficiente

### 5.3 SEGURIDAD

#### 5.3.1 Autenticación
- JWT tokens
- Autenticación de dos factores (2FA)
- Rate limiting por endpoint

#### 5.3.2 Validación
- Validación de entrada en frontend y backend
- Sanitización de datos
- Prevención de inyección SQL

---

## 6. FLUJO DE DATOS COMPLETO

### 6.1 CREACIÓN → APROBACIÓN → EJECUCIÓN → COMPLETACIÓN

```
1. CREACIÓN
   ├── Validación de stock
   ├── Generación de número de orden
   ├── Creación de trabajos de corte
   └── Guardado de draft

2. APROBACIÓN
   ├── Validación de locks
   ├── Reserva de inventario
   ├── Generación de PDF
   └── Envío de webhook

3. EJECUCIÓN
   ├── Asignación a operador
   ├── Ejecución de cortes
   ├── Control de calidad
   └── Gestión de remanentes

4. COMPLETACIÓN
   ├── Validación de estados
   ├── Liberación de inventario
   ├── Creación de remanentes
   └── Notificaciones finales
```

### 6.2 GESTIÓN DE ERRORES

#### 6.2.1 Tipos de Errores
- **ValidationError**: Datos inválidos
- **NotFoundError**: Recurso no encontrado
- **ConflictError**: Conflicto de recursos
- **InternalError**: Error interno del servidor

#### 6.2.2 Manejo de Errores
- Logging detallado
- Respuestas estructuradas
- Rollback de transacciones
- Notificaciones al usuario

---

## 7. MÉTRICAS Y REPORTES

### 7.1 MÉTRICAS DISPONIBLES
- Órdenes por estado
- Tiempo promedio de completación
- Eficiencia de cortes
- Utilización de inventario
- Desperdicio vs. aprovechamiento

### 7.2 REPORTES AUTOMÁTICOS
- PDF de órdenes de producción
- Reportes de variación de cortes
- Movimientos de inventario
- Historial de cambios de estado

---

## 8. INTEGRACIONES

### 8.1 SISTEMAS EXTERNOS
- **Make.com**: Automatización de procesos
- **Sistemas de notificación**: Email, WhatsApp
- **Sistemas contables**: Integración futura

### 8.2 APIs EXPUESTAS
- REST API completa
- Documentación automática
- Rate limiting configurable
- CORS configurado

---

## 9. CONSIDERACIONES TÉCNICAS

### 9.1 ESCALABILIDAD
- Arquitectura modular
- Base de datos optimizada
- Caché distribuido
- Logging centralizado

### 9.2 MANTENIBILIDAD
- Código documentado
- Tests automatizados
- Migraciones versionadas
- Configuración por entorno

### 9.3 SEGURIDAD
- Autenticación robusta
- Validación de entrada
- Auditoría completa
- Backup automático

---

## 10. CONCLUSIONES

El sistema de órdenes de producción de SERCODAM es una solución completa y robusta que cubre todo el ciclo de vida de las órdenes de producción. Sus características principales incluyen:

1. **Gestión integral del inventario** con control automático de stock
2. **Sistema de cortes avanzado** con algoritmos de optimización
3. **Control de calidad** con tolerancias configurables
4. **Automatización completa** con webhooks y generación de PDF
5. **Interfaz intuitiva** con roles y permisos bien definidos
6. **Arquitectura escalable** preparada para crecimiento

El sistema está diseñado para maximizar la eficiencia operativa mientras mantiene un control estricto sobre la calidad y el inventario, proporcionando visibilidad completa del proceso de producción. 