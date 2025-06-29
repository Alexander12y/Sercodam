module.exports = {
  // Configuración de rate limiting para desarrollo
  rateLimit: {
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 100000, // 100,000 peticiones por minuto (muy permisivo)
    message: {
      success: false,
      message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
      retryAfter: 1
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Saltar rate limiting para health checks y algunos endpoints
      return req.path === '/health' || 
             req.path.startsWith('/api/v1/auth/login') ||
             req.path.includes('/health');
    },
    keyGenerator: (req) => {
      // Usar IP + User Agent para mejor identificación
      return req.ip + ':' + (req.get('User-Agent') || 'unknown');
    }
  },

  // Configuración de logging para desarrollo
  logging: {
    level: 'debug',
    enableConsole: true,
    enableFile: true
  },

  // Configuración de CORS para desarrollo
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ],
    credentials: true
  },

  // Configuración de compresión
  compression: {
    level: 6,
    threshold: 1024
  }
}; 