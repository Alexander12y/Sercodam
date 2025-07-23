# 🚀 Plan de Implementación Técnica - Integración Fases 1-3

## 📊 Resumen del Análisis

### 🔍 Comparación de Arquitecturas

| Aspecto | Otro Proyecto | Nuestro Proyecto | Compatibilidad |
|---------|---------------|------------------|----------------|
| **Frontend** | Next.js 14 (App Router) | React + Vite | ⚠️ Media |
| **Lenguaje** | TypeScript + JavaScript | JavaScript | ✅ Alta |
| **Base de Datos** | SQLite (Prisma ORM) | PostgreSQL (Knex.js) | ⚠️ Baja |
| **Autenticación** | NextAuth.js (no implementado) | JWT + 2FA | ⚠️ Media |
| **Estado** | React Hooks | Redux Toolkit | ⚠️ Media |

### 🎯 Funcionalidades a Integrar

**Del otro proyecto:**
- ✅ Sistema de cotizaciones (Fase 2)
- ✅ Gestión de documentos con IA
- ✅ Sistema de facturas SAT/CFDI (Fase 7)
- ✅ Mensajes de email

**Ya tenemos:**
- ✅ Gestión de clientes
- ✅ Sistema de inventario
- ✅ Órdenes de producción
- ✅ Autenticación robusta

---

## 🛠️ Estrategia de Implementación

### 🟢 **ESTRATEGIA RECOMENDADA: Integración Gradual**

**Razones:**
1. **Mantiene estabilidad** del sistema actual
2. **Reduce riesgo** de pérdida de datos
3. **Permite testing incremental**
4. **Facilita rollback** si hay problemas

---

## 📋 Plan de Acción Detallado

### 📅 **FASE 1: Análisis y Planificación (1-2 semanas)**

#### 1.1 Análisis del Esquema Prisma
```bash
# Necesitamos obtener del otro proyecto:
- schema.prisma completo
- Datos de ejemplo en SQLite
- Documentación de relaciones
- Validaciones y constraints
```

#### 1.2 Mapeo de Modelos
```sql
-- Modelos del otro proyecto a migrar:
Client          → cliente (ya existe, extender)
Document        → documento (nuevo)
Invoice         → factura (nuevo)
Quotation       → cotizacion (nuevo)
EmailMessage    → mensaje_email (nuevo)
```

#### 1.3 Plan de Migración de Datos
- Scripts de exportación desde SQLite
- Scripts de importación a PostgreSQL
- Validaciones de integridad
- Testing de migración

---

### 📅 **FASE 2: Migración de Base de Datos (2-3 semanas)**

#### 2.1 Nuevas Migraciones Knex

```javascript
// 20250101000001_create_cotizacion_table.js
exports.up = function(knex) {
    return knex.schema.createTable('cotizacion', (table) => {
        table.increments('id_cotizacion').primary();
        table.integer('id_cliente').references('id_cliente').inTable('cliente');
        table.string('numero_cotizacion', 50).unique().notNullable();
        table.decimal('total', 15, 2).notNullable();
        table.enum('estado', ['borrador', 'enviada', 'aceptada', 'rechazada', 'expirada'])
            .defaultTo('borrador').notNullable();
        table.timestamp('fecha_creacion').defaultTo(knex.fn.now());
        table.timestamp('fecha_expiracion');
        table.text('observaciones');
        table.integer('created_by').references('id').inTable('usuario');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        
        // Índices
        table.index(['id_cliente']);
        table.index(['numero_cotizacion']);
        table.index(['estado']);
        table.index(['fecha_creacion']);
    });
};
```

```javascript
// 20250101000002_create_cotizacion_detalle_table.js
exports.up = function(knex) {
    return knex.schema.createTable('cotizacion_detalle', (table) => {
        table.increments('id_detalle').primary();
        table.integer('id_cotizacion').references('id_cotizacion').inTable('cotizacion').onDelete('CASCADE');
        table.string('descripcion', 500).notNullable();
        table.decimal('cantidad', 10, 2).notNullable();
        table.string('unidad_medida', 20).defaultTo('unidad');
        table.decimal('precio_unitario', 15, 2).notNullable();
        table.decimal('subtotal', 15, 2).notNullable();
        table.decimal('iva', 5, 2).defaultTo(16.00);
        table.decimal('total', 15, 2).notNullable();
        table.text('notas');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        
        // Índices
        table.index(['id_cotizacion']);
    });
};
```

