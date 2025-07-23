const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Importar todos los controladores
const inventarioController = require('../controllers/inventario/inventarioController');
const panosController = require('../controllers/inventario/panosController');
const materialesController = require('../controllers/inventario/materialesController');
const herramientasController = require('../controllers/inventario/herramientasController');
const movimientosController = require('../controllers/inventario/movimientosController');

// Importar validadores
const { 
    validateInventarioUpdate, 
    validateMaterialUpdate,
    validateMovimiento,
    validateMaterialCreacion,
    validateHerramientaCreacion,
    validateDisponibilidad,
    validateQueryParams,
    validateIdParam,
    validateHerramientaUpdate
} = require('../validators/inventarioValidator');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// ========== RUTAS GENERALES DE INVENTARIO ==========
// GET /api/v1/inventario - Obtener resumen del inventario
router.get('/', asyncHandler(inventarioController.getResumenInventario));

// GET /api/v1/inventario/catalogos - Obtener todos los catálogos
router.get('/catalogos', asyncHandler(inventarioController.getCatalogos));

// POST /api/v1/inventario/disponibilidad - Verificar disponibilidad de materiales
router.post('/disponibilidad', 
    validateDisponibilidad,
    asyncHandler(inventarioController.verificarDisponibilidad)
);

// GET /api/v1/inventario/alertas - Obtener alertas de stock bajo
router.get('/alertas', asyncHandler(inventarioController.getAlertas));

// ========== RUTAS DE PAÑOS ==========
// GET /api/v1/inventario/panos - Obtener paños disponibles
router.get('/panos', 
    validateQueryParams,
    asyncHandler(panosController.getPanos)
);

// GET /api/v1/inventario/panos/subgrupos - Obtener subgrupos de paños
router.get('/panos/subgrupos', 
    asyncHandler(panosController.getSubgrupos)
);

// GET /api/v1/inventario/panos/calibres - Obtener calibres disponibles
router.get('/panos/calibres', 
    asyncHandler(panosController.getCalibres)
);

// GET /api/v1/inventario/panos/catalogos/nylon - Obtener catálogos para nylon
router.get('/panos/catalogos/nylon', 
    asyncHandler(panosController.getNylonCatalogos)
);

// GET /api/v1/inventario/panos/catalogos/polipropileno - Obtener catálogos para polipropileno
router.get('/panos/catalogos/polipropileno', 
    asyncHandler(panosController.getPolipropilenoCatalogos)
);

// GET /api/v1/inventario/panos/catalogos/lona - Obtener catálogos para lona
router.get('/panos/catalogos/lona', 
    asyncHandler(panosController.getLonaCatalogos)
);

// GET /api/v1/inventario/panos/catalogos/malla-sombra - Obtener catálogos para malla sombra
router.get('/panos/catalogos/malla-sombra', 
    asyncHandler(panosController.getMallaSombraCatalogos)
);

// GET /api/v1/inventario/panos/catalogos/nylon/full - Obtener datos completos de nylon
router.get('/panos/catalogos/nylon/full', 
    asyncHandler(panosController.getNylonFullData)
);

// GET /api/v1/inventario/panos/catalogos/polipropileno/full - Obtener datos completos de polipropileno
router.get('/panos/catalogos/polipropileno/full', 
    asyncHandler(panosController.getPolipropilenoFullData)
);

// GET /api/v1/inventario/panos/catalogos/lona/full - Obtener datos completos de lona
router.get('/panos/catalogos/lona/full', 
    asyncHandler(panosController.getLonaFullData)
);

// GET /api/v1/inventario/panos/catalogos/malla-sombra/full - Obtener datos completos de malla sombra
router.get('/panos/catalogos/malla-sombra/full', 
    asyncHandler(panosController.getMallaSombraFullData)
);

// POST /api/v1/inventario/panos/calculate-dimensions - Calcular dimensiones recomendadas para múltiples cortes
router.post('/panos/calculate-dimensions', 
    asyncHandler(panosController.calculateRecommendedDimensions)
);

// GET /api/v1/inventario/panos/:id - Obtener paño específico
router.get('/panos/:id', 
    validateIdParam,
    asyncHandler(panosController.getPanoById)
);

// POST /api/v1/inventario/panos - Crear nuevo paño
router.post('/panos', 
    requireRole(['admin', 'supervisor']),
    asyncHandler(panosController.createPano)
);

// PUT /api/v1/inventario/panos/:id - Actualizar paño
router.put('/panos/:id', 
    validateIdParam,
    requireRole(['admin', 'supervisor']),
    validateInventarioUpdate,
    asyncHandler(panosController.updatePano)
);

// DELETE /api/v1/inventario/panos/:id - Eliminar paño
router.delete('/panos/:id', 
    validateIdParam,
    requireRole(['admin']),
    asyncHandler(panosController.deletePano)
);

// POST /api/v1/inventario/panos/entrada - Registrar entrada de paño
router.post('/panos/entrada', 
    requireRole(['admin', 'supervisor']),
    asyncHandler(panosController.entradaPano)
);

// POST /api/v1/inventario/panos/salida - Registrar salida de paño
router.post('/panos/salida', 
    requireRole(['admin', 'supervisor']),
    asyncHandler(panosController.salidaPano)
);

