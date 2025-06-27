const db = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../config/logger');
const { NotFoundError, ValidationError, ConflictError } = require('../middleware/errorHandler');

// Función helper para verificar si existe una vista materializada
async function checkViewExists(viewName) {
    try {
        const result = await db.raw(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = '${viewName}' 
                AND table_schema = 'catalogo_1'
            );
        `);
        return result.rows[0].exists;
    } catch (error) {
        logger.warn(`Error verificando vista ${viewName}:`, error.message);
        return false;
    }
}

// Función helper para obtener datos de paños (con o sin vista materializada)
async function getPanoData(id_item) {
    const viewExists = await checkViewExists('mv_panos_resumen');
    
    if (viewExists) {
        return await db('mv_panos_resumen')
            .where('id_item', id_item)
            .first();
    } else {
        // Consulta directa a la tabla pano
        return await db('pano')
            .where('id_item', id_item)
            .select('*')
            .first();
    }
}

// Función helper para obtener datos de materiales (con o sin vista materializada)
async function getMaterialData(id_item) {
    const viewExists = await checkViewExists('mv_materiales_resumen');
    
    if (viewExists) {
        return await db('mv_materiales_resumen')
            .where('id_item', id_item)
            .first();
    } else {
        // Consulta directa a las tablas de materiales
        // Intentar en materiales_extras primero
        let material = await db('materiales_extras')
            .where('id_item', id_item)
            .first();
        
        if (!material) {
            // Si no está en materiales_extras, buscar en otras tablas
            material = await db('nylon')
                .where('id_item', id_item)
                .first();
        }
        
        if (!material) {
            material = await db('lona')
                .where('id_item', id_item)
                .first();
        }
        
        if (!material) {
            material = await db('polipropileno')
                .where('id_item', id_item)
                .first();
        }
        
        if (!material) {
            material = await db('malla_sombra')
                .where('id_item', id_item)
                .first();
        }
        
        return material;
    }
}

// Función helper para obtener datos de herramientas (con o sin vista materializada)
async function getHerramientaData(id_item) {
    const viewExists = await checkViewExists('mv_herramientas_resumen');
    
    if (viewExists) {
        return await db('mv_herramientas_resumen')
            .where('id_item', id_item)
            .first();
    } else {
        // Consulta directa a la tabla herramientas
        return await db('herramientas')
            .where('id_item', id_item)
            .first();
    }
}

const ordenesController = {
    // GET /api/v1/ordenes - Obtener todas las órdenes con filtros
    getOrdenes: async (req, res) => {
        try {
            const {
                estado,
                cliente,
                fecha_desde,
                fecha_hasta,
                page = 1,
                limit = 20,
                sortBy = 'fecha_op',
                sortOrder = 'desc'
            } = req.query;

            // Query base para filtros
            let baseQuery = db('orden_produccion as op');

            // Aplicar filtros
            if (estado) {
                baseQuery = baseQuery.where('op.estado', estado);
            }
            if (cliente) {
                baseQuery = baseQuery.where('op.cliente', 'ilike', `%${cliente}%`);
            }
            if (fecha_desde) {
                baseQuery = baseQuery.where('op.fecha_op', '>=', fecha_desde);
            }
            if (fecha_hasta) {
                baseQuery = baseQuery.where('op.fecha_op', '<=', fecha_hasta);
            }

            // Contar total (sin limit ni offset)
            const { count } = await baseQuery.clone().count('* as count').first();
            const total = parseInt(count);

            // Query para obtener datos con paginación
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const ordenes = await baseQuery
                .select('op.*')
                .orderBy(`op.${sortBy}`, sortOrder)
                .limit(parseInt(limit))
                .offset(offset);

            // Obtener resumen de materiales por orden
            const ordenesConResumen = await Promise.all(
                ordenes.map(async (orden) => {
                    const resumenMateriales = await db('orden_produccion_detalle as opd')
                        .leftJoin('inventario_item as ii', 'opd.id_item', 'ii.id_item')
                        .where('opd.id_op', orden.id_op)
                        .select(
                            'ii.tipo_item',
                            db.raw('COUNT(*) as cantidad_items'),
                            db.raw('SUM(opd.cantidad) as cantidad_total')
                        )
                        .groupBy('ii.tipo_item');

                    return {
                        ...orden,
                        resumen_materiales: resumenMateriales
                    };
                })
            );

            res.json({
                success: true,
                data: {
                    ordenes: ordenesConResumen,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo órdenes:', error);
            throw error;
        }
    },

    // GET /api/v1/ordenes/pendientes - Obtener órdenes pendientes
    getOrdenesPendientes: async (req, res) => {
        try {
            const ordenes = await db('orden_produccion as op')
                .where('op.estado', 'pendiente')
                .select('op.*')
                .orderBy('op.fecha_op', 'asc');

            res.json({
                success: true,
                data: ordenes
            });

        } catch (error) {
            logger.error('Error obteniendo órdenes pendientes:', error);
            throw error;
        }
    },

    // GET /api/v1/ordenes/activas - Obtener órdenes activas
    getOrdenesActivas: async (req, res) => {
        try {
            const ordenes = await db('orden_produccion as op')
                .whereIn('op.estado', ['en_proceso', 'asignada'])
                .select('op.*')
                .orderBy('op.fecha_op', 'desc');

            res.json({
                success: true,
                data: ordenes
            });

        } catch (error) {
            logger.error('Error obteniendo órdenes activas:', error);
            throw error;
        }
    },

    // GET /api/v1/ordenes/completadas - Obtener órdenes completadas
    getOrdenesCompletadas: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;

            let query = db('orden_produccion as op')
                .where('op.estado', 'completada')
                .select('op.*');

            // Contar total
            const totalQuery = query.clone();
            const { count } = await totalQuery.count('* as count').first();
            const total = parseInt(count);

            // Aplicar paginación
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const ordenes = await query
                .orderBy('op.fecha_op', 'desc')
                .limit(parseInt(limit))
                .offset(offset);

            res.json({
                success: true,
                data: {
                    ordenes,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo órdenes completadas:', error);
            throw error;
        }
    },

    // GET /api/v1/ordenes/:id - Obtener orden específica
    getOrdenById: async (req, res) => {
        try {
            const { id } = req.params;

            const orden = await db('orden_produccion as op')
                .where('op.id_op', id)
                .select('op.*')
                .first();

            if (!orden) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            res.json({
                success: true,
                data: orden
            });

        } catch (error) {
            logger.error('Error obteniendo orden:', error);
            throw error;
        }
    },

    // GET /api/v1/ordenes/:id/detalle - Obtener detalle completo de orden
    getOrdenDetalle: async (req, res) => {
        try {
            const { id } = req.params;

            // Obtener orden básica
            const orden = await db('orden_produccion as op')
                .where('op.id_op', id)
                .select('op.*')
                .first();

            if (!orden) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Obtener materiales de la orden
            const materiales = await db('orden_produccion_detalle as opd')
                .leftJoin('inventario_item as ii', 'opd.id_item', 'ii.id_item')
                .where('opd.id_op', id)
                .select('opd.*', 'ii.tipo_item');

            // Enriquecer datos de materiales con información detallada
            const materialesDetallados = await Promise.all(
                materiales.map(async (material) => {
                    let detalle = null;

                    if (material.tipo_item === 'PANO') {
                        detalle = await getPanoData(material.id_item);
                    } else if (material.tipo_item === 'EXTRA') {
                        // Verificar si es material o herramienta
                        detalle = await getMaterialData(material.id_item);
                        
                        if (detalle) {
                            detalle.subtipo = 'MATERIAL';
                        } else {
                            detalle = await getHerramientaData(material.id_item);
                            if (detalle) {
                                detalle.subtipo = 'HERRAMIENTA';
                            }
                        }
                    }

                    return {
                        ...material,
                        detalle_item: detalle
                    };
                })
            );

            // Obtener herramientas asignadas
            const herramientas = await db('herramienta_ordenada as ho')
                .leftJoin('herramientas as h', 'ho.id_item', 'h.id_item')
                .where('ho.id_op', id)
                .select('ho.*', 'h.descripcion', 'h.categoria', 'h.marca')
                .orderBy('ho.fecha', 'desc');

            // Obtener historial de movimientos
            const movimientos = await db('movimiento_inventario as mi')
                .leftJoin('inventario_item as ii', 'mi.id_item', 'ii.id_item')
                .where('mi.id_op', id)
                .select(
                    'mi.*',
                    'ii.tipo_item'
                )
                .orderBy('mi.fecha', 'desc');

            res.json({
                success: true,
                data: {
                    orden,
                    materiales: materialesDetallados,
                    herramientas,
                    movimientos,
                    estadisticas: {
                        total_materiales: materialesDetallados.length,
                        total_herramientas: herramientas.length,
                        total_movimientos: movimientos.length
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo detalle de orden:', error);
            throw error;
        }
    },

    // POST /api/v1/ordenes - Crear nueva orden de producción
    createOrden: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const {
                cliente,
                observaciones,
                prioridad = 'normal',
                fecha_inicio = null,
                fecha_fin = null,
                materiales = [],
                herramientas = []
            } = req.body;

            // Generar número de orden único
            const fechaActual = new Date();
            const año = fechaActual.getFullYear();
            const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
            const dia = String(fechaActual.getDate()).padStart(2, '0');
            
            // Obtener último número de orden del día
            const ultimaOrden = await trx('orden_produccion')
                .where('numero_op', 'like', `OP-${año}${mes}${dia}-%`)
                .orderBy('numero_op', 'desc')
                .first();

            let numeroOrden = 1;
            if (ultimaOrden) {
                const ultimoNumero = parseInt(ultimaOrden.numero_op.split('-')[2]);
                numeroOrden = ultimoNumero + 1;
            }

            const numero_op = `OP-${año}${mes}${dia}-${String(numeroOrden).padStart(3, '0')}`;

            // Validar disponibilidad de materiales y herramientas
            const materialesNoDisponibles = [];
            for (const material of materiales) {
                const { id_item, cantidad, tipo_item } = material;
                if (tipo_item === 'PANO') {
                    const pano = await getPanoData(id_item);
                    if (!pano) {
                        materialesNoDisponibles.push(`Paño ID ${id_item} no encontrado`);
                    } else {
                        const areaDisponible = Number(pano.area_m2) || 0;
                        const areaSolicitada = Number(cantidad) || 0;
                        if (areaSolicitada > areaDisponible) {
                            materialesNoDisponibles.push(`Paño ID ${id_item}: área solicitada (${areaSolicitada.toFixed(2)} m²) excede área disponible (${areaDisponible.toFixed(2)} m²)`);
                        }
                    }
                } else if (tipo_item === 'EXTRA') {
                    const materialData = await getMaterialData(id_item);
                    if (!materialData || materialData.cantidad_disponible < cantidad) {
                        materialesNoDisponibles.push(`Material ID ${id_item} no disponible o insuficiente`);
                    }
                }
            }
            for (const herramienta of herramientas) {
                const { id_item, cantidad } = herramienta;
                const herramientaData = await getHerramientaData(id_item);
                if (!herramientaData || herramientaData.cantidad_disponible < (cantidad || 1)) {
                    materialesNoDisponibles.push(`Herramienta ID ${id_item} no disponible o insuficiente`);
                }
            }
            if (materialesNoDisponibles.length > 0) {
                throw new ValidationError('Materiales/Herramientas no disponibles: ' + materialesNoDisponibles.join(', '));
            }

            // Crear orden de producción
            const [ordenCreada] = await trx('orden_produccion')
                .insert({
                    numero_op,
                fecha_op: fechaActual,
                cliente,
                observaciones,
                    prioridad,
                    fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : null,
                    fecha_fin: fecha_fin ? new Date(fecha_fin) : null,
                estado: 'pendiente'
                })
                .returning('id_op');

            const id_op = ordenCreada.id_op;

            // Agregar materiales a la orden
            for (const material of materiales) {
                const detalleInsert = {
                    id_op,
                    id_item: material.id_item,
                    tipo_item: material.tipo_item || '',
                    cantidad: material.cantidad,
                    notas: material.notas || ''
                };
                console.log('Insertando en orden_produccion_detalle:', detalleInsert);
                await trx('orden_produccion_detalle').insert(detalleInsert);

                // Registrar movimiento de inventario y descontar stock
                if (material.tipo_item === 'PANO') {
                    // Para paños, descontar área en m²
                    const pano = await getPanoData(material.id_item);
                    if (pano) {
                        const areaActual = Number(pano.area_m2) || 0;
                        const areaDescontada = Number(material.cantidad) || 0;
                        const nuevaArea = Math.max(0, areaActual - areaDescontada);
                        
                        // Calcular nuevas dimensiones proporcionalmente
                        let nuevoLargo = pano.largo_m;
                        let nuevoAncho = pano.ancho_m;
                        
                        if (nuevaArea > 0 && areaActual > 0) {
                            // Calcular factor de reducción
                            const factorReduccion = Math.sqrt(nuevaArea / areaActual);
                            nuevoLargo = Number((pano.largo_m * factorReduccion).toFixed(3));
                            nuevoAncho = Number((pano.ancho_m * factorReduccion).toFixed(3));
                        } else {
                            // Si no queda área, establecer dimensiones a 0
                            nuevoLargo = 0;
                            nuevoAncho = 0;
                        }
                        
                        // Actualizar dimensiones del paño (el área se recalculará automáticamente)
                        await trx('pano')
                            .where('id_item', material.id_item)
                            .update({ 
                                largo_m: nuevoLargo,
                                ancho_m: nuevoAncho,
                                updated_at: db.fn.now()
                            });

                        // Registrar movimiento
                        await trx('movimiento_inventario').insert({
                            id_item: material.id_item,
                            tipo_mov: 'CONSUMO',
                            cantidad: areaDescontada,
                            unidad: 'm²',
                            notas: `Consumo para orden ${numero_op}`,
                            fecha: new Date(),
                            id_op: id_op,
                            id_usuario: req.user.id
                        });
                    }
                } else if (material.tipo_item === 'EXTRA') {
                    // Para materiales extras, descontar cantidad
                    const materialData = await getMaterialData(material.id_item);
                    if (materialData) {
                        const cantidadActual = Number(materialData.cantidad_disponible) || 0;
                        const cantidadDescontada = Number(material.cantidad) || 0;
                        const nuevaCantidad = Math.max(0, cantidadActual - cantidadDescontada);
                        
                        // Actualizar cantidad del material
                        await trx('materiales_extras')
                            .where('id_item', material.id_item)
                            .update({ 
                                cantidad_disponible: nuevaCantidad,
                                ultima_modificacion: db.fn.now()
                            });

                        // Registrar movimiento
                        await trx('movimiento_inventario').insert({
                            id_item: material.id_item,
                            tipo_mov: 'CONSUMO',
                            cantidad: cantidadDescontada,
                            unidad: materialData.unidad || 'unidad',
                            notas: `Consumo para orden ${numero_op}`,
                            fecha: new Date(),
                            id_op: id_op,
                            id_usuario: req.user.id
                        });
                    }
                }
            }

            // Asignar herramientas a la orden
            for (const herramienta of herramientas) {
                await trx('herramienta_ordenada').insert({
                    id_op,
                    id_item: herramienta.id_item,
                    tipo_movimiento: 'ASIGNACION',
                    cantidad: herramienta.cantidad || 1,
                    notas: herramienta.notas || ''
                });
            }

            await trx.commit();

            res.status(201).json({
                success: true,
                message: 'Orden de producción creada exitosamente',
                data: { id_op, numero_op }
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error creando orden:', error);
            throw error;
        }
    },

    // PUT /api/v1/ordenes/:id - Actualizar orden
    updateOrden: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;
            const { cliente, observaciones, estado } = req.body;

            // Verificar que la orden existe
            const ordenExistente = await trx('orden_produccion')
                .where('id_op', id)
                .first();

            if (!ordenExistente) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Actualizar orden
            const updateData = {};
            if (cliente) updateData.cliente = cliente;
            if (observaciones !== undefined) updateData.observaciones = observaciones;
            if (estado) updateData.estado = estado;

            await trx('orden_produccion')
                .where('id_op', id)
                .update(updateData);

            await trx.commit();

            res.json({
                success: true,
                message: 'Orden actualizada exitosamente'
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error actualizando orden:', error);
            throw error;
        }
    },

    // PATCH /api/v1/ordenes/:id/estado - Cambiar estado de orden
    cambiarEstadoOrden: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;
            const { estado, notas } = req.body;

            // Verificar que la orden existe
            const orden = await trx('orden_produccion')
                .where('id_op', id)
                .first();

            if (!orden) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Validar estado
            const estadosValidos = ['pendiente', 'en_proceso', 'completada', 'cancelada', 'pausada'];
            if (!estadosValidos.includes(estado)) {
                throw new ValidationError('Estado inválido');
            }

            // Actualizar estado
            await trx('orden_produccion')
                .where('id_op', id)
                .update({ estado });

            await trx.commit();

            res.json({
                success: true,
                message: `Estado de orden cambiado a ${estado}`
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error cambiando estado de orden:', error);
            throw error;
        }
    },

    // POST /api/v1/ordenes/:id/materiales - Agregar materiales a orden
    agregarMateriales: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;
            const { materiales } = req.body;

            // Verificar que la orden existe
            const orden = await trx('orden_produccion')
                .where('id_op', id)
                .first();

            if (!orden) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Agregar materiales
            for (const material of materiales) {
                await trx('orden_produccion_detalle').insert({
                    id_op,
                    id_item: material.id_item,
                    tipo_mov: material.tipo_mov || 'CONSUMO',
                    cantidad: material.cantidad,
                    notas: material.notas || ''
                });
            }

            await trx.commit();

            res.json({
                success: true,
                message: 'Materiales agregados exitosamente'
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error agregando materiales:', error);
            throw error;
        }
    },

    // POST /api/v1/ordenes/:id/herramientas - Asignar herramientas a orden
    asignarHerramientas: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;
            const { herramientas } = req.body;

            // Verificar que la orden existe
            const orden = await trx('orden_produccion')
                .where('id_op', id)
                .first();

            if (!orden) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Asignar herramientas
            for (const herramienta of herramientas) {
                await trx('herramienta_ordenada').insert({
                    id_op: id,
                    id_item: herramienta.id_item,
                    tipo_movimiento: 'ASIGNACION',
                    cantidad: 1,
                    notas: herramienta.notas || ''
                });
            }

            await trx.commit();

            res.json({
                success: true,
                message: 'Herramientas asignadas exitosamente'
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error asignando herramientas:', error);
            throw error;
        }
    },

    // GET /api/v1/ordenes/stats/resumen - Obtener estadísticas de órdenes
    getEstadisticasOrdenes: async (req, res) => {
        try {
            const stats = await db('orden_produccion')
                .select('estado')
                .count('* as cantidad')
                .groupBy('estado');

            const totalOrdenes = await db('orden_produccion').count('* as total').first();

            res.json({
                success: true,
                data: {
                    por_estado: stats,
                    total: parseInt(totalOrdenes.total)
                }
            });

        } catch (error) {
            logger.error('Error obteniendo estadísticas:', error);
            throw error;
        }
    }
};

module.exports = ordenesController; 