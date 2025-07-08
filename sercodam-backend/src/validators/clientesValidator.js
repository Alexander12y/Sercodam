const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('../middleware/errorHandler');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => error.msg);
        throw new ValidationError(errorMessages.join(', '));
    }
    next();
};

// Validador para crear cliente
const validateClienteCreacion = [
    body('nombre_cliente')
        .notEmpty()
        .withMessage('El nombre del cliente es requerido')
        .isLength({ min: 2, max: 255 })
        .withMessage('El nombre debe tener entre 2 y 255 caracteres')
        .trim(),
    
    body('email')
        .optional({ nullable: true })
        .isEmail()
        .withMessage('El email debe tener un formato válido')
        .isLength({ max: 255 })
        .withMessage('El email no puede exceder 255 caracteres')
        .normalizeEmail(),
    
    body('telefono')
        .optional({ nullable: true })
        .isLength({ max: 50 })
        .withMessage('El teléfono no puede exceder 50 caracteres')
        .trim(),
    
    handleValidationErrors
];

// Validador para actualizar cliente
const validateClienteUpdate = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('El ID del cliente debe ser un número entero positivo'),
    
    body('nombre_cliente')
        .notEmpty()
        .withMessage('El nombre del cliente es requerido')
        .isLength({ min: 2, max: 255 })
        .withMessage('El nombre debe tener entre 2 y 255 caracteres')
        .trim(),
    
    body('email')
        .optional({ nullable: true })
        .isEmail()
        .withMessage('El email debe tener un formato válido')
        .isLength({ max: 255 })
        .withMessage('El email no puede exceder 255 caracteres')
        .normalizeEmail(),
    
    body('telefono')
        .optional({ nullable: true })
        .isLength({ max: 50 })
        .withMessage('El teléfono no puede exceder 50 caracteres')
        .trim(),
    
    handleValidationErrors
];

// Validador para parámetros de ID
const validateIdParam = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('El ID debe ser un número entero positivo'),
    
    handleValidationErrors
];

// Validador para parámetros de búsqueda
const validateSearchQuery = [
    query('q')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ min: 2, max: 100 })
        .withMessage('La búsqueda debe tener entre 2 y 100 caracteres')
        .trim(),
    
    handleValidationErrors
];

// Validador para parámetros de consulta generales
const validateQueryParams = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('La página debe ser un número entero positivo'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('El límite debe ser un número entre 1 y 1000'),
    
    query('search')
        .optional({ nullable: true, checkFalsy: true })
        .isLength({ min: 1, max: 100 })
        .withMessage('La búsqueda debe tener entre 1 y 100 caracteres')
        .trim(),
    
    handleValidationErrors
];

// Validador para parámetros de órdenes de cliente
const validateOrdenesClienteQuery = [
    param('id')
        .isInt({ min: 1 })
        .withMessage('El ID del cliente debe ser un número entero positivo'),
    
    query('estado')
        .optional()
        .isIn(['en_proceso', 'completada', 'cancelada', 'pausada'])
        .withMessage('El estado debe ser: en_proceso, completada, cancelada o pausada'),
    
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('La página debe ser un número entero positivo'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('El límite debe ser un número entre 1 y 100'),
    
    query('sortBy')
        .optional()
        .isIn(['fecha_op', 'numero_op', 'estado', 'prioridad'])
        .withMessage('El campo de ordenamiento debe ser: fecha_op, numero_op, estado o prioridad'),
    
    query('sortOrder')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('El orden debe ser: asc o desc'),
    
    handleValidationErrors
];

module.exports = {
    validateClienteCreacion,
    validateClienteUpdate,
    validateIdParam,
    validateSearchQuery,
    validateQueryParams,
    validateOrdenesClienteQuery
}; 