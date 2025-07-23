# RESUMEN: Movimiento de modo_corte de trabajo_corte a orden_produccion

## 🎯 Objetivo
Mover el campo `modo_corte` de la tabla `trabajo_corte` a la tabla `orden_produccion` para simplificar la lógica y asegurar que el modo de corte esté disponible desde el momento que se crea la orden, no solo cuando se aprueba.

## 📋 Cambios Realizados

### 1. **SQL para Base de Datos** ✅
**Archivo:** `add_modo_corte_to_orden_produccion.sql`

#### Cambios en la base de datos:
- **Agregar campo `modo_corte`** a la tabla `orden_produccion`
  - Tipo: `VARCHAR(20)`
  - Valor por defecto: `'simple'`
  - Comentario: `'simple o individuales - modo de corte para todos los paños de esta orden'`
  - Índice creado para mejorar consultas

- **Remover campo `modo_corte`** de la tabla `trabajo_corte`
  - Verificación de existencia antes de remover
  - Eliminación del índice asociado
  - Manejo seguro con bloque DO

- **Actualización de datos existentes**
  - Todas las órdenes existentes se actualizan a `modo_corte = 'simple'`

#### Para aplicar:
```bash
# Ejecutar manualmente en PostgreSQL
psql -d sercodam_db -f add_modo_corte_to_orden_produccion.sql
```

### 2. **Migración de Knex** ✅
**Archivo:** `sercodam-backend/src/migrations/20250710000002_move_modo_corte_to_orden_produccion.js`

#### Funcionalidad:
- **Up:** Agrega campo a `orden_produccion` y remueve de `trabajo_corte`
- **Down:** Revierte los cambios (restaura en `trabajo_corte` y remueve de `orden_produccion`)
- Manejo seguro de errores y verificaciones

#### Para aplicar:
```bash
cd sercodam-backend
npm run migrate
```

### 3. **Backend - Controlador de Órdenes** ✅
**Archivo:** `sercodam-backend/src/controllers/ordenesController.js`

#### Funciones actualizadas:

##### `createOrden()` - Líneas 460-470
- **Lógica de determinación de modo_corte:**
  ```javascript
  // Determinar el modo_corte general de la orden basándose en los paños
  let modoCorteOrden = 'simple';
  if (panos.length > 0) {
      // Si al menos un paño tiene cortes individuales, la orden es de cortes individuales
      const tieneCortesIndividuales = panos.some(pano => 
          pano.modo_corte === 'individuales' || 
          (pano.cortes_individuales && Array.isArray(pano.cortes_individuales) && pano.cortes_individuales.length > 0)
      );
      modoCorteOrden = tieneCortesIndividuales ? 'individuales' : 'simple';
  }
  ```

- **Guardado en orden_produccion:**
  ```javascript
  const [ordenCreada] = await trx('orden_produccion')
      .insert({
          // ... otros campos
          modo_corte: modoCorteOrden
      })
      .returning('id_op');
  ```

- **Removido parámetro modo_corte de createCutJob:**
  ```javascript
  // Antes:
  const job_id = await panosController.createCutJob(trx, id_op, selectedPano.id_item, panoReq.altura_req, panoReq.ancho_req, panoReq.umbral_sobrante_m2 || 5.0, i + 1, req.user.id, modo_corte);
  
  // Después:
  const job_id = await panosController.createCutJob(trx, id_op, selectedPano.id_item, panoReq.altura_req, panoReq.ancho_req, panoReq.umbral_sobrante_m2 || 5.0, i + 1, req.user.id);
  ```

##### Funciones de PDF actualizadas:
- `generarPDF()` - Línea 1840
- `descargarPDF()` - Línea 2060  
- `approveOrden()` - Línea 2480
- `cambiarEstadoOrden()` - Línea 1320

**Cambio en todas las funciones:**
```javascript
// Antes:
modo_corte: job.modo_corte || 'simple',

// Después:
modo_corte: orden.modo_corte || 'simple', // Usar modo_corte de la orden
```

### 4. **Backend - Controlador de Paños** ✅
**Archivo:** `sercodam-backend/src/controllers/inventario/panosController.js`

#### Función `createCutJob()` actualizada:
- **Removido parámetro `modo_corte`:**
  ```javascript
  // Antes:
  createCutJob: async (trx, id_op, id_item, altura_req, ancho_req, umbral_sobrante_m2 = 5.0, order_seq = 1, id_operador, modo_corte = 'simple') => {
  
  // Después:
  createCutJob: async (trx, id_op, id_item, altura_req, ancho_req, umbral_sobrante_m2 = 5.0, order_seq = 1, id_operador) => {
  ```

