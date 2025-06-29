const express = require('express');
const router = express.Router();
const makeWebhookService = require('../services/makeWebhookService');
const logger = require('../config/logger');

// Configuración específica para webhooks
router.use(express.json({ limit: '10mb' }));
router.use(express.urlencoded({ extended: true, limit: '10mb' }));

// GET /api/v1/webhook/health - Health check
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Webhook service is healthy',
        timestamp: new Date().toISOString()
    });
});

// GET /api/v1/webhook/make-config - Verificar configuración de Make.com
router.get('/make-config', (req, res) => {
    try {
        const config = makeWebhookService.verificarConfiguracion();
        res.json({
            success: true,
            message: 'Configuración de Make.com',
            data: config
        });
    } catch (error) {
        logger.error('Error verificando configuración de Make.com:', error);
        res.status(500).json({
            success: false,
            message: 'Error verificando configuración',
            error: error.message
        });
    }
});

// POST /api/v1/webhook/test-make - Probar webhook a Make.com
router.post('/test-make', async (req, res) => {
    try {
        logger.info('Solicitud de prueba de webhook a Make.com');
        
        // Permitir URL de prueba opcional
        const testUrl = req.body.testUrl;
        
        const resultado = await makeWebhookService.enviarPrueba(testUrl);
        
        if (resultado.success) {
            res.json({
                success: true,
                message: 'Prueba de webhook exitosa',
                data: resultado
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error en prueba de webhook',
                error: resultado.error,
                status: resultado.status
            });
        }
    } catch (error) {
        logger.error('Error en prueba de webhook:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno en prueba de webhook',
            error: error.message
        });
    }
});

module.exports = router; 