const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const ordenesController = require('../controllers/ordenesController');
const { validateOrdenCreacion, validateOrdenUpdate } = require('../validators/ordenesValidator');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// GET /api/v1/ordenes - Obtener todas las órdenes con filtros
router.get('/', asyncHandler(ordenesController.getOrdenes));

// GET /api/v1/ordenes/pendientes - Obtener órdenes pendientes
router.get('/pendientes', asyncHandler(ordenesController.getOrdenesPendientes));

// GET /api/v1/ordenes/activas - Obtener órdenes activas
router.get('/activas', asyncHandler(ordenesController.getOrdenesActivas));

// GET /api/v1/ordenes/completadas - Obtener órdenes completadas
router.get('/completadas', asyncHandler(ordenesController.getOrdenesCompletadas));

// GET /api/v1/ordenes/:id - Obtener orden específica
router.get('/:id', asyncHandler(ordenesController.getOrdenById));

// GET /api/v1/ordenes/:id/detalle - Obtener detalle completo de orden
router.get('/:id/detalle', asyncHandler(ordenesController.getOrdenDetalle));

// POST /api/v1/ordenes - Crear nueva orden de producción
router.post('/',
    validateOrdenCreacion,
    asyncHandler(ordenesController.createOrden)
);

// PUT /api/v1/ordenes/:id - Actualizar orden
router.put('/:id',
    validateOrdenUpdate,
    asyncHandler(ordenesController.updateOrden)
);

// PATCH /api/v1/ordenes/:id/estado - Cambiar estado de orden
router.patch('/:id/estado',
    asyncHandler(ordenesController.cambiarEstadoOrden)
);

// POST /api/v1/ordenes/:id/materiales - Agregar materiales a orden
router.post('/:id/materiales',
    asyncHandler(ordenesController.agregarMateriales)
);

// PUT /api/v1/ordenes/:id/materiales/:materialId - Actualizar cantidad de material
router.put('/:id/materiales/:materialId',
    asyncHandler(ordenesController.actualizarMaterial)
);

// DELETE /api/v1/ordenes/:id/materiales/:materialId - Remover material de orden
router.delete('/:id/materiales/:materialId',
    asyncHandler(ordenesController.removerMaterial)
);

// POST /api/v1/ordenes/:id/herramientas - Asignar herramientas a orden
router.post('/:id/herramientas',
    asyncHandler(ordenesController.asignarHerramientas)
);

// PUT /api/v1/ordenes/:id/herramientas/:herramientaId - Actualizar herramienta asignada
router.put('/:id/herramientas/:herramientaId',
    asyncHandler(ordenesController.actualizarHerramienta)
);

// DELETE /api/v1/ordenes/:id/herramientas/:herramientaId - Remover herramienta de orden
router.delete('/:id/herramientas/:herramientaId',
    asyncHandler(ordenesController.removerHerramienta)
);

// POST /api/v1/ordenes/:id/completar - Completar orden
router.post('/:id/completar',
    asyncHandler(ordenesController.completarOrden)
);

// POST /api/v1/ordenes/:id/cancelar - Cancelar orden
router.post('/:id/cancelar',
    requireRole(['admin', 'supervisor']),
    asyncHandler(ordenesController.cancelarOrden)
);

// GET /api/v1/ordenes/:id/pdf - Generar PDF de orden
router.get('/:id/pdf',
    asyncHandler(ordenesController.generarPDF)
);

// GET /api/v1/ordenes/:id/historial - Obtener historial de cambios
router.get('/:id/historial',
    asyncHandler(ordenesController.getHistorialOrden)
);

// POST /api/v1/ordenes/:id/clonar - Clonar orden existente
router.post('/:id/clonar',
    asyncHandler(ordenesController.clonarOrden)
);

// GET /api/v1/ordenes/stats/resumen - Obtener estadísticas de órdenes
router.get('/stats/resumen',
    asyncHandler(ordenesController.getEstadisticasOrdenes)
);

// GET /api/v1/ordenes/export/excel - Exportar órdenes a Excel
router.get('/export/excel',
    requireRole(['admin', 'supervisor']),
    asyncHandler(ordenesController.exportarOrdenes)
);

// POST /api/v1/ordenes/batch/create - Crear múltiples órdenes
router.post('/batch/create',
    requireRole(['admin', 'supervisor']),
    asyncHandler(ordenesController.crearOrdenesLote)
);

module.exports = router;