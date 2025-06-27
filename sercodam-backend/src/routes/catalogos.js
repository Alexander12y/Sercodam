const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Importar controlador
const catalogosController = require('../controllers/catalogosController');

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// ========== RUTAS DE CATÁLOGOS ==========

// GET /api/v1/catalogos/panos - Obtener Catálogo 1 (Redes por tramo)
router.get('/panos', asyncHandler(catalogosController.getCatalogosPanos));

// GET /api/v1/catalogos/panos/subgrupos - Obtener subgrupos de paños
router.get('/panos/subgrupos', asyncHandler(catalogosController.getSubgruposPanos));

// GET /api/v1/catalogos/materiales - Obtener Catálogo 2 (Materiales consumibles)
router.get('/materiales', asyncHandler(catalogosController.getCatalogosMateriales));

// GET /api/v1/catalogos/materiales/subgrupos - Obtener subgrupos de materiales
router.get('/materiales/subgrupos', asyncHandler(catalogosController.getSubgruposMateriales));

// GET /api/v1/catalogos/herramientas - Obtener Catálogo 3 (Herramientas reutilizables)
router.get('/herramientas', asyncHandler(catalogosController.getCatalogosHerramientas));

// GET /api/v1/catalogos/herramientas/subgrupos - Obtener subgrupos de herramientas
router.get('/herramientas/subgrupos', asyncHandler(catalogosController.getSubgruposHerramientas));

module.exports = router; 