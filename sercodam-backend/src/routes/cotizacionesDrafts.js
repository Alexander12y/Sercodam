const express = require('express');
const router = express.Router();
const cotizacionesDraftsController = require('../controllers/cotizacionesDraftsController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);

// POST /api/v1/cotizaciones-drafts - Guardar o actualizar draft
router.post('/', asyncHandler(cotizacionesDraftsController.saveDraft));

// GET /api/v1/cotizaciones-drafts/user/:id_usuario - Obtener draft del usuario
router.get('/user/:id_usuario', asyncHandler(cotizacionesDraftsController.getDraftByUser));

// GET /api/v1/cotizaciones-drafts - Obtener todos los drafts (administradores)
router.get('/', requireRole(['admin', 'supervisor']), asyncHandler(cotizacionesDraftsController.getAllDrafts));

// DELETE /api/v1/cotizaciones-drafts/:id_draft - Eliminar draft específico
router.delete('/:id_draft', requireRole(['admin']), asyncHandler(cotizacionesDraftsController.deleteDraft));

// DELETE /api/v1/cotizaciones-drafts/user/:id_usuario - Eliminar draft del usuario
router.delete('/user/:id_usuario', asyncHandler(cotizacionesDraftsController.deleteUserDraft));

// POST /api/v1/cotizaciones-drafts/cleanup - Limpiar drafts expirados
router.post('/cleanup', requireRole(['admin']), asyncHandler(cotizacionesDraftsController.cleanupExpiredDrafts));

module.exports = router;