// ========== RUTAS DE MATERIALES ==========
// GET /api/v1/inventario/materiales - Obtener materiales extras
router.get('/materiales', 
    validateQueryParams,
    asyncHandler(materialesController.getMateriales)
);

// GET /api/v1/inventario/materiales/categorias - Obtener categorías disponibles
router.get('/materiales/categorias', 
    asyncHandler(materialesController.getCategorias)
);

// GET /api/v1/inventario/materiales/subgrupos - Obtener subgrupos de materiales
router.get('/materiales/subgrupos', 
    asyncHandler(materialesController.getSubgrupos)
);

// GET /api/v1/inventario/materiales/categoria/:categoria - Obtener materiales por categoría
router.get('/materiales/categoria/:categoria', 
    asyncHandler(materialesController.getMaterialesPorCategoria)
);

// GET /api/v1/inventario/materiales/:id - Obtener material específico
router.get('/materiales/:id', 
    validateIdParam,
    asyncHandler(materialesController.getMaterialById)
);

// POST /api/v1/inventario/materiales - Crear nuevo material
router.post('/materiales', 
    requireRole(['admin', 'supervisor']),
    asyncHandler(materialesController.createMaterial)
);

// PUT /api/v1/inventario/materiales/:id - Actualizar material
router.put('/materiales/:id', 
    validateIdParam,
    requireRole(['admin', 'supervisor']),
    validateMaterialUpdate,
    asyncHandler(materialesController.updateMaterial)
);

// DELETE /api/v1/inventario/materiales/:id - Eliminar material
router.delete('/materiales/:id', 
    validateIdParam,
    requireRole(['admin']),
    asyncHandler(materialesController.deleteMaterial)
);

// POST /api/v1/inventario/materiales/entrada - Registrar entrada de material
router.post('/materiales/entrada', 
    requireRole(['admin', 'supervisor']),
    asyncHandler(materialesController.entradaMaterial)
);

// POST /api/v1/inventario/materiales/salida - Registrar salida de material
router.post('/materiales/salida', 
    requireRole(['admin', 'supervisor']),
    asyncHandler(materialesController.salidaMaterial)
);

// ========== RUTAS DE HERRAMIENTAS ==========
// GET /api/v1/inventario/herramientas - Obtener herramientas
router.get('/herramientas', 
    validateQueryParams,
    asyncHandler(herramientasController.getHerramientas)
);

// GET /api/v1/inventario/herramientas/categorias - Obtener categorías de herramientas
router.get('/herramientas/categorias', 
    asyncHandler(herramientasController.getCategorias)
);

// GET /api/v1/inventario/herramientas/estados - Obtener estados de calidad
router.get('/herramientas/estados', 
    asyncHandler(herramientasController.getEstados)
);

// GET /api/v1/inventario/herramientas/ubicaciones - Obtener ubicaciones
router.get('/herramientas/ubicaciones', 
    asyncHandler(herramientasController.getUbicaciones)
);

// GET /api/v1/inventario/herramientas/categoria/:categoria - Obtener herramientas por categoría
router.get('/herramientas/categoria/:categoria', 
    asyncHandler(herramientasController.getHerramientasPorCategoria)
);

// GET /api/v1/inventario/herramientas/:id - Obtener herramienta específica
router.get('/herramientas/:id', 
    validateIdParam,
    asyncHandler(herramientasController.getHerramientaById)
);

// POST /api/v1/inventario/herramientas - Crear nueva herramienta
router.post('/herramientas', 
    requireRole(['admin', 'supervisor']),
    validateHerramientaCreacion,
    asyncHandler(herramientasController.createHerramienta)
);

// PUT /api/v1/inventario/herramientas/:id - Actualizar herramienta
router.put('/herramientas/:id', 
    requireRole(['admin', 'supervisor']),
    validateIdParam,
    validateHerramientaUpdate,
    asyncHandler(herramientasController.updateHerramienta)
);

// DELETE /api/v1/inventario/herramientas/:id - Eliminar herramienta
router.delete('/herramientas/:id', 
    requireRole(['admin']),
    validateIdParam,
    asyncHandler(herramientasController.deleteHerramienta)
);

// POST /api/v1/inventario/herramientas/entrada - Registrar entrada de herramienta
router.post('/herramientas/entrada', 
    requireRole(['admin', 'supervisor']),
    asyncHandler(herramientasController.entradaHerramienta)
);

// POST /api/v1/inventario/herramientas/salida - Registrar salida de herramienta
router.post('/herramientas/salida', 
    requireRole(['admin', 'supervisor']),
    asyncHandler(herramientasController.salidaHerramienta)
);

// ========== RUTAS DE MOVIMIENTOS ==========
// GET /api/v1/inventario/movimientos - Obtener historial de movimientos
router.get('/movimientos', 
    validateQueryParams,
    asyncHandler(movimientosController.getMovimientos)
);

// POST /api/v1/inventario/movimientos - Crear movimiento de inventario
router.post('/movimientos',
    requireRole(['admin', 'supervisor']),
    validateMovimiento,
    asyncHandler(movimientosController.createMovimiento)
);

module.exports = router;