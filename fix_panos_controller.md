# Corrección del Controlador de Paños

## Problema Identificado

El controlador de paños (`panosController.js`) está contaminando las tablas de catálogo al crear nuevos paños. El problema está en el método `createPano` (líneas 356-395).

### Comportamiento Incorrecto Actual

1. **Genera un nuevo `id_mcr`** único para cada paño individual
2. **Inserta en `red_producto`** con este nuevo ID
3. **INCORRECTO**: Inserta el mismo ID en las tablas de catálogo (`nylon`, `lona`, `polipropileno`, `malla_sombra`)

### Comportamiento Correcto Esperado

1. **El usuario selecciona** un tipo de red existente del catálogo
2. **Se usa el `id_mcr`** del catálogo seleccionado
3. **NO se inserta** nada en las tablas de catálogo

## Solución Propuesta

### 1. Modificar el Frontend

El formulario de creación de paños debe permitir:
- **Seleccionar un tipo de red existente** del catálogo
- **Mostrar los tipos disponibles** según el catálogo
- **No permitir crear nuevos tipos** de red

### 2. Modificar el Backend

#### Opción A: Selección de Catálogo Existente
```javascript
// En lugar de generar un nuevo id_mcr, recibir uno existente
const { id_mcr_existente, largo_m, ancho_m, estado, ubicacion, precio_x_unidad } = req.body;

// Verificar que el id_mcr existe en el catálogo
const redProducto = await trx('red_producto').where('id_mcr', id_mcr_existente).first();
if (!redProducto) {
    throw new ValidationError('Tipo de red no encontrado en catálogo');
}

// Crear paño usando el id_mcr existente
const [id_item] = await trx('pano').insert({
    id_mcr: id_mcr_existente, // Usar el existente, no generar uno nuevo
    largo_m: parseFloat(largo_m),
    ancho_m: parseFloat(ancho_m),
    estado,
    ubicacion,
    precio_x_unidad: parseFloat(precio_x_unidad || 0),
    created_at: db.fn.now(),
    updated_at: db.fn.now(),
    stock_minimo: parseFloat(stock_minimo || 0),
    estado_trabajo: 'Libre'
}).returning('id_item');
```

#### Opción B: Crear Nuevo Tipo de Red (Solo para Administradores)
```javascript
// Solo permitir crear nuevos tipos de red si es administrador
if (req.user.rol !== 'admin') {
    throw new ValidationError('Solo administradores pueden crear nuevos tipos de red');
}

// Generar nuevo id_mcr solo para nuevos tipos de red
const id_mcr = `MCR-${tipo_red.toUpperCase()}-${Date.now()}`;

// Crear en red_producto y tabla específica
await trx('red_producto').insert({
    id_mcr,
    tipo_red: tipo_red.toLowerCase(),
    unidad: 'm²',
    marca: 'Sercodam',
    descripcion
});

// Crear en tabla específica según tipo
switch (tipo_red.toLowerCase()) {
    case 'nylon':
        await trx('nylon').insert({
            id_mcr,
            calibre,
            cuadro,
            torsion,
            refuerzo: refuerzo === 'Sí' || refuerzo === true
        });
        break;
    // ... otros casos
}
```

### 3. Nuevos Endpoints Necesarios

```javascript
// GET /api/v1/inventario/panos/tipos-red - Obtener tipos de red disponibles
getTiposRedDisponibles: async (req, res) => {
    try {
        const { tipo_red } = req.query;
        
        let query = db('red_producto')
            .select('id_mcr', 'tipo_red', 'descripcion');
            
        if (tipo_red) {
            query = query.where('tipo_red', tipo_red.toLowerCase());
        }
        
        const tipos = await query.orderBy('tipo_red', 'descripcion');
        
        res.json({
            success: true,
            data: tipos
        });
    } catch (error) {
        logger.error('Error obteniendo tipos de red:', error);
        throw error;
    }
}
```

### 4. Modificaciones en el Frontend

#### PanoModal.jsx
```javascript
// Agregar estado para tipos de red disponibles
const [tiposRedDisponibles, setTiposRedDisponibles] = useState([]);

// Cargar tipos de red al abrir el modal
useEffect(() => {
    if (open) {
        loadTiposRedDisponibles();
    }
}, [open]);

const loadTiposRedDisponibles = async () => {
    try {
        const response = await panosApi.getTiposRedDisponibles();
        setTiposRedDisponibles(response.data.data);
    } catch (error) {
        console.error('Error cargando tipos de red:', error);
    }
};

// En el formulario, reemplazar el campo de texto por un select
<FormControl fullWidth>
    <InputLabel>Tipo de Red</InputLabel>
    <Select
        value={formData.id_mcr_existente || ''}
        onChange={(e) => setFormData({...formData, id_mcr_existente: e.target.value})}
        required
    >
        {tiposRedDisponibles.map((tipo) => (
            <MenuItem key={tipo.id_mcr} value={tipo.id_mcr}>
                {tipo.descripcion} ({tipo.tipo_red})
            </MenuItem>
        ))}
    </Select>
</FormControl>
```

## Implementación Recomendada

1. **Fase 1**: Limpiar catálogos contaminados usando `cleanup_catalog_contamination.sql`
2. **Fase 2**: Implementar selección de tipos existentes en el frontend
3. **Fase 3**: Modificar el backend para usar IDs existentes
4. **Fase 4**: Agregar funcionalidad de creación de tipos (solo admin) si es necesario

## Beneficios de la Corrección

1. **Catálogos limpios**: Solo contienen tipos de redes válidos
2. **Consistencia**: Todos los paños del mismo tipo usan el mismo ID
3. **Mantenibilidad**: Más fácil gestionar tipos de redes
4. **Integridad**: Mejor integridad referencial en la base de datos 