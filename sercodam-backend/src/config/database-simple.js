const knex = require('knex');
const logger = require('./logger');

const dbConfig = {
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    },
    searchPath: [process.env.DB_SCHEMA || 'catalogo_1'],
    pool: {
        min: 0,
        max: 1, // Solo 1 conexión para pruebas
        createTimeoutMillis: 5000,
        acquireTimeoutMillis: 5000,
        idleTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100,
        propagateCreateError: false
    },
    acquireConnectionTimeout: 10000
};

const db = knex(dbConfig);

module.exports = db; 