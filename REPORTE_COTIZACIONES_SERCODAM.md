# 📋 Reporte Completo: Sistema de Cotizaciones Sercodam

## 🎯 **Resumen Ejecutivo**

Este reporte detalla la implementación del sistema de cotizaciones para Sercodam, basado en el análisis del proyecto TypeScript y los requerimientos específicos del flujo de negocio. El sistema integrará las tablas de cotización con el inventario existente de paños, materiales y herramientas.

---

## 🗄️ **Estructura de Base de Datos**

### **1. Tabla Principal: `cotizacion`**

```sql
CREATE TABLE cotizacion (
    id_cotizacion SERIAL PRIMARY KEY,
    numero_cotizacion VARCHAR(50) UNIQUE,
    id_cliente INTEGER REFERENCES cliente(id_cliente),
    titulo_proyecto VARCHAR(255),
    tipo_proyecto VARCHAR(100), -- 'red_deportiva', 'sistema_proteccion', 'red_industrial', etc.
    incluye_instalacion BOOLEAN DEFAULT false,
    
    -- Datos del cliente (copia para histórico)
    nombre_cliente VARCHAR(255),
    empresa_cliente VARCHAR(255),
    email_cliente VARCHAR(255),
    telefono_cliente VARCHAR(50),
    
    -- Totales
    subtotal DECIMAL(15,2) DEFAULT 0,
    iva DECIMAL(15,2) DEFAULT 0,
    total DECIMAL(15,2) DEFAULT 0,
    
    -- Condiciones
    condiciones_pago TEXT,
    condiciones_envio TEXT,
    tiempo_entrega VARCHAR(100),
    tiempo_instalacion VARCHAR(100),
    dias_validez INTEGER DEFAULT 15,
    valido_hasta TIMESTAMP,
    
    -- Secciones opcionales
    incluye_garantia BOOLEAN DEFAULT false,
    incluye_instalacion_seccion BOOLEAN DEFAULT false,
    observaciones TEXT,
    no_incluye TEXT,
    notas TEXT,
    conceptos_extra TEXT,
    
    -- Cláusula personalizada
    titulo_clausula_personalizada VARCHAR(255),
    descripcion_clausula_personalizada TEXT,
    
    -- Estado y control
    estado VARCHAR(50) DEFAULT 'borrador', -- 'borrador', 'enviada', 'aprobada', 'rechazada', 'convertida'
    version INTEGER DEFAULT 1,
    
    -- Archivos
    ruta_pdf VARCHAR(500),
    url_pdf VARCHAR(500),
    
    -- Fechas
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_envio TIMESTAMP,
    fecha_aprobacion TIMESTAMP,
    fecha_rechazo TIMESTAMP,
    fecha_conversion TIMESTAMP,
    
    -- Usuario
    id_usuario_creador INTEGER REFERENCES usuario(id),
    id_usuario_asignado INTEGER REFERENCES usuario(id),
    
    -- Relación con orden de producción (cuando se convierte)
    id_orden_produccion INTEGER REFERENCES orden_produccion(id_orden_produccion),
    
    -- Metadatos
    metadata JSON, -- Para datos adicionales como análisis de IA
    
    -- Índices
    INDEX idx_cotizacion_cliente (id_cliente),
    INDEX idx_cotizacion_estado (estado),
    INDEX idx_cotizacion_fecha (fecha_creacion),
    INDEX idx_cotizacion_numero (numero_cotizacion)
);
```

### **2. Tabla de Items: `cotizacion_item`**

