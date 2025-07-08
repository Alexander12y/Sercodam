const db = require('./src/config/database');
const logger = require('./src/config/logger');

async function limpiarOrdenesCompletadas() {
    try {
        logger.info('Iniciando limpieza de órdenes completadas...');
        
        const result = await db.raw('SELECT fn_limpiar_detalle_completadas()');
        
        logger.info('Limpieza de órdenes completadas ejecutada correctamente');
        return { success: true, message: 'Limpieza completada' };
    } catch (error) {
        logger.error('Error en limpieza de órdenes completadas:', error);
        return { success: false, error: error.message };
    }
}

async function cancelarOrdenes30Dias() {
    try {
        logger.info('Iniciando cancelación automática de órdenes de 30 días...');
        
        const result = await db.raw('SELECT fn_cancelar_ordenes_30_dias()');
        
        logger.info('Cancelación automática de órdenes ejecutada correctamente');
        return { success: true, message: 'Cancelación automática completada' };
    } catch (error) {
        logger.error('Error en cancelación automática de órdenes:', error);
        return { success: false, error: error.message };
    }
}

async function ejecutarLimpiezaCompleta() {
    try {
        logger.info('=== INICIANDO PROCESO DE LIMPIEZA AUTOMÁTICA ===');
        
        // Ejecutar limpieza de órdenes completadas
        const resultadoCompletadas = await limpiarOrdenesCompletadas();
        if (!resultadoCompletadas.success) {
            logger.error('Error en limpieza de completadas:', resultadoCompletadas.error);
        }
        
        // Ejecutar cancelación automática de órdenes de 30 días
        const resultadoCancelacion = await cancelarOrdenes30Dias();
        if (!resultadoCancelacion.success) {
            logger.error('Error en cancelación automática:', resultadoCancelacion.error);
        }
        
        logger.info('=== PROCESO DE LIMPIEZA AUTOMÁTICA COMPLETADO ===');
        
        return {
            success: true,
            completadas: resultadoCompletadas,
            cancelacion: resultadoCancelacion
        };
    } catch (error) {
        logger.error('Error en proceso de limpieza completa:', error);
        return { success: false, error: error.message };
    } finally {
        // Cerrar conexión de base de datos
        await db.destroy();
    }
}

// Si se ejecuta directamente este script
if (require.main === module) {
    ejecutarLimpiezaCompleta()
        .then(result => {
            console.log('Resultado:', result);
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Error fatal:', error);
            process.exit(1);
        });
}

module.exports = {
    limpiarOrdenesCompletadas,
    cancelarOrdenes30Dias,
    ejecutarLimpiezaCompleta
}; 