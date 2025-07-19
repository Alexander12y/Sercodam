const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la base de datos desde variables de entorno
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sercodam_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  schema: process.env.DB_SCHEMA || 'catalogo_1'
});

async function analyzeDatabaseStructure() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Analizando estructura de la base de datos...\n');
    
    // 1. Obtener todas las tablas
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'catalogo_1' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const tables = await client.query(tablesQuery);
    
    console.log('📋 Tablas encontradas:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // 2. Obtener todas las foreign keys
    const fkQuery = `
      SELECT 
        tc.table_name as table_name,
        kcu.column_name as column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_schema = 'catalogo_1'
      ORDER BY tc.table_name, kcu.column_name;
    `;
    const foreignKeys = await client.query(fkQuery);
    
    console.log('\n🔗 Foreign Keys encontradas:');
    foreignKeys.rows.forEach(fk => {
      console.log(`  - ${fk.table_name}.${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (${fk.constraint_name})`);
    });
    
    // 3. Crear mapa de dependencias
    const dependencies = {};
    foreignKeys.rows.forEach(fk => {
      if (!dependencies[fk.table_name]) {
        dependencies[fk.table_name] = [];
      }
      dependencies[fk.table_name].push(fk.foreign_table_name);
    });
    
    console.log('\n📊 Dependencias por tabla:');
    Object.keys(dependencies).forEach(table => {
      console.log(`  - ${table} depende de: ${dependencies[table].join(', ')}`);
    });
    
    // 4. Determinar orden de limpieza (topological sort)
    const tablesToClean = [
      'orden_produccion_detalle',
      'herramienta_ordenada', 
      'real_corte_pieza',
      'plan_corte_pieza',
      'trabajo_corte',
      'panos_sobrantes',
      'pano',
      'movimiento_inventario',
      'materiales_extras',
      'cliente_log',
      'cliente',
      'reporte_variacion',
      'red_producto',
      'ordenes_draft'
    ];
    
    console.log('\n🧹 Orden de limpieza recomendado:');
    tablesToClean.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table}`);
    });
    
    return { tables: tables.rows, foreignKeys: foreignKeys.rows, dependencies, cleanupOrder: tablesToClean };
    
  } catch (error) {
    console.error('❌ Error analizando la base de datos:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function performCleanup(cleanupOrder) {
  const client = await pool.connect();
  
  try {
    console.log('\n🧹 Iniciando limpieza de datos...\n');
    
    // 1. Primero borrar los registros específicos de paños en inventario_item
    console.log('1. Borrando registros específicos de paños en inventario_item...');
    const deletePanosQuery = `
      DELETE FROM catalogo_1.inventario_item 
      WHERE id_item IN (560, 561, 562, 563, 564, 565, 566, 567, 568, 569, 570, 571, 572, 574)
      AND tipo_item = 'PANO';
    `;
    const panosResult = await client.query(deletePanosQuery);
    console.log(`   ✅ Borrados ${panosResult.rowCount} registros de paños`);
    
    // 2. Borrar en el orden correcto para evitar foreign key violations
    for (let i = 0; i < cleanupOrder.length; i++) {
      const table = cleanupOrder[i];
      console.log(`${i + 2}. Borrando datos de ${table}...`);
      
      try {
        const deleteQuery = `DELETE FROM catalogo_1.${table};`;
        const result = await client.query(deleteQuery);
        console.log(`   ✅ Borrados ${result.rowCount} registros de ${table}`);
      } catch (error) {
        console.log(`   ⚠️  Error borrando ${table}: ${error.message}`);
      }
    }
    
    // 3. Verificar el estado final
    console.log('\n📊 Estado final de inventario_item:');
    const finalStateQuery = `
      SELECT tipo_item, COUNT(*) as total
      FROM catalogo_1.inventario_item 
      GROUP BY tipo_item
      ORDER BY tipo_item;
    `;
    const finalState = await client.query(finalStateQuery);
    finalState.rows.forEach(row => {
      console.log(`   - ${row.tipo_item}: ${row.total} registros`);
    });
    
    console.log('\n✅ Limpieza completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function fixSequences() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔧 Arreglando secuencias...\n');
    
    // Función para resetear secuencia
    const resetSequenceQuery = `
      CREATE OR REPLACE FUNCTION reset_sequence(seq_name text, table_name text, id_column text)
      RETURNS void AS $$
      DECLARE
          max_id bigint;
          next_val bigint;
      BEGIN
          EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', id_column, table_name) INTO max_id;
          
          IF max_id = 0 THEN
              next_val := 1;
          ELSE
              next_val := max_id + 1;
          END IF;
          
          EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seq_name, next_val);
          
          RAISE NOTICE 'Secuencia % reseteada a % (max_id: %)', seq_name, next_val, max_id;
      END;
      $$ LANGUAGE plpgsql;
    `;
    await client.query(resetSequenceQuery);
    
    // Lista de secuencias a resetear
    const sequences = [
      { seq: 'catalogo_1.orden_produccion_id_op_seq', table: 'catalogo_1.orden_produccion', column: 'id_op' },
      { seq: 'catalogo_1.orden_produccion_detalle_id_detalle_seq', table: 'catalogo_1.orden_produccion_detalle', column: 'id_detalle' },
      { seq: 'catalogo_1.pano_id_pano_seq', table: 'catalogo_1.pano', column: 'id_pano' },
      { seq: 'catalogo_1.panos_sobrantes_id_remnant_seq', table: 'catalogo_1.panos_sobrantes', column: 'id_remnant' },
      { seq: 'catalogo_1.trabajo_corte_job_id_seq', table: 'catalogo_1.trabajo_corte', column: 'job_id' },
      { seq: 'catalogo_1.real_corte_pieza_id_pieza_seq', table: 'catalogo_1.real_corte_pieza', column: 'id_pieza' },
      { seq: 'catalogo_1.movimiento_inventario_id_movimiento_seq', table: 'catalogo_1.movimiento_inventario', column: 'id_movimiento' },
      { seq: 'catalogo_1.herramienta_ordenada_id_orden_seq', table: 'catalogo_1.herramienta_ordenada', column: 'id_orden' },
      { seq: 'catalogo_1.cliente_id_cliente_seq', table: 'catalogo_1.cliente', column: 'id_cliente' },
      { seq: 'catalogo_1.cliente_log_id_log_seq', table: 'catalogo_1.cliente_log', column: 'id_log' },
      { seq: 'catalogo_1.ordenes_draft_id_draft_seq', table: 'catalogo_1.ordenes_draft', column: 'id_draft' },
      { seq: 'catalogo_1.reporte_variacion_var_id_seq', table: 'catalogo_1.reporte_variacion', column: 'var_id' },
      { seq: 'catalogo_1.inventario_item_id_item_seq', table: 'catalogo_1.inventario_item', column: 'id_item' }
    ];
    
    for (const seq of sequences) {
      try {
        await client.query(`SELECT reset_sequence($1, $2, $3)`, [seq.seq, seq.table, seq.column]);
        console.log(`   ✅ Secuencia ${seq.seq} reseteada`);
      } catch (error) {
        console.log(`   ⚠️  Error reseteando ${seq.seq}: ${error.message}`);
      }
    }
    
    // Limpiar función temporal
    await client.query('DROP FUNCTION reset_sequence(text, text, text);');
    
    console.log('\n✅ Secuencias arregladas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error arreglando secuencias:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando análisis y limpieza de la base de datos...\n');
    
    // 1. Analizar estructura
    const analysis = await analyzeDatabaseStructure();
    
    // 2. Preguntar si continuar
    console.log('\n' + '='.repeat(60));
    console.log('¿Deseas continuar con la limpieza? (s/n)');
    console.log('='.repeat(60));
    
    // Por ahora continuamos automáticamente, pero podrías agregar input aquí
    
    // 3. Realizar limpieza
    await performCleanup(analysis.cleanupOrder);
    
    // 4. Arreglar secuencias
    await fixSequences();
    
    console.log('\n🎉 Proceso completado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main();
}

module.exports = { analyzeDatabaseStructure, performCleanup, fixSequences }; 