```sql
CREATE TABLE cotizacion_item (
    id_item SERIAL PRIMARY KEY,
    id_cotizacion INTEGER REFERENCES cotizacion(id_cotizacion) ON DELETE CASCADE,
    
    -- Identificación
    partida VARCHAR(10), -- 'A', 'B', 'C', etc.
    orden_index INTEGER, -- Para mantener el orden
    
    -- Producto/Concepto
    nombre_producto VARCHAR(255),
    concepto VARCHAR(255),
    
    -- Cantidades y precios
    cantidad DECIMAL(10,2),
    unidad VARCHAR(50), -- 'm²', 'pzas', 'servicio', etc.
    precio_unitario DECIMAL(15,2),
    subtotal DECIMAL(15,2),
    
    -- Descripción técnica
    caracteristicas TEXT,
    descripcion_tecnica TEXT,
    
    -- Relación con inventario (opcional)
    id_pano INTEGER REFERENCES pano(id_pano), -- Si es un paño específico
    id_material INTEGER REFERENCES materiales_extras(id_material), -- Si es un material
    id_herramienta INTEGER REFERENCES herramientas(id_herramienta), -- Si es una herramienta
    
    -- Metadatos
    metadata JSON, -- Para datos adicionales específicos del item
    
    -- Índices
    INDEX idx_cotizacion_item_cotizacion (id_cotizacion),
    INDEX idx_cotizacion_item_orden (orden_index)
);
```

### **3. Tabla de Fichas Técnicas: `ficha_tecnica`**

```sql
CREATE TABLE ficha_tecnica (
    id_ficha SERIAL PRIMARY KEY,
    
    -- Identificación
    nombre_red VARCHAR(255),
    tipo_red VARCHAR(100), -- 'nylon', 'polipropileno', 'lona', 'malla_sombra'
    codigo_producto VARCHAR(50),
    
    -- Especificaciones técnicas
    calibre VARCHAR(50), -- 'No. 60 x 4"'
    luz_malla VARCHAR(100), -- '10 cm x 10 cm'
    resistencia VARCHAR(100), -- '1,400 - 1,600 KG por m2'
    certificacion VARCHAR(255), -- 'UNE EN – 1263-12004'
    
    -- Características
    material VARCHAR(255),
    color VARCHAR(50),
    tratamiento VARCHAR(255),
    propiedades TEXT,
    
    -- Ficha técnica completa
    ficha_tecnica_completa TEXT,
    
    -- Imágenes
    ruta_imagen VARCHAR(500),
    ruta_imagen_grande VARCHAR(500), -- Para la parte 17
    
    -- Categorías
    categorias TEXT[], -- ['deportiva', 'proteccion', 'industrial', 'golf']
    
    -- Estado
    activo BOOLEAN DEFAULT true,
    
    -- Fechas
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP DEFAULT NOW(),
    
    -- Índices
    INDEX idx_ficha_tecnica_tipo (tipo_red),
    INDEX idx_ficha_tecnica_categorias (categorias),
    INDEX idx_ficha_tecnica_activo (activo)
);
```

### **4. Tabla de Log de Cotizaciones: `cotizacion_log`**

```sql
CREATE TABLE cotizacion_log (
    id_log SERIAL PRIMARY KEY,
    id_cotizacion INTEGER REFERENCES cotizacion(id_cotizacion),
    id_usuario INTEGER REFERENCES usuario(id),
    
    accion VARCHAR(100), -- 'creada', 'enviada', 'aprobada', 'rechazada', 'convertida'
    descripcion TEXT,
    datos_anteriores JSON,
    datos_nuevos JSON,
    
    fecha_accion TIMESTAMP DEFAULT NOW(),
    
    INDEX idx_cotizacion_log_cotizacion (id_cotizacion),
    INDEX idx_cotizacion_log_fecha (fecha_accion)
);
```

---

## 🔄 **Flujo del Formulario de Cotización**

### **Estructura del Formulario (5 Secciones)**

#### **Sección 1: Información General**
```typescript
interface Seccion1 {
  // Cliente (selección automática desde leads o búsqueda)
  id_cliente: number;
  nombre_cliente: string;
  empresa_cliente: string;
  email_cliente: string;
  telefono_cliente: string;
  
  // Proyecto
  titulo_proyecto: string;
  tipo_proyecto: string; // Select con opciones predefinidas
  incluye_instalacion: boolean;
  
  // Condiciones básicas
  dias_validez: number;
  tiempo_entrega: string;
  tiempo_instalacion: string;
}
```

