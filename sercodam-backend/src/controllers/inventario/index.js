const inventarioController = require('./inventarioController');
const panosController = require('./panosController');
const materialesController = require('./materialesController');
const herramientasController = require('./herramientasController');
const movimientosController = require('./movimientosController');

module.exports = {
    // Controladores principales
    inventario: inventarioController,
    panos: panosController,
    materiales: materialesController,
    herramientas: herramientasController,
    movimientos: movimientosController,

    // Métodos del controller principal para compatibilidad
    getResumenInventario: inventarioController.getResumenInventario,
    getCatalogos: inventarioController.getCatalogos,
    verificarDisponibilidad: inventarioController.verificarDisponibilidad,
    getAlertas: inventarioController.getAlertas,

    // Métodos de paños
    getPanos: panosController.getPanos,
    getPanoById: panosController.getPanoById,
    updatePano: panosController.updatePano,

    // Métodos de materiales
    getMateriales: materialesController.getMateriales,
    getMaterialesPorCategoria: materialesController.getMaterialesPorCategoria,
    getMaterialById: materialesController.getMaterialById,
    updateMaterial: materialesController.updateMaterial,
    createMaterial: materialesController.createMaterial,

    // Métodos de herramientas
    getHerramientas: herramientasController.getHerramientas,
    getHerramientasPorCategoria: herramientasController.getHerramientasPorCategoria,
    getHerramientaById: herramientasController.getHerramientaById,
    updateHerramienta: herramientasController.updateHerramienta,
    createHerramienta: herramientasController.createHerramienta,

    // Métodos de movimientos
    getMovimientos: movimientosController.getMovimientos,
    createMovimiento: movimientosController.createMovimiento,
    getMovimientoById: movimientosController.getMovimientoById,
    getEstadisticasMovimientos: movimientosController.getEstadisticasMovimientos
};