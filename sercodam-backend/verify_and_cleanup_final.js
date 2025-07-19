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

async function verifyCurrentState() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verificando estado actual de la base de datos...\n');
    
    // 1. Verificar qué tablas existen realmente
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'catalogo_1' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    const tables = await client.query(tablesQuery);
    
    console.log('📋 Tablas que existen actualmente:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // 2. Verificar datos en inventario_item
    console.log('\n📊 Datos actuales en inventario_item:');
    const inventarioQuery = `
      SELECT tipo_item, COUNT(*) as total
      FROM catalogo_1.inventario_item 
      GROUP BY tipo_item
      ORDER BY tipo_item;
    `;
    const inventario = await client.query(inventarioQuery);
    inventario.rows.forEach(row => {
      console.log(`   - ${row.tipo_item}: ${row.total} registros`);
    });
    
    // 3. Verificar los registros específicos de paños que queremos borrar
    console.log('\n🎯 Verificando registros específicos de paños:');
    const panosQuery = `
      SELECT id_item, tipo_item, fecha_creacion 
      FROM catalogo_1.inventario_item 
      WHERE id_item IN (560, 561, 562, 563, 564, 565, 566, 567, 568, 569, 570, 571, 572, 574)
      ORDER BY id_item;
    `;
    const panos = await client.query(panosQuery);
    
    if (panos.rows.length > 0) {
      console.log('   Registros encontrados:');
      panos.rows.forEach(row => {
        console.log(`     - ID: ${row.id_item}, Tipo: ${row.tipo_item}, Fecha: ${row.fecha_creacion}`);
      });
    } else {
      console.log('   No se encontraron registros con esos IDs');
    }
    
    // 4. Verificar datos en otras tablas importantes
    const tablesToCheck = [
      'orden_produccion',
      'orden_produccion_detalle', 
      'pano',
      'panos_sobrantes',
      'trabajo_corte',
      'real_corte_pieza',
      'plan_corte_pieza',
      'movimiento_inventario',
      'materiales_extras',
      'herramienta_ordenada',
      'cliente',
      'cliente_log',
      'reporte_variacion',
      'red_producto',
      'ordenes_draft'
    ];
    
    console.log('\n📈 Datos en tablas a limpiar:');
    for (const tableName of tablesToCheck) {
      try {
        const countQuery = `SELECT COUNT(*) as total FROM catalogo_1.${tableName}`;
        const result = await client.query(countQuery);
        console.log(`   - ${tableName}: ${result.rows[0].total} registros`);
      } catch (error) {
        console.log(`   - ${tableName}: Tabla no existe`);
      }
    }
    
    return { tables: tables.rows, inventario: inventario.rows, panos: panos.rows };
    
  } catch (error) {
    console.error('❌ Error verificando estado:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function performTargetedCleanup() {
  const client = await pool.connect();
  
  try {
    console.log('\n🧹 Iniciando limpieza específica...\n');
    
    // 1. Borrar registros específicos de paños en inventario_item
    console.log('1. Borrando registros específicos de paños en inventario_item...');
    const deletePanosQuery = `
      DELETE FROM catalogo_1.inventario_item 
      WHERE id_item IN (560, 561, 562, 563, 564, 565, 566, 567, 568, 569, 570, 571, 572, 574)
      AND tipo_item = 'PANO';
    `;
    const panosResult = await client.query(deletePanosQuery);
    console.log(`   ✅ Borrados ${panosResult.rowCount} registros de paños`);
    
    // 2. Borrar datos de tablas en orden correcto (solo las que existen)
    const cleanupSteps = [
      { table: 'orden_produccion_detalle', description: 'Detalles de órdenes de producción' },
      { table: 'herramienta_ordenada', description: 'Herramientas ordenadas' },
      { table: 'real_corte_pieza', description: 'Piezas de corte real' },
      { table: 'plan_corte_pieza', description: 'Plan de corte pieza' },
      { table: 'trabajo_corte', description: 'Trabajos de corte' },
      { table: 'panos_sobrantes', description: 'Paños sobrantes' },
      { table: 'pano', description: 'Paños' },
      { table: 'movimiento_inventario', description: 'Movimientos de inventario' },
      { table: 'materiales_extras', description: 'Materiales extras' },
      { table: 'cliente_log', description: 'Logs de clientes' },
      { table: 'reporte_variacion', description: 'Reportes de variación' },
      { table: 'red_producto', description: 'Red de producto' },
      { table: 'ordenes_draft', description: 'Drafts de órdenes' }
    ];
    
    for (let i = 0; i < cleanupSteps.length; i++) {
      const step = cleanupSteps[i];
      console.log(`${i + 2}. Borrando ${step.description}...`);
      
      try {
        const deleteQuery = `DELETE FROM catalogo_1.${step.table};`;
        const result = await client.query(deleteQuery);
        console.log(`   ✅ Borrados ${result.rowCount} registros de ${step.table}`);
      } catch (error) {
        if (error.message.includes('does not exist')) {
          console.log(`   ℹ️  Tabla ${step.table} no existe`);
        } else {
          console.log(`   ⚠️  Error borrando ${step.table}: ${error.message}`);
        }
      }
    }
    
    // 3. Intentar borrar cliente (puede fallar por foreign keys)
    console.log(`${cleanupSteps.length + 2}. Borrando clientes...`);
    try {
      const result = await client.query('DELETE FROM catalogo_1.cliente;');
      console.log(`   ✅ Borrados ${result.rowCount} registros de cliente`);
    } catch (error) {
      console.log(`   ⚠️  Error borrando cliente: ${error.message}`);
      console.log('   ℹ️  Esto es normal si hay órdenes de producción que referencian clientes');
    }
    
    // 4. Verificar estado final
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

async function fixSequencesSafely() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔧 Arreglando secuencias de forma segura...\n');
    
    // Función para resetear secuencia
    const resetSequenceQuery = `
      CREATE OR REPLACE FUNCTION reset_sequence_safe(seq_name text, table_name text, id_column text)
      RETURNS void AS $$
      DECLARE
          max_id bigint;
          next_val bigint;
          table_exists boolean;
      BEGIN
          -- Verificar si la tabla existe
          SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_schema = 'catalogo_1' 
              AND table_name = $2
          ) INTO table_exists;
          
          IF NOT table_exists THEN
              RAISE NOTICE 'Tabla % no existe, saltando secuencia %', $2, $1;
              RETURN;
          END IF;
          
          -- Obtener el valor máximo actual de la tabla
          EXECUTE format('SELECT COALESCE(MAX(%I), 0) FROM %I', id_column, table_name) INTO max_id;
          
          -- Si no hay registros, resetear a 1, sino al siguiente valor
          IF max_id = 0 THEN
              next_val := 1;
          ELSE
              next_val := max_id + 1;
          END IF;
          
          -- Resetear la secuencia
          EXECUTE format('ALTER SEQUENCE %I RESTART WITH %s', seq_name, next_val);
          
          RAISE NOTICE 'Secuencia % reseteada a % (max_id: %)', seq_name, next_val, max_id;
      END;
      $$ LANGUAGE plpgsql;
    `;
    await client.query(resetSequenceQuery);
    
    // Lista de secuencias a resetear
    const sequences = [
      { seq: 'catalogo_1.orden_produccion_id_op_seq', table: 'orden_produccion', column: 'id_op' },
      { seq: 'catalogo_1.orden_produccion_detalle_id_detalle_seq', table: 'orden_produccion_detalle', column: 'id_detalle' },
      { seq: 'catalogo_1.pano_id_pano_seq', table: 'pano', column: 'id_pano' },
      { seq: 'catalogo_1.panos_sobrantes_id_remnant_seq', table: 'panos_sobrantes', column: 'id_remnant' },
      { seq: 'catalogo_1.trabajo_corte_job_id_seq', table: 'trabajo_corte', column: 'job_id' },
      { seq: 'catalogo_1.real_corte_pieza_id_pieza_seq', table: 'real_corte_pieza', column: 'id_pieza' },
      { seq: 'catalogo_1.movimiento_inventario_id_movimiento_seq', table: 'movimiento_inventario', column: 'id_movimiento' },
      { seq: 'catalogo_1.herramienta_ordenada_id_orden_seq', table: 'herramienta_ordenada', column: 'id_orden' },
      { seq: 'catalogo_1.cliente_id_cliente_seq', table: 'cliente', column: 'id_cliente' },
      { seq: 'catalogo_1.cliente_log_id_log_seq', table: 'cliente_log', column: 'id_log' },
      { seq: 'catalogo_1.ordenes_draft_id_draft_seq', table: 'ordenes_draft', column: 'id_draft' },
      { seq: 'catalogo_1.reporte_variacion_var_id_seq', table: 'reporte_variacion', column: 'var_id' },
      { seq: 'catalogo_1.inventario_item_id_item_seq', table: 'inventario_item', column: 'id_item' }
    ];
    
    for (const seq of sequences) {
      try {
        await client.query(`SELECT reset_sequence_safe($1, $2, $3)`, [seq.seq, seq.table, seq.column]);
      } catch (error) {
        console.log(`   ⚠️  Error con secuencia ${seq.seq}: ${error.message}`);
      }
    }
    
    // Limpiar función temporal
    await client.query('DROP FUNCTION reset_sequence_safe(text, text, text);');
    
    console.log('\n✅ Secuencias procesadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error arreglando secuencias:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando verificación y limpieza final...\n');
    
    // 1. Verificar estado actual
    const state = await verifyCurrentState();
    
    // 2. Realizar limpieza
    await performTargetedCleanup();
    
    // 3. Arreglar secuencias
    await fixSequencesSafely();
    
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

module.exports = { verifyCurrentState, performTargetedCleanup, fixSequencesSafely }; 