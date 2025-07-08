# Implementación del Manejo de Inventario de Paños - Sercodam

## Resumen de la Implementación

Se ha implementado un sistema completo para el manejo del inventario de paños en las órdenes de producción, que incluye:

1. **Doble registro por paño**: Largo y ancho se registran por separado en `orden_produccion_detalle`
2. **Notas detalladas**: Generación automática de notas descriptivas según el tipo de red
3. **Restauración automática**: Cuando una orden se cancela, el inventario se restaura automáticamente
4. **Limpieza automática**: Eliminación de registros después de 3 días (completadas) o 30 días (en proceso/pausada)

## Archivos Creados/Modificados

### Migraciones
- `013_add_catalogo_estado_to_orden_produccion_detalle.js` - Agrega campos catalogo y estado
- `014_create_pano_inventory_functions.js` - Crea funciones SQL para manejo de inventario

### Controladores
- `ordenesController.js` - Modificado para manejar paños con largo/ancho separados

### Scripts
- `cleanup-ordenes.js` - Script para limpieza automática
- `run-migrations.js` - Script para ejecutar migraciones
- `test-pano-inventory.js` - Script de pruebas

### Rutas
- `ordenes.js` - Agregado endpoint de limpieza

## Instrucciones de Instalación

### 1. Ejecutar Migraciones

```bash
cd sercodam-backend
node run-migrations.js
```

### 2. Verificar Instalación

```bash
node test-pano-inventory.js
```

### 3. Configurar Limpieza Automática (Opcional)

Para configurar la limpieza automática como un cron job:

```bash
# Agregar al crontab (ejecutar cada día a las 2:00 AM)
0 2 * * * cd /path/to/sercodam-backend && node cleanup-ordenes.js >> /var/log/sercodam-cleanup.log 2>&1
```

## Funcionalidades Implementadas

### 1. Creación de Órdenes con Paños

Cuando se crea una orden de producción con paños:

1. **Validación**: Se verifica que las dimensiones solicitadas no excedan las disponibles
2. **Doble registro**: Se crean dos registros en `orden_produccion_detalle`:
   - Uno para el largo extraído
   - Uno para el ancho extraído
3. **Notas automáticas**: Se generan notas descriptivas usando la función `fn_generar_nota_pano`
4. **Descuento de inventario**: Se descuentan las dimensiones del paño original

### 2. Notas Detalladas

Las notas se generan automáticamente con el formato:
- Para largo: `"2.5 m de largo red nylon calibre 18 torcida sin refuerzo"`
- Para ancho: `"1.8 m de ancho red nylon calibre 18 torcida sin refuerzo"`

La función consulta las tablas de catálogo (`nylon`, `polipropileno`, `lona`, `malla_sombra`) para obtener los atributos específicos de cada tipo de red.

### 3. Restauración Automática por Cancelación

Cuando una orden cambia a estado "cancelada":

1. **Trigger automático**: Se activa `trg_orden_cancelada`
2. **Identificación de registros**: Se buscan los registros de largo y ancho por paño
3. **Restauración**: Se suman las dimensiones de vuelta al paño original
4. **Movimiento de inventario**: Se registra la restauración
5. **Limpieza**: Se eliminan los registros de `orden_produccion_detalle`

### 4. Limpieza Automática

#### Órdenes Completadas (3 días)
- Se eliminan automáticamente los registros de `orden_produccion_detalle`
- Función: `fn_limpiar_detalle_completadas()`

#### Órdenes en Proceso/Pausada (30 días)
- Se cambia automáticamente el estado a "cancelada"
- Esto activa la restauración de inventario
- Función: `fn_cancelar_ordenes_30_dias()`

## Estructura de Datos

### Tabla orden_produccion_detalle

```sql
CREATE TABLE orden_produccion_detalle (
    id_detalle SERIAL PRIMARY KEY,
    id_op INTEGER NOT NULL REFERENCES orden_produccion(id_op),
    id_item INTEGER NOT NULL,
    cantidad NUMERIC NOT NULL,
    notas TEXT,
    catalogo TEXT DEFAULT 'CATALOGO_1',
    tipo_item VARCHAR(20) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
);
```

### Campos Específicos para Paños

- `catalogo`: 'CATALOGO_1' para paños
- `tipo_item`: 'PANO' para paños
- `cantidad`: Valor del largo o ancho extraído
- `notas`: Descripción detallada generada automáticamente

## Funciones SQL Creadas

### 1. fn_generar_nota_pano(id_item, cantidad, tipo_dimension)
Genera notas descriptivas para paños consultando las tablas de catálogo.

### 2. fn_restaurar_inventario_panos_cancelada(id_op)
Restaura el inventario de paños cuando se cancela una orden.

### 3. fn_limpiar_detalle_completadas()
Elimina registros de órdenes completadas después de 3 días.

### 4. fn_cancelar_ordenes_30_dias()
Cancela automáticamente órdenes en proceso/pausada después de 30 días.

## Triggers Creados

### trg_orden_cancelada
Se activa cuando una orden cambia a estado "cancelada" y ejecuta automáticamente la restauración de inventario.

## Endpoints de API

### POST /api/v1/ordenes/limpieza
Ejecuta limpieza manual (solo administradores).

Parámetros:
- `tipo`: 'completadas', 'cancelacion_automatica', o 'completa'

## Pruebas

Para verificar que todo funciona correctamente:

```bash
# Ejecutar pruebas
node test-pano-inventory.js

# Ejecutar limpieza manual
curl -X POST http://localhost:3000/api/v1/ordenes/limpieza \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"tipo": "completa"}'
```

## Consideraciones Importantes

1. **Integridad de Datos**: Las funciones validan que las dimensiones no excedan las disponibles
2. **Transacciones**: Todas las operaciones se ejecutan dentro de transacciones para garantizar consistencia
3. **Logging**: Se registran todos los movimientos de inventario para auditoría
4. **Performance**: Se han creado índices en las columnas relevantes
5. **Escalabilidad**: El sistema está preparado para manejar materiales extras (CATALOGO_2)

## Próximos Pasos

1. **Materiales Extras**: Implementar el manejo similar para materiales extras
2. **Monitoreo**: Crear dashboard para monitorear el estado del inventario
3. **Reportes**: Generar reportes de consumo y restauración de inventario
4. **Notificaciones**: Implementar alertas cuando el inventario esté bajo

## Soporte

Para problemas o preguntas sobre la implementación, revisar:
1. Los logs del sistema
2. Los resultados de `test-pano-inventory.js`
3. La documentación de las funciones SQL
4. Los triggers y constraints de la base de datos 