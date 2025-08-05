# 📋 Análisis Completo del Proyecto TypeScript - Panel Sercodam Centralizado

## 🎯 **Resumen Ejecutivo**

Este documento presenta el análisis exhaustivo del proyecto TypeScript desarrollado por el equipo externo, que implementa las **fases 1-3 del ERP** (Registro de Cliente, Cotización, Aceptación) con funcionalidades avanzadas de automatización, análisis de documentos con IA, y gestión completa del pipeline de ventas.

---

## 🏗️ **Arquitectura del Proyecto**

### **Stack Tecnológico**
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Base de Datos**: PostgreSQL (esquema integrado)
- **UI**: Tailwind CSS, Radix UI, shadcn/ui
- **Estado**: Zustand (gestión de estado)
- **Autenticación**: NextAuth.js con Google OAuth
- **Integraciones**: WhatsApp Business API, Google Drive, Factura.com, OpenAI/Claude

### **Estructura del Proyecto**
```
panel_sercodam_centralizado_editing/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/         # Autenticación
│   │   ├── clients/      # Gestión de clientes
│   │   ├── quotations/   # Cotizaciones
│   │   ├── invoicing/    # Facturación y análisis
│   │   ├── stages/       # Pipeline de ventas
│   │   └── webhooks/     # Integraciones externas
│   └── quotation/        # Páginas de cotización
├── components/           # Componentes React
│   ├── dashboard/       # Panel principal
│   ├── quotation/       # Formularios de cotización
│   ├── modals/         # Modales y diálogos
│   └── ui/             # Componentes base
├── prisma/             # Esquema de base de datos
└── lib/               # Utilidades y configuraciones
```

---

## 🗄️ **Modelo de Datos (Prisma Schema)**

### **Tablas Principales**

#### **1. Gestión de Clientes (`cliente`)**
```prisma
model cliente {
  id_cliente            Int                   @id @default(autoincrement())
  nombre_cliente        String                @db.VarChar(255)
  email                 String?               @db.VarChar(255)
  telefono              String?               @db.VarChar(50)
  fecha_registro        DateTime?             @default(now())
  client_cuid           String?               @unique @db.VarChar(30)
  company               String?               @db.VarChar(255)
  rfc                   String?               @db.VarChar(13)
  contact_name          String?               @db.VarChar(255)
  phone                 String?               @db.VarChar(20)
  address               String?
  city                  String?               @db.VarChar(100)
  state                 String?               @db.VarChar(100)
  postal_code           String?               @db.VarChar(10)
  country               String?               @default("México")
  source                String?               @db.VarChar(100)
  current_stage         client_stage?         @default(LEAD)
  assigned_to           String?               @db.VarChar(30)
  notes                 String?
  last_contact          DateTime?
  is_active             Boolean?              @default(true)
  created_at            DateTime?             @default(now())
  updated_at            DateTime?             @default(now())
}
```

**Campos Clave:**
- `current_stage`: Etapa actual en el pipeline (LEAD, QUALIFIED, PROPOSAL, etc.)
- `source`: Origen del cliente (LANDING, BOT, REFERRAL, MANUAL)
- `rfc`: Datos fiscales para facturación
- `assigned_to`: Usuario asignado al cliente

#### **2. Pipeline de Ventas (`Stage`, `StageTransition`)**
```prisma
model Stage {
  id                Int               @id @default(autoincrement())
  name              String            @db.VarChar(100)
  description       String?
  order_index       Int               @unique
  color             String?           @default("#3b82f6")
  is_active         Boolean?          @default(true)
  stage_automations StageAutomation[]
}

model StageTransition {
  id         String    @id @default(cuid())
  client_id  Int
  from_stage Int?
  to_stage   Int
  moved_by   Int
  notes      String?
  created_at DateTime? @default(now())
}
```

**Etapas del Pipeline:**
1. **LEAD** - Cliente potencial
2. **QUALIFIED** - Cliente calificado
3. **PROPOSAL** - Propuesta enviada
4. **NEGOTIATION** - En negociación
5. **CLOSED_WON** - Ganado
6. **CLOSED_LOST** - Perdido