#### **Sección 2: Productos y Servicios**
```typescript
interface Seccion2 {
  items: Array<{
    partida: string; // 'A', 'B', 'C' - generado automáticamente
    nombre_producto: string;
    concepto: string;
    cantidad: number;
    unidad: string; // 'm²', 'pzas', 'servicio'
    precio_unitario: number;
    subtotal: number; // calculado automáticamente
    caracteristicas: string;
    descripcion_tecnica: string;
    
    // Relación con inventario (opcional)
    id_pano?: number;
    id_material?: number;
    id_herramienta?: number;
  }>;
  
  // Totales calculados automáticamente
  subtotal: number;
  iva: number;
  total: number;
}
```

#### **Sección 3: Condiciones de Pago**
```typescript
interface Seccion3 {
  condiciones_pago: string; // Texto libre
  condiciones_envio: string; // Texto libre
}
```

#### **Sección 4: Información Adicional**
```typescript
interface Seccion4 {
  // Secciones opcionales
  incluye_garantia: boolean;
  incluye_instalacion_seccion: boolean;
  
  // Campos de texto opcionales
  observaciones?: string;
  no_incluye?: string;
  notas?: string;
  conceptos_extra?: string;
}
```

#### **Sección 5: Cláusula Personalizada**
```typescript
interface Seccion5 {
  incluye_clausula_personalizada: boolean;
  titulo_clausula_personalizada?: string;
  descripcion_clausula_personalizada?: string;
}
```

---

## 🤖 **Integración con IA (ChatGPT)**

### **1. Generación de Descripción del Proyecto (Parte 3)**

```typescript
interface GeneracionDescripcion {
  prompt: string;
  contexto: {
    tipo_proyecto: string;
    items: Array<{
      nombre: string;
      caracteristicas: string;
      cantidad: number;
      unidad: string;
    }>;
    ficha_tecnica?: string;
  };
}

// Ejemplo de prompt:
const prompt = `
Genera una descripción técnica para una cotización de ${tipo_proyecto} que incluya:

Productos:
${items.map(item => `- ${item.nombre}: ${item.cantidad} ${item.unidad}`).join('\n')}

Ficha técnica: ${ficha_tecnica}

La descripción debe explicar qué incluye la cotización, el tipo de material utilizado, 
las especificaciones técnicas y las normas que cumple. Debe ser profesional y técnica.
`;
```

### **2. Cálculo Automático de Totales (Parte 7)**

```typescript
interface CalculoTotales {
  items: Array<{
    partida: string;
    subtotal: number;
  }>;
  
  calcularTotales(): {
    subtotal: number;
    iva: number;
    total: number;
  };
}

// Implementación:
const calcularTotales = (items: Array<any>) => {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const iva = subtotal * 0.16; // 16% IVA
  const total = subtotal + iva;
  
  return { subtotal, iva, total };
};
```

---

## 📊 **Flujo Completo de Cotización**

### **Paso 1: Creación de Cotización**
1. **Selección de Cliente**: Desde leads o búsqueda en clientes existentes
2. **Información del Proyecto**: Título, tipo, instalación
3. **Generación de Número**: Automática (COT-YYYY-XXXX)

### **Paso 2: Agregar Productos**
1. **Selección de Productos**: Desde inventario o creación manual
2. **Cálculo Automático**: Subtotal por item y totales
3. **Validación**: Stock disponible si aplica

### **Paso 3: Configuración de Condiciones**
1. **Condiciones de Pago**: Texto libre
2. **Condiciones de Envío**: Texto libre
3. **Tiempos**: Entrega e instalación

### **Paso 4: Secciones Opcionales**
1. **Garantía**: Checkbox + texto automático
2. **Instalación**: Checkbox + texto libre
3. **Observaciones**: Texto libre
4. **No Incluye**: Texto libre
5. **Notas**: Texto libre
6. **Conceptos Extra**: Texto libre
7. **Cláusula Personalizada**: Título + descripción

### **Paso 5: Generación de PDF**
1. **Análisis de Productos**: Identificar tipo de red/sistema
2. **Búsqueda de Ficha Técnica**: En base de datos
3. **Generación de Descripción**: Con ChatGPT
4. **Cálculo de Totales**: Automático
5. **Generación de PDF**: Con servicio existente

### **Paso 6: Envío y Seguimiento**
1. **Envío**: Email, WhatsApp, o descarga
2. **Seguimiento**: Estado de cotización
3. **Conversión**: A orden de producción

---

