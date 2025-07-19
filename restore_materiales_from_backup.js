const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la base de datos de backup
// MODIFICA ESTAS CREDENCIALES SEGÚN TU CONFIGURACIÓN DE BACKUP
const backupPool = new Pool({
  host: 'localhost', // Cambia si es diferente
  port: 5432,        // Cambia si es diferente
  database: 'sercodam_backup_restore',
  user: 'postgres',  // Cambia por tu usuario de backup
  password: 'P@chiicolipAt024!', // CAMBIA ESTA CONTRASEÑA
  schema: 'catalogo_1'
});

// Configuración de la base de datos principal
// MODIFICA ESTAS CREDENCIALES SEGÚN TU CONFIGURACIÓN DE SERCOdam_DB
const mainPool = new Pool({
  host: 'localhost', // Cambia si es diferente
  port: 5432,        // Cambia si es diferente
  database: 'sercodam_db',
  user: 'postgres',  // Cambia por tu usuario de sercodam_db
  password: 'P@chiicolipAt024!', // CAMBIA ESTA CONTRASEÑA
  schema: 'catalogo_1'
});

async function getMaterialesFromBackup() {
  const client = await backupPool.connect();
  
  try {
    console.log('📖 Extrayendo datos de materiales_extras desde la base de datos de backup...');
    
    const query = `
      SELECT 
        id_item, id_material_extra, descripcion, categoria, presentacion, 
        unidad, permite_decimales, cantidad_disponible, marca, estado_calidad, 
        ubicacion, precioxunidad, uso_principal, ultima_modificacion, stock_minimo
      FROM catalogo_1.materiales_extras
      ORDER BY id_item
    `;
    
    const result = await client.query(query);
    console.log(`✅ Se extrajeron ${result.rows.length} registros de la base de datos de backup`);
    
    return result.rows;
    
  } catch (error) {
    console.error('❌ Error extrayendo datos del backup:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function restoreMaterialesToMain(registros) {
  const client = await mainPool.connect();
  
  try {
    console.log(`🔄 Restaurando ${registros.length} registros en la base de datos principal...`);
    
    // Limpiar la tabla primero
    await client.query('DELETE FROM catalogo_1.materiales_extras');
    console.log('✅ Tabla materiales_extras limpiada en la base de datos principal');
    
    // Insertar los registros
    for (const registro of registros) {
      const query = `
        INSERT INTO catalogo_1.materiales_extras (
          id_item, id_material_extra, descripcion, categoria, presentacion, 
          unidad, permite_decimales, cantidad_disponible, marca, estado_calidad, 
          ubicacion, precioxunidad, uso_principal, ultima_modificacion, stock_minimo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `;
      
      const values = [
        registro.id_item,
        registro.id_material_extra,
        registro.descripcion,
        registro.categoria,
        registro.presentacion,
        registro.unidad,
        registro.permite_decimales,
        registro.cantidad_disponible,
        registro.marca,
        registro.estado_calidad,
        registro.ubicacion,
        registro.precioxunidad,
        registro.uso_principal,
        registro.ultima_modificacion,
        registro.stock_minimo
      ];
      
      await client.query(query, values);
    }
    
    console.log('✅ Registros insertados exitosamente en la base de datos principal');
    
    // Verificar el resultado
    const result = await client.query('SELECT COUNT(*) as total FROM catalogo_1.materiales_extras');
    console.log(`📊 Total de registros en materiales_extras: ${result.rows[0].total}`);
    
    // Mostrar algunos ejemplos
    const examples = await client.query('SELECT id_item, id_material_extra, descripcion FROM catalogo_1.materiales_extras LIMIT 5');
    console.log('\n📋 Ejemplos de registros restaurados:');
    examples.rows.forEach(row => {
      console.log(`   - ${row.id_item}: ${row.id_material_extra} - ${row.descripcion}`);
    });
    
  } catch (error) {
    console.error('❌ Error restaurando en la base de datos principal:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando restauración de materiales_extras desde backup...\n');
    
    // 1. Extraer datos del backup
    const registros = await getMaterialesFromBackup();
    
    // 2. Restaurar en la base de datos principal
    await restoreMaterialesToMain(registros);
    
    console.log('\n🎉 Restauración completada exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
  } finally {
    await backupPool.end();
    await mainPool.end();
  }
}

// Ejecutar si es el archivo principal
if (require.main === module) {
  main();
}

module.exports = { getMaterialesFromBackup, restoreMaterialesToMain }; 