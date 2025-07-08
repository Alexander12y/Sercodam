const db = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../config/logger');
const { NotFoundError, ValidationError, ConflictError } = require('../middleware/errorHandler');
const fs = require('fs');

// Función helper para verificar si existe una vista materializada
async function checkViewExists(viewName) {
    try {
        const result = await db.raw(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = '${viewName}' 
                AND table_schema = 'catalogo_1'
            );
        `);
        return result.rows[0].exists;
    } catch (error) {
        logger.warn(`Error verificando vista ${viewName}:`, error.message);
        return false;
    }
}

// Función helper para obtener datos de paños (con o sin vista materializada)
async function getPanoData(id_item) {
    const viewExists = await checkViewExists('mv_panos_resumen');
    
    if (viewExists) {
        return await db('mv_panos_resumen')
            .where('id_item', id_item)
            .first();
    } else {
        // Consulta directa a la tabla pano
        return await db('pano')
            .where('id_item', id_item)
            .select('*')
            .first();
    }
}

// Función helper para obtener datos de materiales (con o sin vista materializada)
async function getMaterialData(id_item) {
    const viewExists = await checkViewExists('mv_materiales_resumen');
    
    if (viewExists) {
        return await db('mv_materiales_resumen')
            .where('id_item', id_item)
            .first();
    } else {
        // Consulta directa a las tablas de materiales
        // Intentar en materiales_extras primero
        let material = await db('materiales_extras')
            .where('id_item', id_item)
            .first();
        
        if (!material) {
            // Buscar id_mcr en la tabla pano usando id_item
            const pano = await db('pano').where('id_item', id_item).first();
            if (pano && pano.id_mcr) {
                // Buscar en nylon
                material = await db('nylon').where('id_mcr', pano.id_mcr).first();
                if (!material) {
                    // Buscar en lona
                    material = await db('lona').where('id_mcr', pano.id_mcr).first();
                }
                if (!material) {
                    // Buscar en polipropileno
                    material = await db('polipropileno').where('id_mcr', pano.id_mcr).first();
                }
                if (!material) {
                    // Buscar en malla_sombra
                    material = await db('malla_sombra').where('id_mcr', pano.id_mcr).first();
                }
            }
        }
        return material;
    }
}

// Función helper para obtener datos de herramientas (con o sin vista materializada)
async function getHerramientaData(id_item) {
    const viewExists = await checkViewExists('mv_herramientas_resumen');
    
    if (viewExists) {
        return await db('mv_herramientas_resumen')
            .where('id_item', id_item)
            .first();
    } else {
        // Consulta directa a la tabla herramientas
        return await db('herramientas')
            .where('id_item', id_item)
            .first();
    }
}

const ordenesController = {
    // GET /api/v1/ordenes - Obtener todas las órdenes con filtros
    getOrdenes: async (req, res) => {
        try {
            const {
                estado,
                cliente,
                fecha_desde,
                fecha_hasta,
                page = 1,
                limit = 20,
                sortBy = 'fecha_op',
                sortOrder = 'desc'
            } = req.query;

            // Query base para filtros
            let baseQuery = db('orden_produccion as op');

            // Aplicar filtros
            if (estado) {
                baseQuery = baseQuery.where('op.estado', estado);
            }
            if (cliente) {
                baseQuery = baseQuery.where('op.cliente', 'ilike', `%${cliente}%`);
            }
            if (fecha_desde) {
                baseQuery = baseQuery.where('op.fecha_op', '>=', fecha_desde);
            }
            if (fecha_hasta) {
                baseQuery = baseQuery.where('op.fecha_op', '<=', fecha_hasta);
            }

            // Contar total (sin limit ni offset)
            const { count } = await baseQuery.clone().count('* as count').first();
            const total = parseInt(count);

            // Query para obtener datos con paginación
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const ordenes = await baseQuery
                .select('op.*')
                .orderBy(`op.${sortBy}`, sortOrder)
                .limit(parseInt(limit))
                .offset(offset);

            // Obtener resumen de materiales por orden
            const ordenesConResumen = await Promise.all(
                ordenes.map(async (orden) => {
                    const resumenMateriales = await db('orden_produccion_detalle as opd')
                        .leftJoin('inventario_item as ii', 'opd.id_item', 'ii.id_item')
                        .where('opd.id_op', orden.id_op)
                        .select(
                            'ii.tipo_item',
                            db.raw('COUNT(*) as cantidad_items'),
                            db.raw('SUM(opd.cantidad) as cantidad_total')
                        )
                        .groupBy('ii.tipo_item');

                    return {
                        ...orden,
                        resumen_materiales: resumenMateriales
                    };
                })
            );

            res.json({
                success: true,
                data: {
                    ordenes: ordenesConResumen,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo órdenes:', error);
            throw error;
        }
    },

    // GET /api/v1/ordenes/borradores - Obtener órdenes borrador
    getOrdenesBorradores: async (req, res) => {
        try {
            const ordenes = await db('orden_produccion as op')
                .where('op.estado', 'BORRADOR')
                .select('op.*')
                .orderBy('op.fecha_op', 'asc');

            res.json({
                success: true,
                data: ordenes
            });

        } catch (error) {
            logger.error('Error obteniendo órdenes borrador:', error);
            throw error;
        }
    },

    // GET /api/v1/ordenes/activas - Obtener órdenes activas
    getOrdenesActivas: async (req, res) => {
        try {
            const ordenes = await db('orden_produccion as op')
                .whereIn('op.estado', ['en_proceso', 'asignada'])
                .select('op.*')
                .orderBy('op.fecha_op', 'desc');

            res.json({
                success: true,
                data: ordenes
            });

        } catch (error) {
            logger.error('Error obteniendo órdenes activas:', error);
            throw error;
        }
    },

    // GET /api/v1/ordenes/completadas - Obtener órdenes completadas
    getOrdenesCompletadas: async (req, res) => {
        try {
            const { page = 1, limit = 20 } = req.query;

            let query = db('orden_produccion as op')
                .where('op.estado', 'completada')
                .select('op.*');

            // Contar total
            const totalQuery = query.clone();
            const { count } = await totalQuery.count('* as count').first();
            const total = parseInt(count);

            // Aplicar paginación
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const ordenes = await query
                .orderBy('op.fecha_op', 'desc')
                .limit(parseInt(limit))
                .offset(offset);

            res.json({
                success: true,
                data: {
                    ordenes,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo órdenes completadas:', error);
            throw error;
        }
    },

    // GET /api/v1/ordenes/:id - Obtener orden específica
    getOrdenById: async (req, res) => {
        try {
            const { id } = req.params;

            const orden = await db('orden_produccion as op')
                .where('op.id_op', id)
                .select('op.*')
                .first();

            if (!orden) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            res.json({
                success: true,
                data: orden
            });

        } catch (error) {
            logger.error('Error obteniendo orden:', error);
            throw error;
        }
    },

    // GET /api/v1/ordenes/:id/detalle - Obtener detalle completo de orden
    getOrdenDetalle: async (req, res) => {
        try {
            const { id } = req.params;

            // Obtener orden básica
            const orden = await db('orden_produccion as op')
                .where('op.id_op', id)
                .select('op.*')
                .first();

            if (!orden) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Obtener materiales de la orden
            const materiales = await db('orden_produccion_detalle as opd')
                .leftJoin('inventario_item as ii', 'opd.id_item', 'ii.id_item')
                .where('opd.id_op', id)
                .select('opd.*', 'ii.tipo_item');

            // Enriquecer datos de materiales con información detallada
            const materialesDetallados = await Promise.all(
                materiales.map(async (material) => {
                    let detalle = null;

                    if (material.tipo_item === 'PANO') {
                        detalle = await getPanoData(material.id_item);
                    } else if (material.tipo_item === 'EXTRA') {
                        // Verificar si es material o herramienta
                        detalle = await getMaterialData(material.id_item);
                        
                        if (detalle) {
                            detalle.subtipo = 'MATERIAL';
                        } else {
                            detalle = await getHerramientaData(material.id_item);
                            if (detalle) {
                                detalle.subtipo = 'HERRAMIENTA';
                            }
                        }
                    }

                    return {
                        ...material,
                        detalle_item: detalle
                    };
                })
            );

            // Obtener herramientas asignadas
            const herramientas = await db('herramienta_ordenada as ho')
                .leftJoin('herramientas as h', 'ho.id_item', 'h.id_item')
                .where('ho.id_op', id)
                .select('ho.*', 'h.descripcion', 'h.categoria', 'h.marca')
                .orderBy('ho.fecha', 'desc');

            // Obtener historial de movimientos
            const movimientos = await db('movimiento_inventario as mi')
                .leftJoin('inventario_item as ii', 'mi.id_item', 'ii.id_item')
                .where('mi.id_op', id)
                .select(
                    'mi.*',
                    'ii.tipo_item'
                )
                .orderBy('mi.fecha', 'desc');

            res.json({
                success: true,
                data: {
                    orden,
                    materiales: materialesDetallados,
                    herramientas,
                    movimientos,
                    estadisticas: {
                        total_materiales: materialesDetallados.length,
                        total_herramientas: herramientas.length,
                        total_movimientos: movimientos.length
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo detalle de orden:', error);
            throw error;
        }
    },

    // POST /api/v1/ordenes - Crear nueva orden de producción
    createOrden: async (req, res) => {
        const trx = await db.transaction();
        try {
            const { cliente, id_cliente, observaciones, prioridad, fecha_inicio, fecha_fin, materiales = [], herramientas = [] } = req.body;
            const fechaActual = new Date();
            const año = fechaActual.getFullYear();
            const mes = String(fechaActual.getMonth() + 1).padStart(2, '0');
            const dia = String(fechaActual.getDate()).padStart(2, '0');

            // Validar que se proporcione el cliente
            if (!cliente || cliente.trim().length === 0) {
                throw new ValidationError('El cliente es requerido');
            }

            // Si se proporciona id_cliente, validar que existe
            let clienteData = null;
            if (id_cliente) {
                clienteData = await trx('cliente').where('id_cliente', id_cliente).first();
                if (!clienteData) {
                    throw new ValidationError('El cliente seleccionado no existe');
                }
            } else {
                // Si no se proporciona id_cliente, buscar por nombre (compatibilidad con versiones anteriores)
                clienteData = await trx('cliente').where('nombre_cliente', 'ilike', cliente.trim()).first();
                if (!clienteData) {
                    // Si no existe, crear nuevo cliente automáticamente
                    const [nuevoCliente] = await trx('cliente')
                        .insert({
                            nombre_cliente: cliente.trim(),
                            fecha_registro: fechaActual
                        })
                        .returning('*');
                    clienteData = nuevoCliente;
                    logger.info(`Cliente creado automáticamente: ${clienteData.id_cliente} - ${clienteData.nombre_cliente}`);
                }
            }

            // Generar número de orden único
            const ultimaOrden = await trx('orden_produccion')
                .where('numero_op', 'like', `OP-${año}${mes}${dia}-%`)
                .orderBy('numero_op', 'desc')
                .first();
            let numeroOrden = 1;
            if (ultimaOrden) {
                const ultimoNumero = parseInt(ultimaOrden.numero_op.split('-')[2]);
                numeroOrden = ultimoNumero + 1;
            }
            const numero_op = `OP-${año}${mes}${dia}-${String(numeroOrden).padStart(3, '0')}`;

            // 1. Validar stock de todos los ítems antes de cualquier inserción
            const erroresStock = [];
            for (const material of materiales) {
                const { id_item, tipo_item } = material;
                if (tipo_item === 'PANO') {
                    const pano = await getPanoData(id_item);
                    if (!pano) {
                        erroresStock.push(`Paño ID ${id_item} no encontrado`);
                    } else {
                        const largoDisponible = Number(pano.largo_m) || 0;
                        const anchoDisponible = Number(pano.ancho_m) || 0;
                        // Los datos pueden venir en largo_m/ancho_m o largo_tomar/ancho_tomar
                        const largoSolicitado = Number(material.largo_m || material.largo_tomar) || 0;
                        const anchoSolicitado = Number(material.ancho_m || material.ancho_tomar) || 0;
                        
                        if (largoSolicitado > largoDisponible) {
                            erroresStock.push(`Paño ID ${id_item}: largo solicitado (${largoSolicitado.toFixed(2)} m) excede largo disponible (${largoDisponible.toFixed(2)} m)`);
                        }
                        if (anchoSolicitado > anchoDisponible) {
                            erroresStock.push(`Paño ID ${id_item}: ancho solicitado (${anchoSolicitado.toFixed(2)} m) excede ancho disponible (${anchoDisponible.toFixed(2)} m)`);
                        }
                    }
                } else if (tipo_item === 'EXTRA') {
                    const materialData = await getMaterialData(id_item);
                    if (!materialData || materialData.cantidad_disponible < material.cantidad) {
                        erroresStock.push(`Material ID ${id_item} no disponible o insuficiente. Stock actual: ${(materialData && materialData.cantidad_disponible) || 0}, solicitado: ${material.cantidad}`);
                    }
                } else if (tipo_item === 'HERRAMIENTA') {
                    const herramientaData = await getHerramientaData(id_item);
                    if (!herramientaData || herramientaData.cantidad_disponible < material.cantidad) {
                        erroresStock.push(`Herramienta ID ${id_item} no disponible o insuficiente. Stock actual: ${(herramientaData && herramientaData.cantidad_disponible) || 0}, solicitado: ${material.cantidad}`);
                    }
                }
            }
            for (const herramienta of herramientas) {
                const { id_item, cantidad } = herramienta;
                const herramientaData = await getHerramientaData(id_item);
                if (!herramientaData || herramientaData.cantidad_disponible < (cantidad || 1)) {
                    erroresStock.push(`Herramienta ID ${id_item} no disponible o insuficiente. Stock actual: ${(herramientaData && herramientaData.cantidad_disponible) || 0}, solicitado: ${cantidad || 1}`);
                }
            }
            if (erroresStock.length > 0) {
                await trx.rollback();
                return res.status(400).json({
                    success: false,
                    errorType: 'ValidationError',
                    message: 'No hay suficiente stock para uno o más ítems.',
                    details: erroresStock
                });
            }

            // 2. Crear orden de producción
            const [ordenCreada] = await trx('orden_produccion')
                .insert({
                    numero_op,
                    fecha_op: fechaActual,
                    fecha_creacion: fechaActual,
                    cliente: clienteData.nombre_cliente,
                    id_cliente: clienteData.id_cliente,
                    observaciones,
                    prioridad,
                    fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : null,
                    fecha_fin: fecha_fin ? new Date(fecha_fin) : null,
                    estado: 'en_proceso'
                })
                .returning('id_op');
            const id_op = ordenCreada.id_op;

            // 3. Agregar materiales a la orden y descontar stock
            for (const material of materiales) {
                if (material.tipo_item === 'PANO') {
                    // Usar la nueva función para procesar paños (crea dos registros: largo y ancho)
                    // Los datos de largo y ancho vienen en las propiedades del material
                    const largo_tomar = material.largo_m || material.largo_tomar || 0;
                    const ancho_tomar = material.ancho_m || material.ancho_tomar || 0;
                    
                    await trx.raw('SELECT fn_procesar_pano_orden(?, ?, ?, ?, ?)', [
                        id_op,
                        material.id_item,
                        largo_tomar,
                        ancho_tomar,
                        material.cantidad || 1
                    ]);
                } else if (material.tipo_item === 'EXTRA') {
                    // Usar la nueva función para procesar materiales extras
                    await trx.raw('SELECT fn_procesar_material_extra_orden(?, ?, ?)', [
                        id_op,
                        material.id_item,
                        material.cantidad
                    ]);
                } else if (material.tipo_item === 'HERRAMIENTA') {
                    // Para herramientas, insertar directamente en herramienta_ordenada
                    await trx('herramienta_ordenada').insert({
                        id_op,
                        id_item: material.id_item,
                        tipo_movimiento: 'ASIGNACION',
                        cantidad: material.cantidad || 1,
                        notas: material.notas || ''
                    });
                } else {
                    // Para otros tipos de items
                    await trx('orden_produccion_detalle').insert({
                        id_op,
                        id_item: material.id_item,
                        tipo_item: material.tipo_item,
                        cantidad: material.cantidad,
                        notas: material.notas || '',
                        estado: 'en_proceso'
                    });
                }
            }

            // 4. Las herramientas ya se procesaron en el bucle anterior
            // No necesitamos procesarlas por separado

            await trx.commit();
            
            // Generar PDF automáticamente en background después de crear la orden
            setImmediate(async () => {
                try {
                    const pdfService = require('../services/pdfService');
                    
                    // Obtener datos completos de la orden recién creada
                    const ordenCompleta = await db('orden_produccion as op')
                        .where('op.id_op', id_op)
                        .select('op.*')
                        .first();

                    // Obtener detalles de paños
                    const panos = await db('orden_produccion_detalle as opd')
                        .leftJoin('pano as p', 'opd.id_item', 'p.id_item')
                        .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                        .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
                        .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
                        .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
                        .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
                        .where('opd.id_op', id_op)
                        .where('opd.tipo_item', 'PANO')
                        .select(
                            'opd.*',
                            'p.largo_m',
                            'p.ancho_m',
                            'p.area_m2',
                            'p.precio_x_unidad',
                            'p.estado as estado_pano',
                            'rp.tipo_red',
                            'rp.descripcion as descripcion_producto',
                            // Nylon
                            'n.calibre as nylon_calibre',
                            'n.cuadro as nylon_cuadro',
                            'n.torsion as nylon_torsion',
                            'n.refuerzo as nylon_refuerzo',
                            // Lona
                            'l.color as lona_color',
                            'l.presentacion as lona_presentacion',
                            // Polipropileno
                            'pp.grosor as polipropileno_grosor',
                            'pp.cuadro as polipropileno_cuadro',
                            // Malla sombra
                            'ms.color_tipo_red as malla_color_tipo_red',
                            'ms.presentacion as malla_presentacion'
                        );

                    // Obtener detalles de materiales
                    const materiales = await db('orden_produccion_detalle as opd')
                        .leftJoin('materiales_extras as me', 'opd.id_item', 'me.id_item')
                        .where('opd.id_op', id_op)
                        .where('opd.tipo_item', 'EXTRA')
                        .select(
                            'opd.*',
                            'me.descripcion',
                            'me.categoria',
                            'me.unidad',
                            'me.precioxunidad'
                        );

                    // Obtener herramientas asignadas
                    const herramientas = await db('herramienta_ordenada as ho')
                        .leftJoin('herramientas as h', 'ho.id_item', 'h.id_item')
                        .where('ho.id_op', id_op)
                        .select(
                            'ho.*',
                            'h.descripcion',
                            'h.categoria',
                            'h.marca'
                        );

                    // Preparar datos para el PDF
                    const ordenData = {
                        ...ordenCompleta,
                        panos: panos.map(pano => {
                            // Determinar campos técnicos según tipo_red
                            let calibre, cuadro, torsion, refuerzo, color, presentacion, grosor, color_tipo_red;
                            switch ((pano.tipo_red || '').toLowerCase()) {
                                case 'nylon':
                                    calibre = pano.nylon_calibre;
                                    cuadro = pano.nylon_cuadro;
                                    torsion = pano.nylon_torsion;
                                    refuerzo = pano.nylon_refuerzo;
                                    break;
                                case 'lona':
                                    color = pano.lona_color;
                                    presentacion = pano.lona_presentacion;
                                    break;
                                case 'polipropileno':
                                    grosor = pano.polipropileno_grosor;
                                    cuadro = pano.polipropileno_cuadro;
                                    break;
                                case 'malla sombra':
                                    color_tipo_red = pano.malla_color_tipo_red;
                                    presentacion = pano.malla_presentacion;
                                    break;
                            }
                            return {
                                largo_m: pano.largo_m,
                                ancho_m: pano.ancho_m,
                                cantidad: pano.cantidad,
                                tipo_red: pano.tipo_red || 'nylon',
                                area_m2: pano.area_m2,
                                // Las columnas largo_tomar, ancho_tomar, area_tomar ya no existen
                                // Los datos se almacenan en las notas y se procesan con las nuevas funciones
                                precio_m2: pano.precio_x_unidad,
                                calibre,
                                cuadro,
                                torsion,
                                refuerzo,
                                color,
                                presentacion,
                                grosor,
                                color_tipo_red
                            };
                        }),
                        materiales: materiales.map(material => ({
                            descripcion: material.descripcion || 'Material',
                            categoria: material.categoria || 'General',
                            cantidad: material.cantidad || 0,
                            unidad: material.unidad || 'unidad',
                            precioxunidad: material.precioxunidad || 0,
                            precio_total: material.costo_total || 0
                        })),
                        herramientas: herramientas.map(herramienta => ({
                            nombre: herramienta.descripcion || 'Herramienta',
                            descripcion: herramienta.descripcion || '',
                            categoria: herramienta.categoria || 'General',
                            cantidad: herramienta.cantidad || 1
                        }))
                    };

                    // Generar PDF
                    const { filepath, filename } = await pdfService.generateOrdenProduccionPDF(ordenData);
                    
                    logger.info('PDF generado automáticamente al crear orden', {
                        ordenId: id_op,
                        numeroOp: numero_op,
                        filepath,
                        filename
                    });

                    // No necesitamos guardar referencia en BD - el archivo se maneja directamente
                    logger.info('PDF generado y guardado en sistema de archivos', {
                        ordenId: id_op,
                        filename: filename
                    });

                    // Enviar webhook automáticamente al crear la orden en estado en_proceso
                    try {
                        const makeWebhookService = require('../services/makeWebhookService');
                        const resultado = await makeWebhookService.enviarOrdenEnProceso(ordenData);
                        
                        if (resultado.success) {
                            logger.info('Webhook enviado automáticamente al crear orden', {
                                ordenId: id_op,
                                numeroOp: numero_op,
                                status: resultado.status,
                                pdfIncluido: resultado.pdfIncluido
                            });
                        } else {
                            logger.warn('Error enviando webhook automático al crear orden', {
                                ordenId: id_op,
                                error: resultado.error
                            });
                        }
                    } catch (webhookError) {
                        logger.error('Error crítico enviando webhook automático', {
                            ordenId: id_op,
                            error: webhookError.message
                        });
                    }

                } catch (pdfError) {
                    logger.error('Error generando PDF automático al crear orden', {
                        ordenId: id_op,
                        error: pdfError.message
                    });
                }
            });

            return res.status(201).json({
                success: true,
                message: 'Orden de producción creada exitosamente',
                data: { id_op, numero_op }
            });
        } catch (error) {
            await trx.rollback();
            logger.error('Error creando orden:', error);
            // Si es un error de validación, devolver mensaje estructurado
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    errorType: 'ValidationError',
                    message: error.message,
                    details: error.errors || []
                });
            }
            // Otros errores
            return res.status(500).json({
                success: false,
                errorType: 'InternalError',
                message: 'Error interno del servidor. Por favor, intenta de nuevo más tarde.'
            });
        }
    },

    // PUT /api/v1/ordenes/:id - Actualizar orden
    updateOrden: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;
            const { cliente, observaciones, estado } = req.body;

            // Verificar que la orden existe
            const ordenExistente = await trx('orden_produccion')
                .where('id_op', id)
                .first();

            if (!ordenExistente) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Actualizar orden
            const updateData = {};
            if (cliente) updateData.cliente = cliente;
            if (observaciones !== undefined) updateData.observaciones = observaciones;
            if (estado) updateData.estado = estado;

            await trx('orden_produccion')
                .where('id_op', id)
                .update(updateData);

            await trx.commit();

            res.json({
                success: true,
                message: 'Orden actualizada exitosamente'
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error actualizando orden:', error);
            throw error;
        }
    },

    // PATCH /api/v1/ordenes/:id/estado - Cambiar estado de orden
    cambiarEstadoOrden: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;
            const { estado, notas } = req.body;

            // Verificar que la orden existe
            const orden = await trx('orden_produccion')
                .where('id_op', id)
                .first();

            if (!orden) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Validar estado
            const estadosValidos = ['en_proceso', 'completada', 'cancelada', 'pausada'];
            if (!estadosValidos.includes(estado)) {
                throw new ValidationError('Estado inválido');
            }

            // Guardar estado anterior para logging
            const estadoAnterior = orden.estado;

            // Actualizar estado en orden_produccion
            await trx('orden_produccion')
                .where('id_op', id)
                .update({ estado });

            // Si el estado cambió a 'cancelada', restaurar inventario completo (paños + materiales extras)
            if (estado === 'cancelada' && estadoAnterior !== 'cancelada') {
                await trx.raw('SELECT fn_restaurar_inventario_completo_cancelada(?)', [id]);
            }

            await trx.commit();

            // Si el estado cambió a 'en_proceso', enviar webhook a Make.com
            if (estado === 'en_proceso' && estadoAnterior !== 'en_proceso') {
                try {
                    const makeWebhookService = require('../services/makeWebhookService');
                    
                    // Obtener datos completos de la orden para el webhook
                    const ordenCompleta = await db('orden_produccion as op')
                        .where('op.id_op', id)
                        .select('op.*')
                        .first();

                    // Obtener detalles de paños
                    const panos = await db('orden_produccion_detalle as opd')
                        .leftJoin('pano as p', 'opd.id_item', 'p.id_item')
                        .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                        .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
                        .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
                        .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
                        .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
                        .where('opd.id_op', id)
                        .where('opd.tipo_item', 'PANO')
                        .select(
                            'opd.*',
                            'p.largo_m',
                            'p.ancho_m',
                            'p.area_m2',
                            'p.precio_x_unidad',
                            'p.estado as estado_pano',
                            'rp.tipo_red',
                            'rp.descripcion as descripcion_producto',
                            // Nylon
                            'n.calibre as nylon_calibre',
                            'n.cuadro as nylon_cuadro',
                            'n.torsion as nylon_torsion',
                            'n.refuerzo as nylon_refuerzo',
                            // Lona
                            'l.color as lona_color',
                            'l.presentacion as lona_presentacion',
                            // Polipropileno
                            'pp.grosor as polipropileno_grosor',
                            'pp.cuadro as polipropileno_cuadro',
                            // Malla sombra
                            'ms.color_tipo_red as malla_color_tipo_red',
                            'ms.presentacion as malla_presentacion'
                        );

                    // Obtener detalles de materiales
                    const materiales = await db('orden_produccion_detalle as opd')
                        .leftJoin('materiales_extras as me', 'opd.id_item', 'me.id_item')
                        .where('opd.id_op', id)
                        .where('opd.tipo_item', 'EXTRA')
                        .select(
                            'opd.*',
                            'me.descripcion',
                            'me.categoria',
                            'me.unidad'
                        );

                    // Obtener herramientas asignadas
                    const herramientas = await db('herramienta_ordenada as ho')
                        .leftJoin('herramientas as h', 'ho.id_item', 'h.id_item')
                        .where('ho.id_op', id)
                        .select(
                            'ho.*',
                            'h.descripcion',
                            'h.categoria',
                            'h.marca'
                        );

                    // Preparar datos completos para el webhook
                    const ordenData = {
                        ...ordenCompleta,
                        panos: panos.map(pano => {
                            // Determinar campos técnicos según tipo_red
                            let calibre, cuadro, torsion, refuerzo, color, presentacion, grosor, color_tipo_red;
                            switch ((pano.tipo_red || '').toLowerCase()) {
                                case 'nylon':
                                    calibre = pano.nylon_calibre;
                                    cuadro = pano.nylon_cuadro;
                                    torsion = pano.nylon_torsion;
                                    refuerzo = pano.nylon_refuerzo;
                                    break;
                                case 'lona':
                                    color = pano.lona_color;
                                    presentacion = pano.lona_presentacion;
                                    break;
                                case 'polipropileno':
                                    grosor = pano.polipropileno_grosor;
                                    cuadro = pano.polipropileno_cuadro;
                                    break;
                                case 'malla sombra':
                                    color_tipo_red = pano.malla_color_tipo_red;
                                    presentacion = pano.malla_presentacion;
                                    break;
                            }
                            return {
                                largo_m: pano.largo_m,
                                ancho_m: pano.ancho_m,
                                cantidad: pano.cantidad,
                                tipo_red: pano.tipo_red || 'nylon',
                                area_m2: pano.area_m2,
                                // Las columnas largo_tomar, ancho_tomar, area_tomar ya no existen
                                // Los datos se almacenan en las notas y se procesan con las nuevas funciones
                                precio_m2: pano.precio_x_unidad,
                                calibre,
                                cuadro,
                                torsion,
                                refuerzo,
                                color,
                                presentacion,
                                grosor,
                                color_tipo_red
                            };
                        }),
                        materiales: materiales.map(material => ({
                            descripcion: material.descripcion,
                            categoria: material.categoria,
                            cantidad: material.cantidad,
                            unidad: material.unidad
                        })),
                        herramientas: herramientas.map(herramienta => ({
                            nombre: herramienta.descripcion || 'Herramienta',
                            descripcion: herramienta.descripcion || '',
                            categoria: herramienta.categoria || 'General',
                            cantidad: herramienta.cantidad || 1
                        }))
                    };

                    // Enviar webhook de forma asíncrona (no bloquear la respuesta)
                    setImmediate(async () => {
                        try {
                            const resultado = await makeWebhookService.enviarOrdenEnProceso(ordenData);
                            if (resultado.success) {
                                logger.info('Webhook enviado exitosamente al cambiar estado a en_proceso', {
                                    ordenId: id,
                                    estado: estado
                                });
                            } else {
                                logger.warn('Error enviando webhook al cambiar estado a en_proceso', {
                                    ordenId: id,
                                    error: resultado.error
                                });
                            }
                        } catch (webhookError) {
                            logger.error('Error crítico enviando webhook', {
                                ordenId: id,
                                error: webhookError.message
                            });
                        }
                    });

                } catch (webhookError) {
                    logger.error('Error preparando webhook', {
                        ordenId: id,
                        error: webhookError.message
                    });
                }
            }

            res.json({
                success: true,
                message: `Estado de orden cambiado a ${estado}`,
                data: {
                    id_op: id,
                    estado_anterior: estadoAnterior,
                    estado_nuevo: estado,
                    webhook_enviado: estado === 'en_proceso' && estadoAnterior !== 'en_proceso'
                }
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error cambiando estado de orden:', error);
            throw error;
        }
    },

    // POST /api/v1/ordenes/:id/materiales - Agregar materiales a orden
    agregarMateriales: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;
            const { materiales } = req.body;

            // Verificar que la orden existe
            const orden = await trx('orden_produccion')
                .where('id_op', id)
                .first();

            if (!orden) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Agregar materiales
            for (const material of materiales) {
                // Validar stock antes de agregar
                const materialData = await getMaterialData(material.id_item);
                const stockDisponible = materialData?.cantidad_disponible || 0;
                if (material.cantidad > stockDisponible) {
                    throw new ValidationError(`Material ID ${material.id_item} no disponible o insuficiente. Stock actual: ${stockDisponible}, solicitado: ${material.cantidad}`);
                }

                // Agregar material a la orden
                await trx('orden_produccion_detalle').insert({
                    id_op: id,
                    id_item: material.id_item,
                    tipo_item: material.tipo_item || 'EXTRA',
                    cantidad: material.cantidad,
                    notas: material.notas || '',
                    estado: 'en_proceso'
                });

                // Descontar stock
                await trx('materiales_extras')
                    .where('id_item', material.id_item)
                    .decrement('cantidad_disponible', material.cantidad);
            }

            await trx.commit();

            res.json({
                success: true,
                message: 'Materiales agregados exitosamente'
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error agregando materiales:', error);
            throw error;
        }
    },

    // POST /api/v1/ordenes/:id/herramientas - Agregar herramientas a orden
    agregarHerramientas: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;
            const { herramientas } = req.body;

            // Verificar que la orden existe
            const orden = await trx('orden_produccion')
                .where('id_op', id)
                .first();

            if (!orden) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Agregar herramientas
            for (const herramienta of herramientas) {
                // Validar stock antes de agregar
                const herramientaData = await getHerramientaData(herramienta.id_item);
                const stockDisponible = herramientaData?.cantidad_disponible || 0;
                if (herramienta.cantidad > stockDisponible) {
                    throw new ValidationError(`Herramienta ID ${herramienta.id_item} no disponible o insuficiente. Stock actual: ${stockDisponible}, solicitado: ${herramienta.cantidad}`);
                }

                // Agregar herramienta a la orden
                await trx('herramienta_ordenada').insert({
                    id_op: id,
                    id_item: herramienta.id_item,
                    tipo_movimiento: 'ASIGNACION',
                    cantidad: herramienta.cantidad,
                    notas: herramienta.notas || ''
                });

                // Descontar stock si aplica
                // await trx('herramientas')
                //     .where('id_item', herramienta.id_item)
                //     .decrement('cantidad_disponible', herramienta.cantidad);
            }

            await trx.commit();

            res.json({
                success: true,
                message: 'Herramientas agregadas exitosamente'
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error agregando herramientas:', error);
            throw error;
        }
    },

    // POST /api/v1/ordenes/:id/herramientas - Asignar herramientas a orden (alias)
    asignarHerramientas: async (req, res) => {
        // Redirigir a la función agregarHerramientas
        return await ordenesController.agregarHerramientas(req, res);
    },

    // DELETE /api/v1/ordenes/:id - Eliminar orden
    deleteOrden: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;

            // Verificar que la orden existe
            const orden = await trx('orden_produccion')
                .where('id_op', id)
                .first();

            if (!orden) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Verificar que la orden no esté en proceso
            if (orden.estado === 'en_proceso') {
                throw new ValidationError('No se puede eliminar una orden en proceso');
            }

            // Eliminar detalles de la orden
            await trx('orden_produccion_detalle')
                .where('id_op', id)
                .del();

            // Eliminar herramientas asignadas
            await trx('herramienta_ordenada')
                .where('id_op', id)
                .del();

            // Eliminar movimientos de inventario
            await trx('movimiento_inventario')
                .where('id_op', id)
                .del();

            // Eliminar la orden
            await trx('orden_produccion')
                .where('id_op', id)
                .del();

            await trx.commit();

            res.json({
                success: true,
                message: 'Orden eliminada exitosamente'
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error eliminando orden:', error);
            throw error;
        }
    },

    // POST /api/v1/ordenes/:id/pdf - Generar PDF de orden
    generarPDF: async (req, res) => {
        try {
            const { id } = req.params;

            // Obtener orden básica
            const orden = await db('orden_produccion as op')
                .where('op.id_op', id)
                .select('op.*')
                .first();

            if (!orden) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Obtener detalles de paños
            const panos = await db('orden_produccion_detalle as opd')
                .leftJoin('pano as p', 'opd.id_item', 'p.id_item')
                .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
                .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
                .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
                .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
                .where('opd.id_op', id)
                .where('opd.tipo_item', 'PANO')
                .select(
                    'opd.*',
                    'p.largo_m',
                    'p.ancho_m',
                    'p.area_m2',
                    'p.precio_x_unidad',
                    'p.estado as estado_pano',
                    'rp.tipo_red',
                    'rp.descripcion as descripcion_producto',
                    // Nylon
                    'n.calibre as nylon_calibre',
                    'n.cuadro as nylon_cuadro',
                    'n.torsion as nylon_torsion',
                    'n.refuerzo as nylon_refuerzo',
                    // Lona
                    'l.color as lona_color',
                    'l.presentacion as lona_presentacion',
                    // Polipropileno
                    'pp.grosor as polipropileno_grosor',
                    'pp.cuadro as polipropileno_cuadro',
                    // Malla sombra
                    'ms.color_tipo_red as malla_color_tipo_red',
                    'ms.presentacion as malla_presentacion'
                );

            // Obtener detalles de materiales
            const materiales = await db('orden_produccion_detalle as opd')
                .leftJoin('materiales_extras as me', 'opd.id_item', 'me.id_item')
                .where('opd.id_op', id)
                .where('opd.tipo_item', 'EXTRA')
                .select(
                    'opd.*',
                    'me.descripcion',
                    'me.categoria',
                    'me.unidad',
                    'me.precioxunidad'
                );

            // Obtener herramientas asignadas
            const herramientas = await db('herramienta_ordenada as ho')
                .leftJoin('herramientas as h', 'ho.id_item', 'h.id_item')
                .where('ho.id_op', id)
                .select(
                    'ho.*',
                    'h.descripcion',
                    'h.categoria',
                    'h.marca'
                );

            // Preparar datos para el PDF
            const ordenData = {
                ...orden,
                panos: panos.map(pano => {
                    // Determinar campos técnicos según tipo_red
                    let calibre, cuadro, torsion, refuerzo, color, presentacion, grosor, color_tipo_red;
                    switch ((pano.tipo_red || '').toLowerCase()) {
                        case 'nylon':
                            calibre = pano.nylon_calibre;
                            cuadro = pano.nylon_cuadro;
                            torsion = pano.nylon_torsion;
                            refuerzo = pano.nylon_refuerzo;
                            break;
                        case 'lona':
                            color = pano.lona_color;
                            presentacion = pano.lona_presentacion;
                            break;
                        case 'polipropileno':
                            grosor = pano.polipropileno_grosor;
                            cuadro = pano.polipropileno_cuadro;
                            break;
                        case 'malla sombra':
                            color_tipo_red = pano.malla_color_tipo_red;
                            presentacion = pano.malla_presentacion;
                            break;
                    }
                    return {
                        largo_m: pano.largo_m,
                        ancho_m: pano.ancho_m,
                        cantidad: pano.cantidad,
                        tipo_red: pano.tipo_red || 'nylon',
                        area_m2: pano.area_m2,
                        // Las columnas largo_tomar, ancho_tomar, area_tomar ya no existen
                        // Los datos se almacenan en las notas y se procesan con las nuevas funciones
                        precio_m2: pano.precio_x_unidad,
                        calibre,
                        cuadro,
                        torsion,
                        refuerzo,
                        color,
                        presentacion,
                        grosor,
                        color_tipo_red
                    };
                }),
                materiales: materiales.map(material => ({
                    descripcion: material.descripcion || 'Material',
                    categoria: material.categoria || 'General',
                    cantidad: material.cantidad || 0,
                    unidad: material.unidad || 'unidad',
                    precioxunidad: material.precioxunidad || 0,
                    precio_total: material.costo_total || 0
                })),
                herramientas: herramientas.map(herramienta => ({
                    nombre: herramienta.descripcion || 'Herramienta',
                    descripcion: herramienta.descripcion || '',
                    categoria: herramienta.categoria || 'General',
                    cantidad: herramienta.cantidad || 1
                }))
            };

            // Generar PDF
            const pdfService = require('../services/pdfService');
            const { filepath, filename } = await pdfService.generateOrdenProduccionPDF(ordenData);

            // No necesitamos guardar referencia en BD - el archivo se maneja directamente
            logger.info('PDF generado y guardado en sistema de archivos', {
                ordenId: id,
                filename: filename
            });

            res.json({
                success: true,
                message: 'PDF generado exitosamente',
                data: {
                    filepath,
                    filename,
                    downloadUrl: `/api/v1/ordenes/${id}/pdf/download`
                }
            });

        } catch (error) {
            logger.error('Error generando PDF:', error);
            throw error;
        }
    },

    // GET /api/v1/ordenes/:id/pdf/download - Descargar PDF
    descargarPDF: async (req, res) => {
        try {
            const { id } = req.params;

            logger.info('Iniciando descarga de PDF', { ordenId: id });

            const pdfService = require('../services/pdfService');
            const fs = require('fs');

            // Buscar el archivo PDF existente
            const pdfInfo = pdfService.findPDFByOrderId(id);

            if (!pdfInfo) {
                logger.error('Archivo PDF no encontrado para la orden', { 
                    ordenId: id 
                });
                
                // Intentar generar el PDF si no existe
                try {
                    logger.info('Intentando generar PDF para la orden', { ordenId: id });
                    
                    // Obtener datos de la orden
                    const orden = await db('orden_produccion')
                        .where('id_op', id)
                        .first();
                    
                    if (!orden) {
                        throw new NotFoundError('Orden de producción no encontrada');
                    }

                    // Obtener detalles completos de la orden
                    const ordenCompleta = await ordenesController.getOrdenDetalle({ params: { id } }, { 
                        json: (data) => data,
                        status: () => ({ json: (data) => data })
                    });

                    if (!ordenCompleta.success) {
                        throw new Error('Error obteniendo datos de la orden');
                    }

                    // Generar PDF
                    const { filepath, filename } = await pdfService.generateOrdenProduccionPDF(ordenCompleta.data);
                    
                    logger.info('PDF generado exitosamente para descarga', { 
                        ordenId: id, 
                        filename, 
                        filepath 
                    });
                    
                    // Descargar el archivo recién generado
                    return res.download(filepath, filename);
                    
                } catch (genError) {
                    logger.error('Error generando PDF para descarga:', genError);
                    throw new NotFoundError('No se pudo generar ni encontrar el PDF de la orden');
                }
            }

            logger.info('Archivo PDF encontrado', { 
                ordenId: id, 
                filename: pdfInfo.filename, 
                filepath: pdfInfo.filepath 
            });

            // Verificar que el archivo no esté vacío
            const stats = fs.statSync(pdfInfo.filepath);
            if (stats.size === 0) {
                logger.error('Archivo PDF está vacío', { 
                    ordenId: id, 
                    filepath: pdfInfo.filepath, 
                    size: stats.size 
                });
                throw new Error('El archivo PDF está vacío o corrupto');
            }

            logger.info('Enviando archivo PDF', { 
                ordenId: id, 
                filename: pdfInfo.filename, 
                size: stats.size 
            });

            // Usar res.download() que es más simple y robusto
            res.download(pdfInfo.filepath, pdfInfo.filename, (err) => {
                if (err) {
                    logger.error('Error enviando archivo PDF', { 
                        ordenId: id, 
                        error: err.message 
                    });
                    if (!res.headersSent) {
                        res.status(500).json({
                            success: false,
                            message: 'Error enviando el archivo PDF'
                        });
                    }
                } else {
                    logger.info('PDF enviado exitosamente', { 
                        ordenId: id, 
                        filename: pdfInfo.filename 
                    });
                }
            });

        } catch (error) {
            logger.error('Error descargando PDF:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    message: error.message || 'Error descargando PDF'
                });
            }
        }
    },

    // GET /api/v1/ordenes/clientes/search - Buscar clientes para autocompletado
    searchClientes: async (req, res) => {
        try {
            const { q } = req.query;
            
            logger.info('Búsqueda de clientes solicitada', { query: q });
            
            if (!q || q.trim().length < 2) {
                logger.info('Consulta muy corta, retornando lista vacía', { query: q });
                return res.json({
                    success: true,
                    clientes: []
                });
            }

            const searchTerm = q.trim();
            logger.info('Ejecutando búsqueda de clientes', { searchTerm });

            // Log del SQL que se va a ejecutar
            const query = db('cliente')
                .select('id_cliente', 'nombre_cliente', 'email', 'telefono')
                .where('nombre_cliente', 'ilike', `%${searchTerm}%`)
                .orderBy('nombre_cliente', 'asc')
                .limit(10);
            
            logger.info('SQL Query a ejecutar:', { sql: query.toString() });
            
            const clientes = await query;

            logger.info('Resultados de búsqueda de clientes', { 
                searchTerm, 
                resultados: clientes.length,
                clientes: clientes.map(c => c.nombre_cliente)
            });

            res.json({
                success: true,
                clientes: clientes
            });

        } catch (error) {
            logger.error('Error buscando clientes:', error);
            throw error;
        }
    }
};

module.exports = ordenesController;