## 🎨 **Estructura del PDF**

### **Partes Fijas (Todas las Cotizaciones)**
1. **Encabezado**: Logo, datos de empresa
2. **Información del Cliente**: Nombre, empresa, contacto
3. **Título del Proyecto**: Generado automáticamente
4. **Descripción del Proyecto**: Generada por IA
5. **Tabla de Productos**: Estructura fija con datos dinámicos
6. **Ficha Técnica**: Extraída de base de datos
7. **Imagen del Producto**: Extraída de base de datos
8. **Totales**: Calculados automáticamente
9. **Condiciones de Pago**: Texto del formulario
10. **Mensaje de Cierre**: Texto fijo
11. **Imagen de Equipo**: Según tipo de proyecto
12. **Datos de Contacto**: Manager + teléfono
13. **Datos Bancarios**: Fijos

### **Partes Opcionales**
14. **Instalación**: Si se selecciona
15. **Garantía**: Si se selecciona
16. **Observaciones**: Si se incluye
17. **No Incluye**: Si se incluye
18. **Notas**: Si se incluye
19. **Conceptos Extra**: Si se incluye
20. **Cláusula Personalizada**: Si se incluye

---

## 🔧 **Integración con Sistema Existente**

### **1. Relación con Inventario**
```sql
-- Los items de cotización pueden referenciar:
- pano (para redes específicas)
- materiales_extras (para materiales)
- herramientas (para herramientas)
- productos personalizados (sin referencia)
```

### **2. Conversión a Orden de Producción**
```sql
-- Cuando se aprueba una cotización:
1. Crear orden_produccion
2. Crear orden_produccion_detalle basado en cotizacion_item
3. Actualizar estado de cotización a 'convertida'
4. Registrar en cotizacion_log
```

### **3. Reutilización de Servicios**
- **PDF Service**: Extender para cotizaciones
- **Email Service**: Para envío de cotizaciones
- **WhatsApp Service**: Para notificaciones
- **Auth System**: Para permisos y auditoría

---

## 📋 **Próximos Pasos de Implementación**

### **Fase 1: Base de Datos (1-2 días)**
- [ ] Crear migraciones para las nuevas tablas
- [ ] Poblar tabla de fichas técnicas
- [ ] Crear índices y constraints

### **Fase 2: Backend APIs (3-4 días)**
- [ ] CRUD de cotizaciones
- [ ] CRUD de items de cotización
- [ ] Integración con ChatGPT
- [ ] Generación de PDF

### **Fase 3: Frontend (4-5 días)**
- [ ] Formulario de 5 secciones
- [ ] Tabla dinámica de productos
- [ ] Validaciones y cálculos
- [ ] Vista previa de PDF

### **Fase 4: Integración (2-3 días)**
- [ ] Conectar con inventario existente
- [ ] Integrar con sistema de leads
- [ ] Testing end-to-end
- [ ] Documentación

---

## 🎯 **Beneficios del Sistema**

### **✅ Automatización**
- Generación automática de descripciones con IA
- Cálculo automático de totales
- Numeración automática de partidas
- Búsqueda automática de fichas técnicas

### **✅ Flexibilidad**
- Secciones opcionales configurables
- Productos personalizados o del inventario
- Cláusulas personalizables
- Múltiples formatos de entrega

### **✅ Integración**
- Con sistema de leads existente
- Con inventario de paños y materiales
- Con sistema de órdenes de producción
- Con servicios de PDF y comunicación

### **✅ Trazabilidad**
- Log completo de cambios
- Historial de versiones
- Auditoría de conversiones
- Métricas de efectividad

---

## 🚀 **Conclusión**

Este sistema de cotizaciones proporcionará a Sercodam una herramienta completa y automatizada que:

1. **Reduce el tiempo** de creación de cotizaciones
2. **Mejora la precisión** con cálculos automáticos
3. **Mantiene consistencia** en el formato
4. **Integra perfectamente** con el sistema existente
5. **Permite personalización** según necesidades específicas
6. **Facilita el seguimiento** del pipeline de ventas

La implementación aprovechará la infraestructura existente y agregará capacidades avanzadas de IA para generar descripciones técnicas profesionales automáticamente. 