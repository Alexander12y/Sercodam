#!/usr/bin/env node

/**
 * Script de limpieza de drafts de cotizaciones expirados
 * Uso: node scripts/cleanup-cotizaciones-drafts.js
 */

const db = require('../src/config/database');
const logger = require('../src/config/logger');

async function cleanupExpiredDrafts() {
  try {
    console.log('🧹 Iniciando limpieza de drafts de cotizaciones expirados...');
    
    // Ejecutar función de limpieza
    const result = await db.raw('SELECT limpiar_cotizaciones_drafts_expirados() as drafts_eliminados');
    const draftsEliminados = result.rows[0].drafts_eliminados;
    
    console.log(`✅ Limpieza completada: ${draftsEliminados} drafts marcados como inactivos`);
    
    // Obtener estadísticas
    const stats = await db.raw('SELECT * FROM obtener_estadisticas_cotizaciones_drafts()');
    const estadisticas = stats.rows[0];
    
    console.log('\n📊 Estadísticas de drafts de cotizaciones:');
    console.log(`  - Total de drafts: ${estadisticas.total_drafts}`);
    console.log(`  - Drafts activos: ${estadisticas.drafts_activos}`);
    console.log(`  - Drafts expirados: ${estadisticas.drafts_expirados}`);
    console.log(`  - Drafts eliminados: ${estadisticas.drafts_eliminados}`);
    console.log(`  - Usuarios con drafts: ${estadisticas.usuarios_con_drafts}`);
    console.log(`  - Sección promedio: ${Number(estadisticas.promedio_seccion || 0).toFixed(1)}`);
    
    // Limpiar drafts muy antiguos (físicamente)
    const oldDraftsResult = await db.raw('SELECT limpiar_cotizaciones_drafts_antiguos() as drafts_antiguos_eliminados');
    const draftsAntiguosEliminados = oldDraftsResult.rows[0].drafts_antiguos_eliminados;
    
    if (draftsAntiguosEliminados > 0) {
      console.log(`🗑️  Eliminados físicamente ${draftsAntiguosEliminados} drafts antiguos (>6 meses)`);
    }
    
    logger.info('Limpieza de drafts de cotizaciones completada', {
      drafts_expirados_eliminados: draftsEliminados,
      drafts_antiguos_eliminados: draftsAntiguosEliminados,
      estadisticas
    });
    
  } catch (error) {
    console.error('❌ Error en limpieza de drafts:', error);
    logger.error('Error en limpieza de drafts de cotizaciones', error);
    process.exit(1);
  }
}

async function showHelp() {
  console.log(`
🧹 Script de Limpieza de Drafts de Cotizaciones

Uso:
  node scripts/cleanup-cotizaciones-drafts.js [opción]

Opciones:
  --help, -h     Mostrar esta ayuda
  --stats, -s    Solo mostrar estadísticas sin limpiar
  --dry-run      Simular limpieza sin ejecutar cambios

Descripción:
  Este script limpia los drafts de cotizaciones que han expirado (>15 días)
  y elimina físicamente los drafts muy antiguos (>6 meses).
  
  Se recomienda ejecutar este script diariamente mediante cron:
  0 2 * * * cd /ruta/proyecto && node scripts/cleanup-cotizaciones-drafts.js
  `);
}

async function showStats() {
  try {
    console.log('📊 Estadísticas de drafts de cotizaciones...\n');
    
    const stats = await db.raw('SELECT * FROM obtener_estadisticas_cotizaciones_drafts()');
    const estadisticas = stats.rows[0];
    
    console.log('📈 Resumen General:');
    console.log(`  Total de drafts: ${estadisticas.total_drafts}`);
    console.log(`  Drafts activos: ${estadisticas.drafts_activos}`);
    console.log(`  Drafts expirados: ${estadisticas.drafts_expirados}`);
    console.log(`  Drafts eliminados: ${estadisticas.drafts_eliminados}`);
    console.log(`  Usuarios con drafts: ${estadisticas.usuarios_con_drafts}`);
    console.log(`  Sección promedio: ${Number(estadisticas.promedio_seccion || 0).toFixed(1)}`);
    
    // Mostrar drafts por usuario
    const draftsPorUsuario = await db.raw(`
      SELECT 
        u.nombre,
        u.email,
        cd.seccion_actual,
        cd.fecha_actualizacion,
        CASE 
          WHEN cd.fecha_expiracion < NOW() THEN 'Expirado'
          ELSE 'Activo'
        END as estado
      FROM cotizaciones_draft cd
      JOIN usuario u ON cd.id_usuario = u.id
      WHERE cd.activo = true
      ORDER BY cd.fecha_actualizacion DESC
      LIMIT 10
    `);
    
    if (draftsPorUsuario.rows.length > 0) {
      console.log('\n👥 Últimos 10 drafts activos:');
      draftsPorUsuario.rows.forEach(draft => {
        console.log(`  - ${draft.nombre} (${draft.email}) - Sección ${draft.seccion_actual} - ${draft.estado}`);
        console.log(`    Última actualización: ${new Date(draft.fecha_actualizacion).toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    process.exit(1);
  }
}

async function dryRun() {
  try {
    console.log('🔍 Simulación de limpieza (sin cambios reales)...\n');
    
    // Contar drafts que serían eliminados
    const result = await db.raw(`
      SELECT COUNT(*) as count 
      FROM cotizaciones_draft 
      WHERE activo = true AND fecha_expiracion < NOW()
    `);
    
    const draftsPorExpirar = result.rows[0].count;
    
    // Contar drafts antiguos que serían eliminados físicamente
    const oldResult = await db.raw(`
      SELECT COUNT(*) as count 
      FROM cotizaciones_draft 
      WHERE activo = false AND fecha_actualizacion < NOW() - INTERVAL '6 months'
    `);
    
    const draftsAntiguos = oldResult.rows[0].count;
    
    console.log(`📋 Resultados de simulación:`);
    console.log(`  - Drafts que serían marcados como inactivos: ${draftsPorExpirar}`);
    console.log(`  - Drafts antiguos que serían eliminados físicamente: ${draftsAntiguos}`);
    console.log(`\n💡 Para ejecutar la limpieza real, ejecute el script sin --dry-run`);
    
  } catch (error) {
    console.error('❌ Error en simulación:', error);
    process.exit(1);
  }
}

// Procesar argumentos de línea de comandos
async function main() {
  const args = process.argv.slice(2);
  
  try {
    if (args.includes('--help') || args.includes('-h')) {
      await showHelp();
      process.exit(0);
    }
    
    if (args.includes('--stats') || args.includes('-s')) {
      await showStats();
      process.exit(0);
    }
    
    if (args.includes('--dry-run')) {
      await dryRun();
      process.exit(0);
    }
    
    // Ejecutar limpieza normal
    await cleanupExpiredDrafts();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error inesperado:', error);
    process.exit(1);
  } finally {
    // Cerrar conexión de base de datos
    if (db && db.destroy) {
      await db.destroy();
    }
  }
}

// Manejar señales del sistema
process.on('SIGINT', async () => {
  console.log('\n⚠️  Limpieza interrumpida por el usuario');
  if (db && db.destroy) {
    await db.destroy();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⚠️  Limpieza terminada por el sistema');
  if (db && db.destroy) {
    await db.destroy();
  }
  process.exit(0);
});

// Ejecutar script
main();