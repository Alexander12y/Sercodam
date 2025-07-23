# RESUMEN: Fix para modo_corte - Problema Frontend

## 🔍 Problema Identificado

El campo `modo_corte` en la tabla `orden_produccion` siempre se quedaba como "simple" en lugar de detectar correctamente cuando hay cortes individuales.

## 🕵️ Análisis del Problema

### Causa Raíz
El problema estaba en el **frontend**, específicamente en el archivo `sercodam-frontend/src/pages/CreateOrden.jsx`.

Cuando se preparaba el payload para enviar al backend, **no se incluían los campos `modo_corte` y `cortes_individuales`** en el `panosPayload`.

### Código Problemático (Líneas 234-242)
```javascript
// Preparar panos payload
const panosPayload = panosSeleccionados.map(p => ({
  id_item: p.id_item,
  altura_req: p.largo_tomar || p.largo_m,
  ancho_req: p.ancho_tomar || p.ancho_m,
  tipo_red: p.tipo_red || 'nylon',
  umbral_sobrante_m2: p.umbral_sobrante_m2 || 5.0,
  cantidad: p.cantidad || 1,
  notas: p.notas || ''
  // ❌ FALTABAN: modo_corte y cortes_individuales
}));
```

### Flujo del Problema
1. **Frontend**: El usuario agrega paños con cortes individuales
2. **Frontend**: Se establece `modo_corte: 'individuales'` en el objeto del paño
3. **Frontend**: Al enviar la orden, se omite `modo_corte` y `cortes_individuales` del payload
4. **Backend**: Recibe paños sin información de cortes individuales
5. **Backend**: La lógica de detección no encuentra cortes individuales
6. **Backend**: Establece `modo_corte: 'simple'` por defecto

## ✅ Solución Implementada

### Cambio en Frontend
Se modificó el `panosPayload` en `CreateOrden.jsx` para incluir los campos faltantes:

```javascript
// Preparar panos payload
const panosPayload = panosSeleccionados.map(p => ({
  id_item: p.id_item,
  altura_req: p.largo_tomar || p.largo_m,
  ancho_req: p.ancho_tomar || p.ancho_m,
  tipo_red: p.tipo_red || 'nylon',
  umbral_sobrante_m2: p.umbral_sobrante_m2 || 5.0,
  cantidad: p.cantidad || 1,
  notas: p.notas || '',
  modo_corte: p.modo_corte || 'simple',  // ✅ AGREGADO
  cortes_individuales: p.cortes_individuales || null  // ✅ AGREGADO
}));
```

### Lógica del Backend (Ya Correcta)
El backend ya tenía la lógica correcta para detectar cortes individuales:

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

## 🧪 Verificación

### Script de Prueba
Se creó `test_modo_corte_fix_complete.js` que:

1. **Crea orden con cortes individuales** - incluye `modo_corte: 'individuales'` y `cortes_individuales`
2. **Crea orden con cortes simples** - incluye `modo_corte: 'simple'` y `cortes_individuales: null`
3. **Verifica en BD** - confirma que `modo_corte` se guarda correctamente
4. **Genera PDFs** - verifica que la funcionalidad completa funciona

### Resultado Esperado
- Orden con cortes individuales → `modo_corte: 'individuales'`
- Orden con cortes simples → `modo_corte: 'simple'`

## 📋 Pasos para Aplicar el Fix

1. **Reiniciar el frontend** para que tome los cambios
2. **Ejecutar el script de prueba**:
   ```bash
   node test_modo_corte_fix_complete.js
   ```
3. **Verificar en la aplicación** que las órdenes con cortes individuales muestran correctamente el modo de corte

## 🎯 Beneficios del Fix

- ✅ **Detección correcta** de cortes individuales desde la creación de la orden
- ✅ **PDFs consistentes** que muestran el modo de corte correcto
- ✅ **Lógica simplificada** - un solo lugar para determinar el modo de corte
- ✅ **Compatibilidad** con el sistema existente

## 🔧 Archivos Modificados

- `sercodam-frontend/src/pages/CreateOrden.jsx` - Agregado `modo_corte` y `cortes_individuales` al payload
- `test_modo_corte_fix_complete.js` - Script de prueba para verificar el fix

## 📝 Notas Importantes

- El backend ya tenía la lógica correcta
- El problema era puramente de comunicación frontend-backend
- Los cambios son mínimos y no afectan otras funcionalidades
- El fix es compatible con órdenes existentes 