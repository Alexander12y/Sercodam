const db = require('../../config/database');
const logger = require('../../config/logger');
const { NotFoundError, ValidationError } = require('../../middleware/errorHandler');

const herramientasController = {
    // GET /api/v1/inventario/herramientas - Obtener herramientas
    getHerramientas: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 50, 
                search, 
                categoria,
                estado_calidad,
                ubicacion,
                sortBy = 'descripcion',
                sortOrder = 'asc'
            } = req.query;

            let query = db('herramientas as h')
                .select('h.*');

            // Filtro de búsqueda
            if (search) {
                query = query.where(function() {
                    this.where('h.descripcion', 'ilike', `%${search}%`)
                          .orWhere('h.id_herramienta', 'ilike', `%${search}%`)
                          .orWhere('h.categoria', 'ilike', `%${search}%`)
                          .orWhere('h.marca', 'ilike', `%${search}%`);
                });
            }

            // Filtro por categoría
            if (categoria) {
                query = query.where('h.categoria', categoria);
            }

            // Filtro por estado de calidad
            if (estado_calidad) {
                query = query.where('h.estado_calidad', estado_calidad);
            }

            // Filtro por ubicación
            if (ubicacion) {
                query = query.where('h.ubicacion', ubicacion);
            }

            // Verificar si es una consulta sin paginación (limit >= 1000)
            const isNoPagination = parseInt(limit) >= 1000;

            let total = 0;
            let herramientas = [];

            if (isNoPagination) {
                // Consulta sin paginación
                herramientas = await query.orderBy(`h.${sortBy}`, sortOrder);
                total = herramientas.length;
            } else {
                // Contar total para paginación
                const countQuery = db('herramientas as h');
                
                // Aplicar los mismos filtros al query de conteo
                if (search) {
                    countQuery.where(function() {
                        this.where('h.descripcion', 'ilike', `%${search}%`)
                              .orWhere('h.id_herramienta', 'ilike', `%${search}%`)
                              .orWhere('h.categoria', 'ilike', `%${search}%`)
                              .orWhere('h.marca', 'ilike', `%${search}%`);
                    });
                }
                if (categoria) {
                    countQuery.where('h.categoria', categoria);
                }
                if (estado_calidad) {
                    countQuery.where('h.estado_calidad', estado_calidad);
                }
                if (ubicacion) {
                    countQuery.where('h.ubicacion', ubicacion);
                }
                
                const { count } = await countQuery.count('* as count').first();
                total = parseInt(count);

                // Aplicar paginación y ordenamiento
                const offset = (parseInt(page) - 1) * parseInt(limit);
                herramientas = await query
                    .orderBy(`h.${sortBy}`, sortOrder)
                    .limit(parseInt(limit))
                    .offset(offset);
            }

            const response = {
                success: true,
                data: {
                    herramientas,
                    pagination: isNoPagination ? null : {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            };

            res.json(response);

        } catch (error) {
            logger.error('Error obteniendo herramientas:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/herramientas/categorias - Obtener categorías disponibles
    getCategorias: async (req, res) => {
        try {
            const categorias = await db('herramientas')
                .select('categoria')
                .distinct()
                .whereNotNull('categoria')
                .orderBy('categoria');

            const categoriasList = categorias.map(item => item.categoria);

            res.json({
                success: true,
                data: categoriasList
            });

        } catch (error) {
            logger.error('Error obteniendo categorías:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/herramientas/estados - Obtener estados de calidad disponibles
    getEstados: async (req, res) => {
        try {
            const estados = await db('herramientas')
                .select('estado_calidad')
                .distinct()
                .whereNotNull('estado_calidad')
                .orderBy('estado_calidad');

            const estadosList = estados.map(item => item.estado_calidad);

            res.json({
                success: true,
                data: estadosList
            });

        } catch (error) {
            logger.error('Error obteniendo estados:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/herramientas/ubicaciones - Obtener ubicaciones disponibles
    getUbicaciones: async (req, res) => {
        try {
            const ubicaciones = await db('herramientas')
                .select('ubicacion')
                .distinct()
                .whereNotNull('ubicacion')
                .orderBy('ubicacion');

            const ubicacionesList = ubicaciones.map(item => item.ubicacion);

            res.json({
                success: true,
                data: ubicacionesList
            });

        } catch (error) {
            logger.error('Error obteniendo ubicaciones:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/herramientas/categoria/:categoria - Obtener herramientas por categoría
    getHerramientasPorCategoria: async (req, res) => {
        try {
            const { categoria } = req.params;
            const { limit = 50 } = req.query;

            const herramientas = await db('herramientas')
                .where('categoria', categoria)
                .orderBy('descripcion', 'asc')
                .limit(parseInt(limit));

            res.json({
                success: true,
                data: {
                    herramientas,
                    categoria
                }
            });

        } catch (error) {
            logger.error('Error obteniendo herramientas por categoría:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/herramientas/:id - Obtener herramienta específica
    getHerramientaById: async (req, res) => {
        try {
            const { id } = req.params;

            const herramienta = await db('herramientas')
                .where('id_item', id)
                .first();

            if (!herramienta) {
                throw new NotFoundError('Herramienta no encontrada');
            }

            res.json({
                success: true,
                data: herramienta
            });

        } catch (error) {
            logger.error('Error obteniendo herramienta:', error);
            throw error;
        }
    },

    // POST /api/v1/inventario/herramientas - Crear nueva herramienta
    createHerramienta: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const {
                id_herramienta,
                categoria,
                descripcion,
                presentacion,
                unidad,
                cantidad_disponible,
                marca,
                estado_calidad,
                ubicacion,
                precioxunidad,
                uso_principal
            } = req.body;

            // Verificar que el ID de herramienta no exista
            const herramientaExistente = await trx('herramientas')
                .where('id_herramienta', id_herramienta)
                .first();

            if (herramientaExistente) {
                throw new ValidationError('Ya existe una herramienta con ese código');
            }

            // Crear registro en inventario_item
            const [inventarioItem] = await trx('inventario_item')
                .insert({
                    tipo_item: 'HERRAMIENTA'
                })
                .returning('id_item');

            // Crear la herramienta
            const [herramientaCreada] = await trx('herramientas')
                .insert({
                    id_item: inventarioItem.id_item,
                    id_herramienta,
                    categoria,
                    descripcion,
                    presentacion,
                    unidad: unidad || 'unidad',
                    cantidad_disponible: cantidad_disponible || 0,
                    marca,
                    estado_calidad: estado_calidad || 'Bueno',
                    ubicacion,
                    precioxunidad,
                    uso_principal
                })
                .returning('*');

            await trx.commit();

            res.status(201).json({
                success: true,
                message: 'Herramienta creada exitosamente',
                data: herramientaCreada
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error creando herramienta:', error);
            throw error;
        }
    },

    // PUT /api/v1/inventario/herramientas/:id - Actualizar herramienta
    updateHerramienta: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;
            const {
                categoria,
                descripcion,
                presentacion,
                unidad,
                cantidad_disponible,
                marca,
                estado_calidad,
                ubicacion,
                precioxunidad,
                uso_principal
            } = req.body;

            // Verificar que la herramienta existe
            const herramientaExistente = await trx('herramientas')
                .where('id_item', id)
                .first();

            if (!herramientaExistente) {
                throw new NotFoundError('Herramienta no encontrada');
            }

            // Actualizar la herramienta
            const [herramientaActualizada] = await trx('herramientas')
                .where('id_item', id)
                .update({
                    categoria,
                    descripcion,
                    presentacion,
                    unidad: unidad || 'unidad',
                    cantidad_disponible: cantidad_disponible || 0,
                    marca,
                    estado_calidad: estado_calidad || 'Bueno',
                    ubicacion,
                    precioxunidad,
                    uso_principal
                })
                .returning('*');

            await trx.commit();

            res.json({
                success: true,
                message: 'Herramienta actualizada exitosamente',
                data: herramientaActualizada
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error actualizando herramienta:', error);
            throw error;
        }
    },

    // DELETE /api/v1/inventario/herramientas/:id - Eliminar herramienta
    deleteHerramienta: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;

            // Verificar que la herramienta existe
            const herramienta = await trx('herramientas')
                .where('id_item', id)
                .first();

            if (!herramienta) {
                throw new NotFoundError('Herramienta no encontrada');
            }

            // Verificar si la herramienta está asignada a alguna orden
            const herramientaAsignada = await trx('herramienta_ordenada')
                .where('id_item', id)
                .first();

            if (herramientaAsignada) {
                throw new ValidationError('No se puede eliminar la herramienta porque está asignada a una orden');
            }

            // Eliminar la herramienta (esto también eliminará el registro en inventario_item por CASCADE)
            await trx('herramientas')
                .where('id_item', id)
                .del();

            await trx.commit();

            res.json({
                success: true,
                message: 'Herramienta eliminada exitosamente'
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error eliminando herramienta:', error);
            throw error;
        }
    },

    // POST /api/v1/inventario/herramientas/entrada - Registrar entrada de herramienta
    entradaHerramienta: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id, cantidad, notas } = req.body;
            
            if (!id || !cantidad || isNaN(cantidad) || cantidad <= 0) {
                throw new ValidationError('Datos inválidos');
            }

            // Verificar que la herramienta existe
            const herramienta = await trx('herramientas')
                .where('id_item', id)
                .first();

            if (!herramienta) {
                throw new NotFoundError('Herramienta no encontrada');
            }

            // Registrar movimiento
            await trx('movimiento_inventario').insert({
                id_item: id,
                tipo_mov: 'AJUSTE_IN',
                cantidad,
                unidad: herramienta.unidad || 'unidad',
                notas: notas || 'Entrada de herramienta',
                fecha: new Date(),
                id_usuario: req.user.id
            });

            // Actualizar cantidad de la herramienta
            const nuevaCantidad = (herramienta.cantidad_disponible || 0) + parseFloat(cantidad);
            await trx('herramientas')
                .where('id_item', id)
                .update({
                    cantidad_disponible: nuevaCantidad
                });

            await trx.commit();

            res.json({ 
                success: true, 
                message: 'Entrada registrada correctamente',
                data: {
                    id,
                    cantidad_agregada: cantidad,
                    cantidad_anterior: herramienta.cantidad_disponible || 0,
                    cantidad_nueva: nuevaCantidad
                }
            });
        } catch (error) {
            await trx.rollback();
            logger.error('Error en entrada de herramienta:', error);
            throw error;
        }
    },

    // POST /api/v1/inventario/herramientas/salida - Registrar salida de herramienta
    salidaHerramienta: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id, cantidad, notas } = req.body;
            
            if (!id || !cantidad || isNaN(cantidad) || cantidad <= 0) {
                throw new ValidationError('Datos inválidos');
            }

            // Obtener herramienta actual
            const herramienta = await trx('herramientas')
                .where('id_item', id)
                .first();

            if (!herramienta) {
                throw new NotFoundError('Herramienta no encontrada');
            }

            const stockActual = herramienta.cantidad_disponible || 0;
            if (cantidad > stockActual) {
                throw new ValidationError('No hay suficiente stock disponible', {
                    stock_disponible: stockActual,
                    cantidad_solicitada: cantidad
                });
            }

            // Registrar movimiento
            await trx('movimiento_inventario').insert({
                id_item: id,
                tipo_mov: 'AJUSTE_OUT',
                cantidad,
                unidad: herramienta.unidad || 'unidad',
                notas: notas || 'Salida de herramienta',
                fecha: new Date(),
                id_usuario: req.user.id
            });

            // Actualizar cantidad de la herramienta
            const nuevaCantidad = stockActual - parseFloat(cantidad);
            await trx('herramientas')
                .where('id_item', id)
                .update({
                    cantidad_disponible: nuevaCantidad
                });

            await trx.commit();

            res.json({ 
                success: true, 
                message: 'Salida registrada correctamente',
                data: {
                    id,
                    cantidad_retirada: cantidad,
                    cantidad_anterior: stockActual,
                    cantidad_nueva: nuevaCantidad
                }
            });
        } catch (error) {
            await trx.rollback();
            logger.error('Error en salida de herramienta:', error);
            throw error;
        }
    }
};

module.exports = herramientasController;