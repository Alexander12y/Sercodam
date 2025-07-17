const db = require('../../config/database');
const { cache } = require('../../config/redis');
const logger = require('../../config/logger');
const { NotFoundError, ValidationError } = require('../../middleware/errorHandler');

// Helper: verificar si existe la vista materializada
async function checkViewExists(viewName) {
  try {
    const result = await db.raw(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = ? AND table_schema = 'public'
      );
    `, [viewName]);
    return result.rows[0].exists;
  } catch (error) {
    logger.error(`Error verificando vista ${viewName}:`, error);
    return false;
  }
}

const materialesController = {
    // GET /api/v1/inventario/materiales - Obtener materiales con filtros
    getMateriales: async (req, res) => {
        try {
            let {
                categorias, // Nuevo parámetro para array de categorías
                categoria,
                estado_calidad,
                ubicacion,
                search,
                page = 1,
                limit = 50
            } = req.query;

            if (categoria) {
                categoria = categoria.trim();
            }

            let query = db('materiales_extras as me')
                .select(
                    'me.*',
                    'ii.tipo_item',
                    'ii.fecha_creacion'
                )
                .leftJoin('inventario_item as ii', 'me.id_item', 'ii.id_item')
                .where('ii.tipo_item', 'MATERIAL EXTRA');

            // Aplicar filtros
            if (categorias && Array.isArray(categorias) && categorias.length > 0) {
                // Limpiar y validar el array de categorías
                const categoriasLimpias = categorias.map(c => c.trim()).filter(Boolean);
                if (categoriasLimpias.length > 0) {
                    query = query.whereIn('me.categoria', categoriasLimpias);
                }
            } else if (categoria) {
                // Normalizar apostrophes tipográficos (U+2019) a normales (U+0027)
                const apostropheTipografico = String.fromCharCode(8217); // '
                const apostropheNormal = String.fromCharCode(39);       // '
                
                // Crear variantes con ambos tipos de apostrophes
                const categoriaConTipografico = categoria.replace(new RegExp(apostropheNormal, 'g'), apostropheTipografico);
                const categoriaConNormal = categoria.replace(new RegExp(apostropheTipografico, 'g'), apostropheNormal);
                
                // Búsqueda que incluye ambas variantes de apostrophes
                query = query.where(function() {
                    this.where('me.categoria', categoria)
                        .orWhere('me.categoria', categoriaConTipografico)
                        .orWhere('me.categoria', categoriaConNormal)
                        .orWhereRaw('LOWER(me.categoria) = LOWER(?)', [categoria])
                        .orWhereRaw('LOWER(me.categoria) = LOWER(?)', [categoriaConTipografico])
                        .orWhereRaw('LOWER(me.categoria) = LOWER(?)', [categoriaConNormal]);
                });
            }
            if (estado_calidad) {
                query = query.where('me.estado_calidad', estado_calidad);
            }
            if (ubicacion) {
                query = query.where('me.ubicacion', ubicacion);
            }
            if (search) {
                query = query.where(function() {
                    this.where('me.descripcion', 'ilike', `%${search}%`)
                        .orWhere('me.id_material_extra', 'ilike', `%${search}%`)
                        .orWhere('me.marca', 'ilike', `%${search}%`)
                        .orWhere('me.categoria', 'ilike', `%${search}%`);
                });
            }

            // Verificar si es una consulta sin paginación (limit >= 1000)
            const isNoPagination = parseInt(limit) >= 1000;

            let total = 0;
            let materiales = [];

            if (isNoPagination) {
                // Consulta sin paginación
                materiales = await query.orderBy('me.descripcion', 'asc');
                total = materiales.length;
            } else {
                // Contar total para paginación (consulta separada y simple)
                const totalResult = await db('materiales_extras as me')
                    .leftJoin('inventario_item as ii', 'me.id_item', 'ii.id_item')
                    .where('ii.tipo_item', 'MATERIAL EXTRA')
                    .count('me.id_item as count')
                    .first();
                total = parseInt(totalResult.count || 0);

                // Aplicar paginación
                const offset = (page - 1) * limit;
                materiales = await query
                    .orderBy('me.descripcion', 'asc')
                    .limit(limit)
                    .offset(offset);
            }

            const response = {
                success: true,
                materiales: materiales
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
            logger.error('Error obteniendo materiales:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/materiales/:id - Obtener material específico
    getMaterialById: async (req, res) => {
        try {
            const { id } = req.params;

            const material = await db('materiales_extras as me')
                .select(
                    'me.*',
                    'ii.tipo_item',
                    'ii.fecha_creacion'
                )
                .leftJoin('inventario_item as ii', 'me.id_item', 'ii.id_item')
                .where('me.id_item', id)
                .first();

            if (!material) {
                throw new NotFoundError('Material no encontrado');
            }

            res.json({
                success: true,
                data: material
            });

        } catch (error) {
            logger.error('Error obteniendo material:', error);
            throw error;
        }
    },

    // POST /api/v1/inventario/materiales - Crear nuevo material
    createMaterial: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const {
                id_material_extra,
                descripcion,
                categoria,
                presentacion,
                unidad,
                permite_decimales,
                cantidad_disponible,
                marca,
                estado_calidad,
                ubicacion,
                precioxunidad,
                uso_principal,
                stock_minimo
            } = req.body;

            // Validaciones
            const estadosValidos = ['Bueno', 'Regular', 'Usado 50%', 'Malo'];
            if (!estadosValidos.includes(estado_calidad)) {
                throw new ValidationError('Estado de calidad inválido');
            }

            const ubicacionesValidas = ['Bodega CDMX', 'Querétaro', 'Oficina', 'Instalación'];
            if (!ubicacionesValidas.includes(ubicacion)) {
                throw new ValidationError('Ubicación inválida');
            }

            // Validar campos requeridos
            if (!id_material_extra || !descripcion || !categoria || !unidad) {
                throw new ValidationError('Faltan campos requeridos');
            }

            // Verificar si ya existe un material con ese ID
            const materialExistente = await trx('materiales_extras')
                .where('id_material_extra', id_material_extra)
                .first();

            if (materialExistente) {
                throw new ValidationError('Ya existe un material con ese ID');
            }

            // Crear registro en inventario_item
            const [{ id_item }] = await trx('inventario_item').insert({
                tipo_item: 'MATERIAL EXTRA',
                fecha_creacion: db.fn.now()
            }).returning('id_item');

            // Crear material extra
            await trx('materiales_extras').insert({
                id_item,
                id_material_extra,
                descripcion,
                categoria,
                presentacion,
                unidad,
                permite_decimales: permite_decimales || false,
                cantidad_disponible: parseFloat(cantidad_disponible || 0),
                marca,
                estado_calidad,
                ubicacion,
                precioxunidad: parseFloat(precioxunidad || 0),
                uso_principal,
                stock_minimo: parseFloat(stock_minimo || 0),
                ultima_modificacion: db.fn.now()
            });

            await trx.commit();

            res.status(201).json({
                success: true,
                message: 'Material creado exitosamente',
                data: { id_item, id_material_extra }
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error creando material:', error);
            res.status(500).json({
                success: false,
                message: 'Error en la base de datos',
                error: error.message,
                detail: error.detail,
                stack: error.stack
            });
        }
    },

    // PUT /api/v1/inventario/materiales/:id - Actualizar material
    updateMaterial: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;
            const {
                descripcion,
                categoria,
                presentacion,
                unidad,
                permite_decimales,
                cantidad_disponible,
                marca,
                estado_calidad,
                ubicacion,
                precioxunidad,
                uso_principal,
                stock_minimo
            } = req.body;

            // Verificar que el material existe
            const materialExistente = await trx('materiales_extras')
                .where('id_item', id)
                .first();

            if (!materialExistente) {
                throw new NotFoundError('Material no encontrado');
            }

            // Validaciones
            const estadosValidos = ['Bueno', 'Regular', 'Usado 50%', 'Malo'];
            if (estado_calidad && !estadosValidos.includes(estado_calidad)) {
                throw new ValidationError('Estado de calidad inválido');
            }

            const ubicacionesValidas = ['Bodega CDMX', 'Querétaro', 'Oficina', 'Instalación'];
            if (ubicacion && !ubicacionesValidas.includes(ubicacion)) {
                throw new ValidationError('Ubicación inválida');
            }

            // Actualizar material
            const updateData = {};
            if (descripcion !== undefined) updateData.descripcion = descripcion;
            if (categoria !== undefined) updateData.categoria = categoria;
            if (presentacion !== undefined) updateData.presentacion = presentacion;
            if (unidad !== undefined) updateData.unidad = unidad;
            if (permite_decimales !== undefined) updateData.permite_decimales = permite_decimales;
            if (cantidad_disponible !== undefined) updateData.cantidad_disponible = parseFloat(cantidad_disponible);
            if (marca !== undefined) updateData.marca = marca;
            if (estado_calidad !== undefined) updateData.estado_calidad = estado_calidad;
            if (ubicacion !== undefined) updateData.ubicacion = ubicacion;
            if (precioxunidad !== undefined) updateData.precioxunidad = parseFloat(precioxunidad);
            if (stock_minimo !== undefined) updateData.stock_minimo = parseFloat(stock_minimo);
            if (uso_principal !== undefined) updateData.uso_principal = uso_principal;

            updateData.ultima_modificacion = db.fn.now();

            await trx('materiales_extras')
                .where('id_item', id)
                .update(updateData);

            await trx.commit();

            res.json({
                success: true,
                message: 'Material actualizado exitosamente',
                data: { id_item: id }
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error actualizando material:', error);
            throw error;
        }
    },

    // DELETE /api/v1/inventario/materiales/:id - Eliminar material
    deleteMaterial: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;

            // Verificar que el material existe
            const material = await trx('materiales_extras')
                .where('id_item', id)
                .first();

            if (!material) {
                throw new NotFoundError('Material no encontrado');
            }

            // Eliminar material (el inventario_item se elimina automáticamente por CASCADE)
            await trx('materiales_extras')
                .where('id_item', id)
                .del();

            await trx.commit();

            res.json({
                success: true,
                message: 'Material eliminado exitosamente'
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error eliminando material:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/materiales/categorias - Obtener categorías disponibles
    getCategorias: async (req, res) => {
        try {
            const categorias = await db('materiales_extras')
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

    // GET /api/v1/inventario/materiales/subgrupos - Obtener subgrupos disponibles
    getSubgrupos: async (req, res) => {
        try {
            // Mapeo de categorías a subgrupos según la propuesta
            const subgrupos = [
                'Cintas y cintillos',
                'Piolas, cuerdas y lazos',
                'Ojillos, remaches y herrajes menores',
                'Plásticos, emplayes y adhesivos',
                'Taquetes, tornillos y sujetadores',
                'Herramientas desechables o limitadas',
                'Etiquetas y consumibles de señalización',
                'Materiales de embalaje y sujeción temporal'
            ];

            res.json({
                success: true,
                data: subgrupos
            });

        } catch (error) {
            logger.error('Error obteniendo subgrupos:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/materiales/categoria/:categoria - Obtener materiales por categoría
    getMaterialesPorCategoria: async (req, res) => {
        try {
            const { categoria } = req.params;
            const { page = 1, limit = 50 } = req.query;

            let query = db('materiales_extras as me')
                .select(
                    'me.*',
                    'ii.tipo_item',
                    'ii.fecha_creacion'
                )
                .leftJoin('inventario_item as ii', 'me.id_item', 'ii.id_item')
                .where('ii.tipo_item', 'MATERIAL EXTRA')
                .whereRaw('LOWER(me.categoria) = ?', [categoria.toLowerCase()]);

            // Contar total
            const totalResult = await query.clone().count('me.id_item as count').first();
            const total = parseInt(totalResult.count || 0);

            // Aplicar paginación
            const offset = (page - 1) * limit;
            const materiales = await query
                .orderBy('me.descripcion', 'asc')
                .limit(limit)
                .offset(offset);

            res.json({
                success: true,
                materiales: materiales,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    totalPages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            logger.error('Error obteniendo materiales por categoría:', error);
            throw error;
        }
    },

    // POST /api/v1/inventario/materiales/entrada - Registrar entrada de material
    entradaMaterial: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id, cantidad, descripcion } = req.body;
            
            console.log('🔍 Entrada material - Datos recibidos:', { id, cantidad, descripcion });
            console.log('🔍 Entrada material - Usuario:', req.user);
            
            if (!id || !cantidad || isNaN(cantidad) || cantidad <= 0) {
                throw new ValidationError('Datos inválidos para entrada');
            }

            if (!req.user || !req.user.id) {
                throw new ValidationError('Usuario no autenticado');
            }

            // Verificar que el material existe
            const material = await trx('materiales_extras')
                .where('id_item', id)
                .first();

            if (!material) {
                throw new NotFoundError('Material no encontrado');
            }

            console.log('🔍 Material encontrado:', material);

            // Registrar movimiento
            const movimientoData = {
                id_item: id,
                tipo_mov: 'AJUSTE_IN',
                cantidad: parseFloat(cantidad),
                unidad: material.unidad || 'unidad',
                notas: descripcion || null,
                fecha: db.fn.now(),
                id_usuario: req.user.id
            };
            
            console.log('🔍 Insertando movimiento:', movimientoData);
            
            await trx('movimiento_inventario').insert(movimientoData);

            // Actualizar cantidad del material
            const nuevaCantidad = (material.cantidad_disponible || 0) + parseFloat(cantidad);
            const updateData = {
                cantidad_disponible: nuevaCantidad,
                ultima_modificacion: db.fn.now()
            };
            
            console.log('🔍 Actualizando material:', { id_item: id, ...updateData });
            
            await trx('materiales_extras')
                .where('id_item', id)
                .update(updateData);

            await trx.commit();

            res.json({ 
                success: true, 
                message: 'Entrada registrada correctamente',
                data: {
                    id_item: id,
                    cantidad_agregada: cantidad,
                    cantidad_anterior: material.cantidad_disponible || 0,
                    cantidad_nueva: nuevaCantidad
                }
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error en entrada de material:', error);
            console.error('❌ Error en entrada de material:', error);
            
            if (error instanceof ValidationError || error instanceof NotFoundError) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    },

    // POST /api/v1/inventario/materiales/salida - Registrar salida de material
    salidaMaterial: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id, cantidad, descripcion } = req.body;
            
            console.log('🔍 Salida material - Datos recibidos:', { id, cantidad, descripcion });
            console.log('🔍 Salida material - Usuario:', req.user);
            
            if (!id || !cantidad || isNaN(cantidad) || cantidad <= 0) {
                throw new ValidationError('Datos inválidos para salida');
            }

            if (!req.user || !req.user.id) {
                throw new ValidationError('Usuario no autenticado');
            }

            // Obtener material actual
            const material = await trx('materiales_extras')
                .where('id_item', id)
                .first();

            if (!material) {
                throw new NotFoundError('Material no encontrado');
            }

            console.log('🔍 Material encontrado:', material);

            const stockActual = material.cantidad_disponible || 0;
            if (cantidad > stockActual) {
                throw new ValidationError(`Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${cantidad}`);
            }

            // Registrar movimiento
            const movimientoData = {
                id_item: id,
                tipo_mov: 'CONSUMO',
                cantidad: parseFloat(cantidad),
                unidad: material.unidad || 'unidad',
                notas: descripcion || null,
                fecha: db.fn.now(),
                id_usuario: req.user.id
            };
            
            console.log('🔍 Insertando movimiento:', movimientoData);
            
            await trx('movimiento_inventario').insert(movimientoData);

            // Actualizar cantidad del material
            const nuevaCantidad = stockActual - parseFloat(cantidad);
            const updateData = {
                cantidad_disponible: nuevaCantidad,
                ultima_modificacion: db.fn.now()
            };
            
            console.log('🔍 Actualizando material:', { id_item: id, ...updateData });
            
            await trx('materiales_extras')
                .where('id_item', id)
                .update(updateData);

            await trx.commit();

            res.json({ 
                success: true, 
                message: 'Salida registrada correctamente',
                data: {
                    id_item: id,
                    cantidad_retirada: cantidad,
                    cantidad_anterior: stockActual,
                    cantidad_nueva: nuevaCantidad
                }
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error en salida de material:', error);
            console.error('❌ Error en salida de material:', error);
            
            if (error instanceof ValidationError || error instanceof NotFoundError) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
};

module.exports = materialesController;