```javascript
// 20250101000003_create_documento_table.js
exports.up = function(knex) {
    return knex.schema.createTable('documento', (table) => {
        table.increments('id_documento').primary();
        table.integer('id_cliente').references('id_cliente').inTable('cliente');
        table.string('nombre_archivo', 255).notNullable();
        table.string('ruta_archivo', 500).notNullable();
        table.integer('tamaño_bytes');
        table.string('tipo_mime', 100);
        table.enum('tipo_documento', ['cotizacion', 'factura', 'orden_produccion', 'otro'])
            .defaultTo('otro').notNullable();
        table.enum('categoria', ['fiscal', 'pago', 'produccion', 'otro'])
            .defaultTo('otro').notNullable();
        table.decimal('confianza_ia', 3, 2); // 0.00 a 1.00
        table.enum('estado', ['subido', 'procesado', 'revisado', 'error'])
            .defaultTo('subido').notNullable();
        table.text('resultado_analisis'); // JSON como texto
        table.text('texto_ocr');
        table.timestamp('fecha_revision');
        table.text('notas_revision');
        table.integer('created_by').references('id').inTable('usuario');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        
        // Índices
        table.index(['id_cliente']);
        table.index(['tipo_documento']);
        table.index(['categoria']);
        table.index(['estado']);
    });
};
```

#### 2.2 Scripts de Migración de Datos

```javascript
// migrate_data_from_sqlite.js
const sqlite3 = require('sqlite3');
const { Pool } = require('pg');

async function migrateClients() {
    // Migrar clientes del otro proyecto
    // Mapear campos: Client → cliente
}

async function migrateQuotations() {
    // Migrar cotizaciones
    // Mapear campos: Quotation → cotizacion
}

async function migrateDocuments() {
    // Migrar documentos
    // Mapear campos: Document → documento
}
```

---

### 📅 **FASE 3: Implementación de Funcionalidades (4-6 semanas)**

#### 3.1 Sistema de Cotizaciones

**Backend - Controladores:**

```javascript
// sercodam-backend/src/controllers/cotizacionesController.js
const cotizacionesController = {
    // GET /api/v1/cotizaciones
    getCotizaciones: async (req, res) => {
        // Listar cotizaciones con filtros
    },
    
    // POST /api/v1/cotizaciones
    createCotizacion: async (req, res) => {
        // Crear nueva cotización
    },
    
    // PUT /api/v1/cotizaciones/:id
    updateCotizacion: async (req, res) => {
        // Actualizar cotización
    },
    
    // POST /api/v1/cotizaciones/:id/approve
    approveCotizacion: async (req, res) => {
        // Aprobar cotización y crear orden de producción
    },
    
    // POST /api/v1/cotizaciones/:id/reject
    rejectCotizacion: async (req, res) => {
        // Rechazar cotización
    }
};
```

**Frontend - Componentes:**

```jsx
// sercodam-frontend/src/pages/CotizacionesList.jsx
const CotizacionesList = () => {
    // Lista de cotizaciones con filtros
    // Estados: borrador, enviada, aceptada, rechazada
    // Acciones: crear, editar, aprobar, rechazar
};

// sercodam-frontend/src/components/forms/CotizacionForm.jsx
const CotizacionForm = () => {
    // Formulario para crear/editar cotizaciones
    // Campos: cliente, productos, precios, observaciones
    // Validaciones y cálculos automáticos
};
```

#### 3.2 Gestión de Documentos

```javascript
// sercodam-backend/src/controllers/documentosController.js
const documentosController = {
    // POST /api/v1/documentos/upload
    uploadDocument: async (req, res) => {
        // Subir documento con análisis de IA
    },
    
    // GET /api/v1/documentos
    getDocumentos: async (req, res) => {
        // Listar documentos con filtros
    },
    
    // POST /api/v1/documentos/:id/analyze
    analyzeDocument: async (req, res) => {
        // Análisis de IA del documento
    }
};
```

#### 3.3 Integración con Órdenes de Producción

```javascript
// Modificar ordenesController.js
const ordenesController = {
    // Extender createOrden para aceptar cotización
    createOrdenFromCotizacion: async (req, res) => {
        // Crear orden desde cotización aprobada
        // Copiar productos y precios
        // Mantener referencia a cotización
    }
};
```

---

### 📅 **FASE 4: Integración y Testing (2-3 semanas)**

#### 4.1 Testing End-to-End

