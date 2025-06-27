require('dotenv').config();

module.exports = {
    development: {
        client: 'pg',
        connection: {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'sercodam_db',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
        },
        searchPath: [process.env.DB_SCHEMA || 'catalogo_1'],
        migrations: {
            directory: './src/migrations',
            tableName: 'knex_migrations'
        },
        seeds: {
            directory: './src/seeds'
        },
        pool: {
            min: 2,
            max: 10
        }
    },

    production: {
        client: 'pg',
        connection: {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            ssl: { rejectUnauthorized: false }
        },
        searchPath: [process.env.DB_SCHEMA || 'catalogo_1'],
        migrations: {
            directory: './src/migrations',
            tableName: 'knex_migrations'
        },
        seeds: {
            directory: './src/seeds'
        },
        pool: {
            min: 2,
            max: 10
        }
    },

    test: {
        client: 'pg',
        connection: {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME_TEST || 'sercodam_test',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
        },
        searchPath: [process.env.DB_SCHEMA || 'catalogo_1'],
        migrations: {
            directory: './src/migrations',
            tableName: 'knex_migrations'
        },
        seeds: {
            directory: './src/seeds'
        },
        pool: {
            min: 1,
            max: 5
        }
    }
};
