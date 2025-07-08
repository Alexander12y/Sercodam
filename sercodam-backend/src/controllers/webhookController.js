const db = require('../config/database');
const logger = require('../config/logger');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const { validateMakeApiKey, validateMakeData, transformMakeData } = require('../config/webhook');

const webhookController = {
    // POST /api/v1/webhook/make/orden-produccion - Recibir datos de Make.com
    recibirOrdenProduccion: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            // Validar API key
            const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
            
            if (!validateMakeApiKey(apiKey)) {
                logger.warn('Intento de acceso no autorizado al webhook de Make.com', {
                    ip: req.ip,
                    userAgent: req.get('User-Agent'),
                    timestamp: new Date().toISOString()
                });
                
                return res.status(401).json({
                    success: false,
                    message: 'API key inválida o faltante',
                    timestamp: new Date().toISOString()
                });
            }

            // Log de la petición
            logger.info('Webhook de Make.com recibido', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                payloadSize: JSON.stringify(req.body).length,
                timestamp: new Date().toISOString()
            });

            // Validar estructura de datos
            if (!validateMakeData(req.body)) {
                logger.error('Datos de Make.com inválidos', { data: req.body });
                return res.status(400).json({
                    success: false,
                    message: 'Estructura de datos inválida',
                    requiredFields: ['cliente', 'descripcion_trabajo', 'panos'],
                    timestamp: new Date().toISOString()
                });
            }

            // Transformar datos al formato del sistema
            const ordenData = transformMakeData(req.body);
            
            // Generar número de orden único
            const fechaActual = new Date();
            const año = fechaActual.getFullYear();
            const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
            const dia = String(fechaActual.getDate()).padStart(2, '0');
            
            // Obtener último número de orden del día
            const ultimaOrden = await trx('orden_produccion')
                .where('numero_op', 'like', `${año}${mes}${dia}-%`)
                .orderBy('numero_op', 'desc')
                .first();

            let numeroOrden = 1;
            if (ultimaOrden) {
                const ultimoNumero = parseInt(ultimaOrden.numero_op.split('-')[1]);
                numeroOrden = ultimoNumero + 1;
            }

            const numero_op = `${año}${mes}${dia}-${String(numeroOrden).padStart(3, '0')} SD`;

            // Crear orden de producción
            const [ordenCreada] = await trx('orden_produccion')
                .insert({
                    numero_op,
                    fecha_op: fechaActual,
                    fecha_creacion: fechaActual,
                    cliente: ordenData.cliente,
                    descripcion_trabajo: ordenData.descripcion_trabajo,
                    observaciones: ordenData.observaciones,
                    prioridad: ordenData.prioridad,
                    fecha_entrega_estimada: ordenData.fecha_entrega_estimada,
                    direccion_instalacion: ordenData.direccion_instalacion,
                    contacto_cliente: ordenData.contacto_cliente,
                    telefono_cliente: ordenData.telefono_cliente,
                    estado: 'en_proceso'
                })
                .returning('id_op');

            const id_op = ordenCreada.id_op;

            // Procesar paños
            for (const panoData of ordenData.panos) {
                // Buscar paño disponible en inventario
                const panoDisponible = await trx('pano')
                    .where('estado', 'bueno')
                    .where('tipo_red', panoData.tipo_red)
                    .where('area_m2', '>=', panoData.largo_m * panoData.ancho_m * panoData.cantidad)
                    .orderBy('area_m2', 'asc')
                    .first();

                if (!panoDisponible) {
                    logger.warn(`No hay paño disponible para: ${panoData.tipo_red} ${panoData.largo_m}x${panoData.ancho_m}`, {
                        ordenId: id_op,
                        panoData
                    });
                    
                    // Continuar con el siguiente paño
                    continue;
                }

                // Crear detalle de orden para el paño
                await trx('orden_produccion_detalle').insert({
                    id_op,
                    id_item: panoDisponible.id_item,
                    tipo_item: 'PANO',
                    cantidad: panoData.largo_m * panoData.ancho_m * panoData.cantidad,
                    unidad_medida: 'm²',
                    costo_unitario: panoData.precio_m2,
                    costo_total: (panoData.largo_m * panoData.ancho_m * panoData.cantidad) * panoData.precio_m2,
                    notas: `Tramo de ${panoData.largo_m} m de largo x ${panoData.ancho_m} m de alto = ${(panoData.largo_m * panoData.ancho_m).toFixed(2)} m² c/u`
                });

                // Registrar movimiento de inventario
                await trx('movimiento_inventario').insert({
                    id_item: panoDisponible.id_item,
                    tipo_mov: 'CONSUMO',
                    cantidad: panoData.largo_m * panoData.ancho_m * panoData.cantidad,
                    unidad: 'm²',
                    notas: `Consumo para orden ${numero_op} - ${panoData.cantidad} tramos`,
                    fecha: fechaActual,
                    id_op: id_op,
                    id_usuario: 1 // Usuario por defecto para webhooks
                });

                // Actualizar área del paño
                const nuevaArea = Math.max(0, panoDisponible.area_m2 - (panoData.largo_m * panoData.ancho_m * panoData.cantidad));
                await trx('pano')
                    .where('id_item', panoDisponible.id_item)
                    .update({
                        area_m2: nuevaArea,
                        updated_at: db.fn.now()
                    });
            }

            // Procesar materiales adicionales si los hay
            for (const materialData of ordenData.materiales) {
                const material = await trx('materiales_extras')
                    .where('id_item', materialData.id_item)
                    .first();

                if (material && material.cantidad_disponible >= materialData.cantidad) {
                    await trx('orden_produccion_detalle').insert({
                        id_op,
                        id_item: materialData.id_item,
                        tipo_item: 'EXTRA',
                        cantidad: materialData.cantidad,
                        unidad_medida: material.unidad || 'unidad',
                        costo_unitario: material.precioxunidad || 0,
                        costo_total: materialData.cantidad * (material.precioxunidad || 0),
                        notas: materialData.notas || ''
                    });

                    // Actualizar stock del material
                    await trx('materiales_extras')
                        .where('id_item', materialData.id_item)
                        .update({
                            cantidad_disponible: material.cantidad_disponible - materialData.cantidad,
                            ultima_modificacion: db.fn.now()
                        });
                }
            }

            // Procesar herramientas si las hay
            for (const herramientaData of ordenData.herramientas) {
                const herramienta = await trx('herramientas')
                    .where('id_item', herramientaData.id_item)
                    .where('disponibilidad', 'Disponible')
                    .first();

                if (herramienta) {
                    await trx('herramienta_ordenada').insert({
                        id_op,
                        id_item: herramientaData.id_item,
                        tipo_movimiento: 'ASIGNACION',
                        cantidad: herramientaData.cantidad || 1,
                        notas: herramientaData.notas || ''
                    });

                    // Marcar herramienta como en uso
                    await trx('herramientas')
                        .where('id_item', herramientaData.id_item)
                        .update({
                            disponibilidad: 'En Uso',
                            ultima_modificacion: db.fn.now()
                        });
                }
            }

            await trx.commit();

            logger.info('Orden de producción creada exitosamente desde Make.com', {
                ordenId: id_op,
                numeroOp: numero_op,
                cliente: ordenData.cliente,
                timestamp: new Date().toISOString()
            });

            // Responder a Make.com
            res.status(201).json({
                success: true,
                message: 'Orden de producción creada exitosamente',
                data: {
                    id_op,
                    numero_op,
                    cliente: ordenData.cliente,
                    fecha_creacion: fechaActual,
                    estado: 'en_proceso',
                    total_panos: ordenData.panos.length,
                    total_materiales: ordenData.materiales.length,
                    total_herramientas: ordenData.herramientas.length
                },
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error procesando webhook de Make.com:', error);
            
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: process.env.NODE_ENV === 'development' ? error.message : 'Error procesando orden',
                timestamp: new Date().toISOString()
            });
        }
    },

    // GET /api/v1/webhook/make/health - Health check para Make.com
    healthCheck: async (req, res) => {
        try {
            // Verificar conexión a base de datos
            await db.raw('SELECT 1');
            
            res.status(200).json({
                success: true,
                message: 'Webhook service is healthy',
                timestamp: new Date().toISOString(),
                services: {
                    database: 'connected',
                    webhook: 'active'
                }
            });
        } catch (error) {
            logger.error('Health check failed:', error);
            res.status(503).json({
                success: false,
                message: 'Service unavailable',
                timestamp: new Date().toISOString()
            });
        }
    },

    // GET /api/v1/webhook/make/config - Obtener configuración del webhook
    getConfig: async (req, res) => {
        try {
            res.json({
                success: true,
                data: {
                    endpoints: {
                        ordenProduccion: '/api/v1/webhook/make/orden-produccion',
                        healthCheck: '/api/v1/webhook/make/health'
                    },
                    requiredHeaders: {
                        'x-api-key': 'API key para autenticación',
                        'Content-Type': 'application/json'
                    },
                    requiredFields: {
                        cliente: 'string - Nombre del cliente',
                        descripcion_trabajo: 'string - Descripción del trabajo',
                        panos: 'array - Array de paños con largo, ancho, cantidad',
                        observaciones: 'string (opcional) - Observaciones adicionales',
                        prioridad: 'string (opcional) - baja, media, alta, urgente',
                        fecha_entrega: 'string (opcional) - Fecha de entrega estimada',
                        direccion_instalacion: 'string (opcional) - Dirección de instalación',
                        contacto_cliente: 'string (opcional) - Contacto del cliente',
                        telefono_cliente: 'string (opcional) - Teléfono del cliente'
                    },
                    example: {
                        cliente: 'LH - IK',
                        descripcion_trabajo: '255.00 m2 de Red de Nylon',
                        panos: [
                            {
                                largo: 50.00,
                                ancho: 1.70,
                                cantidad: 3,
                                tipo_red: 'nylon',
                                calibre: '18',
                                cuadro: '1"',
                                torsion: 'torcida',
                                refuerzo: 'con refuerzo',
                                color: 'teñida',
                                precio_m2: 100.00
                            }
                        ],
                        observaciones: 'CON REFUERZO EN LAS ORILLAS',
                        prioridad: 'media',
                        precio_total: 25500.00,
                        iva: 4080.00,
                        total_con_iva: 29580.00,
                        flete: 'por cobrar'
                    }
                },
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error obteniendo configuración del webhook:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                timestamp: new Date().toISOString()
            });
        }
    }
};

module.exports = webhookController; 