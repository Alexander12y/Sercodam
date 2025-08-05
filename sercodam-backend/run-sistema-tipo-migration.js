const knex = require('./src/config/database');

async function runSistemaTipoMigration() {
  try {
    console.log('🔄 === EJECUTANDO MIGRACIÓN SISTEMA_TIPO ===');
    
    // Verificar si la columna ya existe
    const hasColumn = await knex.schema.hasColumn('cotizaciones', 'sistema_tipo');
    
    if (hasColumn) {
      console.log('⚠️ La columna sistema_tipo ya existe en la tabla cotizaciones');
      return;
    }
    
    console.log('📋 Agregando columna sistema_tipo a la tabla cotizaciones...');
    
    // Ejecutar migración manual
    await knex.schema.alterTable('cotizaciones', function(table) {
      table.string('sistema_tipo', 1).defaultTo('T').notNullable();
      table.check('sistema_tipo IN (\'T\', \'U\')', 'sistema_tipo_check');
    });
    
    console.log('✅ Columna sistema_tipo agregada exitosamente');
    
    // Actualizar registros existentes
    console.log('🔄 Actualizando registros existentes...');
    const updatedRows = await knex('cotizaciones')
      .whereNull('sistema_tipo')
      .update({ sistema_tipo: 'T' });
    
    console.log(`✅ ${updatedRows} registros actualizados con valor por defecto 'T'`);
    
    // Verificar la migración
    const columnInfo = await knex.raw(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'cotizaciones' AND column_name = 'sistema_tipo'
    `);
    
    console.log('📊 Información de la columna:');
    console.log(columnInfo.rows[0]);
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
  } finally {
    await knex.destroy();
  }
}

// Ejecutar migración
runSistemaTipoMigration(); 