```javascript
// test_integration_cotizacion_orden.js
describe('Flujo Cotización → Orden de Producción', () => {
    test('Crear cotización y convertir a orden', async () => {
        // 1. Crear cotización
        // 2. Aprobar cotización
        // 3. Verificar que se crea orden automáticamente
        // 4. Validar datos transferidos
    });
});
```

#### 4.2 Optimización de Performance

```javascript
// Implementar cache para cotizaciones frecuentes
// Optimizar consultas de base de datos
// Implementar paginación eficiente
```

---

## 🗄️ Estructura de Base de Datos Final

### Tablas Nuevas

```sql
-- Cotizaciones
cotizacion
├── id_cotizacion (PK)
├── id_cliente (FK → cliente)
├── numero_cotizacion (unique)
├── total
├── estado (borrador, enviada, aceptada, rechazada, expirada)
├── fecha_creacion
├── fecha_expiracion
├── observaciones
└── created_by (FK → usuario)

cotizacion_detalle
├── id_detalle (PK)
├── id_cotizacion (FK → cotizacion)
├── descripcion
├── cantidad
├── unidad_medida
├── precio_unitario
├── subtotal
├── iva
├── total
└── notas

-- Documentos
documento
├── id_documento (PK)
├── id_cliente (FK → cliente)
├── nombre_archivo
├── ruta_archivo
├── tipo_documento
├── categoria
├── confianza_ia
├── estado
├── resultado_analisis (JSON)
├── texto_ocr
└── created_by (FK → usuario)

-- Facturas (para Fase 7)
factura
├── id_factura (PK)
├── id_cliente (FK → cliente)
├── id_orden (FK → orden_produccion)
├── serie
├── folio
├── uuid (SAT)
├── total
├── estado
└── fecha_emision
```

### Relaciones Extendidas

```sql
-- Extender tabla cliente
ALTER TABLE cliente ADD COLUMN rfc VARCHAR(13);
ALTER TABLE cliente ADD COLUMN razon_social VARCHAR(255);
ALTER TABLE cliente ADD COLUMN direccion_fiscal TEXT;

-- Extender tabla orden_produccion
ALTER TABLE orden_produccion ADD COLUMN id_cotizacion INTEGER REFERENCES cotizacion(id_cotizacion);
ALTER TABLE orden_produccion ADD COLUMN id_factura INTEGER REFERENCES factura(id_factura);
```

---

## 🔧 Configuración Técnica

### Variables de Entorno

```env
# Configuración de IA para documentos
AI_SERVICE_URL=https://api.openai.com/v1
AI_SERVICE_KEY=your_openai_key

# Configuración de email
EMAIL_SERVICE=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Configuración de archivos
UPLOAD_PATH=./uploads/documents
MAX_FILE_SIZE=10485760 # 10MB
```

### Dependencias Nuevas

```json
{
  "dependencies": {
    "multer": "^1.4.5-lts.1",
    "openai": "^4.0.0",
    "nodemailer": "^6.9.0",
    "pdf-parse": "^1.1.1",
    "tesseract.js": "^4.0.0"
  }
}
```

---

## 📊 Estimación de Recursos

### Tiempo de Desarrollo
- **Fase 1**: 1-2 semanas
- **Fase 2**: 2-3 semanas  
- **Fase 3**: 4-6 semanas
- **Fase 4**: 2-3 semanas
- **Total**: 9-14 semanas

### Equipo Recomendado
- **1 Desarrollador Senior** (arquitectura y integración)
- **1 Desarrollador Mid** (implementación de funcionalidades)
- **1 QA** (testing y validación)

### Riesgos y Mitigación
- **Riesgo**: Pérdida de datos durante migración
  - **Mitigación**: Backups completos y testing exhaustivo
- **Riesgo**: Incompatibilidad de tecnologías
  - **Mitigación**: Implementación gradual y testing incremental
- **Riesgo**: Performance degradada
  - **Mitigación**: Optimización de consultas y cache

---

## 🚀 Próximos Pasos Inmediatos

1. **Obtener esquema completo** del otro proyecto
2. **Crear backup** de la base de datos actual
3. **Implementar migración** de tabla `cotizacion`
4. **Desarrollar controlador básico** de cotizaciones
5. **Crear componente frontend** para listar cotizaciones

---

## 📞 Soporte y Consultas

Para implementar este plan, necesitaremos:

1. **Acceso al código fuente** del otro proyecto
2. **Esquema Prisma completo** (schema.prisma)
3. **Datos de ejemplo** en SQLite
4. **Documentación de APIs** existentes
5. **Especificaciones de negocio** detalladas

¿Te gustaría que comencemos con algún paso específico del plan? 