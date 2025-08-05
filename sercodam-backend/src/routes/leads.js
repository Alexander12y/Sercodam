const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Importar controlador
const leadsController = require('../controllers/leadsController');

// ========== RUTAS DE LEADS ==========

// POST /api/v1/leads/webhook - Webhook para recibir leads desde Make.com (sin autenticación)
router.post('/webhook', 
    asyncHandler(leadsController.receiveLeadFromMake)
);

// GET /api/v1/leads - Obtener todos los leads con filtros
router.get('/', 
    authenticateToken,
    asyncHandler(leadsController.getLeads)
);

// GET /api/v1/leads/stats - Obtener estadísticas de leads
router.get('/stats', 
    authenticateToken,
    asyncHandler(leadsController.getLeadsStats)
);

// GET /api/v1/leads/unread/count - Obtener conteo de leads no leídos
router.get('/unread/count', 
    authenticateToken,
    asyncHandler(leadsController.getUnreadLeadsCount)
);

// GET /api/v1/leads/:id - Obtener lead específico
router.get('/:id', 
    authenticateToken,
    asyncHandler(leadsController.getLeadById)
);

// PUT /api/v1/leads/:id - Actualizar lead
router.put('/:id', 
    authenticateToken, 
    requireRole(['admin', 'supervisor']), 
    asyncHandler(leadsController.updateLead)
);

// DELETE /api/v1/leads/:id - Eliminar lead
router.delete('/:id', 
    authenticateToken, 
    requireRole(['admin']), 
    asyncHandler(leadsController.deleteLead)
);

// POST /api/v1/leads/:id/convert-to-client - Convertir lead a cliente
router.post('/:id/convert-to-client', 
    authenticateToken, 
    requireRole(['admin', 'supervisor']), 
    asyncHandler(leadsController.convertToClient)
);

// ========== RUTAS DE PROCESAMIENTO AUTOMÁTICO ==========

// POST /api/v1/leads/process-emails - Procesar emails automáticamente
router.post('/process-emails', 
    authenticateToken, 
    requireRole(['admin', 'supervisor']), 
    asyncHandler(leadsController.processEmails)
);

// POST /api/v1/leads/process-email/:emailId - Procesar email específico
router.post('/process-email/:emailId', 
    authenticateToken, 
    requireRole(['admin', 'supervisor']), 
    asyncHandler(leadsController.processSingleEmail)
);

// GET /api/v1/leads/email-status - Obtener estado del procesamiento
router.get('/email-status', 
    authenticateToken, 
    requireRole(['admin', 'supervisor']), 
    asyncHandler(leadsController.getEmailProcessingStatus)
);

// GET /api/v1/leads/gmail-emails - Obtener emails de Gmail (para testing)
router.get('/gmail-emails', 
    authenticateToken, 
    requireRole(['admin', 'supervisor']), 
    asyncHandler(leadsController.getGmailEmails)
);

module.exports = router; 