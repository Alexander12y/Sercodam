const { body, query, param, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
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

// Validaciones para creación de órdenes
const validateOrdenCreacion = [
    body('cliente')
        .notEmpty()
        .withMessage('El cliente es requerido')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('El cliente debe tener entre 2 y 200 caracteres'),
    
    body('observaciones')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Las observaciones no pueden exceder 1000 caracteres'),
    
    body('materiales')
        .optional()
        .isArray()
        .withMessage('Materiales debe ser un array'),
    
    body('materiales.*.id_item')
        .if(body('materiales').exists())
        .notEmpty()
        .withMessage('ID del item es requerido')
        .isInt()
        .withMessage('ID del item debe ser un número entero'),
    
    body('materiales.*.cantidad')
        .if(body('materiales').exists())
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
    
    body('materiales.*.tipo_item')
        .if(body('materiales').exists())
        .notEmpty()
        .withMessage('Tipo de item es requerido')
        .isIn(['PANO', 'EXTRA'])
        .withMessage('Tipo de item debe ser: PANO, EXTRA'),
    
    body('materiales.*.tipo_mov')
        .if(body('materiales').exists())
        .optional()
        .isIn(['CONSUMO', 'ASIGNACION', 'AJUSTE_IN', 'AJUSTE_OUT', 'DEVOLUCION'])
        .withMessage('Tipo de movimiento inválido'),
    
    body('materiales.*.notas')
        .if(body('materiales').exists())
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notas no pueden exceder 500 caracteres'),
    
    body('herramientas')
        .optional()
        .isArray()
        .withMessage('Herramientas debe ser un array'),
    
    body('herramientas.*.id_item')
        .if(body('herramientas').exists())
        .notEmpty()
        .withMessage('ID de herramienta es requerido')
        .isInt()
        .withMessage('ID de herramienta debe ser un número entero'),
    
    body('herramientas.*.notas')
        .if(body('herramientas').exists())
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notas de herramienta no pueden exceder 500 caracteres'),
    
    handleValidationErrors
];

// Validaciones para actualización de órdenes
const validateOrdenUpdate = [
    body('cliente')
        .optional()
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('El cliente debe tener entre 2 y 200 caracteres'),
    
    body('observaciones')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Las observaciones no pueden exceder 1000 caracteres'),
    
    body('estado')
        .optional()
        .isIn(['pendiente', 'en_proceso', 'completada', 'cancelada', 'pausada', 'BORRADOR'])
        .withMessage('Estado inválido'),
    
    handleValidationErrors
];

// Validaciones para cambio de estado
const validateCambioEstado = [
    body('estado')
        .notEmpty()
        .withMessage('El estado es requerido')
        .isIn(['pendiente', 'en_proceso', 'completada', 'cancelada', 'pausada', 'BORRADOR'])
        .withMessage('Estado inválido'),
    
    body('notas')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Las notas no pueden exceder 500 caracteres'),
    
    handleValidationErrors
];

// Validaciones para cancelación de orden
const validateCancelacion = [
    body('motivo')
        .notEmpty()
        .withMessage('El motivo de cancelación es requerido')
        .trim()
        .isLength({ min: 5, max: 500 })
        .withMessage('El motivo debe tener entre 5 y 500 caracteres'),
    
    handleValidationErrors
];

// Validaciones para agregar materiales a orden existente
const validateAgregarMateriales = [
    body('materiales')
        .isArray({ min: 1 })
        .withMessage('Debe proporcionar al menos un material'),
    
    body('materiales.*.id_item')
        .notEmpty()
        .withMessage('ID del item es requerido')
        .isInt()
        .withMessage('ID del item debe ser un número entero'),
    
    body('materiales.*.cantidad')
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
    
    body('materiales.*.tipo_mov')
        .optional()
        .isIn(['CONSUMO', 'ASIGNACION', 'AJUSTE_IN', 'AJUSTE_OUT', 'DEVOLUCION'])
        .withMessage('Tipo de movimiento inválido'),
    
    body('materiales.*.notas')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notas no pueden exceder 500 caracteres'),
    
    handleValidationErrors
];

// Validaciones para asignar herramientas
const validateAsignarHerramientas = [
    body('herramientas')
        .isArray({ min: 1 })
        .withMessage('Debe proporcionar al menos una herramienta'),
    
    body('herramientas.*.id_item')
        .notEmpty()
        .withMessage('ID de herramienta es requerido')
        .isInt()
        .withMessage('ID de herramienta debe ser un número entero'),
    
    body('herramientas.*.notas')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notas no pueden exceder 500 caracteres'),
    
    handleValidationErrors
];

// Validaciones para actualizar material en orden
const validateActualizarMaterial = [
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
    
    body('notas')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Notas no pueden exceder 500 caracteres'),
    
    handleValidationErrors
];

// Validaciones para parámetros de consulta de órdenes
const validateOrdenesQuery = [
    query('estado')
        .optional()
        .isIn(['pendiente', 'en_proceso', 'completada', 'cancelada', 'pausada'])
        .withMessage('Estado inválido'),
    
    query('cliente')
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Cliente debe tener entre 1 y 200 caracteres'),
    
    query('fecha_desde')
        .optional()
        .isISO8601()
        .withMessage('Fecha desde debe ser una fecha válida (ISO 8601)'),
    
    query('fecha_hasta')
        .optional()
        .isISO8601()
        .withMessage('Fecha hasta debe ser una fecha válida (ISO 8601)')
        .custom((value, { req }) => {
            if (req.query.fecha_desde && new Date(value) < new Date(req.query.fecha_desde)) {
                throw new Error('Fecha hasta debe ser posterior a fecha desde');
            }
            return true;
        }),
    
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
        .isIn(['fecha_op', 'cliente', 'estado', 'created_at', 'updated_at'])
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
        .withMessage('ID de orden es requerido')
        .matches(/^OP-\d{8}-\d{3}$/)
        .withMessage('ID de orden debe tener el formato OP-YYYYMMDD-XXX'),
    
    handleValidationErrors
];

// Validaciones para parámetros de ID de material/herramienta
const validateMaterialIdParam = [
    param('id')
        .notEmpty()
        .withMessage('ID de orden es requerido')
        .matches(/^OP-\d{8}-\d{3}$/)
        .withMessage('ID de orden debe tener el formato OP-YYYYMMDD-XXX'),
    
    param('materialId')
        .notEmpty()
        .withMessage('ID de material es requerido')
        .isInt()
        .withMessage('ID de material debe ser un número entero'),
    
    handleValidationErrors
];

const validateHerramientaIdParam = [
    param('id')
        .notEmpty()
        .withMessage('ID de orden es requerido')
        .matches(/^OP-\d{8}-\d{3}$/)
        .withMessage('ID de orden debe tener el formato OP-YYYYMMDD-XXX'),
    
    param('herramientaId')
        .notEmpty()
        .withMessage('ID de herramienta es requerido')
        .isInt()
        .withMessage('ID de herramienta debe ser un número entero'),
    
    handleValidationErrors
];

// Validaciones para completar orden
const validateCompletarOrden = [
    body('notas_finales')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notas finales no pueden exceder 1000 caracteres'),
    
    body('herramientas_devueltas')
        .optional()
        .isArray()
        .withMessage('Herramientas devueltas debe ser un array'),
    
    body('herramientas_devueltas.*.id_item')
        .if(body('herramientas_devueltas').exists())
        .notEmpty()
        .withMessage('ID de herramienta es requerido')
        .isInt()
        .withMessage('ID de herramienta debe ser un número entero'),
    
    body('herramientas_devueltas.*.estado_devolucion')
        .if(body('herramientas_devueltas').exists())
        .optional()
        .isIn(['Bueno', 'Regular', 'Malo', 'Reparar'])
        .withMessage('Estado de devolución inválido'),
    
    handleValidationErrors
];

// Validaciones para clonar orden
const validateClonarOrden = [
    body('nuevo_cliente')
        .optional()
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Nuevo cliente debe tener entre 2 y 200 caracteres'),
    
    body('incluir_materiales')
        .optional()
        .isBoolean()
        .withMessage('Incluir materiales debe ser verdadero o falso'),
    
    body('incluir_herramientas')
        .optional()
        .isBoolean()
        .withMessage('Incluir herramientas debe ser verdadero o falso'),
    
    body('observaciones_adicionales')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Observaciones adicionales no pueden exceder 500 caracteres'),
    
    handleValidationErrors
];

module.exports = {
    validateOrdenCreacion,
    validateOrdenUpdate,
    validateCambioEstado,
    validateCancelacion,
    validateAgregarMateriales,
    validateAsignarHerramientas,
    validateActualizarMaterial,
    validateOrdenesQuery,
    validateIdParam,
    validateMaterialIdParam,
    validateHerramientaIdParam,
    validateCompletarOrden,
    validateClonarOrden,
    handleValidationErrors
};