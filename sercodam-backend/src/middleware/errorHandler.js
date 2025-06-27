const logger = require('../config/logger');

// Custom error classes
class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = this.constructor.name;

        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, errors = []) {
        super(message, 400);
        this.errors = errors;
        this.name = 'ValidationError';
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Recurso no encontrado') {
        super(message, 404);
        this.name = 'NotFoundError';
    }
}

class ConflictError extends AppError {
    constructor(message = 'Conflicto en la solicitud') {
        super(message, 409);
        this.name = 'ConflictError';
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'No autorizado') {
        super(message, 401);
        this.name = 'UnauthorizedError';
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Acceso denegado') {
        super(message, 403);
        this.name = 'ForbiddenError';
    }
}

// Database error handler
const handleDatabaseError = (error) => {
    logger.error('Database error:', error);

    // PostgreSQL specific errors
    if (error.code) {
        switch (error.code) {
            case '23505': // Unique violation
                return new ConflictError('Ya existe un registro con estos datos');
            case '23503': // Foreign key violation
                return new ValidationError('Referencia inválida a otro registro', [{ message: error.detail || error.message }]);
            case '23502': // Not null violation
                return new ValidationError('Campo requerido faltante', [{ message: error.detail || error.message }]);
            case '23514': // Check violation
                return new ValidationError('Los datos no cumplen con las restricciones', [{ message: error.detail || error.message }]);
            case '42P01': // Undefined table
                return new AppError('Recurso no disponible', 500);
            case '42601': // Syntax error
                return new AppError('Error en la consulta', 500);
            default:
                return new AppError('Error en la base de datos', 500);
        }
    }

    return new AppError('Error interno del servidor', 500);
};

// JWT error handler
const handleJWTError = (error) => {
    if (error.name === 'JsonWebTokenError') {
        return new UnauthorizedError('Token inválido');
    }
    if (error.name === 'TokenExpiredError') {
        return new UnauthorizedError('Token expirado');
    }
    return new UnauthorizedError('Error de autenticación');
};

// Validation error handler
const handleValidationError = (error) => {
    if (error.details && Array.isArray(error.details)) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
        }));

        return new ValidationError('Datos de entrada inválidos', errors);
    }

    return new ValidationError(error.message || 'Datos inválidos');
};

// Main error handler middleware
const errorHandler = (error, req, res, next) => {
    let err = error;

    // Log the original error
    logger.logError(error, req, {
        body: req.body,
        params: req.params,
        query: req.query
    });

    // Mostrar SIEMPRE el error SQL real en consola para depuración
    console.error('ERROR SQL:', error.message);
    if (error.stack) {
        console.error('STACK SQL:', error.stack);
    }

    // Handle different types of errors
    if (error.name === 'ValidationError' && error.details) {
        err = handleValidationError(error);
    } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        err = handleJWTError(error);
    } else if (error.code && typeof error.code === 'string') {
        err = handleDatabaseError(error);
    } else if (!(error instanceof AppError)) {
        err = new AppError('Error interno del servidor', 500, false);
    }

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    const errorResponse = {
        success: false,
        message: err.message,
        statusCode: err.statusCode || 500,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
    };

    // Add additional details in development
    if (isDevelopment) {
        errorResponse.stack = err.stack;
        if (err.errors) {
            errorResponse.errors = err.errors;
        }
    }

    // Add validation errors in all environments
    if (err instanceof ValidationError && err.errors) {
        errorResponse.errors = err.errors;
    }

    // Send error response
    res.status(err.statusCode || 500).json(errorResponse);
};

// 404 handler middleware
const notFound = (req, res) => {
    const error = new NotFoundError(`Endpoint ${req.originalUrl} no encontrado`);

    logger.warn('404 Not Found:', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(404).json({
        success: false,
        message: error.message,
        statusCode: 404,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
    });
};

// Async wrapper to catch async errors
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    errorHandler,
    notFound,
    asyncHandler,
    AppError,
    ValidationError,
    NotFoundError,
    ConflictError,
    UnauthorizedError,
    ForbiddenError
};