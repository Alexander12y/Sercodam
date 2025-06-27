const db = require('../../config/database');
const { cache } = require('../../config/redis');
const logger = require('../../config/logger');
const { NotFoundError, ValidationError } = require('../../middleware/errorHandler');

const movimientosController = {
    // GET /api/v1/inventario/movimientos - Obtener historial de movimientos
    getMovimientos: async (req, res) => {
        try {
            const { 
                tipo_mov,
                id_item,
                id_op,
                fecha_desde,
                fecha_hasta,
                page = 1, 
                limit = 50,
                sortBy = 'fecha',
                sortOrder = 'desc'
            } = req.query;

            let query = db('movimiento_inventario as mi')
                .leftJoin('inventario_item as ii', 'mi.id_item', 'ii.id_item')
                .leftJoin('orden_produccion as op', 'mi.id_op', 'op.id_op')
                .leftJoin('usuario as u', 'mi.id_usuario', 'u.id')
                .select(
                    'mi.*',
                    'ii.tipo_item',
                    'op.cliente',
                    'u.nombre as usuario_nombre'
                );

            // Aplicar filtros
            if (tipo_mov) {
                query = query.where('mi.tipo_mov', tipo_mov);
            }
            if (id_item) {
                query = query.where('mi.id_item', id_item);
            }
            if (id_op) {
                query = query.where('mi.id_op', id_op);
            }
            if (fecha_desde) {
                query = query.where('mi.fecha', '>=', fecha_desde);
            }
            if (fecha_hasta) {
                query = query.where('mi.fecha', '<=', fecha_hasta);
            }

            // Contar total
            const totalQuery = query.clone();
            const { count } = await totalQuery.count('* as count').first();
            const total = parseInt(count);

            // Aplicar paginación
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const movimientos = await query
                .orderBy(`mi.${sortBy}`, sortOrder)
                .limit(parseInt(limit))
                .offset(offset);

            // Enriquecer datos con información del item
            const movimientosEnriquecidos = await Promise.all(
                movimientos.map(async (movimiento) => {
                    let detalleItem = null;

                    if (movimiento.tipo_item === 'PANO') {
                        detalleItem = await db('mv_panos_resumen')
                            .where('id_item', movimiento.id_item)
                            .first();
                    } else if (movimiento.tipo_item === 'EXTRA') {
                        // Verificar si es material o herramienta
                        const material = await db('mv_materiales_resumen')
                            .where('id_item', movimiento.id_item)
                            .first();
                        
                        if (material) {
                            detalleItem = { ...material, subtipo: 'MATERIAL' };
                        } else {
                            const herramienta = await db('mv_herramientas_resumen')
                                .where('id_item', movimiento.id_item)
                                .first();
                            if (herramienta) {
                                detalleItem = { ...herramienta, subtipo: 'HERRAMIENTA' };
                            }
                        }
                    }

                    return {
                        ...movimiento,
                        detalle_item: detalleItem
                    };
                })
            );

            res.json({
                success: true,
                data: {
                    movimientos: movimientosEnriquecidos,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo movimientos:', error);
            throw error;
        }
    },

    // POST /api/v1/inventario/movimientos - Crear movimiento de inventario
    createMovimiento: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const {
                tipo_mov,
                cantidad,
                id_item,
                id_op,
                notas
            } = req.body;

            // Verificar que el item existe
            const item = await trx('inventario_item')
                .where('id_item', id_item)
                .first();

            if (!item) {
                throw new NotFoundError('Item no encontrado');
            }

            // Verificar orden si se proporciona
            if (id_op) {
                const orden = await trx('orden_produccion')
                    .where('id_op', id_op)
                    .first();

                if (!orden) {
                    throw new NotFoundError('Orden de producción no encontrada');
                }
            }

            // Validaciones específicas por tipo de movimiento
            if (tipo_mov === 'CONSUMO' || tipo_mov === 'AJUSTE_OUT') {
                // Verificar que hay suficiente stock para materiales
                if (item.tipo_item === 'EXTRA') {
                    const material = await trx('materiales_extras')
                        .where('id_item', id_item)
                        .first();

                    if (material && material.cantidad_disponible < cantidad) {
                        throw new ValidationError('Stock insuficiente para realizar el movimiento');
                    }
                }
            }

            // Crear movimiento
            const [movimientoId] = await trx('movimiento_inventario')
                .insert({
                    fecha: db.fn.now(),
                    tipo_mov,
                    cantidad,
                    notas,
                    id_item,
                    id_op,
                    id_usuario: req.user.id
                })
                .returning('id_movimiento');

            // Actualizar stock si es material
            if (item.tipo_item === 'EXTRA') {
                const material = await trx('materiales_extras')
                    .where('id_item', id_item)
                    .first();

                if (material) {
                    let nuevaCantidad = material.cantidad_disponible;

                    switch (tipo_mov) {
                        case 'CONSUMO':
                        case 'AJUSTE_OUT':
                            nuevaCantidad -= cantidad;
                            break;
                        case 'AJUSTE_IN':
                        case 'DEVOLUCION':
                            nuevaCantidad += cantidad;
                            break;
                    }

                    await trx('materiales_extras')
                        .where('id_item', id_item)
                        .update({
                            cantidad_disponible: Math.max(0, nuevaCantidad),
                            última_modificación: db.fn.now()
                        });
                }
            }

            // Actualizar estado de paño si aplica
            if (item.tipo_item === 'PANO' && (tipo_mov === 'CONSUMO' || tipo_mov === 'ASIGNACION')) {
                await trx('pano')
                    .where('id_item', id_item)
                    .update({ estado: 'reservado' });
            }

            await trx.commit();

            // Responder inmediatamente al frontend
            res.status(201).json({
                success: true,
                message: 'Movimiento registrado correctamente',
                data: { id_movimiento: movimientoId }
            });

            // Ejecutar operaciones pesadas en background (no bloquean la respuesta)
            setImmediate(async () => {
                try {
                    // Invalidar cache
                    await cache.delPattern('inventario:*');
                    
                    // Refrescar vistas materializadas
                    await db.raw('REFRESH MATERIALIZED VIEW mv_panos_resumen');
                    await db.raw('REFRESH MATERIALIZED VIEW mv_materiales_resumen');
                    await db.raw('REFRESH MATERIALIZED VIEW mv_herramientas_resumen');
                } catch (error) {
                    logger.error('Error en operaciones background:', error);
                }
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error creando movimiento:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/movimientos/:id - Obtener movimiento específico
    getMovimientoById: async (req, res) => {
        try {
            const { id } = req.params;

            const movimiento = await db('movimiento_inventario as mi')
                .leftJoin('inventario_item as ii', 'mi.id_item', 'ii.id_item')
                .leftJoin('orden_produccion as op', 'mi.id_op', 'op.id_op')
                .leftJoin('usuario as u', 'mi.id_usuario', 'u.id')
                .where('mi.id_movimiento', id)
                .select(
                    'mi.*',
                    'ii.tipo_item',
                    'op.cliente',
                    'op.estado as estado_orden',
                    'u.nombre as usuario_nombre',
                    'u.username'
                )
                .first();

            if (!movimiento) {
                throw new NotFoundError('Movimiento no encontrado');
            }

            // Obtener detalle del item
            let detalleItem = null;
            if (movimiento.tipo_item === 'PANO') {
                detalleItem = await db('mv_panos_resumen')
                    .where('id_item', movimiento.id_item)
                    .first();
            } else if (movimiento.tipo_item === 'EXTRA') {
                const material = await db('mv_materiales_resumen')
                    .where('id_item', movimiento.id_item)
                    .first();
                
                if (material) {
                    detalleItem = { ...material, subtipo: 'MATERIAL' };
                } else {
                    const herramienta = await db('mv_herramientas_resumen')
                        .where('id_item', movimiento.id_item)
                        .first();
                    if (herramienta) {
                        detalleItem = { ...herramienta, subtipo: 'HERRAMIENTA' };
                    }
                }
            }

            res.json({
                success: true,
                data: {
                    ...movimiento,
                    detalle_item: detalleItem
                }
            });

        } catch (error) {
            logger.error('Error obteniendo movimiento:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/movimientos/stats/resumen - Estadísticas de movimientos
    getEstadisticasMovimientos: async (req, res) => {
        try {
            const { fecha_desde, fecha_hasta } = req.query;

            let baseQuery = db('movimiento_inventario');

            // Aplicar filtros de fecha
            if (fecha_desde) {
                baseQuery = baseQuery.where('fecha', '>=', fecha_desde);
            }
            if (fecha_hasta) {
                baseQuery = baseQuery.where('fecha', '<=', fecha_hasta);
            }

            // Estadísticas por tipo de movimiento
            const estadisticasTipo = await baseQuery.clone()
                .select('tipo_mov')
                .count('* as total')
                .sum('cantidad as cantidad_total')
                .groupBy('tipo_mov')
                .orderBy('total', 'desc');

            // Movimientos por día (últimos 30 días)
            const movimientosPorDia = await db('movimiento_inventario')
                .select(
                    db.raw('DATE(fecha) as dia'),
                    db.raw('COUNT(*) as total_movimientos'),
                    db.raw('SUM(cantidad) as cantidad_total')
                )
                .where('fecha', '>=', db.raw("NOW() - INTERVAL '30 days'"))
                .groupBy(db.raw('DATE(fecha)'))
                .orderBy('dia', 'desc');

            // Top items con más movimientos
            const topItems = await baseQuery.clone()
                .select(
                    'mi.id_item',
                    'ii.tipo_item'
                )
                .count('* as total_movimientos')
                .sum('mi.cantidad as cantidad_total')
                .join('inventario_item as ii', 'mi.id_item', 'ii.id_item')
                .groupBy('mi.id_item', 'ii.tipo_item')
                .orderBy('total_movimientos', 'desc')
                .limit(10);

            res.json({
                success: true,
                data: {
                    estadisticasTipo,
                    movimientosPorDia,
                    topItems,
                    periodo: {
                        desde: fecha_desde || 'Sin filtro',
                        hasta: fecha_hasta || 'Sin filtro'
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo estadísticas de movimientos:', error);
            throw error;
        }
    }
};

module.exports = movimientosController;