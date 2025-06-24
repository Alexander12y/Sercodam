const winston = require('winston');
const path = require('path');

// Ensure logs directory exists
const fs = require('fs');
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Custom format for files
const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: fileFormat,
    defaultMeta: { service: 'sercodam-api' },
    transports: [
        // Error log file
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true
        }),

        // Combined log file
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            tailable: true
        }),

        // Separate file for API requests
        new winston.transports.File({
            filename: path.join(logsDir, 'api.log'),
            level: 'info',
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 3,
            tailable: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ],

    // Handle uncaught exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log')
        })
    ],

    // Handle unhandled promise rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log')
        })
    ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
        level: 'debug'
    }));
}

// Add request logging helper
logger.logRequest = (req, res, responseTime) => {
    const logData = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        responseTime: `${responseTime}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        timestamp: new Date().toISOString()
    };

    if (req.user) {
        logData.userId = req.user.id;
        logData.username = req.user.username;
    }

    logger.info('API Request', logData);
};

// Add error logging helper
logger.logError = (error, req = null, context = {}) => {
    const errorData = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        ...context
    };

    if (req) {
        errorData.method = req.method;
        errorData.url = req.url;
        errorData.ip = req.ip || req.connection.remoteAddress;
        errorData.userAgent = req.get('User-Agent');

        if (req.user) {
            errorData.userId = req.user.id;
            errorData.username = req.user.username;
        }
    }

    logger.error('Application Error', errorData);
};

module.exports = logger;