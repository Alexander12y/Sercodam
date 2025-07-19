const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Create a simple logger configuration
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'sercodam-api' },
    transports: [
        // Error log file
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error'
        }),
        // Combined log file
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log')
        })
    ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
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