const db = require('./src/config/database');

async function testMigrationFixes() {
  try {
    console.log('🔍 Probando correcciones de migración...');
    
    // 1. Verificar que las columnas se eliminaron correctamente
    console.log('\n📋 Verificando estructura de orden_produccion_detalle:');
    const detalleColumns = await db.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'orden_produccion_detalle' 
      AND table_schema = 'catalogo_1'
      ORDER BY ordinal_position
    `);
    console.log(detalleColumns.rows);
    
    // 2. Verificar que las columnas PDF se eliminaron de orden_produccion
    console.log('\n📋 Verificando estructura de orden_produccion:');
    const ordenColumns = await db.raw(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'orden_produccion' 
      AND table_schema = 'catalogo_1'
      ORDER BY ordinal_position
    `);
    console.log(ordenColumns.rows);
    
    // 3. Verificar que las funciones se crearon correctamente
    console.log('\n📋 Verificando funciones creadas:');
    const functions = await db.raw(`
      SELECT routine_name, routine_type 
      FROM information_schema.routines 
      WHERE routine_schema = 'catalogo_1'
      AND routine_name IN (
        'fn_autogenerar_catalogo',
        'fn_generar_nota_pano',
        'fn_generar_nota_material_extra',
        'fn_procesar_pano_orden',
        'fn_procesar_material_extra_orden',
        'fn_restaurar_inventario_completo_cancelada',
        'fn_get_pdf_info',
        'fn_save_pdf_info'
      )
      ORDER BY routine_name
    `);
    console.log(functions.rows);
    
    // 4. Verificar que los triggers se crearon correctamente
    console.log('\n📋 Verificando triggers:');
    const triggers = await db.raw(`
      SELECT trigger_name, event_object_table, action_timing
      FROM information_schema.triggers 
      WHERE trigger_schema = 'catalogo_1'
      AND trigger_name IN (
        'trg_autogenerar_catalogo',
        'trg_orden_cancelada'
      )
      ORDER BY trigger_name
    `);
    console.log(triggers.rows);
    
    // 5. Probar la función de generación de notas
    console.log('\n📋 Probando función fn_generar_nota_pano:');
    const testNota = await db.raw('SELECT fn_generar_nota_pano(1, 2.5, \'largo\') as nota');
    console.log('Nota generada:', testNota.rows[0].nota);
    
    // 6. Verificar que la tabla pdf_ordenes se creó
    console.log('\n📋 Verificando tabla pdf_ordenes:');
    const pdfTableExists = await db.schema.hasTable('pdf_ordenes');
    console.log('Tabla pdf_ordenes existe:', pdfTableExists);
    
    if (pdfTableExists) {
      const pdfColumns = await db.raw(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'pdf_ordenes' 
        AND table_schema = 'catalogo_1'
        ORDER BY ordinal_position
      `);
      console.log('Columnas de pdf_ordenes:', pdfColumns.rows);
    }
    
    // 7. Probar inserción en orden_produccion_detalle (debería autogenerar catalogo)
    console.log('\n📋 Probando inserción con autogeneración de catalogo:');
    try {
      const testInsert = await db('orden_produccion_detalle').insert({
        id_op: 1,
        id_item: 1,
        tipo_item: 'PANO',
        cantidad: 10,
        notas: 'Prueba de migración',
        estado: 'en_proceso'
      }).returning('*');
      console.log('Inserción exitosa:', testInsert[0]);
      
      // Limpiar el registro de prueba
      await db('orden_produccion_detalle')
        .where('id_detalle', testInsert[0].id_detalle)
        .del();
      console.log('Registro de prueba eliminado');
    } catch (error) {
      console.log('Error en inserción de prueba:', error.message);
    }
    
    console.log('\n✅ Pruebas completadas exitosamente');
    
  } catch (error) {
    console.error('❌ Error en pruebas:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.destroy();
  }
}

// Ejecutar pruebas
testMigrationFixes(); 