const db = require('./src/config/database');
const logger = require('./src/config/logger');

async function fixEstadoTrabajoPanos() {
    const trx = await db.transaction();
    
    try {
        logger.info('Iniciando corrección de estados de trabajo de paños...');
        
        // 1. Obtener todos los paños que están asignados a órdenes en proceso
        const panosEnOrdenes = await trx.raw(`
            SELECT DISTINCT 
                p.id_item,
                p.estado_trabajo as estado_actual,
                op.id_op,
                op.numero_op,
                op.estado as estado_orden,
                tc.job_id,
                tc.estado as estado_trabajo_corte,
                CASE 
                    WHEN tc.estado = 'Confirmado' THEN 'En progreso'
                    WHEN tc.estado = 'En progreso' THEN 'Reservado'
                    ELSE 'Reservado'
                END as estado_correcto
            FROM pano p
            JOIN trabajo_corte tc ON p.id_item = tc.id_item
            JOIN orden_produccion op ON tc.id_op = op.id_op
            WHERE op.estado IN ('en_proceso', 'completada')
            ORDER BY p.id_item
        `);
        
        logger.info(`Encontrados ${panosEnOrdenes.rows.length} paños en órdenes activas`);
        
        let actualizados = 0;
        let sinCambios = 0;
        
        for (const pano of panosEnOrdenes.rows) {
            const estadoActual = pano.estado_actual;
            const estadoCorrecto = pano.estado_correcto;
            
            logger.info(`Procesando paño ${pano.id_item}:`, {
                orden: pano.numero_op,
                estado_orden: pano.estado_orden,
                estado_trabajo_corte: pano.estado_trabajo_corte,
                estado_actual: estadoActual,
                estado_correcto: estadoCorrecto
            });
            
            // Solo actualizar si el estado actual es incorrecto
            if (estadoActual !== estadoCorrecto) {
                await trx('pano')
                    .where('id_item', pano.id_item)
                    .update({ 
                        estado_trabajo: estadoCorrecto,
                        updated_at: db.fn.now()
                    });
                
                logger.info(`✅ Paño ${pano.id_item} actualizado: ${estadoActual} → ${estadoCorrecto}`);
                actualizados++;
            } else {
                logger.info(`⏭️ Paño ${pano.id_item} ya tiene estado correcto: ${estadoActual}`);
                sinCambios++;
            }
        }
        
        //2 Corregir paños en órdenes completadas que deberían estar libres
        const panosEnOrdenesCompletadas = await trx.raw(`
            SELECT DISTINCT 
                p.id_item,
                p.estado_trabajo as estado_actual
            FROM pano p
            JOIN trabajo_corte tc ON p.id_item = tc.id_item
            JOIN orden_produccion op ON tc.id_op = op.id_op
            WHERE op.estado = 'completada'
            AND p.estado_trabajo != 'Libre'
        `);
        
        logger.info(`Encontrados ${panosEnOrdenesCompletadas.rows.length} paños en órdenes completadas que deberían estar libres`);
        
        for (const pano of panosEnOrdenesCompletadas.rows) {
            await trx('pano')
                .where('id_item', pano.id_item)
                .update({ 
                    estado_trabajo: 'Libre',
                    updated_at: db.fn.now()
                });
            
            logger.info(`✅ Paño ${pano.id_item} liberado: ${pano.estado_actual} → Libre`);
            actualizados++;
        }
        
        // 3erificar paños que no están en órdenes activas pero no están libres
        const panosOrfanos = await trx.raw(`
            SELECT 
                p.id_item,
                p.estado_trabajo as estado_actual
            FROM pano p
            WHERE p.estado_trabajo IN ('Reservado', 'reso)           AND NOT EXISTS (
                SELECT 1 FROM trabajo_corte tc 
                JOIN orden_produccion op ON tc.id_op = op.id_op
                WHERE tc.id_item = p.id_item 
                AND op.estado IN ('en_proceso', 'completada')
            )
        `);
        
        logger.info(`Encontrados ${panosOrfanos.rows.length} paños huérfanos que deberían estar libres`);
        
        for (const pano of panosOrfanos.rows) {
            await trx('pano')
                .where('id_item', pano.id_item)
                .update({ 
                    estado_trabajo: 'Libre',
                    updated_at: db.fn.now()
                });
            
            logger.info(`✅ Paño huérfano ${pano.id_item} liberado: ${pano.estado_actual} → Libre`);
            actualizados++;
        }
        
        await trx.commit();
        
        logger.info('✅ Corrección completada exitosamente', {
            total_actualizados: actualizados,
            sin_cambios: sinCambios,
            panos_en_ordenes: panosEnOrdenes.rows.length,
            panos_en_ordenes_completadas: panosEnOrdenesCompletadas.rows.length,
            panos_huérfanos: panosOrfanos.rows.length
        });
        
        // 4trar resumen final
        const resumenFinal = await db.raw(`
            SELECT 
                estado_trabajo,
                COUNT(*) as cantidad
            FROM pano 
            GROUP BY estado_trabajo 
            ORDER BY estado_trabajo
        `);
        
        logger.info('📊 Resumen final de estados de trabajo:', resumenFinal.rows);
        
    } catch (error) {
        await trx.rollback();
        logger.error('❌ Error durante la corrección:', error);
        throw error;
    }
}

// Ejecutar la corrección
if (require.main === module) {
    fixEstadoTrabajoPanos()
        .then(() => {
            logger.info('✅ Script de corrección ejecutado exitosamente');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Error ejecutando script de corrección:', error);
            process.exit(1);
        });
}

module.exports = { fixEstadoTrabajoPanos }; 