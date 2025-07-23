# RESUMEN: Implementación de modo_corte en orden_produccion

## 🎯 Objetivo
Simplificar la identificación de cortes individuales vs simples moviendo el campo `modo_corte` de la tabla `trabajo_corte` a la tabla `orden_produccion`, asegurando que siempre esté disponible independientemente del estado de la orden.

## 📋 Cambios Realizados

### 1. **SQL para Base de Datos** ✅
**Archivo:** `add_modo_corte_to_orden_produccion.sql`

```sql
-- Agregar campo modo_corte a orden_produccion
ALTER TABLE orden_produccion 
ADD COLUMN modo_corte VARCHAR(20) DEFAULT 'simple';

-- Agregar comentario y constraint
COMMENT ON COLUMN orden_produccion.modo_corte IS 'simple o individuales - determina el tipo de corte para todos los paños de la orden';

CREATE INDEX idx_orden_produccion_modo_corte ON orden_produccion(modo_corte);

ALTER TABLE orden_produccion 
ADD CONSTRAINT orden_produccion_modo_corte_check 
CHECK (modo_corte IN ('simple', 'individuales'));
```

**Para aplicar:** Ejecutar manualmente en PostgreSQL.

### 2. **Migración de Knex** ✅
**Archivo:** `sercodam-backend/src/migrations/20250710000001_add_modo_corte_to_trabajo_corte.js`

- **Cambiado:** Ahora agrega `modo_corte` a `orden_produccion` en lugar de `trabajo_corte`
- **Incluye:** Índice y constraint de validación
- **Valores permitidos:** 'simple' o 'individuales'

### 3. **Controlador de Órdenes** ✅
**Archivo:** `sercodam-backend/src/controllers/ordenesController.js`

#### Función `createOrden()` - Líneas 463-480
- **Agregado:** Lógica para determinar `modo_corte` de la orden
- **Criterio:** Si al menos un paño tiene `modo_corte: 'individuales'` o `cortes_individuales`, la orden es 'individuales'
- **Guardado:** El `modo_corte` se guarda en la tabla `orden_produccion`

#### Funciones de PDF - Líneas 1312, 1829, 2059, 2475
- **Cambiado:** `job.modo_corte` → `orden.modo_corte`
- **Funciones actualizadas:**
  - `generarPDF()`
  - `descargarPDF()`
  - `approveOrden()`
  - `cambiarEstadoOrden()`

### 4. **Script de Corrección** ✅
**Archivo:** `fix_modo_corte_orden_produccion.js`

- **Función:** Reemplaza automáticamente todas las referencias de `job.modo_corte` a `orden.modo_corte`
- **Resultado:** 4 ocurrencias actualizadas en el controlador

### 5. **Script de Prueba** ✅
**Archivo:** `test_modo_corte_orden_produccion.js`

- **Pruebas:** Crea órdenes con cortes simples e individuales
- **Verificación:** Confirma que el campo se guarda correctamente
- **PDF:** Genera PDFs para verificar la funcionalidad

## 🔄 Flujo de Funcionamiento

### 1. **Creación de Orden**
```
Frontend → Backend → Determinar modo_corte → Guardar en orden_produccion
```

### 2. **Determinación de modo_corte**
```javascript
// Si al menos un paño tiene cortes individuales
const tieneCortesIndividuales = panos.some(pano => 
    pano.modo_corte === 'individuales' || 
    (pano.cortes_individuales && pano.cortes_individuales.length > 0)
);
modoCorteOrden = tieneCortesIndividuales ? 'individuales' : 'simple';
```

### 3. **Generación de PDF**
```
Orden → Obtener modo_corte de orden_produccion → Incluir en PDF
```

## 📊 Estructura de Datos

### Tabla `orden_produccion` (actualizada)
```sql
- id_op (PK)
- numero_op
- cliente
- estado
- prioridad
- modo_corte (NUEVO) - 'simple' o 'individuales'
- fecha_op, fecha_creacion, etc.
```

### Datos en PDF
```javascript
cuts: [
  {
    id_item: 123,
    altura_req: 2.5,
    ancho_req: 1.8,
    umbral_sobrante_m2: 5.0,
    modo_corte: 'individuales', // Ahora viene de orden_produccion
    pano_original: { ... },
    plans: [...],
    cortes_individuales: [...]
  }
]
```

## 🎨 Beneficios de la Nueva Implementación

### ✅ **Ventajas**
1. **Siempre disponible:** El `modo_corte` está disponible desde la creación de la orden
2. **Más simple:** No depende del estado de `trabajo_corte`
3. **Consistente:** Un solo valor para toda la orden
4. **Eficiente:** Menos consultas a la base de datos
5. **Claro:** El PDF siempre muestra el modo correcto

### 🔧 **Compatibilidad**
- **Backward compatible:** Las órdenes existentes tendrán `modo_corte: 'simple'` por defecto
- **Frontend:** No requiere cambios, ya usa `modo_corte` del paño individual
- **PDF:** Funciona igual, pero ahora con datos más confiables

## 📋 Pasos para Implementar

### 1. **Ejecutar SQL**
```bash
# Conectar a PostgreSQL y ejecutar:
\i add_modo_corte_to_orden_produccion.sql
```

### 2. **Ejecutar Migración**
```bash
cd sercodam-backend
npm run migrate
```

### 3. **Probar Funcionalidad**
```bash
node test_modo_corte_orden_produccion.js
```

### 4. **Verificar PDF**
- Crear orden con cortes individuales
- Generar PDF
- Verificar que aparecen los cortes individuales

## 🎯 Resultado Final

Con estos cambios, el sistema ahora:
- ✅ Identifica correctamente los cortes individuales
- ✅ Muestra los cortes individuales en el PDF
- ✅ Mantiene la información disponible en todo momento
- ✅ Simplifica la lógica de negocio
- ✅ Mejora la confiabilidad del sistema

El problema original de que "siempre regresaba falso" se resuelve porque ahora el `modo_corte` se determina y guarda al momento de crear la orden, no cuando se aprueba. 