const db = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../config/logger');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

const leadsController = {
    // POST /api/v1/leads/webhook - Recibir lead desde Make.com
    receiveLeadFromMake: async (req, res) => {
        try {
            // Log completo de la petición para debugging
            logger.info('📧 Webhook de Make.com recibido:', {
                body: req.body,
                headers: req.headers,
                timestamp: new Date().toISOString()
            });

            const {
                // Campos básicos del email
                email_remitente,
                nombre_remitente,
                asunto_email,
                contenido_email,
                contenido_interpretado,
                datos_estructurados,
                
                // Información del cliente
                telefono,
                empresa,
                requerimientos,
                presupuesto_estimado,
                fuente = 'email',
                
                // Campos adicionales que pueden venir de Make.com
                fecha_contacto,
                fecha_conversion,
                notas,
                asignado_a,
                estado = 'nuevo',
                
                // Campos de Gmail específicos
                gmail_id,
                gmail_thread_id,
                gmail_labels,
                gmail_snippet,
                
                // Campos de análisis de IA
                ai_analysis,
                sentiment_score,
                priority_score,
                intent_detected,
                
                // Campos de extracción automática
                extracted_phone,
                extracted_company,
                extracted_budget,
                extracted_location,
                extracted_project_type,
                extracted_deadline,
                
                // Campos de contacto adicionales
                direccion,
                ciudad,
                estado_cliente,
                codigo_postal,
                pais,
                sitio_web,
                linkedin,
                
                // Campos de proyecto
                tipo_proyecto,
                area_proyecto,
                ubicacion_proyecto,
                fecha_requerida,
                urgencia,
                
                // Campos de seguimiento
                canal_contacto,
                medio_contacto,
                horario_preferido,
                idioma_preferido
            } = req.body;

            // Validaciones básicas
            if (!email_remitente) {
                throw new ValidationError('El email del remitente es requerido');
            }

            // 1) Intentar encontrar cliente existente
            const clienteExistente = await db('cliente')
                .select('id_cliente', 'nombre_cliente', 'email_cliente', 'telefono_cliente', 'empresa_cliente')
                .where(function() {
                    this.where('email_cliente', email_remitente.trim());
                    
                    // Si hay teléfono, también buscar por teléfono
                    if (telefono && telefono.trim()) {
                        this.orWhere('telefono_cliente', telefono.trim());
                    }
                    
                    // Si hay empresa, también buscar por empresa
                    if (empresa && empresa.trim()) {
                        this.orWhere('empresa_cliente', empresa.trim());
                    }
                })
                .first();

            // Determinar por qué criterio se hizo match
            let matchPor = null;
            if (clienteExistente) {
                if (clienteExistente.email_cliente === email_remitente.trim()) {
                    matchPor = 'email';
                } else if (telefono && clienteExistente.telefono_cliente === telefono.trim()) {
                    matchPor = 'telefono';
                } else if (empresa && clienteExistente.empresa_cliente === empresa.trim()) {
                    matchPor = 'empresa';
                }
                
                logger.info(`🔍 Cliente existente encontrado: ${clienteExistente.id_cliente} - ${clienteExistente.nombre_cliente} (match por: ${matchPor})`);
            }

            // Procesar datos estructurados si vienen como objeto
            let datosEstructuradosFinal = null;
            if (datos_estructurados) {
                if (typeof datos_estructurados === 'string') {
                    try {
                        datosEstructuradosFinal = JSON.parse(datos_estructurados);
                    } catch (e) {
                        datosEstructuradosFinal = { raw_data: datos_estructurados };
                    }
                } else {
                    datosEstructuradosFinal = datos_estructurados;
                }
            }

            // Crear objeto de datos estructurados con información extraída
            const datosCompletos = {
                ...datosEstructuradosFinal,
                gmail_info: {
                    id: gmail_id,
                    thread_id: gmail_thread_id,
                    labels: gmail_labels,
                    snippet: gmail_snippet
                },
                ai_analysis: {
                    analysis: ai_analysis,
                    sentiment: sentiment_score,
                    priority: priority_score,
                    intent: intent_detected
                },
                extracted_data: {
                    phone: extracted_phone || telefono,
                    company: extracted_company || empresa,
                    budget: extracted_budget || presupuesto_estimado,
                    location: extracted_location,
                    project_type: extracted_project_type || tipo_proyecto,
                    deadline: extracted_deadline || fecha_requerida
                },
                contact_info: {
                    address: direccion,
                    city: ciudad,
                    state: estado_cliente,
                    zip_code: codigo_postal,
                    country: pais,
                    website: sitio_web,
                    linkedin: linkedin
                },
                project_info: {
                    type: tipo_proyecto,
                    area: area_proyecto,
                    location: ubicacion_proyecto,
                    required_date: fecha_requerida,
                    urgency: urgencia
                },
                preferences: {
                    contact_channel: canal_contacto,
                    contact_medium: medio_contacto,
                    preferred_time: horario_preferido,
                    preferred_language: idioma_preferido
                },
                cliente_match: clienteExistente ? {
                    id_cliente: clienteExistente.id_cliente,
                    nombre_cliente: clienteExistente.nombre_cliente,
                    match_por: matchPor,
                    encontrado: true
                } : {
                    encontrado: false
                }
            };

            // Preparar datos para inserción
            const leadData = {
                email_remitente: email_remitente.trim(),
                nombre_remitente: nombre_remitente ? nombre_remitente.trim() : null,
                asunto_email: asunto_email ? asunto_email.trim() : null,
                contenido_email: contenido_email || null,
                contenido_interpretado: contenido_interpretado || null,
                datos_estructurados: JSON.stringify(datosCompletos),
                telefono: telefono || extracted_phone || null,
                empresa: empresa || extracted_company || null,
                requerimientos: requerimientos || null,
                presupuesto_estimado: presupuesto_estimado || extracted_budget || null,
                fuente: fuente,
                estado: clienteExistente ? 'nuevo_proyecto' : 'nuevo',
                leido: false,
                fecha_recepcion: db.fn.now(),
                fecha_contacto: fecha_contacto || null,
                fecha_conversion: fecha_conversion || null,
                notas: notas || null,
                asignado_a: asignado_a || null,
                id_cliente: clienteExistente ? clienteExistente.id_cliente : null,
                match_por: matchPor,
                creado_en: db.fn.now(),
                actualizado_en: db.fn.now()
            };

            // Crear el lead
            const [nuevoLead] = await db('leads')
                .insert(leadData)
                .returning('*');

            logger.info(`✅ Nuevo lead recibido desde Make.com: ${nuevoLead.id_lead} - ${nuevoLead.email_remitente}${clienteExistente ? ` (Cliente existente: ${clienteExistente.nombre_cliente})` : ' (Nuevo cliente)'}`);

            // Invalidar cache de leads no leídos
            await cache.del('leads_no_leidos');

            res.status(201).json({
                success: true,
                data: nuevoLead,
                message: clienteExistente ? 'Lead recibido para cliente existente' : 'Lead recibido para nuevo cliente',
                cliente_existente: clienteExistente ? {
                    id_cliente: clienteExistente.id_cliente,
                    nombre_cliente: clienteExistente.nombre_cliente,
                    match_por: matchPor
                } : null,
                processed_fields: {
                    email_remitente: !!email_remitente,
                    contenido_email: !!contenido_email,
                    datos_estructurados: !!datos_estructurados,
                    extracted_data: {
                        phone: !!extracted_phone,
                        company: !!extracted_company,
                        budget: !!extracted_budget,
                        location: !!extracted_location
                    }
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('❌ Error recibiendo lead desde Make.com:', error);
            throw error;
        }
    },

    // GET /api/v1/leads - Obtener todos los leads con filtros
    getLeads: async (req, res) => {
        try {
            const {
                estado,
                leido,
                search,
                page = 1,
                limit = 50,
                sortBy = 'fecha_recepcion',
                sortOrder = 'desc'
            } = req.query;

            let query = db('leads')
                .select(
                    'leads.*',
                    'cliente.nombre_cliente as cliente_nombre',
                    'cliente.empresa_cliente as cliente_empresa',
                    'cliente.email_cliente as cliente_email'
                )
                .leftJoin('cliente', 'leads.id_cliente', 'cliente.id_cliente')
                .orderBy(sortBy, sortOrder);

            // Aplicar filtros
            if (estado) {
                query = query.where('leads.estado', estado);
            }

            if (leido !== undefined) {
                query = query.where('leads.leido', leido === 'true');
            }

            // Aplicar filtro de búsqueda
            if (search && search.trim().length > 0) {
                query = query.where(function() {
                    this.where('leads.email_remitente', 'ilike', `%${search.trim()}%`)
                        .orWhere('leads.nombre_remitente', 'ilike', `%${search.trim()}%`)
                        .orWhere('leads.asunto_email', 'ilike', `%${search.trim()}%`)
                        .orWhere('leads.empresa', 'ilike', `%${search.trim()}%`)
                        .orWhere('cliente.nombre_cliente', 'ilike', `%${search.trim()}%`)
                        .orWhere('cliente.empresa_cliente', 'ilike', `%${search.trim()}%`);
                });
            }

            // Contar total para paginación
            const totalResult = await db('leads').count('id_lead as count').first();
            const total = parseInt(totalResult.count || 0);

            // Aplicar paginación
            const offset = (page - 1) * limit;
            const leads = await query
                .limit(limit)
                .offset(offset);

            res.json({
                success: true,
                leads: leads,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    totalPages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            logger.error('Error obteniendo leads:', error);
            throw error;
        }
    },

    // GET /api/v1/leads/stats - Obtener estadísticas de leads
    getLeadsStats: async (req, res) => {
        try {
            const stats = await db('leads')
                .select(
                    db.raw('COUNT(*) as total_leads'),
                    db.raw('COUNT(CASE WHEN estado = \'nuevo\' THEN 1 END) as leads_nuevos'),
                    db.raw('COUNT(CASE WHEN estado = \'nuevo_proyecto\' THEN 1 END) as leads_nuevo_proyecto'),
                    db.raw('COUNT(CASE WHEN estado = \'en_revision\' THEN 1 END) as leads_en_revision'),
                    db.raw('COUNT(CASE WHEN estado = \'contactado\' THEN 1 END) as leads_contactados'),
                    db.raw('COUNT(CASE WHEN estado = \'convertido\' THEN 1 END) as leads_convertidos'),
                    db.raw('COUNT(CASE WHEN estado = \'descartado\' THEN 1 END) as leads_descartados'),
                    db.raw('COUNT(CASE WHEN leido = false THEN 1 END) as leads_no_leidos'),
                    db.raw('COUNT(CASE WHEN fecha_recepcion >= NOW() - INTERVAL \'24 hours\' THEN 1 END) as leads_hoy'),
                    db.raw('COUNT(CASE WHEN fecha_recepcion >= NOW() - INTERVAL \'7 days\' THEN 1 END) as leads_semana'),
                    db.raw('COUNT(CASE WHEN id_cliente IS NOT NULL THEN 1 END) as leads_clientes_existentes'),
                    db.raw('COUNT(CASE WHEN id_cliente IS NULL THEN 1 END) as leads_clientes_nuevos')
                )
                .first();

            res.json({
                success: true,
                stats: {
                    total_leads: parseInt(stats.total_leads || 0),
                    leads_nuevos: parseInt(stats.leads_nuevos || 0),
                    leads_nuevo_proyecto: parseInt(stats.leads_nuevo_proyecto || 0),
                    leads_en_revision: parseInt(stats.leads_en_revision || 0),
                    leads_contactados: parseInt(stats.leads_contactados || 0),
                    leads_convertidos: parseInt(stats.leads_convertidos || 0),
                    leads_descartados: parseInt(stats.leads_descartados || 0),
                    leads_no_leidos: parseInt(stats.leads_no_leidos || 0),
                    leads_hoy: parseInt(stats.leads_hoy || 0),
                    leads_semana: parseInt(stats.leads_semana || 0),
                    leads_clientes_existentes: parseInt(stats.leads_clientes_existentes || 0),
                    leads_clientes_nuevos: parseInt(stats.leads_clientes_nuevos || 0)
                }
            });

        } catch (error) {
            logger.error('Error obteniendo estadísticas de leads:', error);
            throw error;
        }
    },

    // GET /api/v1/leads/:id - Obtener lead específico
    getLeadById: async (req, res) => {
        try {
            const { id } = req.params;

            const lead = await db('leads')
                .where('id_lead', id)
                .first();

            if (!lead) {
                throw new NotFoundError('Lead no encontrado');
            }

            // Marcar como leído si no lo está
            if (!lead.leido) {
                await db('leads')
                    .where('id_lead', id)
                    .update({
                        leido: true,
                        actualizado_en: db.fn.now()
                    });
                
                // Invalidar cache
                await cache.del('leads_no_leidos');
            }

            res.json({
                success: true,
                data: lead
            });

        } catch (error) {
            logger.error('Error obteniendo lead:', error);
            throw error;
        }
    },

    // PUT /api/v1/leads/:id - Actualizar lead
    updateLead: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                estado,
                asignado_a,
                notas,
                fecha_contacto,
                fecha_conversion
            } = req.body;

            // Verificar que el lead existe
            const leadExistente = await db('leads')
                .where('id_lead', id)
                .first();

            if (!leadExistente) {
                throw new NotFoundError('Lead no encontrado');
            }

            // Preparar datos de actualización
            const updateData = {
                actualizado_en: db.fn.now()
            };

            if (estado) updateData.estado = estado;
            if (asignado_a !== undefined) updateData.asignado_a = asignado_a;
            if (notas !== undefined) updateData.notas = notas;
            if (fecha_contacto) updateData.fecha_contacto = fecha_contacto;
            if (fecha_conversion) updateData.fecha_conversion = fecha_conversion;

            // Actualizar lead
            const [leadActualizado] = await db('leads')
                .where('id_lead', id)
                .update(updateData)
                .returning('*');

            logger.info(`Lead actualizado: ${leadActualizado.id_lead} - Estado: ${leadActualizado.estado}`);

            res.json({
                success: true,
                data: leadActualizado,
                message: 'Lead actualizado exitosamente'
            });

        } catch (error) {
            logger.error('Error actualizando lead:', error);
            throw error;
        }
    },

    // DELETE /api/v1/leads/:id - Eliminar lead
    deleteLead: async (req, res) => {
        try {
            const { id } = req.params;

            // Verificar que el lead existe
            const lead = await db('leads')
                .where('id_lead', id)
                .first();

            if (!lead) {
                throw new NotFoundError('Lead no encontrado');
            }

            // Eliminar lead
            await db('leads')
                .where('id_lead', id)
                .del();

            logger.info(`Lead eliminado: ${id} - ${lead.email_remitente}`);

            res.json({
                success: true,
                message: 'Lead eliminado exitosamente'
            });

        } catch (error) {
            logger.error('Error eliminando lead:', error);
            throw error;
        }
    },

    // GET /api/v1/leads/unread/count - Obtener conteo de leads no leídos
    getUnreadLeadsCount: async (req, res) => {
        try {
            // Intentar obtener del cache primero
            const cachedCount = await cache.get('leads_no_leidos');
            
            if (cachedCount !== null) {
                return res.json({
                    success: true,
                    count: parseInt(cachedCount)
                });
            }

            // Si no está en cache, consultar base de datos
            const result = await db('leads')
                .where('leido', false)
                .count('id_lead as count')
                .first();

            const count = parseInt(result.count || 0);

            // Guardar en cache por 5 minutos
            await cache.setex('leads_no_leidos', 300, count.toString());

            res.json({
                success: true,
                count: count
            });

        } catch (error) {
            logger.error('Error obteniendo conteo de leads no leídos:', error);
            throw error;
        }
    },

    // POST /api/v1/leads/process-emails - Procesar emails automáticamente
    processEmails: async (req, res) => {
        try {
            const emailAutoProcessor = require('../services/emailAutoProcessor');
            
            logger.info('🚀 Iniciando procesamiento automático de emails...');
            
            const results = await emailAutoProcessor.processEmails();
            
            res.json({
                success: true,
                message: 'Procesamiento de emails completado',
                results: results,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error procesando emails:', error);
            throw error;
        }
    },

    // POST /api/v1/leads/process-email/:emailId - Procesar email específico
    processSingleEmail: async (req, res) => {
        try {
            const { emailId } = req.params;
            const emailAutoProcessor = require('../services/emailAutoProcessor');
            
            logger.info(`🔍 Procesando email específico: ${emailId}`);
            
            const result = await emailAutoProcessor.processSingleEmail(emailId);
            
            res.json({
                success: true,
                message: result.processed ? 'Email procesado exitosamente' : 'Email ya procesado',
                data: result,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error procesando email específico:', error);
            throw error;
        }
    },

    // GET /api/v1/leads/email-status - Obtener estado del procesamiento de emails
    getEmailProcessingStatus: async (req, res) => {
        try {
            const emailAutoProcessor = require('../services/emailAutoProcessor');
            
            const status = emailAutoProcessor.getStatus();
            
            res.json({
                success: true,
                data: status,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error obteniendo estado de procesamiento:', error);
            throw error;
        }
    },

    // GET /api/v1/leads/gmail-emails - Obtener emails de Gmail (para testing)
    getGmailEmails: async (req, res) => {
        try {
            const gmailService = require('../services/gmailService');
            
            const emails = await gmailService.getSercodamEmails();
            
            res.json({
                success: true,
                data: emails.map(email => ({
                    messageId: email.messageId,
                    subject: email.subject,
                    from: email.from,
                    date: email.date,
                    bodyLength: email.body.length,
                    threadId: email.threadId,
                    labelIds: email.labelIds
                })),
                count: emails.length,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            logger.error('Error obteniendo emails de Gmail:', error);
            throw error;
        }
    },

    // POST /api/v1/leads/:id/convert-to-client - Convertir lead a cliente
    convertToClient: async (req, res) => {
        try {
            const { id } = req.params;
            const { notas_adicionales } = req.body;
            const userId = req.user?.id;

            logger.info(`🔄 Convirtiendo lead ${id} a cliente...`);

            // Verificar que el lead existe y no está ya convertido
            const lead = await db('leads')
                .where('id_lead', id)
                .first();

            if (!lead) {
                throw new NotFoundError('Lead no encontrado');
            }

            if (lead.estado === 'convertido') {
                throw new ValidationError('Este lead ya ha sido convertido a cliente');
            }

            // Iniciar transacción
            const trx = await db.transaction();

            try {
                // Llamar a la función de PostgreSQL para convertir lead a cliente
                const result = await trx.raw(
                    'SELECT convertir_lead_a_cliente(?, ?) as id_cliente',
                    [id, userId]
                );

                const idCliente = result.rows[0].id_cliente;

                // Actualizar notas adicionales si se proporcionan
                if (notas_adicionales) {
                    await trx('cliente')
                        .where('id_cliente', idCliente)
                        .update({
                            notas: db.raw('COALESCE(notas, ?) || ?', ['', `\n\nNotas de conversión: ${notas_adicionales}`])
                        });
                }

                // Obtener el cliente creado
                const cliente = await trx('cliente')
                    .where('id_cliente', idCliente)
                    .first();

                await trx.commit();

                logger.info(`✅ Lead ${id} convertido exitosamente a cliente ${idCliente}`);

                res.json({
                    success: true,
                    message: 'Lead convertido a cliente exitosamente',
                    data: {
                        id_cliente: idCliente,
                        cliente: cliente,
                        lead_original: {
                            id_lead: lead.id_lead,
                            email_remitente: lead.email_remitente,
                            nombre_remitente: lead.nombre_remitente
                        }
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (error) {
                await trx.rollback();
                throw error;
            }

        } catch (error) {
            logger.error('Error convirtiendo lead a cliente:', error);
            throw error;
        }
    }
};

module.exports = leadsController; 