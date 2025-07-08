const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Importar controlador
const clientesController = require('../controllers/clientesController');

// Importar validadores
const {
    validateClienteCreacion,
    validateClienteUpdate,
    validateIdParam,
    validateSearchQuery,
    validateQueryParams,
    validateOrdenesClienteQuery
} = require('../validators/clientesValidator');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// ========== RUTAS DE CLIENTES ==========

// GET /api/v1/clientes - Obtener todos los clientes con filtros
router.get('/', 
    validateQueryParams,
    asyncHandler(clientesController.getClientes)
);

// GET /api/v1/clientes/search - Búsqueda de clientes para autocompletado
router.get('/search', 
    validateSearchQuery,
    asyncHandler(clientesController.searchClientes)
);

// GET /api/v1/clientes/:id - Obtener cliente específico
router.get('/:id', 
    validateIdParam,
    asyncHandler(clientesController.getClienteById)
);

// GET /api/v1/clientes/:id/ordenes - Obtener órdenes de un cliente
router.get('/:id/ordenes', 
    validateOrdenesClienteQuery,
    asyncHandler(clientesController.getOrdenesCliente)
);

// POST /api/v1/clientes - Crear nuevo cliente
router.post('/', 
    requireRole(['admin', 'supervisor']),
    validateClienteCreacion,
    asyncHandler(clientesController.createCliente)
);

// PUT /api/v1/clientes/:id - Actualizar cliente
router.put('/:id', 
    requireRole(['admin', 'supervisor']),
    validateClienteUpdate,
    asyncHandler(clientesController.updateCliente)
);

// DELETE /api/v1/clientes/:id - Eliminar cliente
router.delete('/:id', 
    requireRole(['admin']),
    validateIdParam,
    asyncHandler(clientesController.deleteCliente)
);

module.exports = router; 