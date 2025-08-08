const express = require('express');
const router = express.Router();
const facturaController = require('../controllers/facturaController');
const { requireRole } = require('../middleware/authMiddleware');

// Apply admin role requirement to all routes
router.use(requireRole(['admin']));

// Get all invoices with filters and pagination
router.get('/', facturaController.getFacturas);

// Get invoice statistics
router.get('/stats', facturaController.getFacturaStats);

// Get single invoice by ID
router.get('/:id', facturaController.getFacturaById);

// Create new invoice
router.post('/', facturaController.createFactura);

// Update invoice
router.put('/:id', facturaController.updateFactura);

// Change invoice status
router.patch('/:id/status', facturaController.changeFacturaStatus);

// Register payment for invoice
router.post('/:id_factura/pagos', facturaController.registerPago);

// Delete invoice (only drafts)
router.delete('/:id', facturaController.deleteFactura);

module.exports = router;
