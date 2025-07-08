const { body, query, param, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('❌ Errores de validación encontrados:');
        console.log('📝 Datos recibidos:', req.body);
        console.log('🚫 Errores:', errors.array());
        
        return res.status(400).json({
            success: false,
            message: 'Datos de entrada inválidos',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg,
                value: error.value
            }))
        });
    }
    next();
};

// Validaciones para actualización de inventario
const validateInventarioUpdate = [
    body('estado')
        .optional()
        .isIn(['bueno', 'regular', 'malo', '50%'])
        .withMessage('Estado debe ser: bueno, regular, malo, 50%'),
    
    body('ubicacion')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 2, max: 100 })
        .withMessage('Ubicación debe tener entre 2 y 100 caracteres'),
    
    body('precio_x_unidad')
        .optional()
        .isNumeric()
        .withMessage('Precio debe ser un número')
        .custom((value) => {
            if (value < 0) {
                throw new Error('Precio no puede ser negativo');
            }
            return true;
        }),
    
    body('cantidad_disponible')
        .optional()
        .isNumeric()
        .withMessage('Cantidad debe ser un número')
        .custom((value) => {
            if (value < 0) {
                throw new Error('Cantidad no puede ser negativa');
            }
            return true;
        }),
    
    body('marca')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 1, max: 50 })
        .withMessage('Marca debe tener entre 1 y 50 caracteres'),
    
    body('estado_calidad')
        .optional()
        .isIn(['bueno', 'regular', 'malo', '50%'])
        .withMessage('Estado de calidad debe ser: bueno, regular, malo, 50%'),
    
    handleValidationErrors
];

// Validaciones específicas para actualización de materiales
const validateMaterialUpdate = [
    body('descripcion')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 2, max: 200 })
        .withMessage('Descripción debe tener entre 2 y 200 caracteres'),
    
    body('categoria')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 2, max: 100 })
        .withMessage('Categoría debe tener entre 2 y 100 caracteres'),
    
    body('presentacion')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ max: 100 })
        .withMessage('Presentación no puede exceder 100 caracteres'),
    
    body('unidad')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 1, max: 20 })
        .withMessage('Unidad debe tener entre 1 y 20 caracteres'),
    
    body('permite_decimales')
        .optional()
        .custom((value) => {
            if (value !== undefined && typeof value !== 'boolean') {
                throw new Error('Permite decimales debe ser verdadero o falso');
            }
            return true;
        }),
    
    body('cantidad_disponible')
        .optional()
        .custom((value) => {
            if (value !== undefined && value !== null && value !== '') {
                const num = parseFloat(value);
                if (isNaN(num)) {
                    throw new Error('Cantidad debe ser un número');
                }
                if (num < 0) {
                    throw new Error('Cantidad no puede ser negativa');
                }
            }
            return true;
        }),
    
    body('marca')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 1, max: 50 })
        .withMessage('Marca debe tener entre 1 y 50 caracteres'),
    
    body('estado_calidad')
        .optional()
        .isIn(['Bueno', 'Regular', 'Usado 50%', 'Malo'])
        .withMessage('Estado de calidad debe ser: Bueno, Regular, Usado 50%, Malo'),
    
    body('ubicacion')
        .optional()
        .isIn(['Bodega CDMX', 'Querétaro', 'Oficina', 'Instalación'])
        .withMessage('Ubicación debe ser: Bodega CDMX, Querétaro, Oficina, Instalación'),
    
    body('precioxunidad')
        .optional()
        .custom((value) => {
            if (value !== undefined && value !== null && value !== '') {
                const num = parseFloat(value);
                if (isNaN(num)) {
                    throw new Error('Precio por unidad debe ser un número');
                }
                if (num < 0) {
                    throw new Error('Precio no puede ser negativo');
                }
            }
            return true;
        }),
    
    body('uso_principal')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ max: 200 })
        .withMessage('Uso principal no puede exceder 200 caracteres'),
    
    handleValidationErrors
];

