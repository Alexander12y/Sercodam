const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function executeFacturacionTables() {
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

        console.log('🚀 Ejecutando script de tablas de facturación...\n');

        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'create_facturacion_tables.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

        // Split into major sections
        const sections = sqlContent.split(/(?=-- )/);

        for (const section of sections) {
            if (section.trim()) {
                try {
                    console.log(`⏳ Ejecutando sección: ${section.split('\n')[0].replace('--', '').trim()}`);
                    await pool.query(section);
                    console.log(`✅ Sección ejecutada correctamente`);
                } catch (error) {
                    console.error(`❌ Error en sección:`, error.message);
                }
            }
        }

        // Execute individual statements for complex functions
        console.log('\n🔧 Ejecutando funciones y triggers...');

        // Create sequence
        try {
            await pool.query(`
                CREATE SEQUENCE IF NOT EXISTS factura_numero_seq
                    INCREMENT 1
                    START 1
                    MINVALUE 1
                    MAXVALUE 999999
                    CACHE 1;
            `);
            console.log('✅ Secuencia factura_numero_seq creada');
        } catch (error) {
            console.log('ℹ️ Secuencia ya existe o error:', error.message);
        }

        // Create function to generate invoice number
        try {
            await pool.query(`
                CREATE OR REPLACE FUNCTION generar_numero_factura()
                RETURNS TRIGGER AS $$
                BEGIN
                    IF NEW.numero_factura IS NULL OR NEW.numero_factura = '' THEN
                        NEW.numero_factura := 'FAC-' || EXTRACT(YEAR FROM CURRENT_DATE) || '-' || 
                                             LPAD(nextval('factura_numero_seq')::text, 4, '0');
                    END IF;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            `);
            console.log('✅ Función generar_numero_factura creada');
        } catch (error) {
            console.log('ℹ️ Función ya existe o error:', error.message);
        }

        // Create trigger for invoice number
        try {
            await pool.query(`
                DROP TRIGGER IF EXISTS trigger_generar_numero_factura ON factura;
                CREATE TRIGGER trigger_generar_numero_factura
                    BEFORE INSERT ON factura
                    FOR EACH ROW
                    EXECUTE FUNCTION generar_numero_factura();
            `);
            console.log('✅ Trigger trigger_generar_numero_factura creado');
        } catch (error) {
            console.log('ℹ️ Trigger ya existe o error:', error.message);
        }

        // Create function to update invoice totals
        try {
            await pool.query(`
                CREATE OR REPLACE FUNCTION actualizar_totales_factura()
                RETURNS TRIGGER AS $$
                BEGIN
                    UPDATE factura 
                    SET 
                        subtotal = (
                            SELECT COALESCE(SUM(subtotal), 0) 
                            FROM factura_detalle 
                            WHERE id_factura = NEW.id_factura
                        ),
                        iva = (
                            SELECT COALESCE(SUM(iva_monto), 0) 
                            FROM factura_detalle 
                            WHERE id_factura = NEW.id_factura
                        ),
                        total = (
                            SELECT COALESCE(SUM(total_linea), 0) 
                            FROM factura_detalle 
                            WHERE id_factura = NEW.id_factura
                        ),
                        fecha_actualizacion = NOW()
                    WHERE id_factura = NEW.id_factura;
                    
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            `);
            console.log('✅ Función actualizar_totales_factura creada');
        } catch (error) {
            console.log('ℹ️ Función ya existe o error:', error.message);
        }

        // Create trigger for updating totals
        try {
            await pool.query(`
                DROP TRIGGER IF EXISTS trigger_actualizar_totales_factura ON factura_detalle;
                CREATE TRIGGER trigger_actualizar_totales_factura
                    AFTER INSERT OR UPDATE OR DELETE ON factura_detalle
                    FOR EACH ROW
                    EXECUTE FUNCTION actualizar_totales_factura();
            `);
            console.log('✅ Trigger trigger_actualizar_totales_factura creado');
        } catch (error) {
            console.log('ℹ️ Trigger ya existe o error:', error.message);
        }

        // Create function to update invoice status based on payments
        try {
            await pool.query(`
                CREATE OR REPLACE FUNCTION actualizar_estado_factura()
                RETURNS TRIGGER AS $$
                DECLARE
                    total_factura NUMERIC;
                    total_pagado NUMERIC;
                BEGIN
                    SELECT total INTO total_factura
                    FROM factura
                    WHERE id_factura = NEW.id_factura;
                    
                    SELECT COALESCE(SUM(monto), 0) INTO total_pagado
                    FROM pago
                    WHERE id_factura = NEW.id_factura;
                    
                    IF total_pagado >= total_factura THEN
                        UPDATE factura SET estado = 'pagada' WHERE id_factura = NEW.id_factura;
                    ELSIF total_pagado > 0 THEN
                        UPDATE factura SET estado = 'parcialmente_pagada' WHERE id_factura = NEW.id_factura;
                    END IF;
                    
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            `);
            console.log('✅ Función actualizar_estado_factura creada');
        } catch (error) {
            console.log('ℹ️ Función ya existe o error:', error.message);
        }

        // Create trigger for updating status
        try {
            await pool.query(`
                DROP TRIGGER IF EXISTS trigger_actualizar_estado_factura ON pago;
                CREATE TRIGGER trigger_actualizar_estado_factura
                    AFTER INSERT OR UPDATE ON pago
                    FOR EACH ROW
                    EXECUTE FUNCTION actualizar_estado_factura();
            `);
            console.log('✅ Trigger trigger_actualizar_estado_factura creado');
        } catch (error) {
            console.log('ℹ️ Trigger ya existe o error:', error.message);
        }

        console.log('\n🎉 Script de facturación ejecutado correctamente!');
        console.log('\n📊 Tablas creadas:');
        console.log('   - factura');
        console.log('   - factura_detalle');
        console.log('   - pago');
        console.log('   - facturas_draft');
        console.log('\n🔧 Funciones y triggers creados:');
        console.log('   - generar_numero_factura()');
        console.log('   - actualizar_totales_factura()');
        console.log('   - actualizar_estado_factura()');

    } catch (error) {
        console.error('❌ Error al ejecutar el script:', error.message);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

// Run the script
executeFacturacionTables();
