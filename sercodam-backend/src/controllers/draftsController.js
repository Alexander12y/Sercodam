const db = require('../config/database');
const logger = require('../config/logger');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

const draftsController = {
    // POST /api/v1/drafts - Guardar o actualizar draft
    saveDraft: async (req, res) => {
        try {
            console.log('📥 Recibida petición para guardar draft:', req.body);
            
            const {
                id_usuario,
                id_op,
                datos_formulario,
                panos_seleccionados = [],
                materiales_seleccionados = [],
                herramientas_seleccionadas = [],
                paso_actual = 1
            } = req.body;

            // Asegurar que los arrays sean realmente arrays
            const panosArray = Array.isArray(panos_seleccionados) ? panos_seleccionados : [];
            const materialesArray = Array.isArray(materiales_seleccionados) ? materiales_seleccionados : [];
            const herramientasArray = Array.isArray(herramientas_seleccionadas) ? herramientas_seleccionadas : [];

            console.log('🔍 Datos extraídos:', {
                id_usuario,
                id_op,
                has_datos_formulario: !!datos_formulario,
                panos_count: panosArray.length,
                materiales_count: materialesArray.length,
                herramientas_count: herramientasArray.length,
                paso_actual
            });

            // Log detallado de los arrays para debugging
            console.log('📋 Panos array:', JSON.stringify(panosArray, null, 2));
            console.log('📋 Materiales array:', JSON.stringify(materialesArray, null, 2));
            console.log('📋 Herramientas array:', JSON.stringify(herramientasArray, null, 2));

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
            const existingDraft = await db('ordenes_draft')
                .where('id_usuario', id_usuario)
                .where('activo', true)
                .first();

            console.log('📋 Draft existente encontrado:', existingDraft);

            let result;

            if (existingDraft) {
                // Actualizar draft existente
                console.log('🔄 Actualizando draft existente:', existingDraft.id_draft);
                result = await db('ordenes_draft')
                    .where('id_draft', existingDraft.id_draft)
                    .update({
                        id_op: id_op || null,
                        datos_formulario: db.raw('?::jsonb', [JSON.stringify(datos_formulario)]),
                        panos_seleccionados: db.raw('?::jsonb', [JSON.stringify(panosArray)]),
                        materiales_seleccionados: db.raw('?::jsonb', [JSON.stringify(materialesArray)]),
                        herramientas_seleccionadas: db.raw('?::jsonb', [JSON.stringify(herramientasArray)]),
                        paso_actual,
                        fecha_actualizacion: db.fn.now(),
                        fecha_expiracion: db.raw('CURRENT_TIMESTAMP + INTERVAL \'15 days\'')
                    })
                    .returning('*');

                console.log('✅ Draft actualizado:', result[0]);
                logger.info(`Draft actualizado para usuario ${id_usuario}, paso ${paso_actual}`);
            } else {
                // Crear nuevo draft
                console.log('🆕 Creando nuevo draft para usuario:', id_usuario);
                result = await db('ordenes_draft')
                    .insert({
                        id_usuario,
                        id_op: id_op || null,
                        datos_formulario: db.raw('?::jsonb', [JSON.stringify(datos_formulario)]),
                        panos_seleccionados: db.raw('?::jsonb', [JSON.stringify(panosArray)]),
                        materiales_seleccionados: db.raw('?::jsonb', [JSON.stringify(materialesArray)]),
                        herramientas_seleccionadas: db.raw('?::jsonb', [JSON.stringify(herramientasArray)]),
                        paso_actual
                    })
                    .returning('*');

                console.log('✅ Nuevo draft creado:', result[0]);
                logger.info(`Nuevo draft creado para usuario ${id_usuario}, paso ${paso_actual}`);
            }

            console.log('📤 Enviando respuesta:', { success: true, data: result[0] });
            res.json({
                success: true,
                data: result[0],
                message: existingDraft ? 'Draft actualizado' : 'Draft creado'
            });

        } catch (error) {
            console.error('❌ Error en saveDraft:', error);
            logger.error('Error guardando draft:', error);
            throw error;
        }
    },

    // GET /api/v1/drafts/:id_usuario - Obtener draft del usuario
    getDraftByUser: async (req, res) => {
        try {
            const { id_usuario } = req.params;

            const draft = await db('ordenes_draft')
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
            logger.error('Error obteniendo draft:', error);
            throw error;
        }
    },

    // GET /api/v1/drafts - Obtener todos los drafts (para administradores)
    getAllDrafts: async (req, res) => {
        try {
            const { page = 1, limit = 50 } = req.query;

            const offset = (page - 1) * limit;

            const drafts = await db('ordenes_draft as od')
                .select(
                    'od.*',
                    'u.nombre as nombre_usuario',
                    'u.email as email_usuario'
                )
                .leftJoin('usuario as u', 'od.id_usuario', 'u.id')
                .where('od.activo', true)
                .where('od.fecha_expiracion', '>', db.fn.now())
                .orderBy('od.fecha_actualizacion', 'desc')
                .limit(limit)
                .offset(offset);

            // Contar total
            const { count } = await db('ordenes_draft')
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
            logger.error('Error obteniendo drafts:', error);
            throw error;
        }
    },

    // DELETE /api/v1/drafts/:id_draft - Eliminar draft específico
    deleteDraft: async (req, res) => {
        try {
            const { id_draft } = req.params;

            const result = await db('ordenes_draft')
                .where('id_draft', id_draft)
                .update({ activo: false });

            if (result === 0) {
                throw new NotFoundError('Draft no encontrado');
            }

            logger.info(`Draft ${id_draft} eliminado`);

            res.json({
                success: true,
                message: 'Draft eliminado correctamente'
            });

        } catch (error) {
            logger.error('Error eliminando draft:', error);
            throw error;
        }
    },

    // DELETE /api/v1/drafts/user/:id_usuario - Eliminar draft del usuario
    deleteUserDraft: async (req, res) => {
        try {
            const { id_usuario } = req.params;

            const result = await db('ordenes_draft')
                .where('id_usuario', id_usuario)
                .where('activo', true)
                .update({ activo: false });

            logger.info(`Draft del usuario ${id_usuario} eliminado`);

            res.json({
                success: true,
                message: 'Draft eliminado correctamente'
            });

        } catch (error) {
            logger.error('Error eliminando draft del usuario:', error);
            throw error;
        }
    },

    // POST /api/v1/drafts/cleanup - Limpiar drafts expirados
    cleanupExpiredDrafts: async (req, res) => {
        try {
            const result = await db.raw('SELECT limpiar_drafts_expirados()');

            logger.info('Drafts expirados limpiados');

            res.json({
                success: true,
                message: 'Drafts expirados eliminados correctamente'
            });

        } catch (error) {
            logger.error('Error limpiando drafts expirados:', error);
            throw error;
        }
    }
};

module.exports = draftsController; 