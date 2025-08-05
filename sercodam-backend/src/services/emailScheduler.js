const emailAutoProcessor = require('./emailAutoProcessor');
const logger = require('../config/logger');

class EmailScheduler {
  constructor() {
    this.interval = null;
    this.isRunning = false;
    this.intervalMinutes = 10; // Procesar cada 10 minutos por defecto
  }

  /**
   * Iniciar el procesamiento automático
   */
  start(intervalMinutes = 10) {
    if (this.isRunning) {
      logger.warn('⚠️ Scheduler ya está ejecutándose');
      return;
    }

    this.intervalMinutes = intervalMinutes;
    this.isRunning = true;

    logger.info(`🚀 Iniciando procesamiento automático de emails cada ${intervalMinutes} minutos`);

    // Procesar inmediatamente al iniciar
    this.processEmails();

    // Configurar intervalo
    this.interval = setInterval(() => {
      this.processEmails();
    }, intervalMinutes * 60 * 1000);

    logger.info('✅ Scheduler iniciado correctamente');
  }

  /**
   * Detener el procesamiento automático
   */
  stop() {
    if (!this.isRunning) {
      logger.warn('⚠️ Scheduler no está ejecutándose');
      return;
    }

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isRunning = false;
    logger.info('🛑 Scheduler detenido');
  }

  /**
   * Procesar emails una vez
   */
  async processEmails() {
    try {
      logger.info('⏰ Ejecutando procesamiento programado de emails...');
      
      const results = await emailAutoProcessor.processEmails();
      
      if (results.processed > 0 || results.created > 0) {
        logger.info(`✅ Procesamiento programado completado: ${results.processed} procesados, ${results.created} creados`);
      } else {
        logger.info('ℹ️ Procesamiento programado completado: sin nuevos emails');
      }

    } catch (error) {
      logger.error('❌ Error en procesamiento programado:', error);
    }
  }

  /**
   * Cambiar intervalo de procesamiento
   */
  setInterval(intervalMinutes) {
    if (this.isRunning) {
      this.stop();
      this.start(intervalMinutes);
    } else {
      this.intervalMinutes = intervalMinutes;
    }
  }

  /**
   * Obtener estado del scheduler
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.intervalMinutes,
      nextRun: this.isRunning ? new Date(Date.now() + this.intervalMinutes * 60 * 1000) : null,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new EmailScheduler();