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

// GET /api/v1/ordenes/stats/resumen - Obtener estadísticas de órdenes
router.get('/stats/resumen', asyncHandler(ordenesController.getEstadisticasOrdenes));

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

// POST /api/v1/ordenes/:id/herramientas - Asignar herramientas a orden
router.post('/:id/herramientas',
  asyncHandler(ordenesController.asignarHerramientas)
);

module.exports = router;