const { Pool } = require('pg');
require('dotenv').config();

async function createFacturacionTables() {
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

        console.log('🚀 Creando tablas de facturación...\n');

        // Insert states first
        console.log('📋 Insertando estados de facturación...');
        await pool.query(`
            INSERT INTO estado_catalogo (estado) VALUES 
                ('borrador'),
                ('emitida'),
                ('pagada'),
                ('cancelada'),
                ('vencida'),
                ('parcialmente_pagada')
            ON CONFLICT (estado) DO NOTHING;
        `);
        console.log('✅ Estados insertados');

        // Create factura table
        console.log('\n📊 Creando tabla factura...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS factura (
                id_factura SERIAL PRIMARY KEY,
                numero_factura VARCHAR(50) UNIQUE NOT NULL,
                id_cliente INTEGER NOT NULL,
                id_cotizacion INTEGER NULL,
                fecha_emision TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                fecha_vencimiento TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
                iva NUMERIC(15,2) NOT NULL DEFAULT 0,
                total NUMERIC(15,2) NOT NULL DEFAULT 0,
                estado VARCHAR(50) NOT NULL DEFAULT 'borrador',
                metodo_pago VARCHAR(100) NULL,
                condiciones_pago TEXT NULL,
                notas TEXT NULL,
                fecha_creacion TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                fecha_actualizacion TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                nombre_cliente VARCHAR(255) NOT NULL,
                empresa_cliente VARCHAR(255) NULL,
                email_cliente VARCHAR(255) NULL,
                telefono_cliente VARCHAR(50) NULL,
                rfc_cliente VARCHAR(20) NULL,
                direccion_fiscal TEXT NULL,
                CONSTRAINT fk_factura_cliente FOREIGN KEY (id_cliente) REFERENCES cliente(id_cliente),
                CONSTRAINT fk_factura_cotizacion FOREIGN KEY (id_cotizacion) REFERENCES cotizacion(id_cotizacion),
                CONSTRAINT fk_factura_estado FOREIGN KEY (estado) REFERENCES estado_catalogo(estado)
            );
        `);
        console.log('✅ Tabla factura creada');

        // Create factura_detalle table
        console.log('\n📋 Creando tabla factura_detalle...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS factura_detalle (
                id_detalle SERIAL PRIMARY KEY,
                id_factura INTEGER NOT NULL,
                descripcion TEXT NOT NULL,
                cantidad NUMERIC(10,2) NOT NULL,
                precio_unitario NUMERIC(15,2) NOT NULL,
                subtotal NUMERIC(15,2) NOT NULL,
                iva_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 16.00,
                iva_monto NUMERIC(15,2) NOT NULL DEFAULT 0,
                total_linea NUMERIC(15,2) NOT NULL,
                orden_index INTEGER NOT NULL DEFAULT 0,
                notas TEXT NULL,
                catalogo VARCHAR(100) NULL,
                tipo_item VARCHAR(50) NULL,
                CONSTRAINT fk_factura_detalle_factura FOREIGN KEY (id_factura) REFERENCES factura(id_factura) ON DELETE CASCADE
            );
        `);
        console.log('✅ Tabla factura_detalle creada');

        // Create pago table
        console.log('\n💰 Creando tabla pago...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS pago (
                id_pago SERIAL PRIMARY KEY,
                id_factura INTEGER NOT NULL,
                monto NUMERIC(15,2) NOT NULL,
                fecha_pago TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                metodo_pago VARCHAR(100) NOT NULL,
                referencia_pago VARCHAR(255) NULL,
                notas TEXT NULL,
                fecha_registro TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
                CONSTRAINT fk_pago_factura FOREIGN KEY (id_factura) REFERENCES factura(id_factura) ON DELETE CASCADE
            );
        `);
        console.log('✅ Tabla pago creada');

        // Create facturas_draft table
        console.log('\n📝 Creando tabla facturas_draft...');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS facturas_draft (
                id_draft SERIAL PRIMARY KEY,
                id_usuario INTEGER NOT NULL,
                id_factura INTEGER NULL,
                datos_formulario JSONB NOT NULL,
                detalle_productos JSONB NOT NULL DEFAULT '[]'::jsonb,
                fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                fecha_expiracion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + '15 days'::interval),
                activo BOOLEAN NOT NULL DEFAULT true,
                seccion_actual INTEGER NOT NULL DEFAULT 1,
                CONSTRAINT fk_facturas_draft_usuario FOREIGN KEY (id_usuario) REFERENCES usuario(id),
                CONSTRAINT fk_facturas_draft_factura FOREIGN KEY (id_factura) REFERENCES factura(id_factura)
            );
        `);
        console.log('✅ Tabla facturas_draft creada');

        // Create indexes
        console.log('\n🔍 Creando índices...');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_factura_cliente ON factura(id_cliente);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_factura_estado ON factura(estado);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_factura_fecha_emision ON factura(fecha_emision);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_factura_numero ON factura(numero_factura);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_factura_cotizacion ON factura(id_cotizacion);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_factura_detalle_factura ON factura_detalle(id_factura);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_pago_factura ON pago(id_factura);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_pago_fecha ON pago(fecha_pago);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_facturas_draft_usuario ON facturas_draft(id_usuario);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_facturas_draft_activo ON facturas_draft(activo);');
        console.log('✅ Índices creados');

        // Create sequence
        console.log('\n🔢 Creando secuencia...');
        await pool.query(`
            CREATE SEQUENCE IF NOT EXISTS factura_numero_seq
                INCREMENT 1
                START 1
                MINVALUE 1
                MAXVALUE 999999
                CACHE 1;
        `);
        console.log('✅ Secuencia creada');

        // Create functions and triggers
        console.log('\n⚙️ Creando funciones y triggers...');
        
        // Function to generate invoice number
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

        // Function to update invoice totals
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

        // Function to update invoice status
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

        // Create triggers
        await pool.query(`
            DROP TRIGGER IF EXISTS trigger_generar_numero_factura ON factura;
            CREATE TRIGGER trigger_generar_numero_factura
                BEFORE INSERT ON factura
                FOR EACH ROW
                EXECUTE FUNCTION generar_numero_factura();
        `);

        await pool.query(`
            DROP TRIGGER IF EXISTS trigger_actualizar_totales_factura ON factura_detalle;
            CREATE TRIGGER trigger_actualizar_totales_factura
                AFTER INSERT OR UPDATE OR DELETE ON factura_detalle
                FOR EACH ROW
                EXECUTE FUNCTION actualizar_totales_factura();
        `);

        await pool.query(`
            DROP TRIGGER IF EXISTS trigger_actualizar_estado_factura ON pago;
            CREATE TRIGGER trigger_actualizar_estado_factura
                AFTER INSERT OR UPDATE ON pago
                FOR EACH ROW
                EXECUTE FUNCTION actualizar_estado_factura();
        `);

        console.log('✅ Funciones y triggers creados');

        console.log('\n🎉 ¡Módulo de facturación creado exitosamente!');
        console.log('\n📊 Tablas creadas:');
        console.log('   - factura');
        console.log('   - factura_detalle');
        console.log('   - pago');
        console.log('   - facturas_draft');
        console.log('\n🔧 Funciones y triggers:');
        console.log('   - generar_numero_factura()');
        console.log('   - actualizar_totales_factura()');
        console.log('   - actualizar_estado_factura()');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (pool) {
            await pool.end();
        }
    }
}

// Run the script
createFacturacionTables();
