const db = require('./src/config/database');

async function checkMovimientoInventario() {
  try {
    console.log('🔍 Verificando estructura de tabla movimiento_inventario...');
    
    // Verificar si la tabla existe
    const tableExists = await db.schema.hasTable('movimiento_inventario');
    console.log('✅ Tabla movimiento_inventario existe:', tableExists);
    
    if (!tableExists) {
      console.log('❌ La tabla movimiento_inventario no existe');
      return;
    }
    
    // Obtener estructura de la tabla
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'movimiento_inventario'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura actual de movimiento_inventario:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // Verificar si falta la columna tipo_item
    const hasTipoItem = columns.rows.some(col => col.column_name === 'tipo_item');
    console.log('\n🔍 ¿Tiene columna tipo_item?', hasTipoItem);
    
    if (!hasTipoItem) {
      console.log('⚠️  Falta la columna tipo_item. Agregándola...');
      await db.schema.alterTable('movimiento_inventario', (table) => {
        table.string('tipo_item', 20).notNullable().defaultTo('EXTRA');
      });
      console.log('✅ Columna tipo_item agregada');
    }
    
    // Verificar si falta la columna unidad
    const hasUnidad = columns.rows.some(col => col.column_name === 'unidad');
    console.log('🔍 ¿Tiene columna unidad?', hasUnidad);
    
    if (!hasUnidad) {
      console.log('⚠️  Falta la columna unidad. Agregándola...');
      await db.schema.alterTable('movimiento_inventario', (table) => {
        table.string('unidad', 20).defaultTo('unidad');
      });
      console.log('✅ Columna unidad agregada');
    }
    
    // Verificar si falta la columna id_usuario
    const hasIdUsuario = columns.rows.some(col => col.column_name === 'id_usuario');
    console.log('🔍 ¿Tiene columna id_usuario?', hasIdUsuario);
    
    if (!hasIdUsuario) {
      console.log('⚠️  Falta la columna id_usuario. Agregándola...');
      await db.schema.alterTable('movimiento_inventario', (table) => {
        table.integer('id_usuario').references('id').inTable('usuario');
      });
      console.log('✅ Columna id_usuario agregada');
    }
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error verificando tabla:', error);
  } finally {
    await db.destroy();
  }
}

checkMovimientoInventario(); 