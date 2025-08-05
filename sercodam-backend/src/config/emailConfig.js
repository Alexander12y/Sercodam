const logger = require('./logger');

// Configuración del procesamiento de emails
const emailConfig = {
  // Intervalo de procesamiento automático (en minutos)
  processingInterval: process.env.EMAIL_PROCESSING_INTERVAL_MINUTES || 10,
  
  // Habilitar procesamiento automático
  autoProcessingEnabled: process.env.EMAIL_AUTO_PROCESSING_ENABLED === 'true',
  
  // Configuración de Gmail
  gmail: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google',
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    emailAddress: 'sercodamxbuddify@gmail.com'
  },
  
  // Configuración de OpenAI
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    enabled: !!process.env.OPENAI_API_KEY
  },
  
  // Filtros de emails
  emailFilters: [
    'to:sercodamxbuddify@gmail.com subject:"Contacto desde landing page"',
    'to:sercodamxbuddify@gmail.com subject:"Cotización Nueva (Buddify)"',
    'to:sercodamxbuddify@gmail.com subject:"Nuevo Contacto"',
    'to:sercodamxbuddify@gmail.com subject:"Solicitud de Cotización"',
    'to:sercodamxbuddify@gmail.com (cotización OR presupuesto OR proyecto)',
    'to:sercodamxbuddify@gmail.com (redes OR protección OR industrial)'
  ],
  
  // Etiquetas de Gmail
  labels: {
    processed: 'Sercodam-Procesado',
    urgent: 'Sercodam-Urgente',
    followUp: 'Sercodam-Seguimiento'
  },
  
  // Validar configuración
  validate() {
    const errors = [];
    
    if (!this.gmail.clientId) {
      errors.push('GOOGLE_CLIENT_ID no configurado');
    }
    
    if (!this.gmail.clientSecret) {
      errors.push('GOOGLE_CLIENT_SECRET no configurado');
    }
    
    if (!this.gmail.refreshToken) {
      errors.push('GOOGLE_REFRESH_TOKEN no configurado');
    }
    
    if (errors.length > 0) {
      logger.warn('⚠️ Configuración de Gmail incompleta:', errors);
      return false;
    }
    
    if (!this.openai.enabled) {
      logger.info('ℹ️ OpenAI no configurado, usando parsing manual');
    }
    
    logger.info('✅ Configuración de email validada correctamente');
    return true;
  },
  
  // Obtener configuración para logging
  getConfigForLogging() {
    return {
      processingInterval: this.processingInterval,
      autoProcessingEnabled: this.autoProcessingEnabled,
      gmailConfigured: !!(this.gmail.clientId && this.gmail.clientSecret && this.gmail.refreshToken),
      openaiEnabled: this.openai.enabled,
      emailFilters: this.emailFilters.length
    };
  }
};

module.exports = emailConfig;