const { body, validationResult } = require('express-validator');

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Datos de entrada inválidos',
            errors: errors.array().map(error => ({
                field: error.path,
                message: error.msg
            }))
        });
    }
    next();
};

// Validaciones para login
const validateLogin = [
    body('username')
        .trim()
        .escape()
        .stripLow()
        .notEmpty()
        .withMessage('El nombre de usuario es requerido')
        .isLength({ min: 3, max: 50 })
        .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
    
    body('password')
        .notEmpty()
        .withMessage('La contraseña es requerida')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres'),
    
    handleValidationErrors
];

// Validaciones para creación de usuarios
const validateUserCreation = [
    body('username')
        .trim()
        .escape()
        .stripLow()
        .notEmpty()
        .withMessage('El nombre de usuario es requerido')
        .isLength({ min: 3, max: 50 })
        .withMessage('El nombre de usuario debe tener entre 3 y 50 caracteres')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('El nombre de usuario solo puede contener letras, números y guiones bajos'),
    
    body('password')
        .notEmpty()
        .withMessage('La contraseña es requerida')
        .isLength({ min: 8 })
        .withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('La contraseña debe contener al menos una letra minúscula, una mayúscula y un número'),
    
    body('nombre')
        .trim()
        .escape()
        .stripLow()
        .notEmpty()
        .withMessage('El nombre es requerido')
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    
    body('email')
        .trim()
        .escape()
        .stripLow()
        .notEmpty()
        .withMessage('El email es requerido')
        .isEmail()
        .withMessage('El email debe tener un formato válido')
        .normalizeEmail(),
    
    body('rol')
        .optional()
        .isIn(['admin', 'supervisor', 'usuario', 'operador'])
        .withMessage('El rol debe ser uno de: admin, supervisor, usuario, operador'),
    
    handleValidationErrors
];

// Validaciones para cambio de contraseña
const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('La contraseña actual es requerida'),
    
    body('newPassword')
        .notEmpty()
        .withMessage('La nueva contraseña es requerida')
        .isLength({ min: 8 })
        .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('La nueva contraseña debe contener al menos una letra minúscula, una mayúscula y un número')
        .custom((value, { req }) => {
            if (value === req.body.currentPassword) {
                throw new Error('La nueva contraseña no puede ser igual a la actual');
            }
            return true;
        }),
    
    handleValidationErrors
];

// Validaciones para actualización de perfil
const validateProfileUpdate = [
    body('nombre')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    
    body('email')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isEmail()
        .withMessage('El email debe tener un formato válido')
        .normalizeEmail(),
    
    handleValidationErrors
];

// Validaciones para actualización de usuarios (admin)
const validateUserUpdate = [
    body('nombre')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    
    body('email')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isEmail()
        .withMessage('El email debe tener un formato válido')
        .normalizeEmail(),
    
    body('password')
        .optional()
        .custom((value) => {
            // Solo validar si se proporciona una contraseña
            if (value && value.trim()) {
                if (value.length < 8) {
                    throw new Error('La contraseña debe tener al menos 8 caracteres');
                }
                if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
                    throw new Error('La contraseña debe contener al menos una letra minúscula, una mayúscula y un número');
                }
            }
            return true;
        }),
    
    body('rol')
        .optional()
        .isIn(['admin', 'supervisor', 'usuario', 'operador'])
        .withMessage('El rol debe ser uno de: admin, supervisor, usuario, operador'),
    
    body('activo')
        .optional()
        .isBoolean()
        .withMessage('El campo activo debe ser un valor booleano'),
    
    handleValidationErrors
];

// Validaciones para reset de contraseña (admin)
const validatePasswordReset = [
    body('newPassword')
        .notEmpty()
        .withMessage('La nueva contraseña es requerida')
        .isLength({ min: 8 })
        .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('La nueva contraseña debe contener al menos una letra minúscula, una mayúscula y un número'),
    
    handleValidationErrors
];

// Validaciones para refresh token
const validateRefreshToken = [
    body('refreshToken')
        .notEmpty()
        .withMessage('El refresh token es requerido'),
    
    handleValidationErrors
];

// Validaciones para logout
const validateLogout = [
    body('sessionId')
        .optional()
        .isUUID()
        .withMessage('El ID de sesión debe ser un UUID válido'),
    
    handleValidationErrors
];

// Validaciones para parámetros de consulta de usuarios
const validateUserQuery = [
    body('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('La página debe ser un número entero mayor a 0'),
    
    body('limit')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('El límite debe ser un número entre 1 y 1000'),
    
    body('search')
        .optional()
        .trim()
        .escape()
        .stripLow()
        .isLength({ min: 1, max: 100 })
        .withMessage('La búsqueda debe tener entre 1 y 100 caracteres'),
    
    body('rol')
        .optional()
        .isIn(['admin', 'supervisor', 'usuario', 'operador'])
        .withMessage('El rol debe ser uno de: admin, supervisor, usuario, operador'),
    
    handleValidationErrors
];

module.exports = {
    validateLogin,
    validateUserCreation,
    validatePasswordChange,
    validateProfileUpdate,
    validateUserUpdate,
    validatePasswordReset,
    validateRefreshToken,
    validateLogout,
    validateUserQuery,
    handleValidationErrors
}; 