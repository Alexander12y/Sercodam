const db = require('../../config/database');
const logger = require('../../config/logger');
const { NotFoundError } = require('../../middleware/errorHandler');

const herramientasController = {
    // GET /api/v1/inventario/herramientas - Obtener herramientas (Catálogo 3)
    getHerramientas: async (req, res) => {
        try {
            // Verificar si la tabla herramientas existe
            const tableExists = await db.schema.hasTable('herramientas');
            if (!tableExists) {
                return res.json({
                    success: true,
                    herramientas: [],
                    message: 'Tabla de herramientas no disponible aún'
                });
            }

            const { 
                page = 1, 
                limit = 50, 
                search, 
                categoria,
                estado,
                ubicacion,
                sortBy = 'descripcion',
                sortOrder = 'asc'
            } = req.query;

            let query = db('herramientas')
                .select('*');

            // Filtro de búsqueda
            if (search) {
                query = query.where(function() {
                    this.where('descripcion', 'ilike', `%${search}%`)
                          .orWhere('id_herramienta', 'ilike', `%${search}%`)
                          .orWhere('categoria', 'ilike', `%${search}%`);
                });
            }

            // Filtro por categoría
            if (categoria) {
                query = query.where('categoria', categoria);
            }

            // Filtro por estado
            if (estado) {
                query = query.where('estado', estado);
            }

            // Filtro por ubicación
            if (ubicacion) {
                query = query.where('ubicacion', ubicacion);
            }

            // Verificar si es una consulta sin paginación (limit >= 1000)
            const isNoPagination = parseInt(limit) >= 1000;

            let total = 0;
            let herramientas = [];

            if (isNoPagination) {
                // Consulta sin paginación
                herramientas = await query.orderBy(sortBy, sortOrder);
                total = herramientas.length;
            } else {
                // Contar total para paginación - crear query separado sin select('*')
                const countQuery = db('herramientas');
                
                // Aplicar los mismos filtros al query de conteo
                if (search) {
                    countQuery.where(function() {
                        this.where('descripcion', 'ilike', `%${search}%`)
                              .orWhere('id_herramienta', 'ilike', `%${search}%`)
                              .orWhere('categoria', 'ilike', `%${search}%`);
                    });
                }
                if (categoria) {
                    countQuery.where('categoria', categoria);
                }
                if (estado) {
                    countQuery.where('estado', estado);
                }
                if (ubicacion) {
                    countQuery.where('ubicacion', ubicacion);
                }
                
                const { count } = await countQuery.count('* as count').first();
                total = parseInt(count);

                // Aplicar paginación y ordenamiento
                const offset = (parseInt(page) - 1) * parseInt(limit);
                herramientas = await query
                    .orderBy(sortBy, sortOrder)
                    .limit(parseInt(limit))
                    .offset(offset);
            }

            const response = {
                success: true,
                herramientas
            };

            // Agregar paginación solo si no es consulta sin paginación
            if (!isNoPagination) {
                response.pagination = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                };
            }

            res.json(response);

        } catch (error) {
            logger.error('Error obteniendo herramientas:', error);
            // En lugar de lanzar error, devolver respuesta vacía
            res.json({
                success: true,
                herramientas: [],
                message: 'Error obteniendo herramientas'
            });
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
                herramientas,
                categoria
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
                .where('id', id)
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

    // POST /api/v1/inventario/herramientas/entrada
    entradaHerramienta: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id, cantidad, descripcion } = req.body;
            if (!id || !cantidad || isNaN(cantidad) || cantidad <= 0) {
                return res.status(400).json({ success: false, message: 'Datos inválidos' });
            }

            // Verificar que la herramienta existe
            const herramienta = await trx('herramientas').where({ id }).first();
            if (!herramienta) {
                await trx.rollback();
                return res.status(404).json({ success: false, message: 'Herramienta no encontrada' });
            }

            // Registrar movimiento
            await trx('movimiento_inventario').insert({
                id_item: id,
                tipo_mov: 'AJUSTE_IN',
                cantidad,
                unidad: herramienta.unidad || 'unidad',
                notas: descripcion || null,
                fecha: new Date(),
                id_usuario: req.user.id
            });

            // Actualizar cantidad de la herramienta
            const nuevaCantidad = (herramienta.cantidad || 0) + parseFloat(cantidad);
            await trx('herramientas')
                .where({ id })
                .update({
                    cantidad: nuevaCantidad,
                    updated_at: db.fn.now()
                });

            await trx.commit();

            res.json({ 
                success: true, 
                message: 'Entrada registrada correctamente',
                data: {
                    id,
                    cantidad_agregada: cantidad,
                    cantidad_anterior: herramienta.cantidad || 0,
                    cantidad_nueva: nuevaCantidad
                }
            });
        } catch (error) {
            await trx.rollback();
            logger.error('Error en entrada de herramienta:', error);
            res.status(500).json({ success: false, message: 'Error registrando entrada' });
        }
    },

    // POST /api/v1/inventario/herramientas/salida
    salidaHerramienta: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id, cantidad, descripcion } = req.body;
            if (!id || !cantidad || isNaN(cantidad) || cantidad <= 0) {
                return res.status(400).json({ success: false, message: 'Datos inválidos' });
            }

            // Obtener herramienta actual
            const herramienta = await trx('herramientas').where({ id }).first();
            if (!herramienta) {
                await trx.rollback();
                return res.status(404).json({ success: false, message: 'Herramienta no encontrada' });
            }

            const stockActual = herramienta.cantidad || 0;
            if (cantidad > stockActual) {
                await trx.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'No hay suficiente stock disponible',
                    data: {
                        stock_disponible: stockActual,
                        cantidad_solicitada: cantidad
                    }
                });
            }

            // Registrar movimiento
            await trx('movimiento_inventario').insert({
                id_item: id,
                tipo_mov: 'AJUSTE_OUT',
                cantidad,
                unidad: herramienta.unidad || 'unidad',
                notas: descripcion || null,
                fecha: new Date(),
                id_usuario: req.user.id
            });

            // Actualizar cantidad de la herramienta
            const nuevaCantidad = stockActual - parseFloat(cantidad);
            await trx('herramientas')
                .where({ id })
                .update({
                    cantidad: nuevaCantidad,
                    updated_at: db.fn.now()
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
            res.status(500).json({ success: false, message: 'Error registrando salida' });
        }
    }
};

module.exports = herramientasController;