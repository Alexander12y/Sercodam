const db = require('../config/database');
const logger = require('../config/logger');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

const cotizacionesDraftsController = {
    // POST /api/v1/cotizaciones-drafts - Guardar o actualizar draft
    saveDraft: async (req, res) => {
        try {
            console.log('📥 Recibida petición para guardar draft de cotización:', req.body);
            
            const {
                id_usuario,
                id_cotizacion,
                datos_formulario,
                detalle_productos = [],
                conceptos_extra_list = [],
                seccion_actual = 1
            } = req.body;

            // Asegurar que los arrays sean realmente arrays
            const detalleArray = Array.isArray(detalle_productos) ? detalle_productos : [];
            const conceptosArray = Array.isArray(conceptos_extra_list) ? conceptos_extra_list : [];

            console.log('🔍 Datos extraídos:', {
                id_usuario,
                id_cotizacion,
                has_datos_formulario: !!datos_formulario,
                detalle_count: detalleArray.length,
                conceptos_count: conceptosArray.length,
                seccion_actual
            });

            // Log detallado de los arrays para debugging
            console.log('📋 Detalle productos array:', JSON.stringify(detalleArray, null, 2));
            console.log('📋 Conceptos extra array:', JSON.stringify(conceptosArray, null, 2));

            // Validaciones
            if (!id_usuario) {
                console.log('❌ Error: ID de usuario es requerido');
                throw new ValidationError('ID de usuario es requerido');
            }

            if (!datos_formulario) {
                console.log('❌ Error: Datos del formulario son requeridos');
                throw new ValidationError('Datos del formulario son requeridos');
            }

            // Verificar si ya existe un draft para este usuario
            console.log('🔍 Buscando draft existente para usuario:', id_usuario);
            const existingDraft = await db('cotizaciones_draft')
                .where('id_usuario', id_usuario)
                .where('activo', true)
                .first();

            console.log('📋 Draft existente encontrado:', existingDraft);

            let result;

            if (existingDraft) {
                // Actualizar draft existente
                console.log('🔄 Actualizando draft existente:', existingDraft.id_draft);
                result = await db('cotizaciones_draft')
                    .where('id_draft', existingDraft.id_draft)
                    .update({
                        id_cotizacion: id_cotizacion || null,
                        datos_formulario: db.raw('?::jsonb', [JSON.stringify(datos_formulario)]),
                        detalle_productos: db.raw('?::jsonb', [JSON.stringify(detalleArray)]),
                        conceptos_extra_list: db.raw('?::jsonb', [JSON.stringify(conceptosArray)]),
                        seccion_actual,
                        fecha_actualizacion: db.fn.now(),
                        fecha_expiracion: db.raw('CURRENT_TIMESTAMP + INTERVAL \'15 days\'')
                    })
                    .returning('*');

                console.log('✅ Draft actualizado:', result[0]);
                logger.info(`Draft de cotización actualizado para usuario ${id_usuario}, sección ${seccion_actual}`);
            } else {
                // Crear nuevo draft
                console.log('🆕 Creando nuevo draft para usuario:', id_usuario);
                result = await db('cotizaciones_draft')
                    .insert({
                        id_usuario,
                        id_cotizacion: id_cotizacion || null,
                        datos_formulario: db.raw('?::jsonb', [JSON.stringify(datos_formulario)]),
                        detalle_productos: db.raw('?::jsonb', [JSON.stringify(detalleArray)]),
                        conceptos_extra_list: db.raw('?::jsonb', [JSON.stringify(conceptosArray)]),
                        seccion_actual
                    })
                    .returning('*');

                console.log('✅ Nuevo draft creado:', result[0]);
                logger.info(`Nuevo draft de cotización creado para usuario ${id_usuario}, sección ${seccion_actual}`);
            }

            console.log('📤 Enviando respuesta:', { success: true, data: result[0] });
            res.json({
                success: true,
                data: result[0],
                message: existingDraft ? 'Draft actualizado' : 'Draft creado'
            });

        } catch (error) {
            console.error('❌ Error en saveDraft:', error);
            logger.error('Error guardando draft de cotización:', error);
            throw error;
        }
    },

    // GET /api/v1/cotizaciones-drafts/:id_usuario - Obtener draft del usuario
    getDraftByUser: async (req, res) => {
        try {
            const { id_usuario } = req.params;

            const draft = await db('cotizaciones_draft')
                .where('id_usuario', id_usuario)
                .where('activo', true)
                .where('fecha_expiracion', '>', db.fn.now())
                .first();

            if (!draft) {
                return res.json({
                    success: true,
                    data: null,
                    message: 'No se encontró draft activo'
                });
            }

            res.json({
                success: true,
                data: draft
            });

        } catch (error) {
            logger.error('Error obteniendo draft de cotización:', error);
            throw error;
        }
    },

    // GET /api/v1/cotizaciones-drafts - Obtener todos los drafts (para administradores)
    getAllDrafts: async (req, res) => {
        try {
            const { page = 1, limit = 50 } = req.query;

            const offset = (page - 1) * limit;

            const drafts = await db('cotizaciones_draft as cd')
                .select(
                    'cd.*',
                    'u.nombre as nombre_usuario',
                    'u.email as email_usuario'
                )
                .leftJoin('usuario as u', 'cd.id_usuario', 'u.id')
                .where('cd.activo', true)
                .where('cd.fecha_expiracion', '>', db.fn.now())
                .orderBy('cd.fecha_actualizacion', 'desc')
                .limit(limit)
                .offset(offset);

            // Contar total
            const { count } = await db('cotizaciones_draft')
                .where('activo', true)
                .where('fecha_expiracion', '>', db.fn.now())
                .count('* as count')
                .first();

            res.json({
                success: true,
                data: drafts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(count),
                    totalPages: Math.ceil(count / limit)
                }
            });

        } catch (error) {
            logger.error('Error obteniendo drafts de cotizaciones:', error);
            throw error;
        }
    },

    // DELETE /api/v1/cotizaciones-drafts/:id_draft - Eliminar draft específico
    deleteDraft: async (req, res) => {
        try {
            const { id_draft } = req.params;

            const result = await db('cotizaciones_draft')
                .where('id_draft', id_draft)
                .update({ activo: false });

            if (result === 0) {
                throw new NotFoundError('Draft no encontrado');
            }

            logger.info(`Draft de cotización ${id_draft} eliminado`);

            res.json({
                success: true,
                message: 'Draft eliminado correctamente'
            });

        } catch (error) {
            logger.error('Error eliminando draft de cotización:', error);
            throw error;
        }
    },

    // DELETE /api/v1/cotizaciones-drafts/user/:id_usuario - Eliminar draft del usuario
    deleteUserDraft: async (req, res) => {
        try {
            const { id_usuario } = req.params;

            const result = await db('cotizaciones_draft')
                .where('id_usuario', id_usuario)
                .where('activo', true)
                .update({ activo: false });

            logger.info(`Draft de cotización del usuario ${id_usuario} eliminado`);

            res.json({
                success: true,
                message: 'Draft eliminado correctamente'
            });

        } catch (error) {
            logger.error('Error eliminando draft de cotización del usuario:', error);
            throw error;
        }
    },

    // POST /api/v1/cotizaciones-drafts/cleanup - Limpiar drafts expirados
    cleanupExpiredDrafts: async (req, res) => {
        try {
            const result = await db.raw('SELECT limpiar_cotizaciones_drafts_expirados()');

            logger.info('Drafts de cotizaciones expirados limpiados');

            res.json({
                success: true,
                message: 'Drafts expirados eliminados correctamente'
            });

        } catch (error) {
            logger.error('Error limpiando drafts de cotizaciones expirados:', error);
            throw error;
        }
    }
};

module.exports = cotizacionesDraftsController;