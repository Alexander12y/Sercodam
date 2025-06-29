const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const draftsController = require('../controllers/draftsController');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// POST /api/v1/drafts - Guardar o actualizar draft
router.post('/', asyncHandler(draftsController.saveDraft));

// GET /api/v1/drafts/:id_usuario - Obtener draft del usuario
router.get('/user/:id_usuario', asyncHandler(draftsController.getDraftByUser));

// GET /api/v1/drafts - Obtener todos los drafts (solo administradores)
router.get('/', requireRole(['admin', 'supervisor']), asyncHandler(draftsController.getAllDrafts));

// DELETE /api/v1/drafts/:id_draft - Eliminar draft específico
router.delete('/:id_draft', requireRole(['admin']), asyncHandler(draftsController.deleteDraft));

// DELETE /api/v1/drafts/user/:id_usuario - Eliminar draft del usuario
router.delete('/user/:id_usuario', asyncHandler(draftsController.deleteUserDraft));

// POST /api/v1/drafts/cleanup - Limpiar drafts expirados (solo administradores)
router.post('/cleanup', requireRole(['admin']), asyncHandler(draftsController.cleanupExpiredDrafts));

module.exports = router; 