const logger = require('../config/logger');

const notFound = (req, res) => {
    logger.warn('404 Not Found:', {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(404).json({
        success: false,
        message: `Endpoint ${req.originalUrl} no encontrado`,
        statusCode: 404,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method
    });
};

module.exports = notFound;