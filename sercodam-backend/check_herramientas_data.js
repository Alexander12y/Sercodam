const db = require('./src/config/database');

async function checkHerramientasData() {
  try {
    console.log('🔍 Verificando datos en tabla herramientas...');
    
    // Verificar si la tabla existe
    const tableExists = await db.schema.hasTable('herramientas');
    console.log('✅ Tabla herramientas existe:', tableExists);
    
    if (!tableExists) {
      console.log('❌ La tabla herramientas no existe');
      return;
    }
    
    // Contar registros
    const countResult = await db('herramientas').count('* as total');
    const total = countResult[0].total;
    console.log(`📊 Total de herramientas en la tabla: ${total}`);
    
    if (total > 0) {
      // Mostrar algunos registros de ejemplo
      const herramientas = await db('herramientas')
        .select('id_item', 'descripcion', 'categoria', 'marca')
        .limit(5);
      
      console.log('\n📋 Ejemplos de herramientas:');
      herramientas.forEach((h, i) => {
        console.log(`   ${i + 1}. ID: ${h.id_item}, Descripción: ${h.descripcion || 'N/A'}, Categoría: ${h.categoria || 'N/A'}, Marca: ${h.marca || 'N/A'}`);
      });
      
      // Verificar categorías disponibles
      const categorias = await db('herramientas')
        .select('categoria')
        .distinct()
        .whereNotNull('categoria')
        .orderBy('categoria');
      
      console.log('\n📂 Categorías disponibles:');
      categorias.forEach(cat => {
        console.log(`   - ${cat.categoria}`);
      });
      
    } else {
      console.log('⚠️  No hay herramientas en la tabla');
    }
    
    // Verificar estructura de la tabla
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'herramientas'
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Estructura de la tabla herramientas:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error verificando datos:', error);
  } finally {
    await db.destroy();
  }
}

checkHerramientasData(); 