#### **3. Cotizaciones (`Quotation`, `QuotationItem`)**
```prisma
model Quotation {
  id                          String             @id @default(cuid())
  client_id                   Int
  quotation_number            String?            @unique @db.VarChar(50)
  project_title               String?            @db.VarChar(255)
  project_type                String?            @db.VarChar(100)
  includes_installation       Boolean?           @default(false)
  items                       Json
  total_amount                Decimal            @db.Decimal(10, 2)
  subtotal                    Decimal?           @db.Decimal(10, 2)
  taxes                       Decimal?           @db.Decimal(10, 2)
  payment_conditions          String?
  shipping_conditions         String?
  delivery_time               String?
  installation_time           String?
  validity_days               Int?               @default(15)
  valid_until                 DateTime?
  status                      String?            @default("DRAFT")
  version                     Int?               @default(1)
  pdf_path                    String?
  pdf_url                     String?
  sent_at                     DateTime?
  approved_at                 DateTime?
  rejected_at                 DateTime?
  created_at                  DateTime?          @default(now())
  updated_at                  DateTime?          @default(now())
}

model QuotationItem {
  id           String   @id @default(cuid())
  quotation_id String
  name         String   @db.VarChar(255)
  description  String?
  quantity     Decimal  @db.Decimal(10, 2)
  unit         String   @db.VarChar(50)
  unit_price   Decimal  @db.Decimal(10, 2)
  subtotal     Decimal  @db.Decimal(10, 2)
  order_index  Int
}
```

#### **4. Documentos (`ClientDocument`)**
```prisma
model ClientDocument {
  id               String             @id @default(cuid())
  client_id        Int
  communication_id String?
  document_type    String             @db.VarChar(50)
  file_name        String             @db.VarChar(255)
  file_path        String             @db.VarChar(500)
  file_size        Int?
  mime_type        String?
  metadata         Json?
  status           String?            @default("UPLOADED")
  category         document_category? @default(OTHER)
  extracted_data   Json?
  confidence       Decimal?           @db.Decimal(5, 4)
  reviewed_by      Int?
  reviewed_at      DateTime?
  review_notes     String?
  email_message_id String?
  created_at       DateTime?          @default(now())
  updated_at       DateTime?          @default(now())
}
```

**Categorías de Documentos:**
- `FISCAL_DOCUMENT` - Documentos fiscales (RFC, etc.)
- `PAYMENT_RECEIPT` - Comprobantes de pago
- `QUOTATION` - Cotizaciones
- `INVOICE` - Facturas
- `OTHER` - Otros documentos

#### **5. Facturación (`Invoice`, `FiscalValidation`)**
```prisma
model Invoice {
  id              String    @id @default(cuid())
  client_id       Int
  quotation_id    String?
  invoice_number  String?   @unique @db.VarChar(50)
  cfdi_uuid       String?   @unique @db.VarChar(50)
  total_amount    Decimal   @db.Decimal(10, 2)
  subtotal        Decimal?  @db.Decimal(10, 2)
  taxes           Decimal?  @db.Decimal(10, 2)
  currency        String?   @default("MXN")
  status          String?   @default("DRAFT")
  cfdi_status     String?
  cfdi_xml_path   String?
  cfdi_pdf_path   String?
  issue_date      DateTime?
  due_date        DateTime?
  paid_at         DateTime?
  created_at      DateTime? @default(now())
  updated_at      DateTime? @default(now())
}

model FiscalValidation {
  id              String    @id @default(cuid())
  client_id       Int
  document_id     String?
  rfc             String?   @db.VarChar(13)
  business_name   String?
  address         Json?
  validation_date DateTime? @default(now())
  is_valid        Boolean?  @default(false)
  errors          Json?
  warnings        Json?
  confidence      Decimal?  @db.Decimal(5, 4)
}
```

---

## 🔄 **Lógica de Negocio Implementada**

### **1. Pipeline de Ventas (Drag & Drop)**

#### **Componente Principal: `sales-pipeline-base.tsx`**
```typescript
interface Client {
  id: number
  name: string
  email: string
  phone?: string
  currentStage: string
  createdAt: string
  updatedAt: string
  source?: string
  company?: string
  address?: string
  notes?: string
}

interface Stage {
  id: number
  name: string
  color: string
  clients: Client[]
}
```

**Funcionalidades:**
- **Drag & Drop**: Mover clientes entre etapas con `@hello-pangea/dnd`
- **Validaciones**: Verificar transiciones permitidas
- **Automatizaciones**: Triggers por cambio de etapa
- **Historial**: Registrar todas las transiciones

