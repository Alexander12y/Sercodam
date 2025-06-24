require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const logger = require('./config/logger');
const db = require('./config/database');
const redis = require('./config/redis');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Routes
const authRoutes = require('./routes/auth');
const inventarioRoutes = require('./routes/inventario');
const ordenesRoutes = require('./routes/ordenes');
const catalogosRoutes = require('./routes/catalogos');
const webhookRoutes = require('./routes/webhooks');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX),
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN.split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined', {
        stream: { write: (message) => logger.info(message.trim()) }
    }));
}

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        // Check database connection
        await db.raw('SELECT 1');

        // Check Redis connection
        await redis.ping();

        res.status(200).json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            services: {
                database: 'connected',
                redis: 'connected'
            }
        });
    } catch (error) {
        logger.error('Health check failed:', error);
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: 'Service unavailable'
        });
    }
});

// API Routes
app.use(`/api/${process.env.API_VERSION}/auth`, authRoutes);
app.use(`/api/${process.env.API_VERSION}/inventario`, inventarioRoutes);
app.use(`/api/${process.env.API_VERSION}/ordenes`, ordenesRoutes);
app.use(`/api/${process.env.API_VERSION}/catalogos`, catalogosRoutes);
app.use(`/api/${process.env.API_VERSION}/webhooks`, webhookRoutes);
app.use(`/api/${process.env.API_VERSION}/dashboard`, dashboardRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');

    try {
        await db.destroy();
        await redis.quit();
        logger.info('Database and Redis connections closed');
        process.exit(0);
    } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
    }
});

// Start server
const server = app.listen(PORT, () => {
    logger.info(`🚀 Servidor SERCODAM iniciado en puerto ${PORT}`);
    logger.info(`🌍 Entorno: ${process.env.NODE_ENV}`);
    logger.info(`📊 API Version: ${process.env.API_VERSION}`);
});

module.exports = app;