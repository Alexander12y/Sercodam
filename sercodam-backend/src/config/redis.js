const { createClient } = require('redis');
const logger = require('./logger');

// Mock Redis para desarrollo cuando Redis no esté disponible
class MockRedis {
    constructor() {
        this.store = new Map();
        this.connected = false;
        logger.info('🔧 Usando Redis Mock (modo desarrollo)');
    }

    async connect() {
        this.connected = true;
        logger.info('✅ Mock Redis conectado');
        return Promise.resolve();
    }

    async disconnect() {
        this.connected = false;
        logger.info('🔌 Mock Redis desconectado');
        return Promise.resolve();
    }

    async quit() {
        return this.disconnect();
    }

    async ping() {
        if (!this.connected) throw new Error('Mock Redis no conectado');
        return 'PONG';
    }

    async get(key) {
        const item = this.store.get(key);
        if (item && item.expiresAt > Date.now()) {
            return item.value;
        }
        if (item) {
            this.store.delete(key);
        }
        return null;
    }

    async setEx(key, ttl, value) {
        this.store.set(key, {
            value,
            expiresAt: Date.now() + (ttl * 1000)
        });
        return 'OK';
    }

    async set(key, value, options = {}) {
        const ttl = options.EX || 3600; // Default 1 hour
        return this.setEx(key, ttl, value);
    }

    async del(key) {
        if (Array.isArray(key)) {
            let deleted = 0;
            key.forEach(k => {
                if (this.store.delete(k)) deleted++;
            });
            return deleted;
        }
        return this.store.delete(key) ? 1 : 0;
    }

    async keys(pattern) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return Array.from(this.store.keys()).filter(key => regex.test(key));
    }

    async exists(key) {
        const item = this.store.get(key);
        return item && item.expiresAt > Date.now() ? 1 : 0;
    }

    async ttl(key) {
        const item = this.store.get(key);
        if (!item || item.expiresAt <= Date.now()) {
            return -2; // Key doesn't exist
        }
        return Math.ceil((item.expiresAt - Date.now()) / 1000);
    }

    // Event handlers mock
    on(event, callback) {
        // Simular eventos después de un pequeño delay
        setTimeout(() => {
            if (event === 'connect') {
                callback();
            } else if (event === 'ready') {
                callback();
            }
        }, 10);
        return this;
    }

    // Para compatibilidad
    off() { return this; }
    removeListener() { return this; }
}

let redis;
let isRealRedis = false;

// Inicializar Redis con fallback automático a mock
const initializeRedis = async () => {
    const redisConfig = {
        socket: {
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            connectTimeout: 2000, // Timeout corto para desarrollo
            lazyConnect: true
        },
        password: process.env.REDIS_PASSWORD || undefined,
        database: 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1 // Reducir reintentos
    };

    try {
        logger.info('🔄 Intentando conectar a Redis...');
        const redisClient = createClient(redisConfig);

        // Configurar timeouts más cortos para desarrollo
        const connectPromise = redisClient.connect();
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout connecting to Redis')), 3000);
        });

        await Promise.race([connectPromise, timeoutPromise]);
        
        // Si llegamos aquí, Redis se conectó exitosamente
        redis = redisClient;
        isRealRedis = true;

        redis.on('error', (err) => {
            logger.error('❌ Error en Redis:', { code: err.code, message: err.message });
        });

        redis.on('end', () => {
            logger.info('🔌 Conexión Redis cerrada');
        });

        logger.info('✅ Redis real conectado exitosamente');

    } catch (error) {
        if (process.env.NODE_ENV === 'production') {
            logger.error('❌ No se pudo conectar a Redis en producción. Abortando...');
            process.exit(1); // Detiene el backend en producción si Redis falla
        } else {
            logger.warn('⚠️ No se pudo conectar a Redis, usando mock para desarrollo');
            logger.debug('Redis error details:', { message: error.message, code: error.code });
            redis = new MockRedis();
            await redis.connect();
            isRealRedis = false;
        }
    }
};

// Cache helper functions que funcionan con ambos tipos de Redis
const cache = {
    // Get value from cache
    get: async (key) => {
        try {
            const value = await redis.get(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            logger.error(`Error getting cache key ${key}:`, error);
            return null;
        }
    },

    // Set value in cache with TTL (seconds)
    set: async (key, value, ttl = 3600) => {
        try {
            await redis.setEx(key, ttl, JSON.stringify(value));
            return true;
        } catch (error) {
            logger.error(`Error setting cache key ${key}:`, error);
            return false;
        }
    },

    // Delete key from cache
    del: async (key) => {
        try {
            await redis.del(key);
            return true;
        } catch (error) {
            logger.error(`Error deleting cache key ${key}:`, error);
            return false;
        }
    },

    // Delete multiple keys matching pattern
    delPattern: async (pattern) => {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(keys);
            }
            return keys.length;
        } catch (error) {
            logger.error(`Error deleting cache pattern ${pattern}:`, error);
            return 0;
        }
    },

    // Check if key exists
    exists: async (key) => {
        try {
            return await redis.exists(key);
        } catch (error) {
            logger.error(`Error checking cache key ${key}:`, error);
            return false;
        }
    },

    // Get TTL of key
    ttl: async (key) => {
        try {
            return await redis.ttl(key);
        } catch (error) {
            logger.error(`Error getting TTL for key ${key}:`, error);
            return -1;
        }
    }
};

// Inicializar Redis inmediatamente
const redisPromise = initializeRedis();

// Exportar una promesa que se resuelve cuando Redis está listo
module.exports = {
    redis: new Proxy({}, {
        get(target, prop) {
            if (redis && typeof redis[prop] === 'function') {
                return redis[prop].bind(redis);
            }
            if (redis) {
                return redis[prop];
            }
            // Si Redis no está inicializado, retornar mock temporal
            const mock = new MockRedis();
            return typeof mock[prop] === 'function' ? mock[prop].bind(mock) : mock[prop];
        }
    }),
    cache,
    isRealRedis: () => isRealRedis,
    waitForConnection: () => redisPromise
};