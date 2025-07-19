module.exports = {
  // Configuración de rate limiting para producción
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // 100 peticiones por ventana de tiempo
    message: {
      success: false,
      message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
      retryAfter: 15
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Saltar rate limiting para health checks
      return req.path === '/health' || 
             req.path.includes('/health');
    },
    keyGenerator: (req) => {
      // Usar IP + User Agent para mejor identificación
      return req.ip + ':' + (req.get('User-Agent') || 'unknown');
    }
  },

  // Configuración de logging para producción
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: true
  },

  // Configuración de CORS para producción
  cors: {
    origin: [
      // Agregar aquí los dominios de producción
      // 'https://op.sercodam.com',
      // 'https://ordenes.sercodam.com',
      // 'https://sercodam.com'
    ],
    credentials: true
  },

  // Configuración de compresión
  compression: {
    level: 6,
    threshold: 1024
  },

  // Configuración de seguridad
  security: {
    bcryptRounds: 12,
    jwtExpiresIn: '24h',
    jwtRefreshExpiresIn: '7d'
  },

  // Configuración de base de datos
  database: {
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100
    }
  },

  // Configuración de Redis
  redis: {
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000
  }
}; 