const db = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../config/logger');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

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

    // GET /api/v1/inventario/panos - Obtener paños con filtros
    getPanos: async (req, res) => {
        try {
            const {
                tipo_red,
                estado,
                ubicacion,
                marca,
                area_min,
                area_max,
                page = 1,
                limit = 50,
                sortBy = 'area_m2',
                sortOrder = 'desc'
            } = req.query;

            let query = db('mv_panos_resumen');

            // Aplicar filtros
            if (tipo_red) {
                query = query.where('tipo_red', 'ilike', `%${tipo_red}%`);
            }
            if (estado) {
                query = query.where('estado', estado);
            }
            if (ubicacion) {
                query = query.where('ubicacion', 'ilike', `%${ubicacion}%`);
            }
            if (marca) {
                query = query.where('marca', 'ilike', `%${marca}%`);
            }
            if (area_min) {
                query = query.where('area_m2', '>=', parseFloat(area_min));
            }
            if (area_max) {
                query = query.where('area_m2', '<=', parseFloat(area_max));
            }

            // Contar total para paginación
            const totalQuery = query.clone();
            const { count } = await totalQuery.count('* as count').first();
            const total = parseInt(count);

            // Aplicar paginación y ordenamiento
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const panos = await query
                .orderBy(sortBy, sortOrder)
                .limit(parseInt(limit))
                .offset(offset);

            res.json({
                success: true,
                data: {
                    panos,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo paños:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/panos/:id - Obtener paño específico
    getPanoById: async (req, res) => {
        try {
            const { id } = req.params;

            const pano = await db('mv_panos_resumen')
                .where('id_item', id)
                .first();

            if (!pano) {
                throw new NotFoundError('Paño no encontrado');
            }

            res.json({
                success: true,
                data: pano
            });

        } catch (error) {
            logger.error('Error obteniendo paño:', error);
            throw error;
        }
    },

    // PUT /api/v1/inventario/panos/:id - Actualizar paño
    updatePano: async (req, res) => {
        const trx = await db.transaction();

        try {
            const { id } = req.params;
            const { estado, ubicacion, precio_x_unidad } = req.body;

            // Verificar que el paño existe
            const panoExistente = await trx('pano')
                .where('id_item', id)
                .first();

            if (!panoExistente) {
                throw new NotFoundError('Paño no encontrado');
            }

            // Actualizar paño
            await trx('pano')
                .where('id_item', id)
                .update({
                    estado,
                    ubicacion,
                    precio_x_unidad,
                    updated_at: db.fn.now()
                });

            // Registrar movimiento si cambió el estado
            if (estado !== panoExistente.estado) {
                await trx('movimiento_inventario').insert({
                    fecha: db.fn.now(),
                    tipo_mov: 'AJUSTE_IN',
                    cantidad: 1,
                    notas: `Cambio de estado: ${panoExistente.estado} → ${estado}`,
                    id_item: id,
                    id_usuario: req.user.id
                });
            }

            await trx.commit();

            // Invalidar cache
            await cache.delPattern('inventario:*');
            await db.raw('REFRESH MATERIALIZED VIEW mv_panos_resumen');

            res.json({
                success: true,
                message: 'Paño actualizado correctamente'
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error actualizando paño:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/materiales - Obtener materiales con filtros
    getMateriales: async (req, res) => {
        try {
            const {
                categoria,
                nivel_stock,
                ubicacion,
                marca,
                page = 1,
                limit = 50,
                sortBy = 'descripcion',
                sortOrder = 'asc'
            } = req.query;

            let query = db('mv_materiales_resumen');

            // Aplicar filtros
            if (categoria) {
                query = query.where('categoria', 'ilike', `%${categoria}%`);
            }
            if (nivel_stock) {
                query = query.where('nivel_stock', nivel_stock);
            }
            if (ubicacion) {
                query = query.where('ubicacion', 'ilike', `%${ubicacion}%`);
            }
            if (marca) {
                query = query.where('marca', 'ilike', `%${marca}%`);
            }

            // Contar total
            const totalQuery = query.clone();
            const { count } = await totalQuery.count('* as count').first();
            const total = parseInt(count);

            // Aplicar paginación
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const materiales = await query
                .orderBy(sortBy, sortOrder)
                .limit(parseInt(limit))
                .offset(offset);

            res.json({
                success: true,
                data: {
                    materiales,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo materiales:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/materiales/categoria/:categoria
    getMaterialesPorCategoria: async (req, res) => {
        try {
            const { categoria } = req.params;

            const materiales = await db('mv_materiales_resumen')
                .where('categoria', 'ilike', `%${categoria}%`)
                .orderBy('descripcion');

            res.json({
                success: true,
                data: materiales
            });

        } catch (error) {
            logger.error('Error obteniendo materiales por categoría:', error);
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

    // GET /api/v1/inventario/alertas - Obtener alertas de stock
    getAlertas: async (req, res) => {
        try {
            // Materiales con stock bajo o sin stock
            const materialesBajos = await db('mv_materiales_resumen')
                .where('nivel_stock', 'in', ['Sin Stock', 'Stock Bajo'])
                .orderBy('nivel_stock')
                .orderBy('descripcion');

            // Paños que necesitan mantenimiento
            const panosMantenimiento = await db('mv_panos_resumen')
                .where('estado', 'in', ['usado', 'dañado'])
                .orderBy('estado')
                .orderBy('area_m2', 'desc');

            // Herramientas que han estado mucho tiempo en uso
            const herramientasUso = await db('mv_herramientas_resumen')
                .where('disponibilidad', 'En Uso')
                .orderBy('nombre');

            res.json({
                success: true,
                data: {
                    materialesBajos,
                    panosMantenimiento,
                    herramientasUso,
                    resumen: {
                        totalAlertas: materialesBajos.length + panosMantenimiento.length + herramientasUso.length,
                        materialesStock: materialesBajos.length,
                        panosMantenimiento: panosMantenimiento.length,
                        herramientasUso: herramientasUso.length
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo alertas:', error);
            throw error;
        }
    }
};

module.exports = inventarioController;
