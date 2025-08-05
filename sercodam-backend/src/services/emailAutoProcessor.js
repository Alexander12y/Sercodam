const gmailService = require('./gmailService');
const emailProcessor = require('./emailProcessor');
const db = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../config/logger');

class EmailAutoProcessor {
  constructor() {
    this.isProcessing = false;
    this.lastProcessedEmailId = null;
  }

  /**
   * Procesar emails automáticamente
   */
  async processEmails() {
    if (this.isProcessing) {
      logger.info('⚠️ Procesamiento de emails ya en curso, saltando...');
      return;
    }

    this.isProcessing = true;
    const results = {
      processed: 0,
      created: 0,
      errors: 0,
      skipped: 0
    };

    try {
      logger.info('🔄 Iniciando procesamiento automático de emails...');

      // Obtener emails de Sercodam
      const emails = await gmailService.getSercodamEmails();
      logger.info(`📧 Encontrados ${emails.length} emails para procesar`);

      for (const email of emails) {
        try {
          // Verificar si ya procesamos este email
          const existingLead = await db('leads')
            .where('datos_estructurados->gmail_info->id', email.messageId)
            .first();

          if (existingLead) {
            logger.info(`⏭️ Email ${email.messageId} ya procesado, saltando...`);
            results.skipped++;
            continue;
          }

          // Parsear datos del cliente
          const clientData = gmailService.parseClientData(email);
          if (!clientData) {
            logger.warn(`❌ No se pudieron extraer datos del email ${email.messageId}`);
            results.errors++;
            continue;
          }

          // Intentar procesamiento con IA primero, si falla usar manual
          let processedData = await emailProcessor.processEmailWithAI(
            email.body, 
            email.subject, 
            email.from
          );

          if (!processedData) {
            logger.info('🔄 IA falló, usando parsing manual...');
            processedData = emailProcessor.processEmailManual(
              email.body, 
              email.subject, 
              email.from
            );
          }

          if (!processedData) {
            logger.warn(`❌ No se pudo procesar email ${email.messageId}`);
            results.errors++;
            continue;
          }

          // Crear datos estructurados
          const datosEstructurados = {
            gmail_info: {
              id: email.messageId,
              thread_id: email.threadId,
              labels: email.labelIds,
              snippet: email.body.substring(0, 100)
            },
            ai_analysis: {
              analysis: processedData.projectDescription || 'Email procesado automáticamente',
              sentiment: processedData.urgency === 'HIGH' ? '0.9' : processedData.urgency === 'MEDIUM' ? '0.6' : '0.3',
              priority: processedData.urgency === 'HIGH' ? '0.9' : processedData.urgency === 'MEDIUM' ? '0.6' : '0.3',
              intent: 'cotización'
            },
            extracted_data: {
              phone: processedData.phone,
              company: processedData.company,
              budget: processedData.estimatedBudget,
              location: processedData.location,
              project_type: processedData.projectDescription,
              deadline: null
            },
            contact_info: {
              address: processedData.location,
              city: processedData.location,
              state: null,
              zip_code: null,
              country: 'México',
              website: null,
              linkedin: null
            },
            project_info: {
              type: processedData.projectDescription,
              area: null,
              location: processedData.location,
              required_date: null,
              urgency: processedData.urgency.toLowerCase()
            },
            preferences: {
              contact_channel: processedData.preferredContactMethod,
              contact_medium: 'EMAIL',
              preferred_time: null,
              preferred_language: 'es'
            }
          };

          // Preparar datos para inserción
          const leadData = {
            email_remitente: processedData.email,
            nombre_remitente: processedData.name,
            asunto_email: email.subject,
            contenido_email: email.body,
            contenido_interpretado: processedData.projectDescription || 'Email procesado automáticamente',
            datos_estructurados: JSON.stringify(datosEstructurados),
            telefono: processedData.phone,
            empresa: processedData.company,
            requerimientos: processedData.projectDescription,
            presupuesto_estimado: processedData.estimatedBudget,
            fuente: clientData.source.toLowerCase(),
            estado: 'nuevo',
            leido: false,
            fecha_recepcion: db.fn.now(),
            fecha_contacto: null,
            fecha_conversion: null,
            notas: `Procesado automáticamente desde Gmail - ${new Date().toLocaleString()}`,
            asignado_a: null,
            creado_en: db.fn.now(),
            actualizado_en: db.fn.now()
          };

          // 1) Intentar encontrar cliente existente
          const clienteExistente = await db('cliente')
            .select('id_cliente', 'nombre_cliente', 'email_cliente', 'telefono_cliente', 'empresa_cliente')
            .where(function() {
              this.where('email_cliente', processedData.email);
              
              // Si hay teléfono, también buscar por teléfono
              if (processedData.phone && processedData.phone.trim()) {
                this.orWhere('telefono_cliente', processedData.phone.trim());
              }
              
              // Si hay empresa, también buscar por empresa
              if (processedData.company && processedData.company.trim()) {
                this.orWhere('empresa_cliente', processedData.company.trim());
              }
            })
            .first();

          // Determinar por qué criterio se hizo match
          let matchPor = null;
          if (clienteExistente) {
            if (clienteExistente.email_cliente === processedData.email) {
              matchPor = 'email';
            } else if (processedData.phone && clienteExistente.telefono_cliente === processedData.phone.trim()) {
              matchPor = 'telefono';
            } else if (processedData.company && clienteExistente.empresa_cliente === processedData.company.trim()) {
              matchPor = 'empresa';
            }
            
            logger.info(`🔍 Cliente existente encontrado: ${clienteExistente.id_cliente} - ${clienteExistente.nombre_cliente} (match por: ${matchPor})`);
          }

          // Actualizar datos estructurados con información del cliente
          datosEstructurados.cliente_match = clienteExistente ? {
            id_cliente: clienteExistente.id_cliente,
            nombre_cliente: clienteExistente.nombre_cliente,
            match_por: matchPor,
            encontrado: true
          } : {
            encontrado: false
          };

          // Actualizar datos del lead con información del cliente
          leadData.datos_estructurados = JSON.stringify(datosEstructurados);
          leadData.estado = clienteExistente ? 'nuevo_proyecto' : 'nuevo';
          leadData.id_cliente = clienteExistente ? clienteExistente.id_cliente : null;
          leadData.match_por = matchPor;

          // Crear el lead
          const [nuevoLead] = await db('leads')
            .insert(leadData)
            .returning('*');

          logger.info(`✅ Nuevo lead creado automáticamente: ${nuevoLead.id_lead} - ${nuevoLead.email_remitente}`);

          // Marcar email como leído y agregar etiqueta
          await gmailService.markAsRead(email.messageId);
          await gmailService.addLabel(email.messageId, 'Sercodam-Procesado');

          results.created++;
          results.processed++;

          // Actualizar último email procesado
          this.lastProcessedEmailId = email.messageId;

        } catch (error) {
          logger.error(`❌ Error procesando email ${email.messageId}:`, error);
          results.errors++;
        }
      }

      // Invalidar cache de leads no leídos
      await cache.del('leads_no_leidos');

      logger.info('🎉 Procesamiento automático completado:', results);

    } catch (error) {
      logger.error('💥 Error en procesamiento automático:', error);
      results.errors++;
    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  /**
   * Procesar un email específico
   */
  async processSingleEmail(emailId) {
    try {
      logger.info(`🔍 Procesando email específico: ${emailId}`);

      const email = await gmailService.getEmailById(emailId);
      if (!email) {
        throw new Error('Email no encontrado');
      }

      // Verificar si ya procesamos este email
      const existingLead = await db('leads')
        .where('datos_estructurados->gmail_info->id', emailId)
        .first();

      if (existingLead) {
        logger.info(`⏭️ Email ${emailId} ya procesado`);
        return { processed: false, reason: 'already_processed', lead: existingLead };
      }

      // Parsear datos del cliente
      const clientData = gmailService.parseClientData(email);
      if (!clientData) {
        throw new Error('No se pudieron extraer datos del email');
      }

      // Procesar con IA o manual
      let processedData = await emailProcessor.processEmailWithAI(
        email.body, 
        email.subject, 
        email.from
      );

      if (!processedData) {
        processedData = emailProcessor.processEmailManual(
          email.body, 
          email.subject, 
          email.from
        );
      }

      if (!processedData) {
        throw new Error('No se pudo procesar el email');
      }

      // Crear datos estructurados
      const datosEstructurados = {
        gmail_info: {
          id: email.messageId,
          thread_id: email.threadId,
          labels: email.labelIds,
          snippet: email.body.substring(0, 100)
        },
        ai_analysis: {
          analysis: processedData.projectDescription || 'Email procesado manualmente',
          sentiment: processedData.urgency === 'HIGH' ? '0.9' : processedData.urgency === 'MEDIUM' ? '0.6' : '0.3',
          priority: processedData.urgency === 'HIGH' ? '0.9' : processedData.urgency === 'MEDIUM' ? '0.6' : '0.3',
          intent: 'cotización'
        },
        extracted_data: {
          phone: processedData.phone,
          company: processedData.company,
          budget: processedData.estimatedBudget,
          location: processedData.location,
          project_type: processedData.projectDescription,
          deadline: null
        },
        contact_info: {
          address: processedData.location,
          city: processedData.location,
          state: null,
          zip_code: null,
          country: 'México',
          website: null,
          linkedin: null
        },
        project_info: {
          type: processedData.projectDescription,
          area: null,
          location: processedData.location,
          required_date: null,
          urgency: processedData.urgency.toLowerCase()
        },
        preferences: {
          contact_channel: processedData.preferredContactMethod,
          contact_medium: 'EMAIL',
          preferred_time: null,
          preferred_language: 'es'
        }
      };

      // Preparar datos para inserción
      const leadData = {
        email_remitente: processedData.email,
        nombre_remitente: processedData.name,
        asunto_email: email.subject,
        contenido_email: email.body,
        contenido_interpretado: processedData.projectDescription || 'Email procesado manualmente',
        datos_estructurados: JSON.stringify(datosEstructurados),
        telefono: processedData.phone,
        empresa: processedData.company,
        requerimientos: processedData.projectDescription,
        presupuesto_estimado: processedData.estimatedBudget,
        fuente: clientData.source.toLowerCase(),
        estado: 'nuevo',
        leido: false,
        fecha_recepcion: db.fn.now(),
        fecha_contacto: null,
        fecha_conversion: null,
        notas: `Procesado manualmente desde Gmail - ${new Date().toLocaleString()}`,
        asignado_a: null,
        creado_en: db.fn.now(),
        actualizado_en: db.fn.now()
      };

      // Crear el lead
      const [nuevoLead] = await db('leads')
        .insert(leadData)
        .returning('*');

      // Marcar email como leído y agregar etiqueta
      await gmailService.markAsRead(emailId);
      await gmailService.addLabel(emailId, 'Sercodam-Procesado');

      // Invalidar cache
      await cache.del('leads_no_leidos');

      logger.info(`✅ Email ${emailId} procesado exitosamente, lead creado: ${nuevoLead.id_lead}`);

      return { 
        processed: true, 
        lead: nuevoLead,
        clientData: processedData
      };

    } catch (error) {
      logger.error(`❌ Error procesando email ${emailId}:`, error);
      throw error;
    }
  }

  /**
   * Obtener estado del procesamiento
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      lastProcessedEmailId: this.lastProcessedEmailId,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new EmailAutoProcessor();