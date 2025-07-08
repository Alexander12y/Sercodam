const db = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../config/logger');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

const clientesController = {
    // GET /api/v1/clientes - Obtener todos los clientes con filtros
    getClientes: async (req, res) => {
        try {
            const {
                search,
                page = 1,
                limit = 50
            } = req.query;

            let query = db('cliente')
                .select('*')
                .orderBy('nombre_cliente', 'asc');

            // Aplicar filtro de búsqueda
            if (search && search.trim().length > 0) {
                query = query.where(function() {
                    this.where('nombre_cliente', 'ilike', `%${search.trim()}%`)
                        .orWhere('email', 'ilike', `%${search.trim()}%`)
                        .orWhere('telefono', 'ilike', `%${search.trim()}%`);
                });
            }

            // Verificar si es una consulta sin paginación (limit >= 1000)
            const isNoPagination = parseInt(limit) >= 1000;

            let total = 0;
            let clientes = [];

            if (isNoPagination) {
                // Consulta sin paginación
                clientes = await query;
                total = clientes.length;
            } else {
                // Contar total para paginación
                const totalResult = await db('cliente').count('id_cliente as count').first();
                total = parseInt(totalResult.count || 0);

                // Aplicar paginación
                const offset = (page - 1) * limit;
                clientes = await query
                    .limit(limit)
                    .offset(offset);
            }

            // Para cada cliente, obtener información de órdenes asignadas
            const clientesConOrdenes = await Promise.all(
                clientes.map(async (cliente) => {
                    const ordenesCount = await db('orden_produccion')
                        .where('id_cliente', cliente.id_cliente)
                        .count('id_op as count')
                        .first();

                    const ordenesActivas = await db('orden_produccion')
                        .where('id_cliente', cliente.id_cliente)
                        .whereIn('estado', ['en_proceso', 'pausada'])
                        .count('id_op as count')
                        .first();

                    return {
                        ...cliente,
                        ordenes_totales: parseInt(ordenesCount.count || 0),
                        ordenes_activas: parseInt(ordenesActivas.count || 0),
                        tiene_ordenes: parseInt(ordenesCount.count || 0) > 0
                    };
                })
            );

            const response = {
                success: true,
                clientes: clientesConOrdenes
            };

            // Agregar paginación solo si no es consulta sin paginación
            if (!isNoPagination) {
                response.pagination = {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    totalPages: Math.ceil(total / limit)
                };
            }

            res.json(response);

        } catch (error) {
            logger.error('Error obteniendo clientes:', error);
            throw error;
        }
    },

    // GET /api/v1/clientes/search - Búsqueda de clientes para autocompletado
    searchClientes: async (req, res) => {
        try {
            const { q } = req.query;
            
            let query = db('cliente')
                .select('id_cliente', 'nombre_cliente', 'email', 'telefono')
                .orderBy('nombre_cliente', 'asc');

            // Si hay término de búsqueda, aplicar filtro
            if (q && q.trim().length > 0) {
                query = query.where('nombre_cliente', 'ilike', `%${q.trim()}%`);
            }

            // Limitar resultados a 20 para no sobrecargar el dropdown
            const clientes = await query.limit(20);

            res.json({
                success: true,
                clientes: clientes
            });

        } catch (error) {
            logger.error('Error buscando clientes:', error);
            throw error;
        }
    },

    // GET /api/v1/clientes/:id - Obtener cliente específico
    getClienteById: async (req, res) => {
        try {
            const { id } = req.params;

            const cliente = await db('cliente')
                .where('id_cliente', id)
                .first();

            if (!cliente) {
                throw new NotFoundError('Cliente no encontrado');
            }

            // Obtener estadísticas de órdenes
            const ordenesStats = await db('orden_produccion')
                .where('id_cliente', id)
                .select(
                    db.raw('COUNT(*) as total_ordenes'),
                    db.raw('COUNT(CASE WHEN estado = \'en_proceso\' THEN 1 END) as ordenes_en_proceso'),
                    db.raw('COUNT(CASE WHEN estado = \'completada\' THEN 1 END) as ordenes_completadas'),
                    db.raw('COUNT(CASE WHEN estado = \'cancelada\' THEN 1 END) as ordenes_canceladas'),
                    db.raw('COUNT(CASE WHEN estado = \'pausada\' THEN 1 END) as ordenes_pausadas')
                )
                .first();

            res.json({
                success: true,
                data: {
                    ...cliente,
                    stats: {
                        total_ordenes: parseInt(ordenesStats.total_ordenes || 0),
                        ordenes_en_proceso: parseInt(ordenesStats.ordenes_en_proceso || 0),
                        ordenes_completadas: parseInt(ordenesStats.ordenes_completadas || 0),
                        ordenes_canceladas: parseInt(ordenesStats.ordenes_canceladas || 0),
                        ordenes_pausadas: parseInt(ordenesStats.ordenes_pausadas || 0)
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo cliente:', error);
            throw error;
        }
    },

    // GET /api/v1/clientes/:id/ordenes - Obtener órdenes de un cliente
    getOrdenesCliente: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                estado,
                page = 1,
                limit = 20,
                sortBy = 'fecha_op',
                sortOrder = 'desc'
            } = req.query;

            // Verificar que el cliente existe
            const cliente = await db('cliente')
                .where('id_cliente', id)
                .first();

            if (!cliente) {
                throw new NotFoundError('Cliente no encontrado');
            }

            let query = db('orden_produccion')
                .where('id_cliente', id);

            // Aplicar filtro de estado si se proporciona
            if (estado) {
                query = query.where('estado', estado);
            }

            // Contar total
            const totalResult = await query.clone().count('id_op as count').first();
            const total = parseInt(totalResult.count || 0);

            // Obtener órdenes con paginación
            const offset = (page - 1) * limit;
            const ordenes = await query
                .select('*')
                .orderBy(sortBy, sortOrder)
                .limit(limit)
                .offset(offset);

            res.json({
                success: true,
                data: {
                    cliente: cliente,
                    ordenes: ordenes,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: total,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo órdenes del cliente:', error);
            throw error;
        }
    },

    // POST /api/v1/clientes - Crear nuevo cliente
    createCliente: async (req, res) => {
        try {
            const {
                nombre_cliente,
                email,
                telefono
            } = req.body;

            // Validaciones
            if (!nombre_cliente || nombre_cliente.trim().length === 0) {
                throw new ValidationError('El nombre del cliente es requerido');
            }

            if (email && !isValidEmail(email)) {
                throw new ValidationError('El email no tiene un formato válido');
            }

            // Verificar si ya existe un cliente con el mismo nombre
            const clienteExistente = await db('cliente')
                .where('nombre_cliente', 'ilike', nombre_cliente.trim())
                .first();

            if (clienteExistente) {
                throw new ValidationError('Ya existe un cliente con ese nombre');
            }

            // Crear cliente
            const [nuevoCliente] = await db('cliente')
                .insert({
                    nombre_cliente: nombre_cliente.trim(),
                    email: email ? email.trim() : null,
                    telefono: telefono ? telefono.trim() : null,
                    fecha_registro: db.fn.now()
                })
                .returning('*');

            logger.info(`Cliente creado: ${nuevoCliente.id_cliente} - ${nuevoCliente.nombre_cliente}`);

            res.status(201).json({
                success: true,
                data: nuevoCliente,
                message: 'Cliente creado exitosamente'
            });

        } catch (error) {
            logger.error('Error creando cliente:', error);
            throw error;
        }
    },

    // PUT /api/v1/clientes/:id - Actualizar cliente
    updateCliente: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                nombre_cliente,
                email,
                telefono
            } = req.body;

            // Verificar que el cliente existe
            const clienteExistente = await db('cliente')
                .where('id_cliente', id)
                .first();

            if (!clienteExistente) {
                throw new NotFoundError('Cliente no encontrado');
            }

            // Validaciones
            if (!nombre_cliente || nombre_cliente.trim().length === 0) {
                throw new ValidationError('El nombre del cliente es requerido');
            }

            if (email && !isValidEmail(email)) {
                throw new ValidationError('El email no tiene un formato válido');
            }

            // Verificar si ya existe otro cliente con el mismo nombre
            const clienteConMismoNombre = await db('cliente')
                .where('nombre_cliente', 'ilike', nombre_cliente.trim())
                .where('id_cliente', '!=', id)
                .first();

            if (clienteConMismoNombre) {
                throw new ValidationError('Ya existe otro cliente con ese nombre');
            }

            // Actualizar cliente
            const [clienteActualizado] = await db('cliente')
                .where('id_cliente', id)
                .update({
                    nombre_cliente: nombre_cliente.trim(),
                    email: email ? email.trim() : null,
                    telefono: telefono ? telefono.trim() : null
                })
                .returning('*');

            logger.info(`Cliente actualizado: ${clienteActualizado.id_cliente} - ${clienteActualizado.nombre_cliente}`);

            res.json({
                success: true,
                data: clienteActualizado,
                message: 'Cliente actualizado exitosamente'
            });

        } catch (error) {
            logger.error('Error actualizando cliente:', error);
            throw error;
        }
    },

    // DELETE /api/v1/clientes/:id - Eliminar cliente
    deleteCliente: async (req, res) => {
        try {
            const { id } = req.params;

            // Verificar que el cliente existe
            const cliente = await db('cliente')
                .where('id_cliente', id)
                .first();

            if (!cliente) {
                throw new NotFoundError('Cliente no encontrado');
            }

            // Verificar si el cliente tiene órdenes de producción
            const ordenesCount = await db('orden_produccion')
                .where('id_cliente', id)
                .count('id_op as count')
                .first();

            if (parseInt(ordenesCount.count) > 0) {
                throw new ValidationError('No se puede eliminar el cliente porque tiene órdenes de producción asociadas');
            }

            // Eliminar cliente
            await db('cliente')
                .where('id_cliente', id)
                .del();

            logger.info(`Cliente eliminado: ${id} - ${cliente.nombre_cliente}`);

            res.json({
                success: true,
                message: 'Cliente eliminado exitosamente'
            });

        } catch (error) {
            logger.error('Error eliminando cliente:', error);
            throw error;
        }
    }
};

// Helper function para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

module.exports = clientesController; 