// Validaciones para movimientos de inventario
const validateMovimiento = [
    body('tipo_mov')
        .notEmpty()
        .withMessage('Tipo de movimiento es requerido')
        .isIn(['CONSUMO', 'AJUSTE_IN', 'AJUSTE_OUT', 'ASIGNACION', 'DEVOLUCION'])
        .withMessage('Tipo de movimiento debe ser: CONSUMO, AJUSTE_IN, AJUSTE_OUT, ASIGNACION, DEVOLUCION'),
    
    body('cantidad')
        .notEmpty()
        .withMessage('Cantidad es requerida')
        .isNumeric()
        .withMessage('Cantidad debe ser un número')
        .custom((value) => {
            if (value <= 0) {
                throw new Error('Cantidad debe ser mayor a 0');
            }
            return true;
        }),
    
    body('id_item')
        .notEmpty()
        .withMessage('ID del item es requerido')
        .isInt()
        .withMessage('ID del item debe ser un número entero'),
    
    body('notas')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ max: 500 })
        .withMessage('Notas no pueden exceder 500 caracteres'),
    
    handleValidationErrors
];

// Validaciones para creación de materiales
const validateMaterialCreacion = [
    body('id_material_extra')
        .notEmpty()
        .withMessage('Código de material es requerido')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Código debe tener entre 1 y 50 caracteres'),
    
    body('descripcion')
        .notEmpty()
        .withMessage('Descripción es requerida')
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 2, max: 200 })
        .withMessage('Descripción debe tener entre 2 y 200 caracteres'),
    
    body('categoria')
        .notEmpty()
        .withMessage('Categoría es requerida')
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 2, max: 100 })
        .withMessage('Categoría debe tener entre 2 y 100 caracteres'),
    
    body('unidad')
        .notEmpty()
        .withMessage('Unidad es requerida')
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 1, max: 20 })
        .withMessage('Unidad debe tener entre 1 y 20 caracteres'),
    
    body('cantidad_disponible')
        .notEmpty()
        .withMessage('Cantidad disponible es requerida')
        .isNumeric()
        .withMessage('Cantidad debe ser un número')
        .custom((value) => {
            if (value < 0) {
                throw new Error('Cantidad no puede ser negativa');
            }
            return true;
        }),
    
    body('permite_decimales')
        .optional()
        .isBoolean()
        .withMessage('Permite decimales debe ser verdadero o falso'),
    
    handleValidationErrors
];

// Validaciones para creación de herramientas
const validateHerramientaCreacion = [
    body('id_herramienta')
        .notEmpty()
        .withMessage('Código de herramienta es requerido')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Código debe tener entre 1 y 50 caracteres'),
    
    body('categoria')
        .notEmpty()
        .withMessage('Categoría es requerida')
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 2, max: 100 })
        .withMessage('Categoría debe tener entre 2 y 100 caracteres'),
    
    body('descripcion')
        .notEmpty()
        .withMessage('Descripción es requerida')
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 2, max: 200 })
        .withMessage('Descripción debe tener entre 2 y 200 caracteres'),
    
    body('presentacion')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ max: 100 })
        .withMessage('Presentación no puede exceder 100 caracteres'),
    
    body('unidad')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ max: 20 })
        .withMessage('Unidad no puede exceder 20 caracteres'),
    
    body('cantidad_disponible')
        .optional()
        .isNumeric()
        .withMessage('Cantidad disponible debe ser un número')
        .custom((value) => {
            if (value < 0) {
                throw new Error('Cantidad disponible no puede ser negativa');
            }
            return true;
        }),
    
    body('marca')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ max: 50 })
        .withMessage('Marca no puede exceder 50 caracteres'),
    
    body('estado_calidad')
        .optional()
        .isIn(['Bueno', 'Regular', 'Malo', 'Usado 50%'])
        .withMessage('Estado de calidad debe ser: Bueno, Regular, Malo, Usado 50%'),
    
    body('ubicacion')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ max: 100 })
        .withMessage('Ubicación no puede exceder 100 caracteres'),
    
    body('precioxunidad')
        .optional()
        .isNumeric()
        .withMessage('Precio por unidad debe ser un número')
        .custom((value) => {
            if (value < 0) {
                throw new Error('Precio por unidad no puede ser negativo');
            }
            return true;
        }),
    
    body('uso_principal')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ max: 200 })
        .withMessage('Uso principal no puede exceder 200 caracteres'),
    
    handleValidationErrors
];

