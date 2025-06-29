const logger = require('./logger');

// Configuración de webhooks
const webhookConfig = {
    // API Keys para Make.com
    makeApiKeys: {
        // Clave principal para Make.com
        primary: process.env.MAKE_WEBHOOK_SECRET || 'sercodam_make_webhook_2025',
        // Clave secundaria para pruebas
        test: process.env.MAKE_WEBHOOK_TEST_SECRET || 'sercodam_test_webhook_2025'
    },
    
    // Configuración de endpoints
    endpoints: {
        ordenProduccion: '/api/v1/webhook/make/orden-produccion',
        healthCheck: '/api/v1/webhook/make/health'
    },
    
    // Configuración de validación
    validation: {
        maxPayloadSize: '10mb',
        timeout: 30000, // 30 segundos
        retryAttempts: 3
    },
    
    // Configuración de logging
    logging: {
        logAllRequests: process.env.NODE_ENV === 'development',
        logWebhookData: process.env.NODE_ENV === 'development'
    }
};

// Función para validar API key de Make.com
const validateMakeApiKey = (apiKey) => {
    if (!apiKey) {
        logger.warn('Intento de acceso sin API key');
        return false;
    }
    
    const validKeys = Object.values(webhookConfig.makeApiKeys);
    const isValid = validKeys.includes(apiKey);
    
    if (!isValid) {
        logger.warn('API key inválida recibida:', { 
            providedKey: apiKey.substring(0, 10) + '...',
            timestamp: new Date().toISOString()
        });
    }
    
    return isValid;
};

// Función para validar estructura de datos de Make.com
const validateMakeData = (data) => {
    const requiredFields = ['cliente', 'descripcion_trabajo', 'panos'];
    
    for (const field of requiredFields) {
        if (!data[field]) {
            logger.error(`Campo requerido faltante en datos de Make.com: ${field}`);
            return false;
        }
    }
    
    // Validar que panos sea un array
    if (!Array.isArray(data.panos)) {
        logger.error('Campo panos debe ser un array');
        return false;
    }
    
    // Validar cada paño
    for (const pano of data.panos) {
        if (!pano.largo || !pano.ancho || !pano.cantidad) {
            logger.error('Datos de paño incompletos:', pano);
            return false;
        }
    }
    
    return true;
};

// Función para transformar datos de Make.com al formato del sistema
const transformMakeData = (makeData) => {
    try {
        const transformedData = {
            cliente: makeData.cliente,
            descripcion_trabajo: makeData.descripcion_trabajo,
            observaciones: makeData.observaciones || '',
            prioridad: makeData.prioridad || 'media',
            fecha_entrega_estimada: makeData.fecha_entrega ? new Date(makeData.fecha_entrega) : null,
            direccion_instalacion: makeData.direccion_instalacion || '',
            contacto_cliente: makeData.contacto_cliente || '',
            telefono_cliente: makeData.telefono_cliente || '',
            
            // Transformar panos
            panos: makeData.panos.map(pano => ({
                largo_m: parseFloat(pano.largo),
                ancho_m: parseFloat(pano.ancho),
                cantidad: parseInt(pano.cantidad),
                tipo_red: pano.tipo_red || 'nylon',
                calibre: pano.calibre || '18',
                cuadro: pano.cuadro || '1"',
                torsion: pano.torsion || 'torcida',
                refuerzo: pano.refuerzo || 'con refuerzo',
                color: pano.color || 'teñida',
                precio_m2: parseFloat(pano.precio_m2 || 0)
            })),
            
            // Materiales adicionales (si los hay)
            materiales: makeData.materiales || [],
            
            // Herramientas (si las hay)
            herramientas: makeData.herramientas || [],
            
            // Información de facturación
            facturacion: {
                precio_total: parseFloat(makeData.precio_total || 0),
                iva: parseFloat(makeData.iva || 0),
                total_con_iva: parseFloat(makeData.total_con_iva || 0),
                flete: makeData.flete || 'por cobrar'
            }
        };
        
        logger.info('Datos de Make.com transformados exitosamente');
        return transformedData;
        
    } catch (error) {
        logger.error('Error transformando datos de Make.com:', error);
        throw new Error('Error en transformación de datos');
    }
};

module.exports = {
    webhookConfig,
    validateMakeApiKey,
    validateMakeData,
    transformMakeData
}; 