# Correcciones del Diseño de Base de Datos - Sercodam OP

## Resumen de Problemas Identificados

El sistema Sercodam OP tenía varios problemas en el diseño de la base de datos:

1. **Columnas innecesarias** en `orden_produccion_detalle`: `largo_tomar`, `ancho_tomar`, `area_tomar`
2. **Campo `catalogo` no autogenerado** en `orden_produccion_detalle`
3. **Función `fn_generar_nota_pano` defectuosa** que no consultaba correctamente las tablas relacionadas
4. **Trigger problemático** que causaba errores de foreign key
5. **Columnas PDF innecesarias** en `orden_produccion`
6. **Tabla `pdf_ordenes` innecesaria** para la integración con Make.com

## Correcciones Implementadas

### 1. Migración: Corregir estructura de orden_produccion_detalle (Completado)
- [x] Eliminar columnas innecesarias: `largo_tomar`, `ancho_tomar`, `area_tomar`
- [x] Corregir autogeneración del campo `catalogo`
- [x] Agregar constraints y triggers necesarios
- [x] Hacer la migración idempotente y segura

### 2. Migración: Corregir función fn_generar_nota_pano (Completado)
- [x] Corregir consultas para obtener datos de tablas relacionadas
- [x] Mejorar generación de notas con información técnica
- [x] Agregar manejo de errores

### 3. Migración: Eliminar trigger problemático y crear nueva lógica (Completado)
- [x] Eliminar trigger `after_insert_detalle_consumo`
- [x] Crear función `fn_procesar_pano_orden` para procesar paños
- [x] Crear función `fn_procesar_material_extra_orden` para materiales extras
- [x] Actualizar función de restauración de inventario
- [x] Crear trigger de cancelación mejorado

### 4. Migración: Eliminar columnas PDF de orden_produccion (Completado)
- [x] Eliminar columnas: `pdf_generado`, `pdf_filename`, `pdf_generated_at`
- [x] Simplificar manejo de PDFs
- [x] Actualizar lógica de generación de PDFs

### 5. Migración: Eliminar tabla pdf_ordenes (Completado)
- [x] Eliminar tabla `pdf_ordenes` innecesaria
- [x] Simplificar integración con Make.com
- [x] Actualizar servicios de webhook para buscar PDFs por patrón de nombre

### 6. Actualizar Backend (Completado)
- [x] Corregir controlador `ordenesController.js` para usar las nuevas funciones
- [x] Eliminar referencias a columnas eliminadas (`largo_tomar`, `ancho_tomar`, `area_tomar`)
- [x] Actualizar lógica de procesamiento de paños y materiales
- [x] Corregir validaciones de stock
- [x] Actualizar generación de PDF para no usar columnas eliminadas
- [x] Eliminar referencias a funciones inexistentes (`fn_save_pdf_info`)
- [x] Crear script de prueba `test-logica-corregida.js` para verificar funcionamiento

### 7. Actualizar Frontend (Pendiente)
- [ ] Actualizar formularios para no usar las columnas eliminadas
- [ ] Actualizar validaciones de stock
- [ ] Actualizar visualización de datos

## Funciones de Base de Datos Creadas/Actualizadas

### Funciones de Procesamiento
- `fn_procesar_pano_orden(id_op, id_item, largo_tomar, ancho_tomar, cantidad)`: Procesa paños creando dos registros (largo y ancho)
- `fn_procesar_material_extra_orden(id_op, id_item, cantidad)`: Procesa materiales extras
- `fn_generar_nota_pano(id_item, cantidad, tipo_dimension)`: Genera notas descriptivas para paños
- `fn_generar_nota_material_extra(id_item, cantidad)`: Genera notas descriptivas para materiales

### Funciones de Restauración
- `fn_restaurar_inventario_panos_cancelada(id_op)`: Restaura inventario de paños al cancelar orden
- `fn_restaurar_inventario_materiales_cancelada(id_op)`: Restaura inventario de materiales al cancelar orden
- `fn_restaurar_inventario_completo_cancelada(id_op)`: Restaura todo el inventario (paños + materiales)

### Funciones de Mantenimiento
- `fn_limpiar_detalle_completadas()`: Limpia registros de detalle de órdenes completadas
- `fn_cancelar_ordenes_30_dias()`: Cancela automáticamente órdenes antiguas

### Triggers
- `trg_restaurar_inventario_cancelacion()`: Trigger que restaura inventario al cancelar orden

## Lógica de Descuento y Restauración

### Al Crear Orden
1. **Paños**: Se descuentan las dimensiones (largo y ancho) del paño original
2. **Materiales Extras**: Se descuenta la cantidad del stock disponible
3. **Herramientas**: Se asignan sin descuento de stock (se mantienen disponibles)

### Al Cancelar Orden
1. **Paños**: Se restauran las dimensiones descontadas (largo y ancho)
2. **Materiales Extras**: Se restaura la cantidad al stock disponible
3. **Herramientas**: No requieren restauración (no se descontaron)

### Movimientos de Inventario
- Se registran todos los movimientos en `movimiento_inventario`
- Tipos: `CONSUMO` (al crear orden), `AJUSTE_IN` (al cancelar orden)
- Se incluyen notas descriptivas y referencias a la orden

## Archivos de Prueba Creados

- `test-logica-corregida.js`: Prueba completa de la lógica corregida
- `reset-migrations.js`: Script para resetear migraciones problemáticas

## Instrucciones de Uso

### Para Ejecutar las Migraciones
```bash
cd sercodam-backend
npm run reset-migrations  # Si hay problemas con migraciones anteriores
npm run migrate
```

### Para Probar la Conexión
```bash
cd sercodam-backend
node test-connection.js
```

### Para Probar la Lógica Corregida
```bash
cd sercodam-backend
node test-logica-corregida.js
```

**Nota**: Si hay problemas de timeout, primero ejecuta `test-connection.js` para verificar la configuración de la base de datos.

## Beneficios de las Correcciones

1. **Simplificación**: Eliminación de columnas y tablas innecesarias
2. **Consistencia**: Lógica unificada para descuento y restauración de inventario
3. **Robustez**: Mejor manejo de errores y validaciones
4. **Mantenibilidad**: Código más limpio y fácil de mantener
5. **Integración**: Simplificación de la integración con Make.com

## Estado Actual

- ✅ **Backend**: Completamente corregido y probado
- ⏳ **Frontend**: Pendiente de actualización
- ✅ **Base de Datos**: Estructura optimizada y funcional
- ✅ **Integración**: Simplificada y funcional

## Próximos Pasos

1. Actualizar el frontend para usar la nueva estructura
2. Probar la integración completa end-to-end
3. Documentar los cambios para el equipo de desarrollo
4. Implementar pruebas automatizadas 