// Validaciones para actualización de herramientas
const validateHerramientaUpdate = [
    body('categoria')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 2, max: 100 })
        .withMessage('Categoría debe tener entre 2 y 100 caracteres'),
    
    body('descripcion')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 2, max: 200 })
        .withMessage('Descripción debe tener entre 2 y 200 caracteres'),
    
    body('presentacion')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ max: 100 })
        .withMessage('Presentación no puede exceder 100 caracteres'),
    
    body('unidad')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ max: 20 })
        .withMessage('Unidad no puede exceder 20 caracteres'),
    
    body('cantidad_disponible')
        .optional()
        .isNumeric()
        .withMessage('Cantidad disponible debe ser un número')
        .custom((value) => {
            if (value < 0) {
                throw new Error('Cantidad disponible no puede ser negativa');
            }
            return true;
        }),
    
    body('marca')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ max: 50 })
        .withMessage('Marca no puede exceder 50 caracteres'),
    
    body('estado_calidad')
        .optional()
        .isIn(['Bueno', 'Regular', 'Malo', 'Usado 50%'])
        .withMessage('Estado de calidad debe ser: Bueno, Regular, Malo, Usado 50%'),
    
    body('ubicacion')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ max: 100 })
        .withMessage('Ubicación no puede exceder 100 caracteres'),
    
    body('precioxunidad')
        .optional()
        .isNumeric()
        .withMessage('Precio por unidad debe ser un número')
        .custom((value) => {
            if (value < 0) {
                throw new Error('Precio por unidad no puede ser negativo');
            }
            return true;
        }),
    
    body('uso_principal')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ max: 200 })
        .withMessage('Uso principal no puede exceder 200 caracteres'),
    
    handleValidationErrors
];

// Validaciones para disponibilidad
const validateDisponibilidad = [
    body('items')
        .isArray({ min: 1 })
        .withMessage('Items debe ser un array con al menos un elemento'),
    
    body('items.*.tipo')
        .notEmpty()
        .withMessage('Tipo es requerido')
        .isIn(['PANO', 'MATERIAL', 'HERRAMIENTA'])
        .withMessage('Tipo debe ser: PANO, MATERIAL, HERRAMIENTA'),
    
    body('items.*.id_item')
        .notEmpty()
        .withMessage('ID del item es requerido')
        .isInt()
        .withMessage('ID del item debe ser un número entero'),
    
    body('items.*.cantidad_requerida')
        .optional()
        .isNumeric()
        .withMessage('Cantidad requerida debe ser un número')
        .custom((value) => {
            if (value <= 0) {
                throw new Error('Cantidad requerida debe ser mayor a 0');
            }
            return true;
        }),
    
    handleValidationErrors
];

// Validaciones para parámetros de consulta
const validateQueryParams = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Página debe ser un número entero mayor a 0'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Límite debe ser un número entre 1 y 1000'),
    
    query('sortBy')
        .optional()
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Campo de ordenamiento inválido'),
    
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Orden debe ser asc o desc'),
    
    handleValidationErrors
];

// Validaciones para parámetros de ID
const validateIdParam = [
    param('id')
        .notEmpty()
        .withMessage('ID es requerido')
        .isInt()
        .withMessage('ID debe ser un número entero'),
    
    handleValidationErrors
];

module.exports = {
    validateInventarioUpdate,
    validateMaterialUpdate,
    validateMovimiento,
    validateMaterialCreacion,
    validateHerramientaCreacion,
    validateHerramientaUpdate,
    validateDisponibilidad,
    validateQueryParams,
    validateIdParam,
    handleValidationErrors
};