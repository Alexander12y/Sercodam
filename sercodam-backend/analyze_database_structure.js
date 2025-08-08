const { Pool } = require('pg');
require('dotenv').config();

async function analyzeDatabaseStructure() {
    let pool;
    
    try {
        // Create connection pool
        pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'sercodam_db',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
            schema: process.env.DB_SCHEMA || 'catalogo_1'
        });

        console.log('🔍 Analizando estructura de la base de datos...\n');

        // Get all tables in the schema
        const tablesQuery = `
            SELECT 
                tablename as table_name,
                obj_description((schemaname||'.'||tablename)::regclass) as table_comment
            FROM pg_tables 
            WHERE schemaname = $1
            ORDER BY tablename
        `;
        
        const tablesResult = await pool.query(tablesQuery, [process.env.DB_SCHEMA || 'catalogo_1']);
        const tables = tablesResult.rows;

        console.log('📋 TABLAS EXISTENTES:');
        console.log('='.repeat(50));
        
        for (const table of tables) {
            console.log(`\n📊 ${table.table_name}`);
            if (table.table_comment) {
                console.log(`   Descripción: ${table.table_comment}`);
            }

            // Get table structure
            const columnsQuery = `
                SELECT 
                    column_name,
                    data_type,
                    is_nullable,
                    column_default,
                    col_description((table_schema||'.'||table_name)::regclass, ordinal_position) as column_comment
                FROM information_schema.columns 
                WHERE table_schema = $1 
                AND table_name = $2
                ORDER BY ordinal_position
            `;
            
            const columnsResult = await pool.query(columnsQuery, [
                process.env.DB_SCHEMA || 'catalogo_1', 
                table.table_name
            ]);
            const columns = columnsResult.rows;

            console.log('   Columnas:');
            columns.forEach(col => {
                const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
                const default_val = col.column_default ? ` DEFAULT ${col.column_default}` : '';
                const comment = col.column_comment ? ` -- ${col.column_comment}` : '';
                
                console.log(`     - ${col.column_name}: ${col.data_type} ${nullable}${default_val}${comment}`);
            });

            // Get primary keys
            const pkQuery = `
                SELECT 
                    kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu 
                    ON tc.constraint_name = kcu.constraint_name
                WHERE tc.constraint_type = 'PRIMARY KEY' 
                AND tc.table_schema = $1 
                AND tc.table_name = $2
            `;
            
            const pkResult = await pool.query(pkQuery, [
                process.env.DB_SCHEMA || 'catalogo_1', 
                table.table_name
            ]);
            
            if (pkResult.rows.length > 0) {
                console.log('   Claves primarias:');
                pkResult.rows.forEach(pk => {
                    console.log(`     - ${pk.column_name}`);
                });
            }

            // Get foreign keys
            const fkQuery = `
                SELECT 
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY' 
                AND tc.table_schema = $1 
                AND tc.table_name = $2
            `;
            
            const fkResult = await pool.query(fkQuery, [
                process.env.DB_SCHEMA || 'catalogo_1', 
                table.table_name
            ]);
            
            if (fkResult.rows.length > 0) {
                console.log('   Claves foráneas:');
                fkResult.rows.forEach(fk => {
                    console.log(`     - ${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
                });
            }
        }

        // Analyze cotizaciones related tables specifically
        console.log('\n\n🎯 ANÁLISIS ESPECÍFICO - MÓDULO COTIZACIONES:');
        console.log('='.repeat(50));

        const cotizacionTables = tables.filter(t => 
            t.table_name.toLowerCase().includes('cotizacion') ||
            t.table_name.toLowerCase().includes('cotiz')
        );

        if (cotizacionTables.length > 0) {
            console.log('\n📋 Tablas relacionadas con cotizaciones:');
            cotizacionTables.forEach(table => {
                console.log(`   - ${table.table_name}`);
            });
        } else {
            console.log('\n❌ No se encontraron tablas específicas de cotizaciones');
        }

        // Check for client/customer tables
        console.log('\n\n👥 ANÁLISIS DE CLIENTES:');
        console.log('='.repeat(50));

        const clientTables = tables.filter(t => 
            t.table_name.toLowerCase().includes('client') ||
            t.table_name.toLowerCase().includes('customer') ||
            t.table_name.toLowerCase().includes('cliente')
        );

        if (clientTables.length > 0) {
            console.log('\n📋 Tablas relacionadas con clientes:');
            clientTables.forEach(table => {
                console.log(`   - ${table.table_name}`);
            });
        } else {
            console.log('\n❌ No se encontraron tablas específicas de clientes');
        }

        // Check for product tables
        console.log('\n\n📦 ANÁLISIS DE PRODUCTOS:');
        console.log('='.repeat(50));

        const productTables = tables.filter(t => 
            t.table_name.toLowerCase().includes('product') ||
            t.table_name.toLowerCase().includes('producto') ||
            t.table_name.toLowerCase().includes('item')
        );

        if (productTables.length > 0) {
            console.log('\n📋 Tablas relacionadas con productos:');
            productTables.forEach(table => {
                console.log(`   - ${table.table_name}`);
            });
        } else {
            console.log('\n❌ No se encontraron tablas específicas de productos');
        }

        console.log('\n\n✅ Análisis completado');

    } catch (error) {
        console.error('❌ Error al analizar la base de datos:', error.message);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

// Run the analysis
analyzeDatabaseStructure();
