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
    
    // Cargar configuración según el entorno
    const isProduction = process.env.NODE_ENV === 'production';
    const config = isProduction 
        ? require('../config/production')
        : require('../config/development');
    
    console.log('✅ Configuraciones cargadas');

    // Middleware
    const { errorHandler } = require('./middleware/errorHandler');
    const notFound = require('./middleware/notFound');
    console.log('✅ Middleware cargado');

    // Variables de entorno con valores por defecto
    const PORT = process.env.PORT || 4000;
    const API_VERSION = process.env.API_VERSION || 'v1';
    const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173';
    const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW) || 1; // 1 minuto
    const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX) || 50000; // 50000 peticiones por minuto (muy permisivo para desarrollo)

    console.log('Configuración:');
    console.log('- Puerto:', PORT);
    console.log('- API Version:', API_VERSION);
    console.log('- CORS Origin:', CORS_ORIGIN);
    console.log('- Rate Limit:', RATE_LIMIT_MAX, 'peticiones por', RATE_LIMIT_WINDOW, 'minuto(s)');

    // Crear app Express
    const app = express();

    // Lista de orígenes permitidos para CORS
    const ALLOWED_ORIGINS = [
        'http://localhost:3000',
        'http://localhost:5173',
        // Agregar aquí el dominio de producción cuando esté disponible
        // 'https://op.sercodam.com',
        // 'https://ordenes.sercodam.com',
        // 'https://sercodam.com'
    ];

    // CORS configuration (lo más arriba posible)
    app.use(cors({
        origin: function (origin, callback) {
            if (!origin) return callback(null, true);
            if (ALLOWED_ORIGINS.includes(origin)) {
                return callback(null, true);
            } else {
                return callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
        preflightContinue: false,
        optionsSuccessStatus: 204
    }));

    // Helmet - Seguridad HTTP headers
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://apis.google.com', 'https://cdn.jsdelivr.net'],
          styleSrc: ["'self'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net'],
          connectSrc: ["'self'", 'https://sercodam.com', 'https://www.sercodam.com'],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      frameguard: { action: 'deny' },
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      xssFilter: true,
      noSniff: true,
      dnsPrefetchControl: { allow: false },
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
    }));

    // Rate limiting - Configuración según entorno
    const rateLimitConfig = config.rateLimit;

    // Rate limiting estricto para endpoints sensibles
    const sensitiveLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minuto
        max: 5, // 5 intentos por minuto por IP
        message: {
            success: false,
            message: 'Demasiados intentos. Espera un minuto antes de volver a intentarlo.'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
    const registerLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minuto
        max: 10, // 10 intentos por minuto por IP
        message: {
            success: false,
            message: 'Demasiados registros. Espera un minuto antes de volver a intentarlo.'
        },
        standardHeaders: true,
        legacyHeaders: false
    });

    // Aplicar limitadores a rutas sensibles
    app.use('/api/v1/auth/login', sensitiveLimiter);
    app.use('/api/v1/auth/login/2fa', sensitiveLimiter);
    app.use('/api/v1/auth/2fa/verify', sensitiveLimiter);
    app.use('/api/v1/auth/register', registerLimiter);

    // Rate limit global para el resto de la API
    const limiter = rateLimit(rateLimitConfig);
    app.use('/api/', limiter);

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

    // Middleware de logging personalizado para monitorear peticiones
    app.use((req, res, next) => {
        const start = Date.now();
        
        // Log de peticiones problemáticas
        if (req.path.includes('/ubicaciones') || req.path.includes('/categorias') || req.path.includes('/estados')) {
            logger.info('API Call', {
                method: req.method,
                path: req.path,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                timestamp: new Date().toISOString()
            });
        }
        
        // Interceptar respuesta para logging
        const originalSend = res.send;
        res.send = function(data) {
            const duration = Date.now() - start;
            
            // Log de respuestas lentas o errores
            if (duration > 1000 || res.statusCode >= 400) {
                logger.warn('Slow/Error Response', {
                    method: req.method,
                    path: req.path,
                    statusCode: res.statusCode,
                    duration: `${duration}ms`,
                    ip: req.ip
                });
            }
            
            originalSend.call(this, data);
        };
        
        next();
    });

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

    try {
        console.log('Cargando rutas de drafts...');
        const draftsRoutes = require('./routes/drafts');
        app.use(`/api/${API_VERSION}/drafts`, draftsRoutes);
        console.log('✅ Rutas de drafts cargadas');
    } catch (error) {
        console.error('❌ Error cargando rutas de drafts:', error.message);
        console.log('⚠️  Continuando sin rutas de drafts (pueden no estar implementadas)');
    }

    try {
        console.log('Cargando rutas de webhook...');
        const webhookRoutes = require('./routes/webhook');
        app.use(`/api/${API_VERSION}/webhook`, webhookRoutes);
        console.log('✅ Rutas de webhook cargadas');
    } catch (error) {
        console.error('❌ Error cargando rutas de webhook:', error.message);
        console.log('⚠️  Continuando sin rutas de webhook (pueden no estar implementadas)');
    }

    try {
        console.log('Cargando rutas de clientes...');
        const clientesRoutes = require('./routes/clientes');
        app.use(`/api/${API_VERSION}/clientes`, clientesRoutes);
        console.log('✅ Rutas de clientes cargadas');
    } catch (error) {
        console.error('❌ Error cargando rutas de clientes:', error.message);
        console.log('⚠️  Continuando sin rutas de clientes (pueden no estar implementadas)');
    }

    try {
        console.log('Cargando rutas de leads...');
        const leadsRoutes = require('./routes/leads');
        app.use(`/api/${API_VERSION}/leads`, leadsRoutes);
        console.log('✅ Rutas de leads cargadas');
    } catch (error) {
        console.error('❌ Error cargando rutas de leads:', error.message);
        console.log('⚠️  Continuando sin rutas de leads (pueden no estar implementadas)');
    }

    try {
        console.log('Cargando rutas de cotizaciones...');
        const cotizacionesRoutes = require('./routes/cotizaciones');
        app.use(`/api/${API_VERSION}/cotizaciones`, cotizacionesRoutes);
        console.log('✅ Rutas de cotizaciones cargadas');
    } catch (error) {
        console.error('❌ Error cargando rutas de cotizaciones:', error.message);
        console.log('⚠️  Continuando sin rutas de cotizaciones (pueden no estar implementadas)');
    }

    try {
        console.log('Cargando rutas de drafts de cotizaciones...');
        const cotizacionesDraftsRoutes = require('./routes/cotizacionesDrafts');
        app.use(`/api/${API_VERSION}/cotizaciones-drafts`, cotizacionesDraftsRoutes);
        console.log('✅ Rutas de drafts de cotizaciones cargadas');
    } catch (error) {
        console.error('❌ Error cargando rutas de drafts de cotizaciones:', error.message);
        console.log('⚠️  Continuando sin rutas de drafts de cotizaciones (pueden no estar implementadas)');
    }

    // ========== INICIALIZACIÓN DEL PROCESAMIENTO AUTOMÁTICO DE EMAILS ==========
    try {
        console.log('Configurando procesamiento automático de emails...');
        const emailConfig = require('./config/emailConfig');
        const emailScheduler = require('./services/emailScheduler');
        
        // Validar configuración
        if (emailConfig.validate()) {
            console.log('✅ Configuración de email válida');
            
            // Iniciar procesamiento automático si está habilitado
            if (emailConfig.autoProcessingEnabled) {
                emailScheduler.start(emailConfig.processingInterval);
                console.log(`✅ Procesamiento automático iniciado cada ${emailConfig.processingInterval} minutos`);
            } else {
                console.log('ℹ️ Procesamiento automático deshabilitado');
            }
            
            // Log de configuración
            const configLog = emailConfig.getConfigForLogging();
            console.log('📧 Configuración de email:', configLog);
            
        } else {
            console.log('⚠️ Configuración de email incompleta, procesamiento automático no iniciado');
        }
    } catch (error) {
        console.error('❌ Error configurando procesamiento de emails:', error.message);
        console.log('⚠️ Continuando sin procesamiento automático de emails');
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