#### **API de Transiciones:**
```typescript
// POST /api/stages/[clientId]/move
const handleMoveToStage = async (clientId: number, targetStageId: number) => {
  // 1. Validar transición permitida
  // 2. Actualizar etapa del cliente
  // 3. Registrar transición
  // 4. Ejecutar automatizaciones
  // 5. Notificar cambios
}
```

### **2. Gestión de Clientes**

#### **API de Clientes (`/api/clients/route.ts`)**
```typescript
// GET - Obtener todos los clientes
const result = await client.query(`
  SELECT 
    id_cliente as id,
    nombre_cliente as name,
    email,
    phone,
    company,
    current_stage as "currentStage",
    created_at as "createdAt"
  FROM sercodam_integrated.cliente
  ORDER BY created_at DESC
`)

// POST - Crear nuevo cliente
const insertResult = await client.query(`
  INSERT INTO sercodam_integrated.cliente 
  (nombre_cliente, email, phone, company, contact_name, address, notes)
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING *
`)
```

**Validaciones:**
- Email único
- Campos requeridos (nombre, email)
- Formato de datos fiscales

### **3. Sistema de Cotizaciones**

#### **Formulario Completo (`QuotationForm.tsx`)**
```typescript
interface QuotationFormData {
  // Sección 1: Información General
  clientName: string
  companyName: string
  projectTitle: string
  includesInstallation: boolean

  // Sección 2: Productos
  products: Array<{
    name: string
    quantity: number
    unit: string
    unitPrice: number
    description: string
  }>
  technicalSheetProduct: string
  technicalSheetName: string
  technicalSheetDescription: string

  // Sección 3: Pago
  paymentConditions: string
  shippingConditions: string
  deliveryTime: string
  installationTime: string
  validityDays: number

  // Sección 4: Información Adicional
  installationIncludes: string
  installationExcludes: string
  observations: string
  extraNotes: string
  extraConcepts: string

  // Sección 5: Cláusula Personalizada
  customClauseTitle: string
  customClauseDescription: string
}
```

**Características del Formulario:**
- **5 secciones** con navegación progresiva
- **Validaciones en tiempo real**
- **Cálculos automáticos** (subtotal, IVA, total)
- **Hojas técnicas** predefinidas para productos
- **Cláusulas personalizables**

