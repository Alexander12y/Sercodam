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
    // DEBUG: Version identifier to confirm latest code is running
    _debugVersion: '2025-07-15-18:45-DEBUG-VERSION-1.0',
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
                .leftJoin('cliente as c', 'op.id_cliente', 'c.id_cliente')
                .where('op.id_op', id)
                .select('op.*', 'c.nombre_cliente', 'c.email_cliente as cliente_email', 'c.telefono_cliente as cliente_telefono')
                .first();

            if (!orden) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Obtener paños detallados desde trabajo_corte - esto muestra todos los paños asignados a la orden
            const panos = await db.raw(`
                SELECT 
                    tc.job_id as id_detalle,
                    tc.altura_req as largo_m,
                    tc.ancho_req as ancho_m,
                    tc.area_req as area_m2,
                    tc.estado as estado_corte,
                    p.estado_trabajo,
                    tc.created_at,
                    p.*,
                    rp.tipo_red, rp.marca, rp.descripcion as red_descripcion,
                    n.calibre as nylon_calibre, n.cuadro as nylon_cuadro, n.torsion as nylon_torsion, n.refuerzo as nylon_refuerzo,
                    l.color as lona_color, l.presentacion as lona_presentacion,
                    pp.grosor as polipropileno_grosor, pp.cuadro as polipropileno_cuadro,
                    ms.color_tipo_red as malla_color, ms.presentacion as malla_presentacion
                FROM trabajo_corte tc
                JOIN pano p ON tc.id_item = p.id_item
                LEFT JOIN red_producto rp ON p.id_mcr = rp.id_mcr
                LEFT JOIN nylon n ON p.id_mcr = n.id_mcr
                LEFT JOIN lona l ON p.id_mcr = l.id_mcr
                LEFT JOIN polipropileno pp ON p.id_mcr = pp.id_mcr
                LEFT JOIN malla_sombra ms ON p.id_mcr = ms.id_mcr
                WHERE tc.id_op = ?
                ORDER BY tc.created_at ASC
            `, [id]);

            // Obtener materiales extras detallados
            const materialesExtras = await db('orden_produccion_detalle as opd')
                .join('materiales_extras as me', 'opd.id_item', 'me.id_item')
                .where('opd.id_op', id)
                .andWhere('opd.tipo_item', 'EXTRA')
                .select(
                    'opd.id_detalle', 'opd.cantidad', 'opd.notas',
                    'me.id_item', 'me.id_material_extra', 'me.descripcion', 'me.categoria', 'me.unidad'
                );
            
            // Obtener herramientas asignadas (tabla separada)
            const herramientasAsignadas = await db('herramienta_ordenada as ho')
                .leftJoin('herramientas as h', 'ho.id_item', 'h.id_item')
                .where('ho.id_op', id)
                .select(
                    'ho.id_op', 'ho.cantidad', 'ho.fecha',
                    'h.id_item', 'h.id_herramienta', 'h.descripcion', 'h.categoria', 'h.marca', 'h.unidad'
                )
                .orderBy('ho.fecha', 'desc');

            res.json({
                success: true,
                data: {
                    orden,
                    panos: panos.rows,
                    materiales: materialesExtras,
                    herramientas: herramientasAsignadas
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
            const { cliente, id_cliente, observaciones, prioridad, fecha_inicio, fecha_fin, panos = [], materiales = [], herramientas = [] } = req.body;
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

            // Determinar el modo_corte general de la orden basándose en los paños
            let modoCorteOrden = 'simple';
            if (panos.length > 0) {
                // Si al menos un paño tiene cortes individuales, la orden es de cortes individuales
                const tieneCortesIndividuales = panos.some(pano => 
                    pano.modo_corte === 'individuales' || 
                    (pano.cortes_individuales && Array.isArray(pano.cortes_individuales) && pano.cortes_individuales.length > 0)
                );
                modoCorteOrden = tieneCortesIndividuales ? 'individuales' : 'simple';
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
                    estado: 'por aprobar',
                    modo_corte: modoCorteOrden
                })
                .returning('id_op');
            const id_op = ordenCreada.id_op;

            // Procesar panos con optimización
            const panosController = require('./inventario/panosController');
            for (let i = 0; i < panos.length; i++) {
                const panoReq = panos[i];
                
                // Intentar encontrar paño del tipo solicitado
                let suitablePanos = await panosController.findSuitablePanos(panoReq.altura_req, panoReq.ancho_req, panoReq.tipo_red);
                
                // Si no se encuentra paño del tipo solicitado, buscar cualquier tipo disponible
                if (suitablePanos.length === 0 && panoReq.tipo_red) {
                    logger.warn(`No se encontró paño de tipo '${panoReq.tipo_red}' para ${panoReq.altura_req}x${panoReq.ancho_req}. Buscando otros tipos...`);
                    suitablePanos = await panosController.findSuitablePanos(panoReq.altura_req, panoReq.ancho_req, null);
                    
                    if (suitablePanos.length > 0) {
                        logger.info(`Paño alternativo encontrado: tipo '${suitablePanos[0].tipo_red}' en lugar de '${panoReq.tipo_red}'`);
                    }
                }
                
                if (suitablePanos.length === 0) {
                    throw new ValidationError(`No se encontró paño adecuado para ${panoReq.altura_req}x${panoReq.ancho_req} de ningún tipo disponible`);
                }
                
                const selectedPano = suitablePanos[0]; // El más pequeño
                
                // Crear trabajo de corte (modo_corte ya no se pasa a trabajo_corte)
                const job_id = await panosController.createCutJob(trx, id_op, selectedPano.id_item, panoReq.altura_req, panoReq.ancho_req, panoReq.umbral_sobrante_m2 || 5.0, i + 1, req.user.id);
                
                // Si hay cortes individuales, guardarlos en la tabla cortes_individuales
                if (panoReq.cortes_individuales && Array.isArray(panoReq.cortes_individuales)) {
                    for (let j = 0; j < panoReq.cortes_individuales.length; j++) {
                        const corte = panoReq.cortes_individuales[j];
                        const area_corte = (parseFloat(corte.largo) || 0) * (parseFloat(corte.ancho) || 0);
                        
                        await trx('cortes_individuales').insert({
                            job_id,
                            seq: j + 1,
                            largo: parseFloat(corte.largo) || 0,
                            ancho: parseFloat(corte.ancho) || 0,
                            cantidad: parseInt(corte.cantidad) || 1,
                            area_total: area_corte * (parseInt(corte.cantidad) || 1)
                        });
                    }
                }
            }

            // 3. Agregar materiales a la orden (sin descontar stock aún)
            for (const material of materiales) {
                if (material.tipo_item === 'EXTRA') {
                    await trx('orden_produccion_detalle').insert({
                        id_op,
                        id_item: material.id_item,
                        tipo_item: 'EXTRA',
                        cantidad: material.cantidad,
                        notas: material.notas || '',
                        catalogo: 'CATALOGO_2', // Asumir basado en funciones previas
                        estado: 'por aprobar'
                    });
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
                    // Para otros tipos de items (excluyendo PANO)
                    await trx('orden_produccion_detalle').insert({
                        id_op,
                        id_item: material.id_item,
                        tipo_item: material.tipo_item,
                        cantidad: material.cantidad,
                        notas: material.notas || '',
                        estado: 'por aprobar'
                    });
                }
            }

            // 4. Procesar herramientas por separado si vienen en el array herramientas
            for (const herramienta of herramientas) {
                await trx('herramienta_ordenada').insert({
                    id_op,
                    id_item: herramienta.id_item,
                    tipo_movimiento: 'ASIGNACION',
                    cantidad: herramienta.cantidad || 1,
                    notas: herramienta.notas || ''
                });
            }

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

                    // Obtener trabajos de corte y sus planes
                    const cutJobs = await db('trabajo_corte as tc')
                        .leftJoin('pano as p', 'tc.id_item', 'p.id_item')
                        .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                        .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
                        .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
                        .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
                        .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
                        .where('tc.id_op', id_op)
                        .select(
                            'tc.*',
                            'p.largo_m as pano_largo',
                            'p.ancho_m as pano_ancho',
                            'p.area_m2 as pano_area',
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

                    // Obtener planes de corte para cada trabajo
                    for (const job of cutJobs) {
                        job.plans = await db('plan_corte_pieza')
                            .where('job_id', job.job_id)
                            .orderBy('seq')
                            .select('*');
                        
                        // Obtener cortes individuales para este trabajo
                        job.cortes_individuales = await db('cortes_individuales')
                            .where('job_id', job.job_id)
                            .orderBy('seq')
                            .select('*');
                    }

                    // Obtener sobrantes (remnants) para esta orden
                    const sobrantes = await db('panos_sobrantes')
                        .where('id_op', id_op)
                        .select('*');

                    // Preparar datos de panos para PDF basados en trabajo_corte
                    const panosParaPDF = cutJobs.map(job => {
                            // Determinar campos técnicos según tipo_red
                            let calibre, cuadro, torsion, refuerzo, color, presentacion, grosor, color_tipo_red;
                        switch ((job.tipo_red || '').toLowerCase()) {
                                case 'nylon':
                                calibre = job.nylon_calibre;
                                cuadro = job.nylon_cuadro;
                                torsion = job.nylon_torsion;
                                refuerzo = job.nylon_refuerzo;
                                    break;
                                case 'lona':
                                color = job.lona_color;
                                presentacion = job.lona_presentacion;
                                    break;
                                case 'polipropileno':
                                grosor = job.polipropileno_grosor;
                                cuadro = job.polipropileno_cuadro;
                                    break;
                                case 'malla sombra':
                                color_tipo_red = job.malla_color_tipo_red;
                                presentacion = job.malla_presentacion;
                                    break;
                            }

                        return {
                            id_item: job.id_item,
                            largo_m: job.altura_req,  // altura_req es el largo solicitado
                            ancho_m: job.ancho_req,   // ancho_req es el ancho solicitado
                            cantidad: 1,
                            tipo_red: job.tipo_red || 'nylon',
                            area_m2: job.area_req,
                            precio_m2: job.precio_x_unidad,
                            // Datos del pano original
                            pano_original_largo: job.pano_largo,
                            pano_original_ancho: job.pano_ancho,
                            pano_original_area: job.pano_area,
                                calibre,
                                cuadro,
                                torsion,
                                refuerzo,
                                color,
                                presentacion,
                                grosor,
                                color_tipo_red
                        };
                    });

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
                        panos: panosParaPDF,
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
                        })),
                        // Format cuts data for PDF generation
                        cuts: cutJobs.map(job => ({
                            id_item: job.id_item,
                            altura_req: job.altura_req,
                            ancho_req: job.ancho_req,
                            umbral_sobrante_m2: job.umbral_sobrante_m2 || 5.0, // Agregar umbral
                            pano_original: {
                                largo: job.pano_largo,
                                ancho: job.pano_ancho,
                                area: job.pano_area
                            },
                            plans: job.plans.map(plan => ({
                                rol_pieza: plan.rol_pieza,
                                altura_plan: plan.altura_plan,
                                ancho_plan: plan.ancho_plan,
                                seq: plan.seq
                            })),
                            cortes_individuales: job.cortes_individuales || []
                        })),
                        // Add remnants data
                        sobrantes: sobrantes.map(sobrante => ({
                            id_remnant: sobrante.id_remnant,
                            altura_m: sobrante.altura_m,
                            ancho_m: sobrante.ancho_m,
                            area_m2: sobrante.area_m2,
                            parent_id_item: sobrante.id_item_padre
                        }))
                    };

                    logger.info('Datos preparados para PDF:', {
                        ordenId: ordenData.id_op,
                        numeroOp: ordenData.numero_op,
                        panosCount: ordenData.panos?.length || 0,
                        materialesCount: ordenData.materiales?.length || 0,
                        herramientasCount: ordenData.herramientas?.length || 0,
                        cutsCount: ordenData.cuts?.length || 0,
                        sobrantesCount: ordenData.sobrantes?.length || 0
                    });

                    // Generar PDF
                    const { filepath, filename } = await pdfService.generateOrdenProduccionPDF(ordenData);
                    
                    logger.info('PDF generado automáticamente al crear orden', {
                        ordenId: id_op,
                        filename: filename,
                        filepath: filepath
                    });

                    // Enviar webhook si está configurado
                    try {
                        const webhookService = require('./webhookController');
                        const resultado = await webhookService.sendWebhookWithPDF(ordenData, filepath);
                        logger.info('Webhook enviado con PDF', {
                                ordenId: id_op,
                                pdfIncluido: resultado.pdfIncluido
                            });
                    } catch (webhookError) {
                        logger.warn('Error enviando webhook con PDF', {
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
            
            // Si es un error de validación, devolver mensaje estructurado
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    errorType: 'ValidationError',
                    message: error.message,
                    details: error.errors || []
                });
            }
            
            // Si es un error de recurso no encontrado
            if (error.name === 'NotFoundError') {
                return res.status(404).json({
                    success: false,
                    errorType: 'NotFoundError',
                    message: error.message
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

            // VALIDACIÓN ESPECIAL PARA ESTADO "COMPLETADA"
            if (estado === 'completada') {
                logger.info('Validando paños para completar orden:', { orden_id: id });
                
                // Obtener todos los paños relacionados con esta orden (padres, no remanentes)
                const pañosRelacionados = await trx('trabajo_corte as tc')
                    .join('pano as p', 'tc.id_item', 'p.id_item')
                    .where('tc.id_op', id)
                    .select('p.id_item', 'p.estado_trabajo', 'tc.job_id', 'tc.estado as estado_corte');
                
                logger.info('Paños relacionados encontrados:', {
                    orden_id: id,
                    total_paños: pañosRelacionados.length,
                    paños: pañosRelacionados.map(p => ({
                        id_item: p.id_item,
                        estado_trabajo: p.estado_trabajo,
                        estado_corte: p.estado_corte
                    }))
                });
                
                // Verificar que todos los paños estén en estado "Consumido"
                const pañosNoConsumidos = pañosRelacionados.filter(p => p.estado_trabajo !== 'Consumido');
                
                if (pañosNoConsumidos.length > 0) {
                    const pañosIds = pañosNoConsumidos.map(p => p.id_item);
                    logger.warn('No se puede completar la orden - paños no consumidos:', {
                        orden_id: id,
                        paños_no_consumidos: pañosIds,
                        estados: pañosNoConsumidos.map(p => ({
                            id_item: p.id_item,
                            estado_trabajo: p.estado_trabajo,
                            estado_corte: p.estado_corte
                        }))
                    });
                    
                    throw new ValidationError(
                        `No se puede completar la orden. Los siguientes paños no han sido consumidos: ${pañosIds.join(', ')}. ` +
                        `Todos los paños deben estar en estado "Consumido" para completar la orden.`
                    );
                }
                
                // Verificar que todos los trabajos de corte estén completados
                const trabajosPendientes = pañosRelacionados.filter(p => 
                    p.estado_corte !== 'Confirmado' && p.estado_corte !== 'Desviado'
                );
                
                if (trabajosPendientes.length > 0) {
                    const trabajosIds = trabajosPendientes.map(p => p.job_id);
                    logger.warn('No se puede completar la orden - trabajos de corte pendientes:', {
                        orden_id: id,
                        trabajos_pendientes: trabajosIds
                    });
                    
                    throw new ValidationError(
                        `No se puede completar la orden. Los siguientes trabajos de corte no han sido completados: ${trabajosIds.join(', ')}. ` +
                        `Todos los cortes deben estar confirmados o desviados para completar la orden.`
                    );
                }
                
                logger.info('Validación exitosa - todos los paños están consumidos y cortes completados:', { orden_id: id });
            }

            // Actualizar estado en orden_produccion
            await trx('orden_produccion')
                .where('id_op', id)
                .update({ estado });

            // Si el estado cambió a 'cancelada', restaurar inventario completo (paños + materiales extras)
            if (estado === 'cancelada' && estadoAnterior !== 'cancelada') {
                logger.info('Cancelando orden y restaurando inventario:', { orden_id: id });
                
                // 1. Restaurar materiales extras que fueron descontados en la aprobación
                const materialesDescontados = await trx('orden_produccion_detalle as opd')
                    .join('materiales_extras as me', 'opd.id_item', 'me.id_item')
                    .where('opd.id_op', id)
                    .where('opd.tipo_item', 'EXTRA')
                    .where('opd.estado', 'en_proceso')
                    .select('opd.id_item', 'opd.cantidad', 'me.descripcion', 'me.unidad');
                
                for (const material of materialesDescontados) {
                    // Restaurar cantidad al inventario
                    await trx('materiales_extras')
                        .where('id_item', material.id_item)
                        .increment('cantidad_disponible', material.cantidad);
                    
                    // Registrar movimiento de restauración
                    await trx('movimiento_inventario').insert({
                        id_item: material.id_item,
                        tipo_mov: 'AJUSTE_IN',
                        cantidad: material.cantidad,
                        unidad: material.unidad,
                        notas: `Restauración por cancelación de orden ${orden.numero_op}: ${material.descripcion}`,
                        id_op: id,
                        id_usuario: req.user.id
                    });
                    
                    // Marcar detalle como cancelado
                    await trx('orden_produccion_detalle')
                        .where('id_op', id)
                        .where('id_item', material.id_item)
                        .update({ estado: 'cancelado' });
                    
                    logger.info('Material restaurado:', {
                        material_id: material.id_item,
                        cantidad: material.cantidad,
                        descripcion: material.descripcion
                    });
                }
                
                // 2. Manejar paños según el estado de los cortes
                const trabajosCorte = await trx('trabajo_corte')
                    .where('id_op', id)
                    .select('job_id', 'id_item', 'estado', 'altura_req', 'ancho_req', 'completed_at');
                
                for (const trabajo of trabajosCorte) {
                    // Verificar si el trabajo tenía completed_at (indicando que se completó antes de cancelar)
                    const trabajoCompletado = trabajo.completed_at !== null;
                    
                    if (trabajoCompletado) {
                        // Si el corte ya se completó, necesitamos restaurar el paño objetivo
                        logger.info('Corte ya completado, restaurando paño objetivo:', { job_id: trabajo.job_id });
                        
                        // Obtener datos del paño padre original
                        const panoPadre = await trx('pano')
                            .where('id_item', trabajo.id_item)
                            .first();
                        
                        if (panoPadre) {
                            // Crear el paño objetivo con las dimensiones solicitadas
                            const [nuevoPanoResult] = await trx('pano').insert({
                                id_mcr: panoPadre.id_mcr,
                                largo_m: trabajo.altura_req,
                                ancho_m: trabajo.ancho_req,
                                estado: panoPadre.estado,
                                ubicacion: panoPadre.ubicacion,
                                precio_x_unidad: panoPadre.precio_x_unidad,
                                stock_minimo: panoPadre.stock_minimo,
                                estado_trabajo: 'Libre',
                                created_at: db.fn.now(),
                                updated_at: db.fn.now()
                            }).returning('id_item');
                            
                            // Extraer el ID del resultado
                            const nuevoPanoId = typeof nuevoPanoResult === 'object' ? nuevoPanoResult.id_item : nuevoPanoResult;
                            
                            // Registrar movimiento de restauración del paño objetivo
                            await trx('movimiento_inventario').insert({
                                id_item: nuevoPanoId,
                                tipo_mov: 'AJUSTE_IN',
                                cantidad: trabajo.altura_req * trabajo.ancho_req,
                                unidad: 'm²',
                                notas: `Restauración de paño objetivo por cancelación de orden ${orden.numero_op}`,
                                id_op: id,
                                id_usuario: req.user.id
                            });
                            
                            logger.info('Paño objetivo restaurado:', {
                                nuevo_pano_id: nuevoPanoId,
                                dimensiones: `${trabajo.altura_req}m x ${trabajo.ancho_req}m`,
                                area: trabajo.altura_req * trabajo.ancho_req
                            });
                        }
                        
                        // Los remanentes ya están como paños libres, no hay que hacer nada
                        
                        // El paño padre ya no existe físicamente (se convirtió en remanentes + objetivo)
                        // Solo marcarlo como consumido para mantener auditoría
                        await trx('pano')
                            .where('id_item', trabajo.id_item)
                            .update({ estado_trabajo: 'Consumido' });
                        
                    } else {
                        // Si el corte no se completó, liberar el paño padre
                        logger.info('Corte no completado, liberando paño padre:', { 
                            job_id: trabajo.job_id, 
                            pano_id: trabajo.id_item 
                        });
                        
                        // Marcar paño padre como libre
                        await trx('pano')
                            .where('id_item', trabajo.id_item)
                            .update({ estado_trabajo: 'Libre' });
                        
                        // Eliminar remanentes pendientes de este trabajo
                        await trx('panos_sobrantes')
                            .where('id_op', id)
                            .where('estado', 'Pendiente')
                            .del();
                        
                        // Registrar movimiento de liberación
                        await trx('movimiento_inventario').insert({
                            id_item: trabajo.id_item,
                            tipo_mov: 'AJUSTE_IN',
                            cantidad: trabajo.altura_req * trabajo.ancho_req,
                            unidad: 'm²',
                            notas: `Liberación de paño por cancelación de orden ${orden.numero_op}`,
                            id_op: id,
                            id_usuario: req.user.id
                        });
                    }
                    
                    // Marcar trabajo de corte como cancelado
                    await trx('trabajo_corte')
                        .where('job_id', trabajo.job_id)
                        .update({ estado: 'Cancelado' });
                }
                
                // 3. Liberar herramientas asignadas
                const herramientasAsignadas = await trx('herramienta_ordenada')
                    .where('id_op', id)
                    .select('id_item', 'cantidad');
                
                for (const herramienta of herramientasAsignadas) {
                    // Restaurar cantidad al inventario
                    await trx('herramientas')
                        .where('id_item', herramienta.id_item)
                        .increment('cantidad_disponible', herramienta.cantidad);
                    
                    // Registrar movimiento de restauración
                    await trx('movimiento_inventario').insert({
                        id_item: herramienta.id_item,
                        tipo_mov: 'AJUSTE_IN',
                        cantidad: herramienta.cantidad,
                        unidad: 'unidad',
                        notas: `Restauración de herramienta por cancelación de orden ${orden.numero_op}`,
                        id_op: id,
                        id_usuario: req.user.id
                    });
                }
                
                // Eliminar asignaciones de herramientas
                await trx('herramienta_ordenada')
                    .where('id_op', id)
                    .del();
                
                logger.info('Orden cancelada exitosamente:', { 
                    orden_id: id, 
                    materiales_restaurados: materialesDescontados.length,
                    trabajos_corte: trabajosCorte.length,
                    herramientas_restauradas: herramientasAsignadas.length
                });
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

                    // Obtener trabajos de corte y sus planes
                    const cutJobs = await db('trabajo_corte as tc')
                        .leftJoin('pano as p', 'tc.id_item', 'p.id_item')
                        .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                        .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
                        .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
                        .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
                        .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
                        .where('tc.id_op', id)
                        .select(
                            'tc.*',
                            'p.largo_m as pano_largo',
                            'p.ancho_m as pano_ancho',
                            'p.area_m2 as pano_area',
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

                    // Obtener planes de corte para cada trabajo
                    for (const job of cutJobs) {
                        job.plans = await db('plan_corte_pieza')
                            .where('job_id', job.job_id)
                            .orderBy('seq')
                            .select('*');
                    }

                    // Obtener sobrantes (remnants) para esta orden
                    const sobrantes = await db('panos_sobrantes')
                        .where('id_op', id)
                        .select('*');

                    // Preparar datos de panos para PDF basados en trabajo_corte
                    const panosParaPDF = cutJobs.map(job => {
                        // Determinar campos técnicos según tipo_red
                        let calibre, cuadro, torsion, refuerzo, color, presentacion, grosor, color_tipo_red;
                        switch ((job.tipo_red || '').toLowerCase()) {
                            case 'nylon':
                                calibre = job.nylon_calibre;
                                cuadro = job.nylon_cuadro;
                                torsion = job.nylon_torsion;
                                refuerzo = job.nylon_refuerzo;
                                break;
                            case 'lona':
                                color = job.lona_color;
                                presentacion = job.lona_presentacion;
                                break;
                            case 'polipropileno':
                                grosor = job.polipropileno_grosor;
                                cuadro = job.polipropileno_cuadro;
                                break;
                            case 'malla sombra':
                                color_tipo_red = job.malla_color_tipo_red;
                                presentacion = job.malla_presentacion;
                                break;
                        }

                        return {
                            id_item: job.id_item,
                            largo_m: job.altura_req,  // altura_req es el largo solicitado
                            ancho_m: job.ancho_req,   // ancho_req es el ancho solicitado
                            cantidad: 1,
                            tipo_red: job.tipo_red || 'nylon',
                            area_m2: job.area_req,
                            precio_m2: job.precio_x_unidad,
                            // Datos del pano original
                            pano_original_largo: job.pano_largo,
                            pano_original_ancho: job.pano_ancho,
                            pano_original_area: job.pano_area,
                            calibre,
                            cuadro,
                            torsion,
                            refuerzo,
                            color,
                            presentacion,
                            grosor,
                            color_tipo_red
                        };
                    });

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

                    // Preparar datos para el webhook
                    const ordenData = {
                        ...ordenCompleta,
                        panos: panosParaPDF,
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
                        })),
                        // Format cuts data for webhook
                        cuts: cutJobs.map(job => ({
                            id_item: job.id_item,
                            altura_req: job.altura_req,
                            ancho_req: job.ancho_req,
                            umbral_sobrante_m2: job.umbral_sobrante_m2 || 5.0,
                            modo_corte: orden.modo_corte || 'simple', // Agregar modo_corte
                            pano_original: {
                                largo: job.pano_largo,
                                ancho: job.pano_ancho,
                                area: job.pano_area
                            },
                            plans: job.plans.map(plan => ({
                                rol_pieza: plan.rol_pieza,
                                altura_plan: plan.altura_plan,
                                ancho_plan: plan.ancho_plan,
                                seq: plan.seq
                            })),
                            cortes_individuales: job.cortes_individuales || []
                        })),
                        // Add remnants data
                        sobrantes: sobrantes.map(sobrante => ({
                            id_remnant: sobrante.id_remnant,
                            altura_m: sobrante.altura_m,
                            ancho_m: sobrante.ancho_m,
                            area_m2: sobrante.area_m2,
                            parent_id_item: sobrante.id_item_padre
                        })),
                        // Agregar información adicional para el webhook
                        webhook_event: 'orden_en_proceso',
                        webhook_timestamp: new Date().toISOString()
                    };

                    // Generar PDF para el webhook
                    const pdfService = require('../services/pdfService');
                    const { filepath, filename } = await pdfService.generateOrdenProduccionPDF(ordenData);

                    // Agregar información del PDF a los datos del webhook
                    ordenData.pdf_generated = true;
                    ordenData.pdf_filename = filename;
                    ordenData.pdf_filepath = filepath;

                    logger.info('Enviando webhook a Make.com - Orden en proceso', {
                                    ordenId: id,
                        numeroOp: ordenData.numero_op,
                        cliente: ordenData.cliente,
                        pdfFilename: filename
                    });

                    // Enviar webhook con PDF adjunto
                    const webhookResult = await makeWebhookService.enviarOrdenEnProceso(ordenData);
                    
                    logger.info('Webhook enviado exitosamente a Make.com', {
                                    ordenId: id,
                        success: webhookResult.success,
                        pdfIncluido: webhookResult.pdfIncluido,
                        status: webhookResult.status
                    });

                } catch (webhookError) {
                    logger.error('Error enviando webhook a Make.com', {
                        ordenId: id,
                        error: webhookError.message
                    });
                    // No fallar el cambio de estado si el webhook falla
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
            
            // Si es un error de validación, devolver mensaje estructurado
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    errorType: 'ValidationError',
                    message: error.message,
                    details: error.errors || []
                });
            }
            
            // Si es un error de recurso no encontrado
            if (error.name === 'NotFoundError') {
                return res.status(404).json({
                    success: false,
                    errorType: 'NotFoundError',
                    message: error.message
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

                // Agregar material a la orden (sin descontar stock aún)
                await trx('orden_produccion_detalle').insert({
                    id_op: id,
                    id_item: material.id_item,
                    tipo_item: material.tipo_item || 'EXTRA',
                    cantidad: material.cantidad,
                    notas: material.notas || '',
                    estado: 'por aprobar' // Materials will be discounted when order is approved
                });

                // Stock will be discounted when order is approved, not when material is added
                logger.info('Material added to order (stock will be discounted on approval):', {
                    material_id: material.id_item,
                    cantidad: material.cantidad,
                    orden_id: id
                });
            }

            await trx.commit();

            res.json({
                success: true,
                message: 'Materiales agregados exitosamente'
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error agregando materiales:', error);
            
            // Si es un error de validación, devolver mensaje estructurado
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    errorType: 'ValidationError',
                    message: error.message,
                    details: error.errors || []
                });
            }
            
            // Si es un error de recurso no encontrado
            if (error.name === 'NotFoundError') {
                return res.status(404).json({
                    success: false,
                    errorType: 'NotFoundError',
                    message: error.message
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
            
            // Si es un error de validación, devolver mensaje estructurado
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    errorType: 'ValidationError',
                    message: error.message,
                    details: error.errors || []
                });
            }
            
            // Si es un error de recurso no encontrado
            if (error.name === 'NotFoundError') {
                return res.status(404).json({
                    success: false,
                    errorType: 'NotFoundError',
                    message: error.message
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

            // Verificar que la orden esté cancelada o completada
            if (orden.estado === 'en_proceso' || orden.estado === 'por aprobar' || orden.estado === 'pausada') {
                throw new ValidationError('Solo se pueden eliminar órdenes canceladas o completadas');
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
            
            // Si es un error de validación, devolver mensaje estructurado
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    errorType: 'ValidationError',
                    message: error.message,
                    details: error.errors || []
                });
            }
            
            // Si es un error de recurso no encontrado
            if (error.name === 'NotFoundError') {
                return res.status(404).json({
                    success: false,
                    errorType: 'NotFoundError',
                    message: error.message
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

            // Obtener trabajos de corte y sus planes
            const cutJobs = await db('trabajo_corte as tc')
                .leftJoin('pano as p', 'tc.id_item', 'p.id_item')
                .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
                .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
                .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
                .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
                .where('tc.id_op', id)
                .select(
                    'tc.*',
                    'p.largo_m as pano_largo',
                    'p.ancho_m as pano_ancho',
                    'p.area_m2 as pano_area',
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

            // Obtener planes de corte para cada trabajo
            for (const job of cutJobs) {
                job.plans = await db('plan_corte_pieza')
                    .where('job_id', job.job_id)
                    .orderBy('seq')
                    .select('*');
                
                // Obtener cortes individuales para este trabajo
                job.cortes_individuales = await db('cortes_individuales')
                    .where('job_id', job.job_id)
                    .orderBy('seq')
                    .select('*');
            }

            // Obtener sobrantes (remnants) para esta orden
            const sobrantes = await db('panos_sobrantes')
                .where('id_op', id)
                .select('*');

            // Preparar datos de panos para PDF basados en trabajo_corte
            const panosParaPDF = cutJobs.map(job => {
                // Determinar campos técnicos según tipo_red
                let calibre, cuadro, torsion, refuerzo, color, presentacion, grosor, color_tipo_red;
                switch ((job.tipo_red || '').toLowerCase()) {
                    case 'nylon':
                        calibre = job.nylon_calibre;
                        cuadro = job.nylon_cuadro;
                        torsion = job.nylon_torsion;
                        refuerzo = job.nylon_refuerzo;
                        break;
                    case 'lona':
                        color = job.lona_color;
                        presentacion = job.lona_presentacion;
                        break;
                    case 'polipropileno':
                        grosor = job.polipropileno_grosor;
                        cuadro = job.polipropileno_cuadro;
                        break;
                    case 'malla sombra':
                        color_tipo_red = job.malla_color_tipo_red;
                        presentacion = job.malla_presentacion;
                        break;
                }

                return {
                    id_item: job.id_item,
                    largo_m: job.altura_req,  // altura_req es el largo solicitado
                    ancho_m: job.ancho_req,   // ancho_req es el ancho solicitado
                    cantidad: 1,
                    tipo_red: job.tipo_red || 'nylon',
                    area_m2: job.area_req,
                    precio_m2: job.precio_x_unidad,
                    // Datos del pano original
                    pano_original_largo: job.pano_largo,
                    pano_original_ancho: job.pano_ancho,
                    pano_original_area: job.pano_area,
                    calibre,
                    cuadro,
                    torsion,
                    refuerzo,
                    color,
                    presentacion,
                    grosor,
                    color_tipo_red
                };
            });

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

            // Preparar datos para el PDF
            const ordenData = {
                ...orden,
                panos: panosParaPDF,
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
                })),
                // Format cuts data for PDF generation
                cuts: cutJobs.map(job => ({
                    id_item: job.id_item,
                    altura_req: job.altura_req,
                    ancho_req: job.ancho_req,
                    umbral_sobrante_m2: job.umbral_sobrante_m2 || 5.0,
                    modo_corte: orden.modo_corte || 'simple', // Agregar modo_corte
                    pano_original: {
                        largo: job.pano_largo,
                        ancho: job.pano_ancho,
                        area: job.pano_area
                    },
                    plans: job.plans.map(plan => ({
                        rol_pieza: plan.rol_pieza,
                        altura_plan: plan.altura_plan,
                        ancho_plan: plan.ancho_plan,
                        seq: plan.seq
                    })),
                    cortes_individuales: job.cortes_individuales || []
                })),
                // Add remnants data
                sobrantes: sobrantes.map(sobrante => ({
                    id_remnant: sobrante.id_remnant,
                    altura_m: sobrante.altura_m,
                    ancho_m: sobrante.ancho_m,
                    area_m2: sobrante.area_m2,
                    parent_id_item: sobrante.id_item_padre
                }))
            };

            logger.info('Datos preparados para PDF:', {
                ordenId: ordenData.id_op,
                numeroOp: ordenData.numero_op,
                panosCount: ordenData.panos?.length || 0,
                materialesCount: ordenData.materiales?.length || 0,
                herramientasCount: ordenData.herramientas?.length || 0,
                cutsCount: ordenData.cuts?.length || 0,
                sobrantesCount: ordenData.sobrantes?.length || 0
            });

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

            // Siempre generar un PDF fresco
            try {
                logger.info('Generando PDF fresco para la orden', { ordenId: id });
                
                // Obtener datos de la orden usando la función generarPDF
                    const orden = await db('orden_produccion')
                        .where('id_op', id)
                        .first();
                    
                    if (!orden) {
                        throw new NotFoundError('Orden de producción no encontrada');
                    }

                // Obtener trabajos de corte y sus planes
                const cutJobs = await db('trabajo_corte as tc')
                    .leftJoin('pano as p', 'tc.id_item', 'p.id_item')
                    .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                    .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
                    .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
                    .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
                    .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
                    .where('tc.id_op', id)
                    .select(
                        'tc.*',
                        'p.largo_m as pano_largo',
                        'p.ancho_m as pano_ancho',
                        'p.area_m2 as pano_area',
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

                // Obtener planes de corte para cada trabajo
                for (const job of cutJobs) {
                    job.plans = await db('plan_corte_pieza')
                        .where('job_id', job.job_id)
                        .orderBy('seq')
                        .select('*');
                    
                    // Obtener cortes individuales para este trabajo
                    job.cortes_individuales = await db('cortes_individuales')
                        .where('job_id', job.job_id)
                        .orderBy('seq')
                        .select('*');
                }

                // Obtener sobrantes (remnants) para esta orden
                const sobrantes = await db('panos_sobrantes')
                    .where('id_op', id)
                    .select('*');

                // Preparar datos de panos para PDF basados en trabajo_corte
                const panosParaPDF = cutJobs.map(job => {
                    // Determinar campos técnicos según tipo_red
                    let calibre, cuadro, torsion, refuerzo, color, presentacion, grosor, color_tipo_red;
                    switch ((job.tipo_red || '').toLowerCase()) {
                        case 'nylon':
                            calibre = job.nylon_calibre;
                            cuadro = job.nylon_cuadro;
                            torsion = job.nylon_torsion;
                            refuerzo = job.nylon_refuerzo;
                            break;
                        case 'lona':
                            color = job.lona_color;
                            presentacion = job.lona_presentacion;
                            break;
                        case 'polipropileno':
                            grosor = job.polipropileno_grosor;
                            cuadro = job.polipropileno_cuadro;
                            break;
                        case 'malla sombra':
                            color_tipo_red = job.malla_color_tipo_red;
                            presentacion = job.malla_presentacion;
                            break;
                    }

                    return {
                        id_item: job.id_item,
                        largo_m: job.altura_req,  // altura_req es el largo solicitado
                        ancho_m: job.ancho_req,   // ancho_req es el ancho solicitado
                        cantidad: 1,
                        tipo_red: job.tipo_red || 'nylon',
                        area_m2: job.area_req,
                        precio_m2: job.precio_x_unidad,
                        // Datos del pano original
                        pano_original_largo: job.pano_largo,
                        pano_original_ancho: job.pano_ancho,
                        pano_original_area: job.pano_area,
                        calibre,
                        cuadro,
                        torsion,
                        refuerzo,
                        color,
                        presentacion,
                        grosor,
                        color_tipo_red
                    };
                });

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

                // Preparar datos para el PDF
                const ordenData = {
                    ...orden,
                    panos: panosParaPDF,
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
                    })),
                    // Format cuts data for PDF generation
                    cuts: cutJobs.map(job => ({
                        id_item: job.id_item,
                        altura_req: job.altura_req,
                        ancho_req: job.ancho_req,
                        umbral_sobrante_m2: job.umbral_sobrante_m2 || 5.0,
                        modo_corte: orden.modo_corte || 'simple', // Agregar modo_corte
                        pano_original: {
                            largo: job.pano_largo,
                            ancho: job.pano_ancho,
                            area: job.pano_area
                        },
                        plans: job.plans.map(plan => ({
                            rol_pieza: plan.rol_pieza,
                            altura_plan: plan.altura_plan,
                            ancho_plan: plan.ancho_plan,
                            seq: plan.seq
                        })),
                        cortes_individuales: job.cortes_individuales || []
                    })),
                    // Add remnants data
                    sobrantes: sobrantes.map(sobrante => ({
                        id_remnant: sobrante.id_remnant,
                        altura_m: sobrante.altura_m,
                        ancho_m: sobrante.ancho_m,
                        area_m2: sobrante.area_m2,
                        parent_id_item: sobrante.id_item_padre
                    }))
                };

                    // Generar PDF
                const { filepath, filename } = await pdfService.generateOrdenProduccionPDF(ordenData);
                    
                    logger.info('PDF generado exitosamente para descarga', { 
                        ordenId: id, 
                        filename, 
                        filepath 
                    });
                    
                    // Descargar el archivo recién generado
                    return res.download(filepath, filename);
                    
                } catch (genError) {
                    logger.error('Error generando PDF para descarga:', genError);
                throw new NotFoundError('No se pudo generar el PDF de la orden');
            }

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
                .select('id_cliente', 'nombre_cliente', 'email_cliente', 'telefono_cliente')
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
    },

    // Nueva función: Aprobar orden
    approveOrden: async (req, res) => {
        const { id } = req.params;
        const trx = await db.transaction();
        try {
            const orden = await trx('orden_produccion').where('id_op', id).first();
            if (!orden || orden.estado !== 'por aprobar') {
                throw new ValidationError('Orden no encontrada o no en estado por aprobar');
            }

            // DEBUG: Check what materials are in the order
            const allOrderDetails = await trx('orden_produccion_detalle')
                .where('id_op', id)
                .select('*');
            
            logger.info('DEBUG: All order details found:', { 
                orden_id: id, 
                total_details: allOrderDetails.length,
                details: allOrderDetails.map(d => ({
                    id_detalle: d.id_detalle,
                    id_item: d.id_item,
                    tipo_item: d.tipo_item,
                    cantidad: d.cantidad,
                    estado: d.estado
                }))
            });

            // NEW: Log all detalles for the order before filtering
            logger.info('DEBUG: All detalles for order before filtering:', allOrderDetails);

            // NEW: Log the raw SQL for the materialesExtras query
            const materialesExtrasDebugQuery = trx('orden_produccion_detalle as opd')
                .where('opd.id_op', id)
                .where('opd.tipo_item', 'EXTRA')
                .where('opd.estado', 'por aprobar')
                .select(
                    'opd.id_detalle',
                    'opd.id_item',
                    'opd.cantidad',
                    'opd.notas'
                );
            logger.info('DEBUG: Raw materialesExtras SQL:', { sql: materialesExtrasDebugQuery.toString() });

            // Execute the debug query
            const materialesExtrasDebug = await materialesExtrasDebugQuery;
            logger.info('DEBUG: materialesExtras result:', materialesExtrasDebug);

            // NEW: Try a LIKE query for estado
            const materialesExtrasLike = await trx('orden_produccion_detalle as opd')
                .where('opd.id_op', id)
                .where('opd.tipo_item', 'EXTRA')
                .where('opd.estado', 'like', '%por aprobar%')
                .select(
                    'opd.id_detalle',
                    'opd.id_item',
                    'opd.cantidad',
                    'opd.notas'
                );
            logger.info('DEBUG: materialesExtras LIKE result:', materialesExtrasLike);

            // Verificar locks: asegurar que panos no estén en otras órdenes aprobadas
            // Obtener los panos de esta orden
            const panosEstaOrden = await trx('trabajo_corte as tc')
                .where('tc.id_op', id)
                .select('tc.id_item');

            if (panosEstaOrden.length > 0) {
                const panosIds = panosEstaOrden.map(p => p.id_item);
                
                // Verificar si estos panos están siendo usados por otras órdenes aprobadas
                const panosBloqueados = await trx('trabajo_corte as tc')
                    .join('orden_produccion as op', 'tc.id_op', 'op.id_op')
                    .whereIn('tc.id_item', panosIds)
                    .where('tc.id_op', '!=', id) // Excluir la orden actual
                    .whereIn('op.estado', ['en_proceso', 'completada']) // Solo órdenes aprobadas
                    .select('tc.id_item', 'op.numero_op', 'op.estado');

                if (panosBloqueados.length > 0) {
                    // Crear mensaje detallado con información de las órdenes que bloquean
                    const ordenesBloqueadoras = [...new Set(panosBloqueados.map(p => p.numero_op))];
                    const mensaje = `Los siguientes paños están siendo utilizados por otras órdenes aprobadas: ${ordenesBloqueadoras.join(', ')}`;
                    throw new ConflictError(mensaje);
                }
            }

            // Actualizar a 'en_proceso'
            await trx('orden_produccion').where('id_op', id).update({ estado: 'en_proceso' });

            // Set panos to 'Reservado' and trabajo_corte to 'En progreso'
            await trx('pano')
                .whereIn('id_item', function() {
                    this.select('id_item').from('trabajo_corte').where('id_op', id);
                })
                .update({ estado_trabajo: 'Reservado' });
            await trx('trabajo_corte').where('id_op', id).update({ estado: 'En progreso' });

            // DISCOUNT MATERIALS WHEN ORDER IS APPROVED (not when cut is completed)
            logger.info('DEBUG: Starting material discounting logic for order:', { orden_id: id });
            
            // First, get all materials that need to be discounted
            const materialesExtras = materialesExtrasDebug;
            logger.info('DEBUG: Found materials for discounting:', { 
                orden_id: id, 
                materiales_count: materialesExtras.length,
                materiales: materialesExtras.map(m => ({
                    id_detalle: m.id_detalle,
                    id_item: m.id_item,
                    cantidad: m.cantidad
                }))
            });

            // Process each material and discount from inventory
            for (const material of materialesExtras) {
                // Get material details from materiales_extras
                const materialData = await trx('materiales_extras')
                    .where('id_item', material.id_item)
                    .first();

                if (!materialData) {
                    throw new ValidationError(`Material ID ${material.id_item} no encontrado en inventario`);
                }

                // Convert cantidad to number for proper comparison
                const cantidadSolicitada = parseFloat(material.cantidad) || 0;
                const stockDisponible = parseFloat(materialData.cantidad_disponible) || 0;

                // Debug log the values being compared
                logger.info('DEBUG: Stock validation:', {
                    material_id: material.id_item,
                    descripcion: materialData.descripcion,
                    cantidad_solicitada: cantidadSolicitada,
                    stock_disponible: stockDisponible,
                    cantidad_original: material.cantidad,
                    stock_original: materialData.cantidad_disponible
                });

                // Validate stock availability
                if (stockDisponible < cantidadSolicitada) {
                    throw new ValidationError(`Stock insuficiente para material ${materialData.descripcion}: disponible ${stockDisponible}, solicitado ${cantidadSolicitada}`);
                }

                // Update material detail status
                await trx('orden_produccion_detalle')
                    .where('id_detalle', material.id_detalle)
                    .update({ estado: 'en_proceso' });

                // Discount from inventory
                await trx('materiales_extras')
                    .where('id_item', material.id_item)
                    .decrement('cantidad_disponible', cantidadSolicitada);

                // Register inventory movement
                await trx('movimiento_inventario').insert({
                    id_item: material.id_item,
                    tipo_mov: 'CONSUMO',
                    cantidad: cantidadSolicitada,
                    unidad: materialData.unidad || 'unidad',
                    notas: `Consumo para orden ${orden.numero_op}: ${materialData.descripcion}`,
                    id_op: id,
                    id_usuario: req.user.id
                });

                logger.info('Material discounted on order approval:', {
                    material_id: material.id_item,
                    descripcion: materialData.descripcion,
                    cantidad: cantidadSolicitada,
                    orden_id: id
                });
            }

            // Query data for PDF, including cuts
            const ordenData = await trx('orden_produccion').where('id_op', id).first();
            
            // Obtener trabajos de corte y sus planes
            const cutJobs = await trx('trabajo_corte as tc')
                .leftJoin('pano as p', 'tc.id_item', 'p.id_item')
                .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
                .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
                .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
                .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
                .where('tc.id_op', id)
                .select(
                    'tc.*',
                    'p.largo_m as pano_largo',
                    'p.ancho_m as pano_ancho',
                    'p.area_m2 as pano_area',
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

            // Obtener planes de corte para cada trabajo
            for (const job of cutJobs) {
                job.plans = await trx('plan_corte_pieza')
                    .where('job_id', job.job_id)
                    .orderBy('seq')
                    .select('*');
                
                // Obtener cortes individuales para este trabajo
                job.cortes_individuales = await trx('cortes_individuales')
                    .where('job_id', job.job_id)
                    .orderBy('seq')
                    .select('*');
            }

            // Obtener sobrantes (remnants) para esta orden
            const sobrantes = await trx('panos_sobrantes')
                .where('id_op', id)
                .select('*');

            // Preparar datos de panos para PDF basados en trabajo_corte
            const panosParaPDF = cutJobs.map(job => {
                // Determinar campos técnicos según tipo_red
                let calibre, cuadro, torsion, refuerzo, color, presentacion, grosor, color_tipo_red;
                switch ((job.tipo_red || '').toLowerCase()) {
                    case 'nylon':
                        calibre = job.nylon_calibre;
                        cuadro = job.nylon_cuadro;
                        torsion = job.nylon_torsion;
                        refuerzo = job.nylon_refuerzo;
                        break;
                    case 'lona':
                        color = job.lona_color;
                        presentacion = job.lona_presentacion;
                        break;
                    case 'polipropileno':
                        grosor = job.polipropileno_grosor;
                        cuadro = job.polipropileno_cuadro;
                        break;
                    case 'malla sombra':
                        color_tipo_red = job.malla_color_tipo_red;
                        presentacion = job.malla_presentacion;
                        break;
                }

                return {
                    id_item: job.id_item,
                    largo_m: job.altura_req,  // altura_req es el largo solicitado
                    ancho_m: job.ancho_req,   // ancho_req es el ancho solicitado
                    cantidad: 1,
                    tipo_red: job.tipo_red || 'nylon',
                    area_m2: job.area_req,
                    precio_m2: job.precio_x_unidad,
                    // Datos del pano original
                    pano_original_largo: job.pano_largo,
                    pano_original_ancho: job.pano_ancho,
                    pano_original_area: job.pano_area,
                    calibre,
                    cuadro,
                    torsion,
                    refuerzo,
                    color,
                    presentacion,
                    grosor,
                    color_tipo_red
                };
            });

            // Obtener detalles de materiales
            const materiales = await trx('orden_produccion_detalle as opd')
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
            const herramientas = await trx('herramienta_ordenada as ho')
                .leftJoin('herramientas as h', 'ho.id_item', 'h.id_item')
                .where('ho.id_op', id)
                .select(
                    'ho.*',
                    'h.descripcion',
                    'h.categoria',
                    'h.marca'
                );

            // Preparar datos para el PDF
            ordenData.panos = panosParaPDF;
            ordenData.materiales = materiales.map(material => ({
                descripcion: material.descripcion,
                categoria: material.categoria,
                cantidad: material.cantidad,
                unidad: material.unidad
            }));
            ordenData.herramientas = herramientas.map(herramienta => ({
                nombre: herramienta.descripcion || 'Herramienta',
                descripcion: herramienta.descripcion || '',
                categoria: herramienta.categoria || 'General',
                cantidad: herramienta.cantidad || 1
            }));

            // Format cuts data for PDF generation
            ordenData.cuts = cutJobs.map(job => ({
                id_item: job.id_item,
                altura_req: job.altura_req,
                ancho_req: job.ancho_req,
                umbral_sobrante_m2: job.umbral_sobrante_m2 || 5.0,
                modo_corte: orden.modo_corte || 'simple', // Agregar modo_corte
                pano_original: {
                    largo: job.pano_largo,
                    ancho: job.pano_ancho,
                    area: job.pano_area
                },
                plans: job.plans.map(plan => ({
                    rol_pieza: plan.rol_pieza,
                    altura_plan: plan.altura_plan,
                    ancho_plan: plan.ancho_plan,
                    seq: plan.seq
                })),
                cortes_individuales: job.cortes_individuales || []
            }));

            // Add remnants data
            ordenData.sobrantes = sobrantes.map(sobrante => ({
                id_remnant: sobrante.id_remnant,
                altura_m: sobrante.altura_m,
                ancho_m: sobrante.ancho_m,
                area_m2: sobrante.area_m2,
                parent_id_item: sobrante.id_item_padre
            }));

            // Generate PDF
            const pdfService = require('../services/pdfService');
            const { filepath, filename } = await pdfService.generateOrdenProduccionPDF(ordenData);

            // Enviar webhook a Make.com con el PDF cuando la orden se aprueba
            try {
                const makeWebhookService = require('../services/makeWebhookService');
                
                // Preparar datos completos de la orden para el webhook
                const ordenCompleta = {
                    ...ordenData,
                    // Agregar información adicional para el webhook
                    webhook_event: 'orden_aprobada',
                    webhook_timestamp: new Date().toISOString(),
                    pdf_generated: true,
                    pdf_filename: filename,
                    pdf_filepath: filepath
                };

                logger.info('Enviando webhook a Make.com - Orden aprobada', {
                    ordenId: id,
                    numeroOp: ordenData.numero_op,
                    cliente: ordenData.cliente,
                    pdfFilename: filename
                });

                // Enviar webhook con PDF adjunto
                const webhookResult = await makeWebhookService.enviarOrdenEnProceso(ordenCompleta);
                
                logger.info('Webhook enviado exitosamente a Make.com', {
                    ordenId: id,
                    success: webhookResult.success,
                    pdfIncluido: webhookResult.pdfIncluido,
                    status: webhookResult.status
                });

            } catch (webhookError) {
                logger.error('Error enviando webhook a Make.com', {
                    ordenId: id,
                    error: webhookError.message
                });
                // No fallar la aprobación si el webhook falla
            }

            await trx.commit();
            res.json({ 
                success: true, 
                message: 'Orden aprobada y PDF generado', 
                pdf: filename,
                webhook_sent: true
            });
        } catch (error) {
            await trx.rollback();
            logger.error('Error aprobando orden:', error);
            
            // Si es un error de validación, devolver mensaje estructurado
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    success: false,
                    errorType: 'ValidationError',
                    message: error.message,
                    details: error.errors || []
                });
            }
            
            // Si es un error de conflicto (paños bloqueados), devolver mensaje estructurado
            if (error.name === 'ConflictError') {
                return res.status(409).json({
                    success: false,
                    errorType: 'ConflictError',
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

    // Nueva: Obtener trabajos de corte pendientes para operador (agrupados por orden)
    getCutJobs: async (req, res) => {
        try {
            const { id } = req.user;
            
            // Obtener órdenes con trabajos de corte pendientes
            const ordersWithJobs = await db('orden_produccion as op')
                .join('trabajo_corte as tc', 'op.id_op', 'tc.id_op')
                .leftJoin('cliente as c', 'op.id_cliente', 'c.id_cliente')
                .where('tc.id_operador', id)
                .where('tc.estado', 'En progreso')
                .where('op.estado', 'en_proceso')
                .select(
                    'op.id_op',
                    'op.numero_op',
                    'op.cliente',
                    'op.fecha_op',
                    'op.prioridad',
                    'c.nombre_cliente',
                    'c.email_cliente as cliente_email',
                    'c.telefono_cliente as cliente_telefono',
                    db.raw('COUNT(tc.job_id) as total_cuts'),
                    db.raw('COUNT(tc.job_id) as pending_cuts')
                )
                .groupBy('op.id_op', 'op.numero_op', 'op.cliente', 'op.fecha_op', 'op.prioridad', 'c.nombre_cliente', 'c.email_cliente', 'c.telefono_cliente')
                .orderBy('op.fecha_op', 'desc');

            // Para cada orden, obtener los trabajos de corte detallados
            const ordersWithCutDetails = await Promise.all(
                ordersWithJobs.map(async (order) => {
                    const cutJobs = await db('trabajo_corte as tc')
                        .leftJoin('pano as p', 'tc.id_item', 'p.id_item')
                        .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                        .where('tc.id_op', order.id_op)
                        .where('tc.id_operador', id)
                        .where('tc.estado', 'En progreso')
                        .select(
                            'tc.job_id',
                            'tc.altura_req',
                            'tc.ancho_req',
                            'tc.area_req',
                            'tc.estado',
                            'tc.created_at',
                            'p.id_item',
                            'p.largo_m as pano_largo',
                            'p.ancho_m as pano_ancho',
                            'p.area_m2 as pano_area',
                            'rp.tipo_red',
                            'rp.descripcion as descripcion_producto'
                        )
                        .orderBy('tc.created_at', 'asc');

                    // Ensure numeric values for counts
                    const processedOrder = {
                        ...order,
                        total_cuts: parseInt(order.total_cuts) || 0,
                        pending_cuts: parseInt(order.pending_cuts) || 0,
                        cut_jobs: cutJobs
                    };

                    logger.info('Processed order data:', {
                        id_op: processedOrder.id_op,
                        numero_op: processedOrder.numero_op,
                        total_cuts: processedOrder.total_cuts,
                        pending_cuts: processedOrder.pending_cuts,
                        cut_jobs_count: cutJobs.length
                    });

                    return processedOrder;
                })
            );

            res.json({ 
                success: true, 
                data: ordersWithCutDetails 
            });
        } catch (error) {
            logger.error('Error obteniendo trabajos de corte:', error);
            throw error;
        }
    },

    // Nueva: Obtener trabajos de corte completados para operador (agrupados por orden)
    getCompletedCutJobs: async (req, res) => {
        try {
            const { id } = req.user;
            const { page = 1, limit = 10 } = req.query;
            
            // Obtener órdenes con trabajos de corte completados (incluye Confirmado y Desviado)
            const ordersWithCompletedJobs = await db('orden_produccion as op')
                .join('trabajo_corte as tc', 'op.id_op', 'tc.id_op')
                .leftJoin('cliente as c', 'op.id_cliente', 'c.id_cliente')
                .where('tc.id_operador', id)
                .whereIn('tc.estado', ['Confirmado', 'Desviado'])
                .select(
                    'op.id_op',
                    'op.numero_op',
                    'op.cliente',
                    'op.fecha_op',
                    'op.prioridad',
                    'c.nombre_cliente',
                    'c.email_cliente as cliente_email',
                    'c.telefono_cliente as cliente_telefono',
                    db.raw('COUNT(tc.job_id) as total_cuts'),
                    db.raw('COUNT(CASE WHEN tc.estado IN (\'Confirmado\', \'Desviado\') THEN 1 END) as completed_cuts'),
                    db.raw('MAX(tc.completed_at) as last_completed_date')
                )
                .groupBy('op.id_op', 'op.numero_op', 'op.cliente', 'op.fecha_op', 'op.prioridad', 'c.nombre_cliente', 'c.email_cliente', 'c.telefono_cliente')
                .orderBy('last_completed_date', 'desc');

            // Contar total para paginación
            const total = ordersWithCompletedJobs.length;
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const paginatedOrders = ordersWithCompletedJobs.slice(offset, offset + parseInt(limit));

            // Para cada orden, obtener los trabajos de corte detallados
            const ordersWithCutDetails = await Promise.all(
                paginatedOrders.map(async (order) => {
                    const cutJobs = await db('trabajo_corte as tc')
                        .leftJoin('pano as p', 'tc.id_item', 'p.id_item')
                        .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                        .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
                        .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
                        .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
                        .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
                        .where('tc.id_op', order.id_op)
                        .where('tc.id_operador', id)
                        .whereIn('tc.estado', ['Confirmado', 'Desviado'])
                        .select(
                            'tc.job_id',
                            'tc.altura_req',
                            'tc.ancho_req',
                            'tc.area_req',
                            'tc.estado',
                            'tc.created_at',
                            'tc.completed_at',
                            'p.id_item',
                            'p.largo_m as pano_largo',
                            'p.ancho_m as pano_ancho',
                            'p.area_m2 as pano_area',
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
                        )
                        .orderBy('tc.completed_at', 'desc');

                    // Get cut plans and real cuts for each job
                    for (const job of cutJobs) {
                        job.plans = await db('plan_corte_pieza')
                            .where('job_id', job.job_id)
                            .orderBy('seq')
                            .select('*');
                        
                        job.real_cuts = await db('real_corte_pieza')
                            .where('job_id', job.job_id)
                            .orderBy('seq')
                            .select('*');
                    }

                    // Ensure numeric values for counts
                    const processedOrder = {
                        ...order,
                        total_cuts: parseInt(order.total_cuts) || 0,
                        completed_cuts: parseInt(order.completed_cuts) || 0,
                        cut_jobs: cutJobs
                    };

                    return processedOrder;
                })
            );

            res.json({ 
                success: true, 
                data: ordersWithCutDetails,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            logger.error('Error obteniendo trabajos de corte completados:', error);
            throw error;
        }
    },

    // Nueva: Obtener planes de corte para un trabajo específico
    getCutJobPlans: async (req, res) => {
        try {
            const { jobId } = req.params;
            const { id } = req.user;
            
            // Verificar que el trabajo pertenece al operador
            const job = await db('trabajo_corte')
                .where('job_id', jobId)
                .where('id_operador', id)
                .first();
            
            if (!job) {
                throw new NotFoundError('Trabajo de corte no encontrado');
            }

            const plans = await db('plan_corte_pieza')
                .where('job_id', jobId)
                .orderBy('seq')
                .select('*');

            res.json({ success: true, data: plans });
        } catch (error) {
            logger.error('Error obteniendo planes de corte:', error);
            throw error;
        }
    },

    // Nueva: Enviar cortes reales y confirmar (corregir path)
    submitActualCuts: async (req, res) => {
        logger.info('DEBUG_MARKER: submitActualCuts handler is running');
        logger.info('DEBUG_VERSION:', ordenesController._debugVersion);
        const { job_id, actual_pieces } = req.body;
        const { id } = req.user;
        const trx = await db.transaction();
        try {
            const job = await trx('trabajo_corte').where('job_id', job_id).first();
            if (!job || job.id_operador !== id) {
                throw new ValidationError('Trabajo no encontrado o no asignado');
            }

            // Check if pieces already exist to prevent duplicates
            const existingPieces = await trx('real_corte_pieza')
                .where('job_id', job_id)
                .select('seq');
            
            const existingSeqs = existingPieces.map(p => p.seq);
            logger.info('Existing pieces for job:', { job_id, existingSeqs });
            
            // Filter out pieces that already exist
            const newPieces = actual_pieces.filter(piece => !existingSeqs.includes(piece.seq));
            logger.info('New pieces to insert:', { job_id, newPieces: newPieces.map(p => p.seq) });
            
            if (newPieces.length === 0) {
                logger.info('No new pieces to insert, all pieces already exist');
                // Continue with the rest of the logic even if no new pieces
            } else {
                // Insert only new real_corte_pieza
                for (const piece of newPieces) {
                await trx('real_corte_pieza').insert({
                    job_id,
                    seq: piece.seq,
                    altura_real: piece.altura_real,
                    ancho_real: piece.ancho_real
                });
                }
            }

            // Comparar y confirmar
            const plans = await trx('plan_corte_pieza').where('job_id', job_id).select('*');
            const reals = await trx('real_corte_pieza').where('job_id', job_id).select('*');

            const conteo_esperado = plans.length;
            const conteo_real = reals.length;
            const area_esperada = plans.reduce((sum, p) => sum + p.altura_plan * p.ancho_plan, 0);
            const area_real = reals.reduce((sum, r) => sum + r.altura_real * r.ancho_real, 0);
            
            // Fix: Cap delta_pct to prevent numeric overflow (max 999.9999)
            let delta_pct = 0;
            if (area_esperada > 0) {
                delta_pct = Math.abs((area_real - area_esperada) / area_esperada) * 100;
                // Cap at 999.9999 to prevent numeric overflow
                delta_pct = Math.min(delta_pct, 999.9999);
            }

            const tolerance = 5; // %
            const withinTolerance = delta_pct <= tolerance && conteo_real === conteo_esperado;

            // Insert reporte_variacion
            await trx('reporte_variacion').insert({
                job_id,
                conteo_esperado,
                area_esperada,
                conteo_real,
                area_real,
                delta_pct,
                resolucion: withinTolerance ? 'Anulado' : 'Abrir',
                resolved_by: withinTolerance ? id : null,
                resolved_at: withinTolerance ? db.fn.now() : null,
                old_status: job.estado,
                new_status: withinTolerance ? 'Confirmado' : 'Desviado'
            });

            if (withinTolerance) {
                await trx('trabajo_corte').where('job_id', job_id).update({ 
                    estado: 'Confirmado', 
                    completed_at: db.fn.now() 
                });
                
                // DISCOUNT PANO FROM INVENTORY WHEN CUT IS COMPLETED
                const panoOriginal = await trx('pano').where('id_item', job.id_item).first();
                if (panoOriginal) {
                    // Calculate area consumed (requested area)
                    const areaConsumida = job.altura_req * job.ancho_req;
                    
                    // Register pano consumption movement
                    await trx('movimiento_inventario').insert({
                        id_item: job.id_item,
                        tipo_mov: 'CONSUMO',
                        cantidad: areaConsumida,
                        unidad: 'm²',
                        notas: `Consumo de paño para corte: ${job.altura_req}m x ${job.ancho_req}m = ${areaConsumida.toFixed(2)}m²`,
                        id_op: job.id_op,
                        id_usuario: id
                    });
                    
                                            // Update pano dimensions (subtract consumed area)
                        const nuevaArea = Math.max(0, panoOriginal.area_m2 - areaConsumida);
                        
                        // Since area_m2 is a generated column, we need to update largo_m and ancho_m instead
                        // Calculate new dimensions based on remaining area
                        let nuevoLargo = panoOriginal.largo_m;
                        let nuevoAncho = panoOriginal.ancho_m;
                        
                        if (nuevaArea > 0) {
                            // Keep the same proportions but reduce the area
                            const factor = Math.sqrt(nuevaArea / panoOriginal.area_m2);
                            nuevoLargo = panoOriginal.largo_m * factor;
                            nuevoAncho = panoOriginal.ancho_m * factor;
                        } else {
                            // If no area left, set to minimum values
                            nuevoLargo = 0.01;
                            nuevoAncho = 0.01;
                        }
                        
                        await trx('pano')
                            .where('id_item', job.id_item)
                            .update({
                                largo_m: nuevoLargo,
                                ancho_m: nuevoAncho,
                                // CORRECCIÓN: El paño padre siempre se consume cuando se hace un corte
                                // ya que se convierte en remanentes más pequeños
                                estado_trabajo: 'Consumido',
                                updated_at: db.fn.now()
                            });
                    
                    logger.info('Pano discounted on cut completion:', {
                        pano_id: job.id_item,
                        area_consumida: areaConsumida,
                        area_restante: nuevaArea,
                        job_id: job_id,
                        orden_id: job.id_op
                    });
                }
                
                // Migrar remanentes válidos a pano
                const sobrantes = await trx('panos_sobrantes')
                    .select('id_remnant', 'id_item_padre', 'altura_m', 'ancho_m', 'estado', 'id_op')
                    .where('id_op', job.id_op)
                    .where('estado', 'Pendiente');
                
                // Debug: Log the raw data retrieved
                logger.info('Raw sobrantes data (submitActualCuts):', JSON.stringify(sobrantes, null, 2));
                logger.info('Number of sobrantes found:', sobrantes.length);
                
                for (const sob of sobrantes) {
                    // Calculate area from dimensions
                    const area_m2 = parseFloat(sob.altura_m || 0) * parseFloat(sob.ancho_m || 0);
                    const umbral = job.umbral_sobrante_m2 || 5.0; // Default to 5.0 m² if not defined
                    
                    // Debug logging
                    logger.info('Processing sobrante:', {
                        id_remnant: sob.id_remnant,
                        id_item_padre: sob.id_item_padre,
                        id_item_padre_type: typeof sob.id_item_padre,
                        altura_m: sob.altura_m,
                        ancho_m: sob.ancho_m,
                        area_m2: area_m2,
                        umbral: umbral
                    });

                    let idItemPadre = sob.id_item_padre;
                    
                    // DEBUG: Log the original value and its type
                    logger.info('=== PARSING DEBUG START ===');
                    logger.info('Original id_item_padre:', { 
                        value: idItemPadre, 
                        type: typeof idItemPadre, 
                        isNull: idItemPadre === null,
                        isUndefined: idItemPadre === undefined,
                        stringified: JSON.stringify(idItemPadre)
                    });
                    
                    // Enhanced parsing logic to handle all possible cases
                    if (typeof idItemPadre === 'object' && idItemPadre !== null) {
                        // If it's already a JSON object, extract the id_item
                        logger.info('Processing as object:', { 
                            hasIdItem: 'id_item' in idItemPadre,
                            hasIdItemPadre: 'id_item_padre' in idItemPadre,
                            keys: Object.keys(idItemPadre)
                        });
                        idItemPadre = idItemPadre.id_item || idItemPadre.id_item_padre;
                        logger.info('Extracted from object:', { idItemPadre });
                    } else if (typeof idItemPadre === 'string') {
                        // If it's a string, check if it's JSON
                        logger.info('Processing as string:', { 
                            length: idItemPadre.length,
                            startsWithBrace: idItemPadre.startsWith('{'),
                            value: idItemPadre
                        });
                        if (idItemPadre.startsWith('{')) {
                            try {
                                const parsed = JSON.parse(idItemPadre);
                                logger.info('Successfully parsed JSON:', { parsed });
                                idItemPadre = parsed.id_item || parsed.id_item_padre;
                                logger.info('Extracted from parsed JSON:', { idItemPadre });
                            } catch (e) {
                                logger.error('Failed to parse id_item_padre string:', { id_item_padre: idItemPadre, error: e.message });
                            }
                        }
                    } else {
                        logger.info('Processing as other type:', { type: typeof idItemPadre, value: idItemPadre });
                    }
                    
                    // Convert to integer
                    const beforeParseInt = idItemPadre;
                    idItemPadre = parseInt(idItemPadre, 10);
                    logger.info('After parseInt:', { 
                        before: beforeParseInt, 
                        after: idItemPadre, 
                        isNaN: isNaN(idItemPadre),
                        isInteger: Number.isInteger(idItemPadre)
                    });
                    
                    if (!idItemPadre || isNaN(idItemPadre)) {
                        logger.error('Invalid id_item_padre after parsing:', { 
                            original: sob.id_item_padre, 
                            extracted: idItemPadre,
                            beforeParseInt: beforeParseInt
                        });
                        logger.info('=== PARSING DEBUG END (INVALID) ===');
                        continue;
                    }
                    
                    logger.info('=== PARSING DEBUG END (SUCCESS) ===');
                    logger.info('Final idItemPadre to insert into movimiento_inventario:', { idItemPadre });

                    if (area_m2 >= umbral) {
                        const parentPano = await trx('pano').where('id_item', idItemPadre).first();
                        if (!parentPano) {
                            logger.error('Parent pano not found:', { id_item_padre: idItemPadre });
                            continue; // Skip this sobrante
                        }

                        const [new_id] = await trx('pano').insert({
                            id_mcr: parentPano.id_mcr,
                            largo_m: sob.altura_m,
                            ancho_m: sob.ancho_m,
                            estado: parentPano.estado, // Heredar estado del paño padre
                            ubicacion: parentPano.ubicacion, // Heredar ubicación del paño padre
                            precio_x_unidad: parentPano.precio_x_unidad, // Heredar precio del paño padre
                            stock_minimo: parentPano.stock_minimo, // Heredar stock mínimo del paño padre
                            estado_trabajo: 'Libre'
                        }).returning('id_item');
                        
                        // DEBUG: Log the new_id value and type
                        logger.info('New pano created - new_id:', { 
                            new_id: new_id, 
                            type: typeof new_id,
                            isObject: typeof new_id === 'object',
                            stringified: JSON.stringify(new_id)
                        });
                        
                        // Extract id_item if it's an object
                        let finalNewId = new_id;
                        if (typeof new_id === 'object' && new_id !== null) {
                            finalNewId = new_id.id_item || new_id.id;
                            logger.info('Extracted id_item from object:', { 
                                original: new_id, 
                                extracted: finalNewId 
                            });
                        }
                        
                        // Convert to integer
                        finalNewId = parseInt(finalNewId, 10);
                        logger.info('Final new_id after parsing:', { 
                            finalNewId: finalNewId,
                            isInteger: Number.isInteger(finalNewId)
                        });
                        
                        // Debug: Log the exact data being inserted
                            const movimientoData = {
                            tipo_mov: 'AJUSTE_IN',
                                cantidad: area_m2,
                            unidad: 'm²',
                            notas: 'Remanente migrado',
                                id_item: finalNewId,
                            id_op: job.id_op,
                            id_usuario: id
                            };
                            
                            // FAILSAFE: Validate id_item before insertion
                            if (typeof movimientoData.id_item !== 'number' || !Number.isInteger(movimientoData.id_item)) {
                                logger.error('!!! FAILSAFE TRIGGERED: Invalid id_item in AJUSTE_IN (individual):', {
                                    id_item: movimientoData.id_item,
                                    type: typeof movimientoData.id_item,
                                    isInteger: Number.isInteger(movimientoData.id_item)
                                });
                                throw new Error(`Invalid id_item for AJUSTE_IN (individual): ${movimientoData.id_item} (type: ${typeof movimientoData.id_item})`);
                            }
                            
                            logger.info('Inserting movimiento_inventario (AJUSTE_IN) - individual:', movimientoData);
                            
                            await trx('movimiento_inventario').insert(movimientoData);
                    } else {
                            // Debug: Log the exact data being inserted
                            const movimientoData = {
                            tipo_mov: 'AJUSTE_OUT',
                                cantidad: area_m2,
                            unidad: 'm²',
                            notas: 'Desperdicio remanente',
                                id_item: idItemPadre,
                            id_op: job.id_op,
                            id_usuario: id
                            };
                            
                            // FAILSAFE: Validate id_item before insertion
                            if (typeof movimientoData.id_item !== 'number' || !Number.isInteger(movimientoData.id_item)) {
                                logger.error('!!! FAILSAFE TRIGGERED: Invalid id_item in AJUSTE_OUT (individual):', {
                                    id_item: movimientoData.id_item,
                                    type: typeof movimientoData.id_item,
                                    isInteger: Number.isInteger(movimientoData.id_item)
                                });
                                throw new Error(`Invalid id_item for AJUSTE_OUT (individual): ${movimientoData.id_item} (type: ${typeof movimientoData.id_item})`);
                            }
                            
                            logger.info('Inserting movimiento_inventario (AJUSTE_OUT) - individual:', movimientoData);
                            
                            await trx('movimiento_inventario').insert(movimientoData);
                    }
                    await trx('panos_sobrantes')
                        .where('id_remnant', sob.id_remnant)
                        .update({ estado: 'Migrado' });
                }
                
                // Check if all jobs done, set orden to 'completada'
                const pendingJobs = await trx('trabajo_corte')
                    .where('id_op', job.id_op)
                    .whereNotIn('estado', ['Confirmado', 'Desviado'])
                    .count('* as count')
                    .first();
                    
                if (pendingJobs.count === 0) {
                    await trx('orden_produccion').where('id_op', job.id_op).update({ estado: 'completada' });
                    
                    // Liberar todos los paños de esta orden ya que está completada
                    await trx('pano')
                        .whereIn('id_item', function() {
                            this.select('id_item').from('trabajo_corte').where('id_op', job.id_op);
                        })
                        .update({ 
                            estado_trabajo: 'Libre',
                            updated_at: db.fn.now()
                        });
                    
                    logger.info('Order completed - all paños liberated:', {
                        orden_id: job.id_op
                    });
                    
                    // Materials are already discounted when order was approved
                    // Only panos are processed during cut completion
                    logger.info('Order completed - materials already discounted on approval:', {
                        orden_id: job.id_op
                    });
                }
            } else {
                // Mark as deviated - requires admin approval
                await trx('trabajo_corte').where('job_id', job_id).update({ 
                    estado: 'Desviado', 
                    completed_at: db.fn.now() 
                });
                
                logger.info('Job marked as deviated - requires admin approval:', {
                    job_id: job_id,
                    delta_pct: delta_pct.toFixed(2),
                    tolerance: tolerance
                });
            }

            await trx.commit();
            res.json({ success: true, message: 'Cortes submetidos y procesados' });
        } catch (error) {
            await trx.rollback();
            logger.error('Error en submitActualCuts:', error);
            throw error;
        }
    },

    // Nueva: Obtener información detallada de cortes para una orden específica
    getOrderCutDetails: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { id } = req.user;
            
            // Verificar que la orden existe (no filter by estado to allow both pending and completed)
            const order = await db('orden_produccion as op')
                .leftJoin('cliente as c', 'op.id_cliente', 'c.id_cliente')
                .where('op.id_op', orderId)
                .select(
                    'op.*',
                    'c.nombre_cliente',
                    'c.email_cliente as cliente_email',
                    'c.telefono_cliente as cliente_telefono'
                )
                .first();
            
            if (!order) {
                throw new NotFoundError('Orden de producción no encontrada');
            }

            // Obtener trabajos de corte para esta orden (both pending and completed)
            const cutJobs = await db('trabajo_corte as tc')
                .leftJoin('pano as p', 'tc.id_item', 'p.id_item')
                .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
                .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
                .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
                .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
                .where('tc.id_op', orderId)
                .where('tc.id_operador', id)
                .whereIn('tc.estado', ['En progreso', 'Confirmado', 'Desviado'])
                .select(
                    'tc.job_id',
                    'tc.altura_req',
                    'tc.ancho_req',
                    'tc.area_req',
                    'tc.estado',
                    'tc.created_at',
                    'tc.completed_at',
                    'p.id_item',
                    'p.largo_m as pano_largo',
                    'p.ancho_m as pano_ancho',
                    'p.area_m2 as pano_area',
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
                )
                .orderBy('tc.created_at', 'asc');

            if (cutJobs.length === 0) {
                throw new NotFoundError('No hay trabajos de corte asignados a este operador para esta orden');
            }

            // Obtener planes de corte para cada trabajo
            for (const job of cutJobs) {
                job.plans = await db('plan_corte_pieza')
                    .where('job_id', job.job_id)
                    .orderBy('seq')
                    .select('*');
                
                // Obtener cortes reales ya registrados (si existen)
                job.real_cuts = await db('real_corte_pieza')
                    .where('job_id', job.job_id)
                    .orderBy('seq')
                    .select('*');
            }

            res.json({ 
                success: true, 
                data: {
                    order,
                    cut_jobs: cutJobs
                }
            });
        } catch (error) {
            logger.error('Error obteniendo detalles de corte de orden:', error);
            throw error;
        }
    },

    // Nueva: Enviar cortes individuales para un trabajo específico
    submitIndividualCut: async (req, res) => {
        logger.info('DEBUG_MARKER: submitIndividualCut handler is running');
        logger.info('DEBUG_VERSION:', ordenesController._debugVersion);
        const { job_id, actual_pieces } = req.body;
        const { id } = req.user;
        const trx = await db.transaction();
        try {
            const job = await trx('trabajo_corte').where('job_id', job_id).first();
            if (!job || job.id_operador !== id) {
                throw new ValidationError('Trabajo no encontrado o no asignado');
            }

            // Check if pieces already exist to prevent duplicates
            const existingPieces = await trx('real_corte_pieza')
                .where('job_id', job_id)
                .select('seq');
            
            const existingSeqs = existingPieces.map(p => p.seq);
            logger.info('Existing pieces for job (individual):', { job_id, existingSeqs });
            
            // Filter out pieces that already exist
            const newPieces = actual_pieces.filter(piece => !existingSeqs.includes(piece.seq));
            logger.info('New pieces to insert (individual):', { job_id, newPieces: newPieces.map(p => p.seq) });
            
            if (newPieces.length === 0) {
                logger.info('No new pieces to insert (individual), all pieces already exist');
                // Continue with the rest of the logic even if no new pieces
            } else {
                // Insert only new real_corte_pieza for individual pieces
                for (const piece of newPieces) {
                    await trx('real_corte_pieza').insert({
                        job_id,
                        seq: piece.seq,
                        altura_real: piece.altura_real,
                        ancho_real: piece.ancho_real
                    });
                }
            }

            // Check if all pieces for this job have been submitted
            const plans = await trx('plan_corte_pieza').where('job_id', job_id).select('*');
            const reals = await trx('real_corte_pieza').where('job_id', job_id).select('*');

            const conteo_esperado = plans.length;
            const conteo_real = reals.length;
            const area_esperada = plans.reduce((sum, p) => sum + p.altura_plan * p.ancho_plan, 0);
            const area_real = reals.reduce((sum, r) => sum + r.altura_real * r.ancho_real, 0);
            
            // Fix: Cap delta_pct to prevent numeric overflow (max 999.9999)
            let delta_pct = 0;
            if (area_esperada > 0) {
                delta_pct = Math.abs((area_real - area_esperada) / area_esperada) * 100;
                // Cap at 999.9999 to prevent numeric overflow
                delta_pct = Math.min(delta_pct, 999.9999);
            }

            const tolerance = 5; // %
            const withinTolerance = delta_pct <= tolerance && conteo_real === conteo_esperado;

            // Only process if all pieces are submitted
            if (conteo_real === conteo_esperado) {
                // Insert reporte_variacion
                await trx('reporte_variacion').insert({
                    job_id,
                    conteo_esperado,
                    area_esperada,
                    conteo_real,
                    area_real,
                    delta_pct,
                    resolucion: withinTolerance ? 'Anulado' : 'Abrir',
                    resolved_by: withinTolerance ? id : null,
                    resolved_at: withinTolerance ? db.fn.now() : null,
                    old_status: job.estado,
                    new_status: withinTolerance ? 'Confirmado' : 'Desviado'
                });

                if (withinTolerance) {
                    await trx('trabajo_corte').where('job_id', job_id).update({ 
                        estado: 'Confirmado', 
                        completed_at: db.fn.now() 
                    });
                    
                    // DISCOUNT PANO FROM INVENTORY WHEN CUT IS COMPLETED (INDIVIDUAL)
                    const panoOriginal = await trx('pano').where('id_item', job.id_item).first();
                    if (panoOriginal) {
                        // Calculate area consumed (requested area)
                        const areaConsumida = job.altura_req * job.ancho_req;
                        
                        // Register pano consumption movement
                        await trx('movimiento_inventario').insert({
                            id_item: job.id_item,
                            tipo_mov: 'CONSUMO',
                            cantidad: areaConsumida,
                            unidad: 'm²',
                            notas: `Consumo de paño para corte individual: ${job.altura_req}m x ${job.ancho_req}m = ${areaConsumida.toFixed(2)}m²`,
                            id_op: job.id_op,
                            id_usuario: id
                        });
                        
                        // Update pano dimensions (subtract consumed area)
                        const nuevaArea = Math.max(0, panoOriginal.area_m2 - areaConsumida);
                        
                        // Since area_m2 is a generated column, we need to update largo_m and ancho_m instead
                        // Calculate new dimensions based on remaining area
                        let nuevoLargo = panoOriginal.largo_m;
                        let nuevoAncho = panoOriginal.ancho_m;
                        
                        if (nuevaArea > 0) {
                            // Keep the same proportions but reduce the area
                            const factor = Math.sqrt(nuevaArea / panoOriginal.area_m2);
                            nuevoLargo = panoOriginal.largo_m * factor;
                            nuevoAncho = panoOriginal.ancho_m * factor;
                        } else {
                            // If no area left, set to minimum values
                            nuevoLargo = 0.01;
                            nuevoAncho = 0.01;
                        }
                        
                        await trx('pano')
                            .where('id_item', job.id_item)
                            .update({
                                largo_m: nuevoLargo,
                                ancho_m: nuevoAncho,
                                // CORRECCIÓN: El paño padre siempre se consume cuando se hace un corte
                                // ya que se convierte en remanentes más pequeños
                                estado_trabajo: 'Consumido',
                                updated_at: db.fn.now()
                            });
                        
                        logger.info('Pano discounted on individual cut completion:', {
                            pano_id: job.id_item,
                            area_consumida: areaConsumida,
                            area_restante: nuevaArea,
                            job_id: job_id,
                            orden_id: job.id_op
                        });
                    }
                    
                    // Migrar remanentes válidos a pano
                    const sobrantes = await trx('panos_sobrantes')
                        .where('id_op', job.id_op)
                        .where('estado', 'Pendiente');
                    
                    logger.info('Number of sobrantes found (individual):', sobrantes.length);
                    
                    for (const sob of sobrantes) {
                        // Calculate area from dimensions
                        const area_m2 = parseFloat(sob.altura_m || 0) * parseFloat(sob.ancho_m || 0);
                        const umbral = job.umbral_sobrante_m2 || 5.0; // Default to 5.0 m² if not defined
                        
                        // Debug logging
                        logger.info('Processing sobrante (individual):', {
                            id_remnant: sob.id_remnant,
                            id_item_padre: sob.id_item_padre,
                            id_item_padre_type: typeof sob.id_item_padre,
                            altura_m: sob.altura_m,
                            ancho_m: sob.ancho_m,
                            area_m2: area_m2,
                            umbral: umbral
                        });

                        let idItemPadre = sob.id_item_padre;
                        
                        // DEBUG: Log the original value and its type
                        logger.info('=== PARSING DEBUG START (INDIVIDUAL) ===');
                        logger.info('Original id_item_padre (individual):', { 
                            value: idItemPadre, 
                            type: typeof idItemPadre, 
                            isNull: idItemPadre === null,
                            isUndefined: idItemPadre === undefined,
                            stringified: JSON.stringify(idItemPadre)
                        });
                        
                        // Enhanced parsing logic to handle all possible cases
                        if (typeof idItemPadre === 'object' && idItemPadre !== null) {
                            // If it's already a JSON object, extract the id_item
                            logger.info('Processing as object (individual):', { 
                                hasIdItem: 'id_item' in idItemPadre,
                                hasIdItemPadre: 'id_item_padre' in idItemPadre,
                                keys: Object.keys(idItemPadre)
                            });
                            idItemPadre = idItemPadre.id_item || idItemPadre.id_item_padre;
                            logger.info('Extracted from object (individual):', { idItemPadre });
                        } else if (typeof idItemPadre === 'string') {
                            // If it's a string, check if it's JSON
                            logger.info('Processing as string (individual):', { 
                                length: idItemPadre.length,
                                startsWithBrace: idItemPadre.startsWith('{'),
                                value: idItemPadre
                            });
                            if (idItemPadre.startsWith('{')) {
                                try {
                                    const parsed = JSON.parse(idItemPadre);
                                    logger.info('Successfully parsed JSON (individual):', { parsed });
                                    idItemPadre = parsed.id_item || parsed.id_item_padre;
                                    logger.info('Extracted from parsed JSON (individual):', { idItemPadre });
                                } catch (e) {
                                    logger.error('Failed to parse id_item_padre string (individual):', { id_item_padre: idItemPadre, error: e.message });
                                }
                            }
                        } else {
                            logger.info('Processing as other type (individual):', { type: typeof idItemPadre, value: idItemPadre });
                        }
                        
                        // Convert to integer
                        const beforeParseInt = idItemPadre;
                        idItemPadre = parseInt(idItemPadre, 10);
                        logger.info('After parseInt (individual):', { 
                            before: beforeParseInt, 
                            after: idItemPadre, 
                            isNaN: isNaN(idItemPadre),
                            isInteger: Number.isInteger(idItemPadre)
                        });
                        
                        if (!idItemPadre || isNaN(idItemPadre)) {
                            logger.error('Invalid id_item_padre after parsing (individual):', { 
                                original: sob.id_item_padre, 
                                extracted: idItemPadre,
                                beforeParseInt: beforeParseInt
                            });
                            logger.info('=== PARSING DEBUG END (INVALID) ===');
                            continue;
                        }
                        
                        logger.info('=== PARSING DEBUG END (SUCCESS) ===');
                        logger.info('Final idItemPadre to insert into movimiento_inventario (individual):', { idItemPadre });

                        if (area_m2 >= umbral) {
                            const parentPano = await trx('pano').where('id_item', idItemPadre).first();
                            if (!parentPano) {
                                logger.error('Parent pano not found (individual):', { id_item_padre: idItemPadre });
                                continue; // Skip this sobrante
                            }

                            const [new_id] = await trx('pano').insert({
                                id_mcr: parentPano.id_mcr,
                                largo_m: sob.altura_m,
                                ancho_m: sob.ancho_m,
                                estado: parentPano.estado, // Heredar estado del paño padre
                                ubicacion: parentPano.ubicacion, // Heredar ubicación del paño padre
                                precio_x_unidad: parentPano.precio_x_unidad, // Heredar precio del paño padre
                                stock_minimo: parentPano.stock_minimo, // Heredar stock mínimo del paño padre
                                estado_trabajo: 'Libre'
                            }).returning('id_item');
                            
                            // DEBUG: Log the new_id value and type
                            logger.info('New pano created - new_id:', { 
                                new_id: new_id, 
                                type: typeof new_id,
                                isObject: typeof new_id === 'object',
                                stringified: JSON.stringify(new_id)
                            });
                            
                            // Extract id_item if it's an object
                            let finalNewId = new_id;
                            if (typeof new_id === 'object' && new_id !== null) {
                                finalNewId = new_id.id_item || new_id.id;
                                logger.info('Extracted id_item from object:', { 
                                    original: new_id, 
                                    extracted: finalNewId 
                                });
                            }
                            
                            // Convert to integer
                            finalNewId = parseInt(finalNewId, 10);
                            logger.info('Final new_id after parsing:', { 
                                finalNewId: finalNewId,
                                isInteger: Number.isInteger(finalNewId)
                            });
                            
                            // Debug: Log the exact data being inserted
                            const movimientoData = {
                                tipo_mov: 'AJUSTE_IN',
                                cantidad: area_m2,
                                unidad: 'm²',
                                notas: 'Remanente migrado',
                                id_item: finalNewId,
                                id_op: job.id_op,
                                id_usuario: id
                            };
                            
                            // FAILSAFE: Validate id_item before insertion
                            if (typeof movimientoData.id_item !== 'number' || !Number.isInteger(movimientoData.id_item)) {
                                logger.error('!!! FAILSAFE TRIGGERED: Invalid id_item in AJUSTE_IN:', {
                                    id_item: movimientoData.id_item,
                                    type: typeof movimientoData.id_item,
                                    isInteger: Number.isInteger(movimientoData.id_item)
                                });
                                throw new Error(`Invalid id_item for AJUSTE_IN: ${movimientoData.id_item} (type: ${typeof movimientoData.id_item})`);
                            }
                            
                            logger.info('Inserting movimiento_inventario (AJUSTE_IN):', movimientoData);
                            
                            await trx('movimiento_inventario').insert(movimientoData);
                        } else {
                            // Debug: Log the exact data being inserted
                            const movimientoData = {
                                tipo_mov: 'AJUSTE_OUT',
                                cantidad: area_m2,
                                unidad: 'm²',
                                notas: 'Desperdicio remanente',
                                id_item: idItemPadre,
                                id_op: job.id_op,
                                id_usuario: id
                            };
                            
                            // FAILSAFE: Validate id_item before insertion
                            if (typeof movimientoData.id_item !== 'number' || !Number.isInteger(movimientoData.id_item)) {
                                logger.error('!!! FAILSAFE TRIGGERED: Invalid id_item in AJUSTE_OUT:', {
                                    id_item: movimientoData.id_item,
                                    type: typeof movimientoData.id_item,
                                    isInteger: Number.isInteger(movimientoData.id_item)
                                });
                                throw new Error(`Invalid id_item for AJUSTE_OUT: ${movimientoData.id_item} (type: ${typeof movimientoData.id_item})`);
                            }
                            
                            logger.info('Inserting movimiento_inventario (AJUSTE_OUT):', movimientoData);
                            
                            await trx('movimiento_inventario').insert(movimientoData);
                        }
                        await trx('panos_sobrantes')
                            .where('id_remnant', sob.id_remnant)
                            .update({ estado: 'Migrado' });
                    }
                    
                    // Check if all jobs done, set orden to 'completada'
                    const pendingJobs = await trx('trabajo_corte')
                        .where('id_op', job.id_op)
                        .whereNotIn('estado', ['Confirmado', 'Desviado'])
                        .count('* as count')
                        .first();
                        
                    if (pendingJobs.count === 0) {
                        await trx('orden_produccion').where('id_op', job.id_op).update({ estado: 'completada' });
                        
                        // Liberar todos los paños de esta orden ya que está completada
                        await trx('pano')
                            .whereIn('id_item', function() {
                                this.select('id_item').from('trabajo_corte').where('id_op', job.id_op);
                            })
                            .update({ 
                                estado_trabajo: 'Libre',
                                updated_at: db.fn.now()
                            });
                        
                        logger.info('Order completed - all paños liberated:', {
                            orden_id: job.id_op
                        });
                        
                        // Materials are already discounted when order was approved
                        // Only panos are processed during cut completion
                        logger.info('Order completed - materials already discounted on approval:', {
                            orden_id: job.id_op
                        });
                    }
                } else {
                    // Mark as deviated - requires admin approval
                    await trx('trabajo_corte').where('job_id', job_id).update({ 
                        estado: 'Desviado', 
                        completed_at: db.fn.now() 
                    });
                    
                    logger.info('Job marked as deviated - requires admin approval:', {
                        job_id: job_id,
                        delta_pct: delta_pct.toFixed(2),
                        tolerance: tolerance
                    });
                }
            }

            await trx.commit();
            res.json({ 
                success: true, 
                message: 'Cortes individuales submetidos',
                job_completed: conteo_real === conteo_esperado,
                within_tolerance: withinTolerance,
                job_status: conteo_real === conteo_esperado ? (withinTolerance ? 'Confirmado' : 'Desviado') : 'En progreso',
                tolerance_info: {
                    delta_percentage: delta_pct.toFixed(2),
                    tolerance_limit: tolerance,
                    area_expected: area_esperada.toFixed(2),
                    area_actual: area_real.toFixed(2),
                    pieces_expected: conteo_esperado,
                    pieces_actual: conteo_real
                }
            });
        } catch (error) {
            await trx.rollback();
            logger.error('Error en submitIndividualCut:', error);
            throw error;
        }
    },

    // Endpoint para verificar el estado de modo_corte en trabajo_corte
    checkTrabajoCorteModo: async (req, res) => {
        try {
            const stats = await db('trabajo_corte')
                .select('modo_corte')
                .count('* as count')
                .groupBy('modo_corte');

            const total = await db('trabajo_corte').count('* as total').first();
            
            res.json({
                total_trabajos: total.total,
                distribucion_modo_corte: stats,
                mensaje: 'Estadísticas de modo_corte en trabajo_corte'
            });
        } catch (error) {
            logger.error('Error verificando modo_corte:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    },

    // Endpoint para obtener trabajos de corte de una orden específica
    getTrabajosCorte: async (req, res) => {
        try {
            const { id } = req.params;
            
            const trabajos = await db('trabajo_corte as tc')
                .where('tc.id_op', id)
                .select('tc.*')
                .orderBy('tc.order_seq');

            // Obtener cortes individuales para cada trabajo
            for (const trabajo of trabajos) {
                trabajo.cortes_individuales = await db('cortes_individuales')
                    .where('job_id', trabajo.job_id)
                    .orderBy('seq')
                    .select('*');
            }

            res.json(trabajos);
        } catch (error) {
            logger.error('Error obteniendo trabajos de corte:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
};

module.exports = ordenesController;