# 📋 INSTRUCCIONES PARA CREAR SISTEMA DE COTIZACIONES

## 🚀 Orden de Ejecución

Ejecuta los archivos SQL en PostgreSQL en el siguiente orden:

### 1️⃣ **003_agregar_estados_cotizacion_a_catalogo.sql**
```bash
# Conectar a la base de datos
psql -U postgres -d sercodam_db

# Ejecutar el script
\i 003_agregar_estados_cotizacion_a_catalogo.sql
```
**¿Qué hace?** Agrega los estados de cotización a la tabla `estado_catalogo`

---

### 2️⃣ **001_crear_tablas_cotizacion.sql**
```bash
\i 001_crear_tablas_cotizacion.sql
```
**¿Qué hace?** Crea las tablas principales:
- `cotizacion` (tabla principal)
- `cotizacion_detalle` (items de la cotización)
- Índices, triggers y constraints

---

### 3️⃣ **002_agregar_cotizacion_a_orden_produccion.sql**
```bash
\i 002_agregar_cotizacion_a_orden_produccion.sql
```
**¿Qué hace?** Agrega el campo `id_cotizacion` a la tabla `orden_produccion`

---

### 4️⃣ **004_ejemplo_conversion_cotizacion_a_orden.sql** (Opcional)
```bash
\i 004_ejemplo_conversion_cotizacion_a_orden.sql
```
**¿Qué hace?** Crea una función de ejemplo para convertir cotizaciones a órdenes de producción

---

## 🔍 Verificación

Después de ejecutar todos los scripts, verifica que todo esté bien:

```sql
-- Verificar que las tablas se crearon
\dt catalogo_1.cotizacion*

-- Verificar estructura de cotizacion
\d catalogo_1.cotizacion

-- Verificar estructura de cotizacion_detalle
\d catalogo_1.cotizacion_detalle

-- Verificar que orden_produccion tiene el nuevo campo
\d catalogo_1.orden_produccion

-- Verificar estados en estado_catalogo
SELECT estado FROM catalogo_1.estado_catalogo 
WHERE estado IN ('por aprobar', 'aprobada', 'no aprobada', 'enviada', 'convertida', 'rechazada')
ORDER BY estado;
```

---

## 🔄 Flujo de Estados de Cotización

```
por aprobar → aprobada/no aprobada → enviada → convertida/rechazada
```

1. **por aprobar**: Estado inicial cuando se crea la cotización
2. **aprobada**: Admin aprueba la cotización
3. **no aprobada**: Admin no aprueba la cotización
4. **enviada**: Cotización enviada al cliente
5. **convertida**: Cliente pagó, se creó orden de producción
6. **rechazada**: Cliente decidió no pagar

---

## 🎯 Relación Final

```
cotizacion (1) ←--→ (0..1) orden_produccion
```

- Una cotización puede generar **máximo una** orden de producción
- Una orden de producción puede venir de **máximo una** cotización
- Las órdenes pueden crearse sin cotización (flujo directo)

---

## ✅ Listo para Backend

Una vez ejecutados estos scripts, el backend Node.js funcionará correctamente con las nuevas tablas siguiendo el patrón de `orden_produccion` y `orden_produccion_detalle`.

---

**📝 Nota**: Si encuentras algún error, revisa que tengas los permisos correctos y que la base de datos `sercodam_db` tenga el esquema `catalogo_1` configurado. 