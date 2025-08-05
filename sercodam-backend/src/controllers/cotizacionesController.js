const db = require('../config/database');
const logger = require('../config/logger');
const cotizacionPdfService = require('../services/cotizacionPdfServiceV2');
const cotizacionEmailService = require('../services/cotizacionEmailService');

// Estados válidos para cotizaciones
const ESTADOS_VALIDOS = ['por aprobar', 'aprobada', 'no aprobada', 'enviada', 'convertida', 'rechazada'];

const cotizacionesController = {
  // Obtener todas las cotizaciones con filtros y paginación
  getCotizaciones: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        estado = '',
        cliente = '',
        fecha_desde = '',
        fecha_hasta = ''
      } = req.query;

      let query = db('cotizacion as c')
        .leftJoin('cliente as cl', 'c.id_cliente', 'cl.id_cliente')
        .select(
          'c.*',
          'cl.nombre_cliente',
          'cl.empresa_cliente'
        );

      // Aplicar filtros
      if (estado) {
        query = query.where('c.estado', estado);
      }
      if (cliente) {
        query = query.where(function() {
          this.where('cl.nombre_cliente', 'ilike', `%${cliente}%`)
            .orWhere('cl.empresa_cliente', 'ilike', `%${cliente}%`);
        });
      }
      if (fecha_desde) {
        query = query.where('c.fecha_creacion', '>=', fecha_desde);
      }
      if (fecha_hasta) {
        query = query.where('c.fecha_creacion', '<=', fecha_hasta);
      }

      // Contar total de registros
      const countQuery = db('cotizacion as c')
        .leftJoin('cliente as cl', 'c.id_cliente', 'cl.id_cliente');

      // Aplicar los mismos filtros al count query
      if (estado) {
        countQuery.where('c.estado', estado);
      }
      if (cliente) {
        countQuery.where(function() {
          this.where('cl.nombre_cliente', 'ilike', `%${cliente}%`)
            .orWhere('cl.empresa_cliente', 'ilike', `%${cliente}%`);
        });
      }
      if (fecha_desde) {
        countQuery.where('c.fecha_creacion', '>=', fecha_desde);
      }
      if (fecha_hasta) {
        countQuery.where('c.fecha_creacion', '<=', fecha_hasta);
      }

      const total = await countQuery.count('* as count').first();

      // Aplicar paginación
      const offset = (page - 1) * limit;
      const cotizaciones = await query
        .orderBy('c.fecha_creacion', 'desc')
        .limit(limit)
        .offset(offset);

      res.json({
        cotizaciones,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total.count),
          totalPages: Math.ceil(total.count / limit)
        }
      });
    } catch (error) {
      logger.error('Error obteniendo cotizaciones:', error);
      res.status(500).json({ message: 'Error obteniendo cotizaciones' });
    }
  },

  // Obtener cotización por ID
  getCotizacionById: async (req, res) => {
    try {
      const { id } = req.params;

      const cotizacion = await db('cotizacion as c')
        .leftJoin('cliente as cl', 'c.id_cliente', 'cl.id_cliente')
        .select(
          'c.*',
          'cl.nombre_cliente',
          'cl.empresa_cliente'
        )
        .where('c.id_cotizacion', id)
        .first();

      if (!cotizacion) {
        return res.status(404).json({ message: 'Cotización no encontrada' });
      }

      // Obtener detalle de la cotización
      const detalle = await db('cotizacion_detalle')
        .where('id_cotizacion', id)
        .orderBy('orden_index', 'asc');

      cotizacion.detalle = detalle;

      res.json(cotizacion);
    } catch (error) {
      logger.error('Error obteniendo cotización:', error);
      res.status(500).json({ message: 'Error obteniendo cotización' });
    }
  },

     // Crear nueva cotización
   createCotizacion: async (req, res) => {
     const trx = await db.transaction();
     
     try {
       const cotizacionData = req.body;
       const userId = req.user.id;

       // Debug: Log the received data
       console.log('📋 Datos recibidos para crear cotización:', JSON.stringify(cotizacionData, null, 2));
       if (cotizacionData.detalle) {
         console.log('📦 Detalle recibido:', cotizacionData.detalle.map(item => ({
           id_item: item.id_item,
           tipo_item: item.tipo_item,
           notas: item.notas,
           cantidad: item.cantidad,
           precio_unitario: item.precio_unitario
         })));
         
         // Debug: Check for any items with wrong id_item
         cotizacionData.detalle.forEach((item, index) => {
           if (item.id_item && typeof item.id_item === 'object') {
             console.error(`❌ Item ${index} tiene id_item como objeto:`, item.id_item);
           }
         });
       }

      // Validar estado
      if (cotizacionData.estado && !ESTADOS_VALIDOS.includes(cotizacionData.estado)) {
        return res.status(400).json({ 
          message: `Estado inválido. Estados válidos: ${ESTADOS_VALIDOS.join(', ')}` 
        });
      }

      // Generar número de cotización único
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const numeroCotizacion = `COT-${timestamp}-${randomSuffix}`;

      // Preparar datos de la cotización
      const cotizacionInsert = {
        numero_cotizacion: numeroCotizacion,
        id_cliente: cotizacionData.id_cliente,
        titulo_proyecto: cotizacionData.titulo_proyecto,
        tipo_proyecto: cotizacionData.tipo_proyecto,
        incluye_instalacion: cotizacionData.incluye_instalacion || false,
        nombre_cliente: cotizacionData.nombre_cliente,
        empresa_cliente: cotizacionData.empresa_cliente,
        email_cliente: cotizacionData.email_cliente,
        telefono_cliente: cotizacionData.telefono_cliente,
        subtotal: cotizacionData.subtotal || 0,
        iva: cotizacionData.iva || 0,
        total: cotizacionData.total || 0,
        condiciones_pago: cotizacionData.condiciones_pago,
        condiciones_envio: cotizacionData.condiciones_envio,
        tiempo_entrega: cotizacionData.tiempo_entrega,
        tiempo_instalacion: cotizacionData.tiempo_instalacion,
        dias_validez: cotizacionData.dias_validez || 15,
        valido_hasta: cotizacionData.valido_hasta,
        incluye_garantia: cotizacionData.incluye_garantia || false,
        incluye_instalacion_seccion: cotizacionData.incluye_instalacion_seccion || false,
        observaciones: cotizacionData.observaciones,
        no_incluye: cotizacionData.no_incluye,
        notas: cotizacionData.notas,
        conceptos_extra_list: cotizacionData.conceptos_extra_list ? JSON.stringify(cotizacionData.conceptos_extra_list) : null,
        titulo_clausula_personalizada: cotizacionData.titulo_clausula_personalizada,
        descripcion_clausula_personalizada: cotizacionData.descripcion_clausula_personalizada,
        instalacion_incluye: cotizacionData.instalacion_incluye,
        instalacion_no_incluye: cotizacionData.instalacion_no_incluye,
        estado: cotizacionData.estado || 'por aprobar',
        id_usuario_creador: userId
      };

             // Insertar cotización
       const [cotizacionResult] = await trx('cotizacion')
         .insert(cotizacionInsert)
         .returning('id_cotizacion');
       
       // Extraer el ID real (puede ser un objeto o un número)
       const cotizacionId = typeof cotizacionResult === 'object' ? cotizacionResult.id_cotizacion : cotizacionResult;

             // Insertar detalle si existe
       if (cotizacionData.detalle && Array.isArray(cotizacionData.detalle)) {
         const detalleInsert = cotizacionData.detalle.map((item, index) => {
           // Validar y limpiar id_item
           let idItem = null;
           if (item.id_item) {
             // Si id_item es un número, usarlo directamente
             if (typeof item.id_item === 'number') {
               idItem = item.id_item;
             } else if (typeof item.id_item === 'string') {
               // Si es string, intentar convertirlo a número
               const parsed = parseInt(item.id_item);
               idItem = isNaN(parsed) ? null : parsed;
             } else if (typeof item.id_item === 'object') {
               // Si es un objeto, intentar extraer el id si existe
               console.warn(`⚠️ Item ${index} tiene id_item como objeto:`, item.id_item);
               if (item.id_item.id_item) {
                 idItem = parseInt(item.id_item.id_item) || null;
               } else if (item.id_item.id_material_extra) {
                 idItem = parseInt(item.id_item.id_material_extra) || null;
               } else {
                 idItem = null;
               }
             } else {
               // Si es otro tipo, ignorarlo
               idItem = null;
             }
           }

                       return {
              id_cotizacion: cotizacionId,
              id_item: idItem,
              cantidad: item.cantidad || 0,
              precio_unitario: item.precio_unitario || 0,
              subtotal: item.subtotal || 0,
              notas: item.notas || '',
              caracteristicas: item.caracteristicas || '',
              partida: item.partida || '',
              orden_index: item.orden_index || 0,
              catalogo: item.catalogo || '',
              tipo_item: item.tipo_item || '',
              estado: item.estado || 'por aprobar',
              metadata: item.metadata ? JSON.stringify(item.metadata) : null
            };
         });

         // Debug: Log the exact data being inserted
         console.log('🔍 Datos a insertar en cotizacion_detalle:', JSON.stringify(detalleInsert, null, 2));
         
         // Debug: Log each item individually
         detalleInsert.forEach((item, index) => {
           console.log(`🔍 Item ${index}:`, {
             id_cotizacion: item.id_cotizacion,
             id_item: item.id_item,
             tipo_item: item.tipo_item,
             cantidad: item.cantidad
           });
         });
         
         await trx('cotizacion_detalle').insert(detalleInsert);
       }

      await trx.commit();

      // Obtener la cotización creada con su detalle
      const cotizacionCreada = await db('cotizacion as c')
        .leftJoin('cliente as cl', 'c.id_cliente', 'cl.id_cliente')
        .select(
          'c.*',
          'cl.nombre_cliente',
          'cl.empresa_cliente'
        )
        .where('c.id_cotizacion', cotizacionId)
        .first();

      const detalle = await db('cotizacion_detalle')
        .where('id_cotizacion', cotizacionId)
        .orderBy('orden_index', 'asc');

      cotizacionCreada.detalle = detalle;

      res.status(201).json(cotizacionCreada);
    } catch (error) {
      await trx.rollback();
      logger.error('Error creando cotización:', error);
      res.status(500).json({ message: 'Error creando cotización' });
    }
  },

  // Actualizar cotización
  updateCotizacion: async (req, res) => {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;
      const cotizacionData = req.body;

      // Validar estado
      if (cotizacionData.estado && !ESTADOS_VALIDOS.includes(cotizacionData.estado)) {
        return res.status(400).json({ 
          message: `Estado inválido. Estados válidos: ${ESTADOS_VALIDOS.join(', ')}` 
        });
      }

      // Verificar que la cotización existe
      const cotizacionExistente = await trx('cotizacion')
        .where('id_cotizacion', id)
        .first();

      if (!cotizacionExistente) {
        return res.status(404).json({ message: 'Cotización no encontrada' });
      }

      // Actualizar cotización
      await trx('cotizacion')
        .where('id_cotizacion', id)
        .update({
          titulo_proyecto: cotizacionData.titulo_proyecto,
          tipo_proyecto: cotizacionData.tipo_proyecto,
          incluye_instalacion: cotizacionData.incluye_instalacion,
          nombre_cliente: cotizacionData.nombre_cliente,
          empresa_cliente: cotizacionData.empresa_cliente,
          email_cliente: cotizacionData.email_cliente,
          telefono_cliente: cotizacionData.telefono_cliente,
          subtotal: cotizacionData.subtotal,
          iva: cotizacionData.iva,
          total: cotizacionData.total,
          condiciones_pago: cotizacionData.condiciones_pago,
          condiciones_envio: cotizacionData.condiciones_envio,
          tiempo_entrega: cotizacionData.tiempo_entrega,
          tiempo_instalacion: cotizacionData.tiempo_instalacion,
          dias_validez: cotizacionData.dias_validez,
          valido_hasta: cotizacionData.valido_hasta,
          incluye_garantia: cotizacionData.incluye_garantia,
          incluye_instalacion_seccion: cotizacionData.incluye_instalacion_seccion,
          observaciones: cotizacionData.observaciones,
          no_incluye: cotizacionData.no_incluye,
          notas: cotizacionData.notas,
          conceptos_extra_list: cotizacionData.conceptos_extra_list ? JSON.stringify(cotizacionData.conceptos_extra_list) : null,
          titulo_clausula_personalizada: cotizacionData.titulo_clausula_personalizada,
          descripcion_clausula_personalizada: cotizacionData.descripcion_clausula_personalizada,
          instalacion_incluye: cotizacionData.instalacion_incluye,
          instalacion_no_incluye: cotizacionData.instalacion_no_incluye,
          estado: cotizacionData.estado
        });

      // Actualizar detalle si se proporciona
      if (cotizacionData.detalle && Array.isArray(cotizacionData.detalle)) {
        // Eliminar detalle existente
        await trx('cotizacion_detalle')
          .where('id_cotizacion', id)
          .del();

                 // Insertar nuevo detalle
         const detalleInsert = cotizacionData.detalle.map((item, index) => {
           // Validar y limpiar id_item
           let idItem = null;
           if (item.id_item) {
             // Si id_item es un número, usarlo directamente
             if (typeof item.id_item === 'number') {
               idItem = item.id_item;
             } else if (typeof item.id_item === 'string') {
               // Si es string, intentar convertirlo a número
               const parsed = parseInt(item.id_item);
               idItem = isNaN(parsed) ? null : parsed;
             } else if (typeof item.id_item === 'object') {
               // Si es un objeto, intentar extraer el id si existe
               console.warn(`⚠️ Item ${index} tiene id_item como objeto:`, item.id_item);
               if (item.id_item.id_item) {
                 idItem = parseInt(item.id_item.id_item) || null;
               } else if (item.id_item.id_material_extra) {
                 idItem = parseInt(item.id_item.id_material_extra) || null;
               } else {
                 idItem = null;
               }
             } else {
               // Si es otro tipo, ignorarlo
               idItem = null;
             }
           }

                                   return {
              id_cotizacion: parseInt(id),
              id_item: idItem,
              cantidad: item.cantidad || 0,
              precio_unitario: item.precio_unitario || 0,
              subtotal: item.subtotal || 0,
              notas: item.notas || '',
              caracteristicas: item.caracteristicas || '',
              partida: item.partida || '',
              orden_index: item.orden_index || 0,
              catalogo: item.catalogo || '',
              tipo_item: item.tipo_item || '',
              estado: item.estado || 'por aprobar',
              metadata: item.metadata ? JSON.stringify(item.metadata) : null
            };
         });

        // Debug: Log the exact data being inserted
        console.log('🔍 Datos a insertar en cotizacion_detalle (update):', JSON.stringify(detalleInsert, null, 2));
        
        // Debug: Log each item individually
        detalleInsert.forEach((item, index) => {
          console.log(`🔍 Item ${index} (update):`, {
            id_cotizacion: item.id_cotizacion,
            id_item: item.id_item,
            tipo_item: item.tipo_item,
            cantidad: item.cantidad
          });
        });
        
        await trx('cotizacion_detalle').insert(detalleInsert);
      }

      await trx.commit();

      // Obtener la cotización actualizada
      const cotizacionActualizada = await db('cotizacion as c')
        .leftJoin('cliente as cl', 'c.id_cliente', 'cl.id_cliente')
        .select(
          'c.*',
          'cl.nombre_cliente',
          'cl.empresa_cliente'
        )
        .where('c.id_cotizacion', id)
        .first();

      const detalle = await db('cotizacion_detalle')
        .where('id_cotizacion', id)
        .orderBy('orden_index', 'asc');

      cotizacionActualizada.detalle = detalle;

      res.json(cotizacionActualizada);
    } catch (error) {
      await trx.rollback();
      logger.error('Error actualizando cotización:', error);
      res.status(500).json({ message: 'Error actualizando cotización' });
    }
  },

  // Cambiar estado de cotización
  changeEstado: async (req, res) => {
    try {
      const { id } = req.params;
      const { estado, notas } = req.body;

      // Validar estado
      if (!ESTADOS_VALIDOS.includes(estado)) {
        return res.status(400).json({ 
          message: `Estado inválido. Estados válidos: ${ESTADOS_VALIDOS.join(', ')}` 
        });
      }

      // Verificar que la cotización existe
      const cotizacion = await db('cotizacion')
        .where('id_cotizacion', id)
        .first();

      if (!cotizacion) {
        return res.status(404).json({ message: 'Cotización no encontrada' });
      }

      // Actualizar estado
      await db('cotizacion')
        .where('id_cotizacion', id)
        .update({ estado });

      res.json({ message: 'Estado actualizado correctamente' });
    } catch (error) {
      logger.error('Error cambiando estado de cotización:', error);
      res.status(500).json({ message: 'Error cambiando estado de cotización' });
    }
  },

  // Eliminar cotización
  deleteCotizacion: async (req, res) => {
    const trx = await db.transaction();
    
    try {
      const { id } = req.params;

      // Verificar que la cotización existe
      const cotizacion = await trx('cotizacion')
        .where('id_cotizacion', id)
        .first();

      if (!cotizacion) {
        return res.status(404).json({ message: 'Cotización no encontrada' });
      }

      // Eliminar detalle primero (por foreign key)
      await trx('cotizacion_detalle')
        .where('id_cotizacion', id)
        .del();

      // Eliminar cotización
      await trx('cotizacion')
        .where('id_cotizacion', id)
        .del();

      await trx.commit();

      res.json({ message: 'Cotización eliminada correctamente' });
    } catch (error) {
      await trx.rollback();
      logger.error('Error eliminando cotización:', error);
      res.status(500).json({ message: 'Error eliminando cotización' });
    }
  },

  // Generar PDF de cotización
  generatePDF: async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar que la cotización existe
      const cotizacion = await db('cotizacion as c')
        .leftJoin('cliente as cl', 'c.id_cliente', 'cl.id_cliente')
        .select('c.*', 'cl.nombre_cliente', 'cl.empresa_cliente', 'cl.email_cliente', 'cl.telefono_cliente')
        .where('c.id_cotizacion', id)
        .first();

      if (!cotizacion) {
        return res.status(404).json({ message: 'Cotización no encontrada' });
      }

      // Obtener detalles de la cotización
      const detalle = await db('cotizacion_detalle')
        .where('id_cotizacion', id)
        .orderBy('orden_index', 'asc');

      // Generar el PDF
      const pdfBuffer = await cotizacionPdfService.generateCotizacionPDF(cotizacion, detalle);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=cotizacion-${cotizacion.numero_cotizacion}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Error generando PDF:', error);
      res.status(500).json({ message: 'Error generando PDF' });
    }
  },

  // Generar PDF Preview para el modal
  generatePDFPreview: async (req, res) => {
    try {
      const { id } = req.params;

      // Verificar que la cotización existe
      const cotizacion = await db('cotizacion as c')
        .leftJoin('cliente as cl', 'c.id_cliente', 'cl.id_cliente')
        .select('c.*', 'cl.nombre_cliente', 'cl.empresa_cliente', 'cl.email_cliente', 'cl.telefono_cliente')
        .where('c.id_cotizacion', id)
        .first();

      if (!cotizacion) {
        return res.status(404).json({ message: 'Cotización no encontrada' });
      }

      // Obtener detalles de la cotización
      const detalle = await db('cotizacion_detalle')
        .where('id_cotizacion', id)
        .orderBy('orden_index', 'asc');

      // Generar el PDF usando el servicio V2
      const pdfBuffer = await cotizacionPdfService.generateCotizacionPDF(cotizacion, detalle);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline'); // Para preview en el navegador
      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Error generando PDF preview:', error);
      res.status(500).json({ message: 'Error generando PDF preview' });
    }
  },

  // Obtener estadísticas
  getEstadisticas: async (req, res) => {
    try {
      const estadisticas = await db('cotizacion')
        .select('estado')
        .count('* as count')
        .groupBy('estado');

      res.json(estadisticas);
    } catch (error) {
      logger.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ message: 'Error obteniendo estadísticas' });
    }
  },

  // Enviar cotización por email
  sendCotizacionEmail: async (req, res) => {
    try {
      const { id } = req.params;
      
      // Obtener cotización con datos del cliente usando knex
      const cotizacion = await db('cotizacion as c')
        .leftJoin('cliente as cl', 'c.id_cliente', 'cl.id_cliente')
        .select(
          'c.*',
          'cl.nombre_cliente',
          'cl.empresa_cliente',
          'cl.email_cliente',
          'cl.telefono_cliente'
        )
        .where('c.id_cotizacion', id)
        .first();
      
      if (!cotizacion) {
        return res.status(404).json({ error: 'Cotización no encontrada' });
      }
      
      // Verificar que tenga email del cliente
      if (!cotizacion.email_cliente) {
        return res.status(400).json({ error: 'La cotización no tiene un email de cliente asociado' });
      }
      
      // Obtener detalle de la cotización usando knex
      const detalle = await db('cotizacion_detalle as cd')
        .leftJoin('inventario_item as ii', 'cd.id_item', 'ii.id_item')
        .select(
          'cd.*',
          'ii.tipo_item as nombre_producto'
        )
        .where('cd.id_cotizacion', id)
        .orderBy('cd.orden_index', 'asc');
      
      // Enviar email
      const result = await cotizacionEmailService.sendCotizacionEmail(cotizacion, cotizacion, detalle);
      
      // Actualizar estado de la cotización a "enviada"
      await db('cotizacion')
        .where('id_cotizacion', id)
        .update({ estado: 'enviada' });
      
      res.json({
        success: true,
        message: 'Cotización enviada exitosamente',
        data: result
      });
      
    } catch (error) {
      logger.error('Error enviando cotización por email:', error);
      res.status(500).json({ error: error.message });
    }
  },

  // Test de conexión Gmail
  testGmailConnection: async (req, res) => {
    try {
      const result = await cotizacionEmailService.testGmailConnection();
      res.json(result);
    } catch (error) {
      logger.error('Error test Gmail:', error);
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = cotizacionesController; 