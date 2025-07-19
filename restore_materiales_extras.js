const { Pool } = require('pg');
const fs = require('fs');
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

function parseRegistrosFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Verificar que el archivo tiene el formato correcto
    if (!lines[0].includes('id_item | id_material_extra |')) {
      throw new Error('Formato de archivo incorrecto. No se encontró la línea de encabezados');
    }
    
    // Obtener los registros después de los encabezados (línea 1) y separadores (línea 2)
    const dataLines = lines.slice(2); // Saltar encabezados y línea separadora
    
    const registros = [];
    
    for (const line of dataLines) {
      if (line.trim() === '') continue;
      
      // Parsear la línea usando el formato de tabla PostgreSQL
      const parts = line.split('|').map(part => part.trim());
      
      if (parts.length >= 14) {
        const registro = {
          id_item: parseInt(parts[0]),
          id_material_extra: parts[1],
          descripcion: parts[2],
          categoria: parts[3],
          presentacion: parts[4],
          unidad: parts[5],
          permite_decimales: parts[6] === 't' ? true : false,
          cantidad_disponible: parseFloat(parts[7]) || 0,
          marca: parts[8],
          estado_calidad: parts[9],
          ubicacion: parts[10] || null,
          precioxunidad: parts[11] ? parseFloat(parts[11]) : null,
          uso_principal: parts[12],
          ultima_modificacion: parts[13],
          stock_minimo: parseFloat(parts[14]) || 0
        };
        
        registros.push(registro);
      }
    }
    
    return registros;
  } catch (error) {
    console.error('Error leyendo el archivo:', error);
    throw error;
  }
}

async function restoreMaterialesExtras(registros) {
  const client = await pool.connect();
  
  try {
    console.log(`🔄 Restaurando ${registros.length} registros en materiales_extras...`);
    
    // Limpiar la tabla primero
    await client.query('DELETE FROM catalogo_1.materiales_extras');
    console.log('✅ Tabla materiales_extras limpiada');
    
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
    
    console.log('✅ Registros insertados exitosamente');
    
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
    console.error('❌ Error restaurando materiales_extras:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    console.log('🚀 Iniciando restauración de materiales_extras...\n');
    
    // 1. Parsear el archivo
    console.log('📖 Leyendo archivo Registros.txt...');
    const registros = parseRegistrosFile('Registros.txt');
    console.log(`✅ Se encontraron ${registros.length} registros`);
    
    // 2. Restaurar en la base de datos
    await restoreMaterialesExtras(registros);
    
    console.log('\n🎉 Restauración completada exitosamente!');
    
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

module.exports = { parseRegistrosFile, restoreMaterialesExtras }; 