const db = require('../../config/database');
const { cache } = require('../../config/redis');
const logger = require('../../config/logger');
const { ValidationError } = require('../../middleware/errorHandler');

const inventarioController = {
    // GET /api/v1/inventario - Resumen general del inventario
    getResumenInventario: async (req, res) => {
        const cacheKey = 'inventario:resumen';

        try {
            // Intentar obtener del cache primero
            const cached = await cache.get(cacheKey);
            if (cached) {
                return res.json({
                    success: true,
                    data: cached,
                    fromCache: true
                });
            }

            // Obtener estadísticas de paños
            const panos = await db('mv_panos_resumen')
                .select(
                    db.raw('COUNT(*) as total'),
                    db.raw('SUM(area_m2) as area_total'),
                    db.raw('COUNT(CASE WHEN estado = \'disponible\' THEN 1 END) as disponibles')
                )
                .first();

            // Obtener estadísticas de materiales
            const materiales = await db('mv_materiales_resumen')
                .select(
                    db.raw('COUNT(*) as total'),
                    db.raw('COUNT(CASE WHEN nivel_stock = \'Sin Stock\' THEN 1 END) as sin_stock'),
                    db.raw('COUNT(CASE WHEN nivel_stock = \'Stock Bajo\' THEN 1 END) as stock_bajo')
                )
                .first();

            // Obtener estadísticas de herramientas
            const herramientas = await db('mv_herramientas_resumen')
                .select(
                    db.raw('COUNT(*) as total'),
                    db.raw('COUNT(CASE WHEN disponibilidad = \'Disponible\' THEN 1 END) as disponibles'),
                    db.raw('COUNT(CASE WHEN disponibilidad = \'En Uso\' THEN 1 END) as en_uso')
                )
                .first();

            const resumen = {
                panos: {
                    total: parseInt(panos.total),
                    areaTotal: parseFloat(panos.area_total) || 0,
                    disponibles: parseInt(panos.disponibles)
                },
                materiales: {
                    total: parseInt(materiales.total),
                    sinStock: parseInt(materiales.sin_stock),
                    stockBajo: parseInt(materiales.stock_bajo)
                },
                herramientas: {
                    total: parseInt(herramientas.total),
                    disponibles: parseInt(herramientas.disponibles),
                    enUso: parseInt(herramientas.en_uso)
                },
                ultimaActualizacion: new Date().toISOString()
            };

            // Guardar en cache por 5 minutos
            await cache.set(cacheKey, resumen, 300);

            res.json({
                success: true,
                data: resumen
            });

        } catch (error) {
            logger.error('Error obteniendo resumen de inventario:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/catalogos - Obtener estructura de catálogos
    getCatalogos: async (req, res) => {
        try {
            const catalogos = {
                catalogo1: {
                    nombre: 'Paños de Redes',
                    tipos: await db('red_producto')
                        .distinct('tipo_red')
                        .orderBy('tipo_red'),
                    subgrupos: await db('red_producto')
                        .select('tipo_red', 'marca')
                        .groupBy('tipo_red', 'marca')
                        .orderBy('tipo_red', 'marca')
                },
                catalogo2: {
                    nombre: 'Materiales Consumibles',
                    categorias: await db('materiales_extras')
                        .distinct('categoria')
                        .whereNotNull('categoria')
                        .orderBy('categoria')
                },
                catalogo3: {
                    nombre: 'Herramientas Reutilizables',
                    categorias: await db('herramientas')
                        .distinct('categoria')
                        .whereNotNull('categoria')
                        .orderBy('categoria')
                }
            };

            res.json({
                success: true,
                data: catalogos
            });

        } catch (error) {
            logger.error('Error obteniendo catálogos:', error);
            throw error;
        }
    },

    // POST /api/v1/inventario/disponibilidad - Verificar disponibilidad
    verificarDisponibilidad: async (req, res) => {
        try {
            const { items } = req.body;

            if (!Array.isArray(items)) {
                throw new ValidationError('Items debe ser un array');
            }

            const resultados = [];

            for (const item of items) {
                const { tipo, id_item, cantidad_requerida } = item;

                let disponible = false;
                let cantidad_disponible = 0;
                let detalles = {};

                if (tipo === 'PANO') {
                    const pano = await db('mv_panos_resumen')
                        .where('id_item', id_item)
                        .where('estado', 'disponible')
                        .first();

                    disponible = !!pano;
                    cantidad_disponible = pano ? 1 : 0;
                    detalles = pano || {};

                } else if (tipo === 'MATERIAL') {
                    const material = await db('mv_materiales_resumen')
                        .where('id_item', id_item)
                        .first();

                    if (material) {
                        cantidad_disponible = material.cantidad_disponible;
                        disponible = cantidad_disponible >= cantidad_requerida;
                        detalles = material;
                    }

                } else if (tipo === 'HERRAMIENTA') {
                    const herramienta = await db('mv_herramientas_resumen')
                        .where('id_item', id_item)
                        .where('disponibilidad', 'Disponible')
                        .first();

                    disponible = !!herramienta;
                    cantidad_disponible = herramienta ? 1 : 0;
                    detalles = herramienta || {};
                }

                resultados.push({
                    ...item,
                    disponible,
                    cantidad_disponible,
                    detalles
                });
            }

            res.json({
                success: true,
                data: resultados
            });

        } catch (error) {
            logger.error('Error verificando disponibilidad:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/alertas - Obtener alertas de stock bajo
    getAlertas: async (req, res) => {
        try {
            // 1. Materiales cuyo stock disponible es menor o igual al mínimo
            const materialesBajos = await db('materiales_extras')
                .whereRaw('cantidad_disponible <= stock_minimo')
                .orderBy('categoria')
                .orderBy('descripcion');

            // 2. Herramientas con cantidad disponible menor o igual al mínimo
            const herramientasBajas = await db('herramientas')
                .whereRaw('cantidad_disponible <= stock_minimo')
                .orderBy('categoria')
                .orderBy('descripcion');

            // 3. Paños con área disponible menor o igual al mínimo configurado
            const panosBajos = await db('pano as p')
                .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                .select('p.*', 'rp.tipo_red', 'rp.descripcion')
                .whereRaw('p.stock_minimo > 0')
                .andWhereRaw('p.area_m2 <= p.stock_minimo')
                .orderBy('p.area_m2', 'asc');

            const resumen = {
                totalAlertas: materialesBajos.length + herramientasBajas.length + panosBajos.length,
                materialesStock: materialesBajos.length,
                herramientasStock: herramientasBajas.length,
                panosStock: panosBajos.length
            };

            res.json({
                success: true,
                data: {
                    materialesBajos,
                    herramientasBajas,
                    panosBajos,
                    resumen
                }
            });
        } catch (error) {
            logger.error('Error obteniendo alertas:', error);
            throw error;
        }
    }
};

module.exports = inventarioController;