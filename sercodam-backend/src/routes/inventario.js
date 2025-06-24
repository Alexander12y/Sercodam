const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const inventarioController = require('../controllers/inventarioController');
const { validateInventarioUpdate, validateMovimiento } = require('../validators/inventarioValidator');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// GET /api/v1/inventario - Obtener resumen del inventario
router.get('/', asyncHandler(inventarioController.getResumenInventario));

// GET /api/v1/inventario/catalogos - Obtener todos los catálogos
router.get('/catalogos', asyncHandler(inventarioController.getCatalogos));

// GET /api/v1/inventario/panos - Obtener paños disponibles
router.get('/panos', asyncHandler(inventarioController.getPanos));

// GET /api/v1/inventario/panos/:id - Obtener paño específico
router.get('/panos/:id', asyncHandler(inventarioController.getPanoById));

// PUT /api/v1/inventario/panos/:id - Actualizar paño
router.put('/panos/:id',
    requireRole(['admin', 'supervisor']),
    validateInventarioUpdate,
    asyncHandler(inventarioController.updatePano)
);

// GET /api/v1/inventario/materiales - Obtener materiales extras
router.get('/materiales', asyncHandler(inventarioController.getMateriales));

// GET /api/v1/inventario/materiales/categoria/:categoria - Obtener materiales por categoría
router.get('/materiales/categoria/:categoria', asyncHandler(inventarioController.getMaterialesPorCategoria));

// GET /api/v1/inventario/materiales/:id - Obtener material específico
router.get('/materiales/:id', asyncHandler(inventarioController.getMaterialById));

// PUT /api/v1/inventario/materiales/:id - Actualizar material
router.put('/materiales/:id',
    requireRole(['admin', 'supervisor']),
    validateInventarioUpdate,
    asyncHandler(inventarioController.updateMaterial)
);

// POST /api/v1/inventario/materiales - Crear nuevo material
router.post('/materiales',
    requireRole(['admin', 'supervisor']),
    validateInventarioUpdate,
    asyncHandler(inventarioController.createMaterial)
);

// GET /api/v1/inventario/herramientas - Obtener herramientas
router.get('/herramientas', asyncHandler(inventarioController.getHerramientas));

// GET /api/v1/inventario/herramientas/categoria/:categoria - Obtener herramientas por categoría
router.get('/herramientas/categoria/:categoria', asyncHandler(inventarioController.getHerramientasPorCategoria));

// GET /api/v1/inventario/herramientas/:id - Obtener herramienta específica
router.get('/herramientas/:id', asyncHandler(inventarioController.getHerramientaById));

// PUT /api/v1/inventario/herramientas/:id - Actualizar herramienta
router.put('/herramientas/:id',
    requireRole(['admin', 'supervisor']),
    validateInventarioUpdate,
    asyncHandler(inventarioController.updateHerramienta)
);

// POST /api/v1/inventario/herramientas - Crear nueva herramienta
router.post('/herramientas',
    requireRole(['admin', 'supervisor']),
    validateInventarioUpdate,
    asyncHandler(inventarioController.createHerramienta)
);

// GET /api/v1/inventario/movimientos - Obtener historial de movimientos
router.get('/movimientos', asyncHandler(inventarioController.getMovimientos));

// POST /api/v1/inventario/movimientos - Crear movimiento de inventario
router.post('/movimientos',
    requireRole(['admin', 'supervisor']),
    validateMovimiento,
    asyncHandler(inventarioController.createMovimiento)
);

// GET /api/v1/inventario/disponibilidad - Verificar disponibilidad de materiales
router.post('/disponibilidad', asyncHandler(inventarioController.verificarDisponibilidad));

// GET /api/v1/inventario/estadisticas - Obtener estadísticas del inventario
router.get('/estadisticas', asyncHandler(inventarioController.getEstadisticas));

// GET /api/v1/inventario/buscar - Buscar en inventario
router.get('/buscar', asyncHandler(inventarioController.buscarInventario));

// GET /api/v1/inventario/alertas - Obtener alertas de stock bajo
router.get('/alertas', asyncHandler(inventarioController.getAlertas));

// GET /api/v1/inventario/export - Exportar inventario
router.get('/export',
    requireRole(['admin', 'supervisor']),
    asyncHandler(inventarioController.exportarInventario)
);

module.exports = router;