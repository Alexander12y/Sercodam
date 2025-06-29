const axios = require('axios');
const logger = require('../config/logger');

class MakeWebhookService {
    constructor() {
        this.makeWebhookUrl = process.env.MAKE_WEBHOOK_URL || 'https://hook.eu1.make.com/your-webhook-url';
        this.apiKey = process.env.MAKE_API_KEY || 'your-make-api-key';
        this.timeout = 30000; // 30 segundos
    }

    // Enviar webhook a Make.com cuando una orden cambie a en_proceso
    async enviarOrdenEnProceso(ordenData) {
        try {
            logger.info('Enviando webhook a Make.com - Orden en proceso', {
                ordenId: ordenData.id_op,
                numeroOp: ordenData.numero_op,
                cliente: ordenData.cliente
            });

            // Preparar datos para Make.com
            const webhookData = {
                evento: 'orden_en_proceso',
                timestamp: new Date().toISOString(),
                orden: {
                    id_op: ordenData.id_op,
                    numero_op: ordenData.numero_op,
                    cliente: ordenData.cliente,
                    descripcion_trabajo: ordenData.descripcion_trabajo,
                    observaciones: ordenData.observaciones,
                    prioridad: ordenData.prioridad,
                    fecha_creacion: ordenData.fecha_creacion,
                    fecha_inicio: ordenData.fecha_inicio,
                    fecha_fin: ordenData.fecha_fin,
                    direccion_instalacion: ordenData.direccion_instalacion,
                    contacto_cliente: ordenData.contacto_cliente,
                    telefono_cliente: ordenData.telefono_cliente,
                    estado: ordenData.estado,
                    panos: ordenData.panos || [],
                    materiales: ordenData.materiales || [],
                    herramientas: ordenData.herramientas || []
                }
            };

            // Enviar webhook
            const response = await axios.post(this.makeWebhookUrl, webhookData, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-make-apikey': this.apiKey,
                    'User-Agent': 'Sercodam-OP/1.0'
                },
                timeout: this.timeout
            });

            logger.info('Webhook enviado exitosamente a Make.com', {
                ordenId: ordenData.id_op,
                status: response.status,
                responseData: response.data
            });

            return {
                success: true,
                status: response.status,
                data: response.data
            };

        } catch (error) {
            logger.error('Error enviando webhook a Make.com', {
                ordenId: ordenData.id_op,
                error: error.message,
                status: error.response?.status,
                responseData: error.response?.data
            });

            // No lanzar error para no afectar el flujo principal
            return {
                success: false,
                error: error.message,
                status: error.response?.status
            };
        }
    }

    // Enviar webhook de prueba
    async enviarPrueba(testUrl = null) {
        try {
            // Usar URL de prueba si se proporciona, sino usar la configurada
            const webhookUrl = testUrl || this.makeWebhookUrl;
            
            const testData = {
                evento: 'prueba_conexion',
                timestamp: new Date().toISOString(),
                mensaje: 'Prueba de conexión desde SERCODAM',
                version: '1.0.0',
                testMode: !!testUrl
            };

            logger.info('Enviando prueba de webhook', {
                url: webhookUrl,
                testMode: !!testUrl
            });

            const response = await axios.post(webhookUrl, testData, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-make-apikey': this.apiKey,
                    'User-Agent': 'Sercodam-OP/1.0'
                },
                timeout: this.timeout
            });

            logger.info('Prueba de webhook exitosa', {
                url: webhookUrl,
                status: response.status,
                data: response.data
            });

            return {
                success: true,
                status: response.status,
                data: response.data,
                url: webhookUrl
            };

        } catch (error) {
            logger.error('Error en prueba de webhook', {
                url: testUrl || this.makeWebhookUrl,
                error: error.message,
                status: error.response?.status
            });

            return {
                success: false,
                error: error.message,
                status: error.response?.status,
                url: testUrl || this.makeWebhookUrl
            };
        }
    }

    // Verificar configuración
    verificarConfiguracion() {
        const config = {
            webhookUrl: this.makeWebhookUrl,
            apiKey: this.apiKey ? 'Configurado' : 'No configurado',
            timeout: this.timeout
        };

        logger.info('Configuración de Make Webhook Service:', config);
        return config;
    }
}

module.exports = new MakeWebhookService(); 