#### **API de Cotizaciones (`/api/clients/[id]/quotations/route.ts`)**
```typescript
// POST - Crear cotización
const result = await client.query(`
  INSERT INTO sercodam_integrated.quotations (
    id, client_id, quotation_number, project_title,
    subtotal, taxes, total_amount, items,
    payment_conditions, delivery_time, status, valid_until
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  RETURNING *
`)

// Insertar items individuales
for (let i = 0; i < items.length; i++) {
  await client.query(`
    INSERT INTO sercodam_integrated.quotation_items (
      id, quotation_id, name, description, quantity,
      unit, unit_price, subtotal, order_index
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  `)
}
```

### **4. Análisis de Documentos con IA**

#### **API de Análisis (`/api/invoicing/analyze-documents/route.ts`)**
```typescript
export async function POST(request: NextRequest) {
  const { documentIds } = await request.json();
  
  for (const documentId of documentIds) {
    const document = await prisma.clientDocument.findUnique({
      where: { id: documentId }
    });
    
    // Análisis según tipo de archivo
    if (isPDF) {
      // Convertir PDF a imágenes
      const savedDocuments = await convertPdfToImagesAndSave(filePath, document, prisma);
      
      // Analizar cada página y tomar la mejor
      for (const savedDoc of savedDocuments) {
        const analysisResult = await documentAI.analyzeImage(
          base64Image, 
          document.documentType === 'FISCAL_DOCUMENT' ? 'FISCAL_DOCUMENT' : 'PAYMENT_RECEIPT',
          'jpeg'
        );
      }
    } else if (isImage) {
      // Análisis directo con reintentos
      const analysisResult = await documentAI.analyzeImage(
        base64Image,
        document.documentType,
        path.extname(document.fileName).slice(1)
      );
    }
  }
}
```

**Capacidades de Análisis:**
- **Documentos Fiscales**: Extraer RFC, razón social, dirección
- **Comprobantes de Pago**: Extraer monto, fecha, método de pago
- **PDFs Multi-página**: Convertir y analizar cada página
- **Reintentos Automáticos**: Hasta 3 intentos con diferentes configuraciones
- **Confianza**: Calcular nivel de confianza del análisis

### **5. Integración con WhatsApp**

#### **Webhooks de WhatsApp (`/api/webhooks/whatsapp/route.ts`)**
```typescript
// Procesar mensajes entrantes
export async function POST(request: NextRequest) {
  const body = await request.json();
  
  if (body.object === 'whatsapp_business_account') {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.value.messages) {
          for (const message of change.value.messages) {
            // Procesar mensaje
            await processWhatsAppMessage(message);
          }
        }
      }
    }
  }
}

async function processWhatsAppMessage(message: any) {
  // 1. Identificar cliente por número
  const client = await findClientByPhone(message.from);
  
  // 2. Registrar comunicación
  await prisma.clientCommunication.create({
    data: {
      client_id: client.id,
      type: 'WHATSAPP',
      content: message.text.body,
      direction: 'INBOUND',
      metadata: message
    }
  });
  
  // 3. Ejecutar automatizaciones
  await executeStageAutomations(client.id, 'WHATSAPP_MESSAGE');
}
```

### **6. Automatizaciones por Etapa**

#### **Sistema de Automatizaciones (`StageAutomation`)**
```typescript
model StageAutomation {
  id         String    @id @default(cuid())
  stage_id   Int
  name       String    @db.VarChar(255)
  type       String    @db.VarChar(50)  // EMAIL, WHATSAPP, NOTIFICATION
  config     Json      // Configuración específica
  is_active  Boolean?  @default(true)
  created_at DateTime? @default(now())
  updated_at DateTime? @default(now())
}
```

**Tipos de Automatización:**
- **EMAIL**: Envío automático de cotizaciones
- **WHATSAPP**: Notificaciones por WhatsApp
- **NOTIFICATION**: Notificaciones internas
- **DOCUMENT**: Generación automática de documentos

---

## 🎨 **Interfaz de Usuario**

### **1. Dashboard Principal**

#### **Componente: `dashboard.tsx`**
```typescript
export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Métricas en tiempo real */}
      <MetricsCards />
      
      {/* Pipeline de ventas */}
      <SalesPipeline />
      
      {/* Actividad reciente */}
      <RecentActivity />
      
      {/* Acciones rápidas */}
      <QuickActions />
    </div>
  );
}
```

**Elementos del Dashboard:**
- **Métricas**: Clientes por etapa, conversión, ingresos
- **Pipeline Visual**: Drag & drop de clientes
- **Actividad**: Historial de movimientos recientes
- **Acciones Rápidas**: Botones para tareas frecuentes

### **2. Pipeline de Ventas**

#### **Características del Pipeline:**
- **Columnas**: Una por cada etapa del proceso
- **Tarjetas de Cliente**: Información resumida con acciones
- **Drag & Drop**: Mover clientes entre etapas
- **Menú Contextual**: Acciones específicas por cliente
- **Filtros**: Por origen, asignado, fecha

#### **Tarjeta de Cliente:**
```typescript
function ClientCard({ client, onMoveToStage, onGenerateQuotation }) {
  return (
    <Card className="mb-2 cursor-pointer hover:shadow-md">
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium">{client.name}</h4>
            <p className="text-sm text-gray-600">{client.email}</p>
            {client.company && (
              <p className="text-xs text-gray-500">{client.company}</p>
            )}
          </div>
          <Badge variant={getSourceColor(client.source)}>
            {getSourceLabel(client.source)}
          </Badge>
        </div>
        
        <div className="mt-2 flex gap-1">
          <Button size="sm" onClick={() => onGenerateQuotation(client.id)}>
            <FileText className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline">
            <MoreVertical className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

### **3. Formulario de Cotización**

#### **Navegación por Secciones:**
```typescript
const sections = [
  { title: "Información General", icon: User },
  { title: "Productos", icon: Package },
  { title: "Pago y Entrega", icon: CreditCard },
  { title: "Información Adicional", icon: FileText },
  { title: "Cláusula Personalizada", icon: Edit }
];
```

**Características:**
- **5 secciones** con navegación progresiva
- **Validaciones en tiempo real**
- **Cálculos automáticos**
- **Hojas técnicas** predefinidas
- **Guardado automático** de borradores

---

## 🔧 **Integraciones Externas**

### **1. WhatsApp Business API**
- **Webhooks**: Procesar mensajes entrantes
- **Envío**: Mensajes automáticos por etapa
- **Plantillas**: Mensajes predefinidos
- **Media**: Envío de documentos y cotizaciones

### **2. Google Drive**
- **Almacenamiento**: Documentos de clientes
- **Sincronización**: Automática de archivos
- **Compartir**: Enlaces para clientes
- **Backup**: Respaldo automático

### **3. Factura.com (SAT/CFDI)**
- **Generación**: Facturas electrónicas CFDI 4.0
- **Validación**: RFC y datos fiscales
- **Envío**: Automático por email
- **Seguimiento**: Estado de facturas

### **4. OpenAI/Claude**
- **Análisis**: Documentos fiscales y pagos
- **Extracción**: Datos estructurados
- **Clasificación**: Tipos de documento
- **Validación**: Confianza del análisis

---

## 📊 **Flujos de Negocio Implementados**

### **1. Flujo de Cliente Nuevo**
```
1. Cliente llega por landing page/bot → LEAD
2. Contacto inicial → QUALIFIED
3. Generación de cotización → PROPOSAL
4. Negociación → NEGOTIATION
5. Aceptación → CLOSED_WON
6. Producción → Orden de producción
7. Facturación → Factura CFDI
```

### **2. Flujo de Cotización**
```
1. Seleccionar cliente
2. Llenar formulario (5 secciones)
3. Generar PDF automáticamente
4. Enviar por WhatsApp/Email
5. Seguimiento de estado
6. Aprobación/Rechazo
7. Crear orden de producción
```

### **3. Flujo de Documentos**
```
1. Cliente sube documento
2. Análisis automático con IA
3. Extracción de datos
4. Validación de confianza
5. Revisión manual (si es necesario)
6. Almacenamiento en Google Drive
7. Integración con facturación
```

### **4. Flujo de Facturación**
```
1. Documentos analizados
2. Validación de datos fiscales
3. Generación de CFDI
4. Envío automático
5. Seguimiento de estado
6. Registro de pagos
```

---

## 🚀 **Funcionalidades Avanzadas**

### **1. Análisis de Documentos con IA**
- **OCR Inteligente**: Extracción de texto de imágenes
- **Clasificación**: Identificar tipo de documento
- **Validación**: Verificar datos fiscales
- **Confianza**: Calcular precisión del análisis

### **2. Automatizaciones Inteligentes**
- **Triggers por Etapa**: Acciones automáticas
- **Notificaciones**: WhatsApp, Email, Internas
- **Documentos**: Generación automática
- **Seguimiento**: Recordatorios automáticos

### **3. Pipeline Visual**
- **Drag & Drop**: Mover clientes entre etapas
- **Validaciones**: Transiciones permitidas
- **Historial**: Registrar todos los cambios
- **Métricas**: KPIs en tiempo real

### **4. Gestión de Documentos**
- **Subida Múltiple**: Varios archivos simultáneos
- **Análisis Automático**: Procesamiento con IA
- **Almacenamiento**: Google Drive integrado
- **Búsqueda**: Filtros avanzados

---

## 📈 **Métricas y Reportes**

### **KPIs Implementados**
- **Clientes por Etapa**: Distribución en pipeline
- **Tasa de Conversión**: Entre etapas
- **Tiempo Promedio**: Por etapa
- **Ingresos**: Mensuales y por cliente
- **Satisfacción**: Feedback de clientes

### **Reportes Disponibles**
- **Pipeline de Ventas**: Estado actual
- **Actividad Reciente**: Movimientos del día
- **Documentos Pendientes**: Por revisar
- **Facturas**: Estado y pagos
- **Performance**: Por usuario/etapa

---

## 🔐 **Seguridad y Permisos**

### **Autenticación**
- **NextAuth.js**: Con Google OAuth
- **Sesiones**: Seguras y persistentes
- **Roles**: Admin, Usuario, Cliente
- **2FA**: Opcional para administradores

### **Validaciones**
- **Input Sanitization**: Todos los campos
- **SQL Injection**: Prevención con Prisma
- **XSS Protection**: Escape de datos
- **Rate Limiting**: APIs públicas

---

## 🎯 **Puntos Fuertes del Sistema**

### **✅ Ventajas Técnicas**
1. **Arquitectura Moderna**: Next.js 14 con App Router
2. **TypeScript**: Tipado fuerte y detección de errores
3. **Base de Datos Robusta**: PostgreSQL con Prisma
4. **UI/UX Excelente**: Tailwind + Radix UI
5. **Integraciones Avanzadas**: WhatsApp, IA, Facturación

### **✅ Funcionalidades de Negocio**
1. **Pipeline Completo**: Desde lead hasta facturación
2. **Automatizaciones**: Inteligentes y configurables
3. **Análisis de IA**: Documentos y validaciones
4. **Integración Externa**: Múltiples servicios
5. **Experiencia Unificada**: Todo en un panel

### **✅ Escalabilidad**
1. **Modular**: Componentes reutilizables
2. **API-First**: Backend separado del frontend
3. **Base de Datos**: Esquema extensible
4. **Integraciones**: Fáciles de agregar
5. **Performance**: Optimizado para producción

---

## ⚠️ **Consideraciones para Integración**

### **🔴 Incompatibilidades Identificadas**
1. **Base de Datos**: PostgreSQL vs SQLite (ya resuelto)
2. **ORM**: Prisma vs Knex.js
3. **Frontend**: Next.js vs React + Vite
4. **Estado**: Zustand vs Redux Toolkit
5. **Autenticación**: NextAuth vs JWT + 2FA

### **🟡 Funcionalidades a Migrar**
1. **Pipeline de Ventas**: Sistema drag & drop
2. **Formulario de Cotización**: 5 secciones complejas
3. **Análisis de Documentos**: Integración con IA
4. **Automatizaciones**: Sistema de triggers
5. **Integraciones**: WhatsApp, Google Drive, Factura.com

### **🟢 Funcionalidades a Preservar**
1. **Sistema de Cortes**: Algoritmo guillotine
2. **Inventario**: Gestión de paños y materiales
3. **Órdenes de Producción**: Flujo completo
4. **Autenticación**: JWT + 2FA existente
5. **Base de Datos**: Esquema PostgreSQL actual

---

## 📋 **Plan de Migración Recomendado**

### **Fase 1: Análisis y Diseño (2-3 semanas)**
- [ ] Mapear todas las funcionalidades críticas
- [ ] Diseñar esquema de base de datos integrado
- [ ] Planificar APIs compatibles
- [ ] Definir componentes React reutilizables

### **Fase 2: Backend (3-4 semanas)**
- [ ] Migrar tablas de clientes y cotizaciones
- [ ] Implementar APIs de pipeline
- [ ] Integrar análisis de documentos
- [ ] Conectar con sistema de órdenes existente

### **Fase 3: Frontend (3-4 semanas)**
- [ ] Crear componentes de pipeline
- [ ] Implementar formulario de cotización
- [ ] Integrar análisis de documentos
- [ ] Conectar con Redux existente

### **Fase 4: Integración (2-3 semanas)**
- [ ] Testing end-to-end
- [ ] Migración de datos
- [ ] Optimización de performance
- [ ] Documentación completa

---

## 🎯 **Conclusión**

El proyecto TypeScript implementa un **sistema ERP completo y sofisticado** para las fases 1-3, con funcionalidades avanzadas que incluyen:

- ✅ **Pipeline de ventas visual** con drag & drop
- ✅ **Formulario de cotización complejo** con 5 secciones
- ✅ **Análisis de documentos con IA** (OpenAI/Claude)
- ✅ **Integración con WhatsApp Business API**
- ✅ **Facturación electrónica CFDI 4.0**
- ✅ **Automatizaciones inteligentes** por etapa
- ✅ **Gestión completa de documentos** con Google Drive

**La migración requerirá un esfuerzo significativo** pero resultará en un **ERP unificado y potente** que combine lo mejor de ambos sistemas: la robustez del sistema de cortes existente con la sofisticación del pipeline de ventas del proyecto TypeScript.

**Recomendación**: Proceder con la **integración unificada** como se propuso en el plan anterior, manteniendo intacto el sistema de cortes crítico y migrando las funcionalidades del proyecto TypeScript a la arquitectura existente. 