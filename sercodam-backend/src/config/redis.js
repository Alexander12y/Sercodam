const { createClient } = require('redis');
const logger = require('./logger');

const redisConfig = {
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        connectTimeout: 10000,
        lazyConnect: true
    },
    password: process.env.REDIS_PASSWORD || undefined,
    database: 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3
};

const redis = createClient(redisConfig);

// Event handlers
redis.on('connect', () => {
    logger.info('✅ Conectando a Redis...');
});

redis.on('ready', () => {
    logger.info('✅ Redis listo para usar');
});

redis.on('error', (err) => {
    logger.error('❌ Error en Redis:', err);
});

redis.on('end', () => {
    logger.info('🔌 Conexión Redis cerrada');
});

// Connect to Redis
redis.connect().catch((err) => {
    logger.error('❌ Error inicial conectando a Redis:', err);
});

// Cache helper functions
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

module.exports = { redis, cache };