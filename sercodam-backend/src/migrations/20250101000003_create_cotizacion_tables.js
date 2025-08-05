/**
 * Migración para crear las tablas del sistema de cotizaciones
 * Consistente con el diseño de orden_produccion y orden_produccion_detalle
 */

exports.up = function(knex) {
  return knex.schema
    // Tabla principal de cotizaciones (similar a orden_produccion)
    .createTable('cotizacion', (table) => {
      table.increments('id_cotizacion').primary();
      table.string('numero_cotizacion', 50).unique();
      table.integer('id_cliente').references('id_cliente').inTable('cliente');
      
      // Información básica
      table.string('titulo_proyecto', 255);
      table.string('tipo_proyecto', 100); // 'red_deportiva', 'sistema_proteccion', 'red_industrial', etc.
      table.boolean('incluye_instalacion').defaultTo(false);
      
      // Datos del cliente (copia para histórico)
      table.string('nombre_cliente', 255);
      table.string('empresa_cliente', 255);
      table.string('email_cliente', 255);
      table.string('telefono_cliente', 50);
      
      // Totales
      table.decimal('subtotal', 15, 2).defaultTo(0);
      table.decimal('iva', 15, 2).defaultTo(0);
      table.decimal('total', 15, 2).defaultTo(0);
      
      // Condiciones
      table.text('condiciones_pago');
      table.text('condiciones_envio');
      table.string('tiempo_entrega', 100);
      table.string('tiempo_instalacion', 100);
      table.integer('dias_validez').defaultTo(15);
      table.timestamp('valido_hasta');
      
      // Secciones opcionales
      table.boolean('incluye_garantia').defaultTo(false);
      table.boolean('incluye_instalacion_seccion').defaultTo(false);
      table.text('observaciones');
      table.text('no_incluye');
      table.text('notas');
      table.text('conceptos_extra');
      
      // Cláusula personalizada
      table.string('titulo_clausula_personalizada', 255);
      table.text('descripcion_clausula_personalizada');
      
      // Estado (similar a orden_produccion)
      table.string('estado', 20).defaultTo('por aprobar');
      
      // Check constraint para estados válidos
      table.check("estado IN ('por aprobar', 'aprobada', 'no aprobada', 'enviada', 'convertida', 'rechazada')", 
                  'cotizacion_estado_check');
      
      // Fechas (solo fecha_creacion como solicitaste)
      table.timestamp('fecha_creacion').defaultTo(knex.fn.now());
      
      // Usuario
      table.integer('id_usuario_creador').references('id').inTable('usuario');
      

      
      // Índices
      table.index(['id_cliente']);
      table.index(['estado']);
      table.index(['fecha_creacion']);
      table.index(['numero_cotizacion']);
      
      table.comment('Tabla principal para almacenar cotizaciones de Sercodam');
    })
    
    // Tabla de detalle de cotización (similar a orden_produccion_detalle)
    .createTable('cotizacion_detalle', (table) => {
      table.increments('id_detalle').primary();
      table.integer('id_cotizacion').references('id_cotizacion').inTable('cotizacion').onDelete('CASCADE');
      table.integer('id_item').references('id_item').inTable('inventario_item');
      
      // Cantidades y precios
      table.decimal('cantidad', 10, 2).notNullable();
      table.decimal('precio_unitario', 15, 2).notNullable();
      table.decimal('subtotal', 15, 2).notNullable();
      
      // Especificaciones (similar a notas en orden_produccion_detalle)
      table.text('notas'); // Aquí van las especificaciones como en orden_produccion_detalle
      table.text('caracteristicas'); // Descripción adicional del producto
      
      // Identificación de partida
      table.string('partida', 10); // 'A', 'B', 'C', etc.
      table.integer('orden_index'); // Para mantener el orden
      
      // Campos de catálogo (consistente con orden_produccion_detalle)
      table.text('catalogo').notNullable(); // CATALOGO_1, CATALOGO_2, CATALOGO_3
      table.string('tipo_item', 20).notNullable(); // PANO, EXTRA, HERRAMIENTA
      table.string('estado', 20).notNullable(); // estado del catálogo
      
      // Metadatos para flexibilidad
      table.json('metadata');
      
      // Índices (consistente con orden_produccion_detalle)
      table.index(['id_cotizacion']);
      table.index(['catalogo']);
      table.index(['tipo_item']);
      table.index(['orden_index']);
      
      // Constraints (similares a orden_produccion_detalle)
      table.check('catalogo = ANY (ARRAY[\'CATALOGO_1\'::text, \'CATALOGO_2\'::text, \'CATALOGO_3\'::text])', 
                 'cotizacion_detalle_catalogo_check');
      
      table.comment('Detalle de items de cada cotización - similar a orden_produccion_detalle');
    })
    
    // Agregar estados de cotización a estado_catalogo primero
    .then(() => {
      return knex('estado_catalogo').insert([
        { estado: 'por aprobar' },
        { estado: 'aprobada' },
        { estado: 'no aprobada' },
        { estado: 'enviada' },
        { estado: 'convertida' },
        { estado: 'rechazada' }
      ]).onConflict('estado').ignore(); // Ignore si ya existen
    })
    
    // Agregar foreign keys después de crear las tablas
    .then(() => {
      return knex.schema.alterTable('cotizacion', (table) => {
        // Foreign key con estado_catalogo (como en orden_produccion)
        table.foreign('estado').references('estado').inTable('estado_catalogo');
      });
    })
    
    .then(() => {
      return knex.schema.alterTable('cotizacion_detalle', (table) => {
        // Foreign key con estado_catalogo (como en orden_produccion_detalle)
        table.foreign('estado').references('estado').inTable('estado_catalogo');
        
        // Foreign key compuesta con cotizacion (similar a orden_produccion_detalle)
        table.foreign(['id_cotizacion', 'estado']).references(['id_cotizacion', 'estado']).inTable('cotizacion')
             .onUpdate('CASCADE').onDelete('CASCADE');
      });
    })
    
    // Crear trigger para autogenerar catálogo (similar a orden_produccion_detalle)
    .then(() => {
      return knex.raw(`
        CREATE OR REPLACE FUNCTION fn_autogenerar_catalogo_cotizacion()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Solo autogenerar si no se especifica catálogo
          IF NEW.catalogo IS NULL OR NEW.catalogo = '' THEN
            -- Determinar catálogo basado en tipo_item (lógica similar a orden_produccion_detalle)
            CASE NEW.tipo_item
              WHEN 'PANO' THEN
                NEW.catalogo := 'CATALOGO_1';
              WHEN 'EXTRA' THEN
                NEW.catalogo := 'CATALOGO_2';
              WHEN 'HERRAMIENTA' THEN
                NEW.catalogo := 'CATALOGO_3';
              ELSE
                NEW.catalogo := 'CATALOGO_1';
            END CASE;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        CREATE TRIGGER trg_autogenerar_catalogo_cotizacion
          BEFORE INSERT OR UPDATE ON cotizacion_detalle
          FOR EACH ROW EXECUTE FUNCTION fn_autogenerar_catalogo_cotizacion();
      `);
    });
};

exports.down = function(knex) {
  return knex.schema
    .raw('DROP TRIGGER IF EXISTS trg_autogenerar_catalogo_cotizacion ON cotizacion_detalle')
    .raw('DROP FUNCTION IF EXISTS fn_autogenerar_catalogo_cotizacion()')
    .dropTableIfExists('cotizacion_detalle')
    .dropTableIfExists('cotizacion');
}; 