- **Removido campo de inserción en trabajo_corte:**
  ```javascript
  // Antes:
  const job = await trx('trabajo_corte').insert({
      id_item,
      altura_req,
      ancho_req,
      estado: 'Planeado',
      id_operador,
      id_op,
      umbral_sobrante_m2,
      order_seq,
      modo_corte  // ← Removido
  }).returning('job_id');
  
  // Después:
  const job = await trx('trabajo_corte').insert({
      id_item,
      altura_req,
      ancho_req,
      estado: 'Planeado',
      id_operador,
      id_op,
      umbral_sobrante_m2,
      order_seq
  }).returning('job_id');
  ```

### 5. **Script de Prueba** ✅
**Archivo:** `test_modo_corte_orden_produccion.js`

#### Funcionalidades de prueba:
- **Login automático** con credenciales de admin
- **Creación de órdenes** con cortes individuales y simples
- **Verificación en BD** del campo `modo_corte` en `orden_produccion`
- **Generación de PDF** y verificación de datos
- **Validación completa** del flujo de datos

#### Para ejecutar:
```bash
node test_modo_corte_orden_produccion.js
```

## 🔄 Flujo de Funcionamiento Actualizado

### 1. **Creación de Orden**
```
Frontend → Backend → Determinar modo_corte → Guardar en orden_produccion
```

### 2. **Determinación de modo_corte**
- **Simple:** Si todos los paños tienen `modo_corte = 'simple'` o no tienen `cortes_individuales`
- **Individuales:** Si al menos un paño tiene `modo_corte = 'individuales'` o tiene `cortes_individuales`

### 3. **Generación de PDF**
```
Orden → Leer modo_corte de orden_produccion → Incluir en datos de PDF
```

## 📊 Estructura de Datos

### Tabla `orden_produccion` (actualizada)
```sql
- id_op (PK)
- numero_op
- cliente
- observaciones
- estado
- prioridad
- fecha_creacion
- modo_corte VARCHAR(20) DEFAULT 'simple' ← NUEVO
- ... otros campos
```

### Tabla `trabajo_corte` (simplificada)
```sql
- job_id (PK)
- id_item
- altura_req
- ancho_req
- estado
- id_operador
- id_op
- umbral_sobrante_m2
- order_seq
- ... otros campos
- modo_corte ← REMOVIDO
```

## 🎨 Beneficios de la Nueva Implementación

### 1. **Simplicidad**
- Un solo lugar para almacenar el modo de corte
- Lógica más clara y directa
- Menos complejidad en las consultas

### 2. **Disponibilidad**
- El modo de corte está disponible desde la creación de la orden
- No depende del estado de aprobación
- Siempre presente en los PDFs

### 3. **Consistencia**
- Todos los paños de una orden tienen el mismo modo de corte
- Evita inconsistencias entre paños
- Lógica más predecible

### 4. **Mantenibilidad**
- Menos código duplicado
- Cambios más fáciles de implementar
- Mejor trazabilidad

## 🚀 Pasos para Implementar

### 1. **Ejecutar SQL en Base de Datos**
```bash
psql -d sercodam_db -f add_modo_corte_to_orden_produccion.sql
```

### 2. **Ejecutar Migración de Knex**
```bash
cd sercodam-backend
npm run migrate
```

### 3. **Reiniciar Servidor Backend**
```bash
cd sercodam-backend
npm run dev
```

### 4. **Ejecutar Pruebas**
```bash
node test_modo_corte_orden_produccion.js
```

### 5. **Verificar Frontend**
- Crear órdenes con cortes individuales
- Verificar que se muestre correctamente "Cortes Individuales"
- Generar PDFs y verificar que incluyan los cortes individuales

## ✅ Verificación Final

### 1. **Base de Datos**
```sql
-- Verificar que el campo existe en orden_produccion
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'orden_produccion' AND column_name = 'modo_corte';

-- Verificar que no existe en trabajo_corte
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'trabajo_corte' AND column_name = 'modo_corte';
```

### 2. **Backend**
- Crear órdenes con diferentes modos de corte
- Verificar que se guarde correctamente en `orden_produccion`
- Generar PDFs y verificar que incluyan el `modo_corte`

### 3. **Frontend**
- Verificar que se muestre correctamente el modo de corte
- Crear órdenes con cortes individuales
- Verificar que aparezcan en el PDF

## 🎯 Resultado Esperado

Después de implementar estos cambios:
- ✅ El campo `modo_corte` estará en `orden_produccion`
- ✅ Los PDFs mostrarán correctamente los cortes individuales
- ✅ La lógica será más simple y consistente
- ✅ El modo de corte estará disponible desde la creación de la orden 