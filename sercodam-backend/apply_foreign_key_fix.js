const db = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function applyForeignKeyFix() {
  try {
    console.log('🔧 Aplicando corrección de foreign key constraint...');
    
    // Leer el script SQL
    const sqlPath = path.join(__dirname, 'fix_foreign_key_constraint.sql');
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    // Ejecutar el script
    await db.raw(sqlScript);
    
    console.log('✅ Corrección de foreign key constraint aplicada exitosamente');
    
    // Verificar que la constraint se aplicó correctamente
    const constraintCheck = await db.raw(`
      SELECT 
          tc.constraint_name, 
          tc.table_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name,
          rc.update_rule,
          rc.delete_rule
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'orden_produccion_detalle'
        AND tc.constraint_name = 'fk_opdet_to_op'
    `);
    
    if (constraintCheck.rows.length > 0) {
      const constraint = constraintCheck.rows[0];
      console.log('✅ Constraint verificada:');
      console.log(`   - Nombre: ${constraint.constraint_name}`);
      console.log(`   - Tabla: ${constraint.table_name}`);
      console.log(`   - Columna: ${constraint.column_name}`);
      console.log(`   - Tabla referenciada: ${constraint.foreign_table_name}`);
      console.log(`   - Columna referenciada: ${constraint.foreign_column_name}`);
      console.log(`   - Regla de actualización: ${constraint.update_rule}`);
      console.log(`   - Regla de eliminación: ${constraint.delete_rule}`);
    } else {
      console.log('⚠️  No se encontró la constraint fk_opdet_to_op');
    }
    
  } catch (error) {
    console.error('❌ Error aplicando corrección:', error);
  } finally {
    await db.destroy();
  }
}

applyForeignKeyFix(); 