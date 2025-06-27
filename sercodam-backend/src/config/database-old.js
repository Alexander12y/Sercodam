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
        min: 2,
        max: 10,
        createTimeoutMillis: 3000,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100,
        propagateCreateError: false
    },
    acquireConnectionTimeout: 60000,
    migrations: {
        directory: './migrations',
        tableName: 'knex_migrations'
    },
    seeds: {
        directory: './seeds'
    }
};

const db = knex(dbConfig);

// Test connection
db.raw('SELECT version()')
    .then((result) => {
        logger.info(`✅ Conectado a PostgreSQL: ${result.rows[0].version}`);
    })
    .catch((err) => {
        logger.error('❌ Error conectando a la base de datos:', err);
        process.exit(1);
    });

// Add query logging in development
if (process.env.NODE_ENV === 'development') {
    db.on('query', (query) => {
        logger.debug('SQL Query:', query.sql);
    });
}

module.exports = db;
