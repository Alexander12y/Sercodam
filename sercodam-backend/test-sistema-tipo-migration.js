const knex = require('./src/config/database');

async function testSistemaTipoMigration() {
  try {
    console.log('🧪 === PRUEBA DE MIGRACIÓN SISTEMA_TIPO ===');
    
    // Verificar si la columna existe
    const hasColumn = await knex.schema.hasColumn('cotizaciones', 'sistema_tipo');
    console.log('📋 Columna sistema_tipo existe:', hasColumn);
    
    if (!hasColumn) {
      console.log('⚠️ La columna no existe, ejecutando migración...');
      
      // Ejecutar migración
      await knex.schema.alterTable('cotizaciones', function(table) {
        table.string('sistema_tipo', 1).defaultTo('T').notNullable();
        table.check('sistema_tipo IN (\'T\', \'U\')', 'sistema_tipo_check');
      });
      
      console.log('✅ Migración ejecutada exitosamente');
    }
    
    // Verificar la estructura de la columna
    const columnInfo = await knex.raw(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'cotizaciones' AND column_name = 'sistema_tipo'
    `);
    
    console.log('📊 Información de la columna:');
    console.log(columnInfo.rows[0]);
    
    // Verificar constraint
    const constraintInfo = await knex.raw(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = 'sistema_tipo_check'
    `);
    
    console.log('🔒 Información del constraint:');
    console.log(constraintInfo.rows[0]);
    
    // Probar inserción de datos
    console.log('🧪 Probando inserción de datos...');
    
    // Insertar una cotización de prueba
    const testCotizacion = {
      id_cliente: 1,
      nombre_cliente: 'Cliente Test',
      titulo_proyecto: 'Proyecto Test',
      tipo_proyecto: 'REDES_INDUSTRIALES',
      sistema_tipo: 'T',
      subtotal: 1000,
      iva: 160,
      total: 1160,
      fecha_creacion: new Date(),
      estado: 'borrador'
    };
    
    const [insertedId] = await knex('cotizaciones').insert(testCotizacion).returning('id_cotizacion');
    console.log('✅ Cotización insertada con ID:', insertedId);
    
    // Verificar que se insertó correctamente
    const insertedCotizacion = await knex('cotizaciones')
      .where('id_cotizacion', insertedId)
      .first();
    
    console.log('📋 Cotización insertada:');
    console.log(insertedCotizacion);
    
    // Probar actualización
    await knex('cotizaciones')
      .where('id_cotizacion', insertedId)
      .update({ sistema_tipo: 'U' });
    
    console.log('✅ Sistema actualizado a U');
    
    // Verificar actualización
    const updatedCotizacion = await knex('cotizaciones')
      .where('id_cotizacion', insertedId)
      .first();
    
    console.log('📋 Cotización actualizada:');
    console.log(updatedCotizacion);
    
    // Limpiar datos de prueba
    await knex('cotizaciones').where('id_cotizacion', insertedId).del();
    console.log('🧹 Datos de prueba eliminados');
    
    console.log('✅ Todas las pruebas pasaron exitosamente');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  } finally {
    await knex.destroy();
  }
}

// Ejecutar pruebas
testSistemaTipoMigration(); 