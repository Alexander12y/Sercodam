const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const cotizacionesController = require('../controllers/cotizacionesController');

// Rutas públicas (si las hay)
// router.get('/public/:id', asyncHandler(cotizacionesController.getPublicCotizacion));

// Rutas protegidas
router.get('/', authenticateToken, asyncHandler(cotizacionesController.getCotizaciones));
router.get('/estadisticas', authenticateToken, requireRole(['admin', 'supervisor']), asyncHandler(cotizacionesController.getEstadisticas));
router.get('/:id', authenticateToken, asyncHandler(cotizacionesController.getCotizacionById));
router.get('/:id/pdf', authenticateToken, asyncHandler(cotizacionesController.generatePDF));
router.get('/:id/pdf-preview', authenticateToken, asyncHandler(cotizacionesController.generatePDFPreview));

router.post('/', authenticateToken, requireRole(['admin', 'supervisor', 'vendedor']), asyncHandler(cotizacionesController.createCotizacion));
router.put('/:id', authenticateToken, requireRole(['admin', 'supervisor', 'vendedor']), asyncHandler(cotizacionesController.updateCotizacion));
router.patch('/:id/estado', authenticateToken, requireRole(['admin', 'supervisor']), asyncHandler(cotizacionesController.changeEstado));
router.delete('/:id', authenticateToken, requireRole(['admin']), asyncHandler(cotizacionesController.deleteCotizacion));

/**
 * Enviar cotización por email
 */
router.post('/:id/send-email', authenticateToken, requireRole(['admin', 'supervisor']), asyncHandler(cotizacionesController.sendCotizacionEmail));

/**
 * Test de conexión Gmail
 */
router.get('/test-gmail', asyncHandler(cotizacionesController.testGmailConnection));

module.exports = router; 