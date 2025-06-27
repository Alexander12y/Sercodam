console.log('=== INICIO SERVER.JS ===');

// Capturar errores antes de cargar nada
process.on('uncaughtException', (err) => {
    console.error('💥 UNCAUGHT EXCEPTION:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 UNHANDLED REJECTION:', reason);
    process.exit(1);
});

try {
    // Cargar variables de entorno primero
    require('dotenv').config();
    console.log('✅ Variables de entorno cargadas');

    // Importaciones básicas
    const express = require('express');
    const cors = require('cors');
    const helmet = require('helmet');
    const morgan = require('morgan');
    const compression = require('compression');
    const rateLimit = require('express-rate-limit');
    console.log('✅ Dependencias básicas cargadas');

    // Configuraciones
    const logger = require('./config/logger');
    const db = require('./config/database');
    const { redis } = require('./config/redis');
    console.log('✅ Configuraciones cargadas');

    // Middleware
    const { errorHandler } = require('./middleware/errorHandler');
    const notFound = require('./middleware/notFound');
    console.log('✅ Middleware cargado');

    // Variables de entorno con valores por defecto
    const PORT = process.env.PORT || 4000;
    const API_VERSION = process.env.API_VERSION || 'v1';
    const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173';
    const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW) || 15;
    const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX) || 100;

    console.log('Configuración:');
    console.log('- Puerto:', PORT);
    console.log('- API Version:', API_VERSION);
    console.log('- CORS Origin:', CORS_ORIGIN);

    // Crear app Express
    const app = express();

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
        windowMs: RATE_LIMIT_WINDOW * 60 * 1000,
        max: RATE_LIMIT_MAX,
        message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
        standardHeaders: true,
        legacyHeaders: false,
    });
    app.use('/api/', limiter);

    // CORS configuration
    app.use(cors({
        origin: CORS_ORIGIN.split(','),
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

    console.log('✅ Middleware básico configurado');

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

    console.log('✅ Health check configurado');

    // Cargar rutas una por una con manejo de errores
    try {
        console.log('Cargando rutas de auth...');
        const authRoutes = require('./routes/auth');
        app.use(`/api/${API_VERSION}/auth`, authRoutes);
        console.log('✅ Rutas de auth cargadas');
    } catch (error) {
        console.error('❌ Error cargando rutas de auth:', error.message);
        throw error;
    }

    try {
        console.log('Cargando rutas de inventario...');
        const inventarioRoutes = require('./routes/inventario');
        app.use(`/api/${API_VERSION}/inventario`, inventarioRoutes);
        console.log('✅ Rutas de inventario cargadas');
    } catch (error) {
        console.error('❌ Error cargando rutas de inventario:', error.message);
        throw error;
    }

    try {
        console.log('Cargando rutas de catálogos...');
        const catalogosRoutes = require('./routes/catalogos');
        app.use(`/api/${API_VERSION}/catalogos`, catalogosRoutes);
        console.log('✅ Rutas de catálogos cargadas');
    } catch (error) {
        console.error('❌ Error cargando rutas de catálogos:', error.message);
        throw error;
    }

    try {
        console.log('Cargando rutas de ordenes...');
        const ordenesRoutes = require('./routes/ordenes');
        app.use(`/api/${API_VERSION}/ordenes`, ordenesRoutes);
        console.log('✅ Rutas de ordenes cargadas');
    } catch (error) {
        console.error('❌ Error cargando rutas de ordenes:', error.message);
        console.log('⚠️  Continuando sin rutas de ordenes (pueden no estar implementadas)');
    }

    // Error handling middleware
    app.use(notFound);
    app.use(errorHandler);

    console.log('✅ Error handlers configurados');

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
        console.log('🚀 Servidor SERCODAM iniciado exitosamente!');
        console.log(`📡 Puerto: ${PORT}`);
        console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
        console.log(`📊 API Version: ${API_VERSION}`);
        console.log(`🔗 Health check: http://localhost:${PORT}/health`);
        
        logger.info(`🚀 Servidor SERCODAM iniciado en puerto ${PORT}`);
        logger.info(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`📊 API Version: ${API_VERSION}`);
    });

    // Handle server errors
    server.on('error', (error) => {
        console.error('❌ Error del servidor:', error.message);
        if (error.code === 'EADDRINUSE') {
            console.error(`El puerto ${PORT} ya está en uso`);
            process.exit(1);
        }
    });

    module.exports = app;

} catch (error) {
    console.error('❌ Error fatal iniciando servidor:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}