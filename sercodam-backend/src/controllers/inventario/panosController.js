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

const panosController = {
    // Función auxiliar para generar especificaciones formateadas
    generateSpecifications: (pano) => {
        const specs = [];
        
        // Log temporal para debug
        console.log('🔍 generateSpecifications - Datos recibidos:', {
            tipo_red: pano.tipo_red,
            calibre: pano.calibre,
            cuadro: pano.cuadro,
            torsion: pano.torsion,
            refuerzo: pano.refuerzo,
            color: pano.color,
            presentacion: pano.presentacion,
            grosor: pano.grosor,
            color_tipo_red: pano.color_tipo_red
        });
        
        switch (pano.tipo_red?.toLowerCase()) {
            case 'nylon':
                if (pano.calibre) specs.push(`Calibre: ${pano.calibre}`);
                if (pano.cuadro) specs.push(`Cuadro: ${pano.cuadro}`);
                if (pano.torsion) specs.push(`Torsión: ${pano.torsion}`);
                if (pano.refuerzo !== undefined && pano.refuerzo !== null) {
                    specs.push(`Refuerzo: ${pano.refuerzo === true || pano.refuerzo === 't' ? 'Sí' : 'No'}`);
                }
                break;
            case 'lona':
                if (pano.color) specs.push(`Color: ${pano.color}`);
                if (pano.presentacion) specs.push(`Presentación: ${pano.presentacion}`);
                break;
            case 'polipropileno':
                if (pano.grosor) specs.push(`Grosor: ${pano.grosor}`);
                if (pano.cuadro) specs.push(`Cuadro: ${pano.cuadro}`);
                break;
            case 'malla sombra':
                if (pano.color_tipo_red) specs.push(`Color/Tipo: ${pano.color_tipo_red}`);
                if (pano.presentacion) specs.push(`Presentación: ${pano.presentacion}`);
                break;
        }
        
        const result = specs.join('\n');
        console.log('🔍 generateSpecifications - Resultado:', result || '(vacío)');
        return result;
    },

    // POST /api/v1/inventario/panos/calculate-dimensions - Calcular dimensiones recomendadas
    calculateRecommendedDimensions: async (req, res) => {
        try {
            console.log('🔍 calculateRecommendedDimensions llamado con:', req.body);
            
            const { id_item, cortes_individuales } = req.body;
            
            if (!id_item || !cortes_individuales || !Array.isArray(cortes_individuales)) {
                console.log('❌ Validación fallida:', { id_item, cortes_individuales });
                return res.status(400).json({
                    success: false,
                    message: 'Se requiere id_item y cortes_individuales válidos'
                });
            }

            // Obtener información del paño
            console.log('🔍 Buscando paño con id_item:', id_item);
            const pano = await db('pano').where('id_item', id_item).first();
            if (!pano) {
                console.log('❌ Paño no encontrado para id_item:', id_item);
                return res.status(404).json({
                    success: false,
                    message: 'Paño no encontrado'
                });
            }
            console.log('✅ Paño encontrado:', pano);

            // Calcular área total de los cortes
            console.log('🔍 Calculando área total de cortes:', cortes_individuales);
            const areaTotal = cortes_individuales.reduce((total, corte) => {
                const largo = parseFloat(corte.largo) || 0;
                const ancho = parseFloat(corte.ancho) || 0;
                const cantidad = parseInt(corte.cantidad) || 1;
                const areaCorte = largo * ancho * cantidad;
                console.log(`  Corte: ${largo}x${ancho}x${cantidad} = ${areaCorte} m²`);
                return total + areaCorte;
            }, 0);
            console.log('✅ Área total calculada:', areaTotal);

            // Validar que el área total no exceda el área del paño
            const areaPano = parseFloat(pano.area_m2) || 0;
            console.log('🔍 Comparando áreas - Total requerida:', areaTotal, 'vs Disponible:', areaPano);
            
            if (areaTotal > areaPano) {
                console.log('❌ Área excede lo disponible');
                return res.status(400).json({
                    success: false,
                    message: `El área total requerida (${areaTotal.toFixed(2)} m²) excede el área disponible del paño (${areaPano.toFixed(2)} m²)`
                });
            }

            // Calcular dimensiones recomendadas
            console.log('🔍 Calculando dimensiones recomendadas...');
            const dimensionesRecomendadas = panosController.calculateRecommendedDimensionsHelper(pano, areaTotal);
            console.log('✅ Dimensiones recomendadas:', dimensionesRecomendadas);

            const response = {
                success: true,
                data: {
                    areaTotal,
                    dimensionesRecomendadas,
                    areaPano,
                    utilizacion: ((areaTotal / areaPano) * 100).toFixed(1)
                }
            };
            
            console.log('📤 Enviando respuesta:', response);
            res.json(response);

        } catch (error) {
            logger.error('Error calculando dimensiones recomendadas:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    },

    // GET /api/v1/inventario/panos - Obtener paños con filtros
    getPanos: async (req, res) => {
        try {
            const {
                tipo_red,
                estado,
                ubicacion,
                area_min,
                area_max,
                largo_min,
                largo_max,
                ancho_min,
                ancho_max,
                search,
                // Filtros de especificaciones por tipo de red
                calibre,
                cuadro,
                torsion,
                refuerzo,
                color,
                presentacion,
                grosor,
                color_tipo_red,
                page = 1,
                limit = 50
            } = req.query;

            // Función para construir la consulta base con JOINs a las tablas hijas
            const buildBaseQuery = () => {
                console.log('🔍 buildBaseQuery - Filtros de especificaciones recibidos:', {
                    calibre, cuadro, torsion, refuerzo, color, presentacion, grosor, color_tipo_red
                });

                let query = db('pano as p')
                    .select(
                        'p.*',
                        'rp.tipo_red',
                        'rp.unidad',
                        'rp.marca',
                        'rp.descripcion',
                        // Campos específicos de nylon
                        'n.calibre',
                        'n.cuadro',
                        'n.torsion',
                        'n.refuerzo',
                        // Campos específicos de lona
                        'l.color',
                        'l.presentacion',
                        // Campos específicos de polipropileno
                        'pp.grosor',
                        'pp.cuadro as pp_cuadro',
                        // Campos específicos de malla sombra
                        'ms.color_tipo_red',
                        'ms.presentacion as ms_presentacion'
                    )
                    .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                    .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
                    .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
                    .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
                    .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr');

                // Aplicar filtros básicos
                if (tipo_red) {
                    query = query.whereRaw('LOWER(rp.tipo_red) = ?', [tipo_red.toLowerCase()]);
            }
            if (estado) {
                    query = query.where('p.estado', estado);
            }
            if (ubicacion) {
                    query = query.where('p.ubicacion', ubicacion);
            }
            if (area_min) {
                    query = query.where('p.area_m2', '>=', parseFloat(area_min));
            }
            if (area_max) {
                    query = query.where('p.area_m2', '<=', parseFloat(area_max));
                }
                if (largo_min) {
                    query = query.where('p.largo_m', '>=', parseFloat(largo_min));
                }
                if (largo_max) {
                    query = query.where('p.largo_m', '<=', parseFloat(largo_max));
                }
                if (ancho_min) {
                    query = query.where('p.ancho_m', '>=', parseFloat(ancho_min));
                }
                if (ancho_max) {
                    query = query.where('p.ancho_m', '<=', parseFloat(ancho_max));
                }
                if (search) {
                    query = query.where(function() {
                        this.where('rp.descripcion', 'ilike', `%${search}%`)
                            .orWhere('p.ubicacion', 'ilike', `%${search}%`);
                        
                        // Para id_item, verificar si es un número y hacer comparación numérica
                        const searchNum = parseInt(search);
                        if (!isNaN(searchNum)) {
                            this.orWhere('p.id_item', searchNum);
                        }
                    });
                }

                // Filtros de especificaciones por tipo de red
                if (calibre) {
                    console.log('🔍 Aplicando filtro calibre:', calibre);
                    query = query.where('n.calibre', calibre);
                }
                if (cuadro) {
                    console.log('🔍 Aplicando filtro cuadro:', cuadro);
                    query = query.where(function() {
                        this.where('n.cuadro', cuadro)
                            .orWhere('pp.cuadro', cuadro);
                    });
                }
                if (torsion) {
                    console.log('🔍 Aplicando filtro torsion:', torsion);
                    query = query.where('n.torsion', torsion);
                }
                if (refuerzo !== undefined && refuerzo !== null && refuerzo !== '') {
                    const refuerzoBool = refuerzo === 'true' || refuerzo === 'Sí' || refuerzo === 'sí';
                    console.log('🔍 Aplicando filtro refuerzo:', refuerzo, '->', refuerzoBool);
                    query = query.where('n.refuerzo', refuerzoBool);
                }
                if (color) {
                    console.log('🔍 Aplicando filtro color:', color);
                    query = query.where('l.color', color);
                }
                if (presentacion) {
                    console.log('🔍 Aplicando filtro presentacion:', presentacion);
                    query = query.where(function() {
                        this.where('l.presentacion', presentacion)
                            .orWhere('ms.presentacion', presentacion);
                    });
                }
                if (grosor) {
                    console.log('🔍 Aplicando filtro grosor:', grosor);
                    query = query.where('pp.grosor', grosor);
                }
                if (color_tipo_red) {
                    console.log('🔍 Aplicando filtro color_tipo_red:', color_tipo_red);
                    query = query.where('ms.color_tipo_red', color_tipo_red);
                }

                console.log('🔍 buildBaseQuery - Consulta construida con todos los filtros');
                return query;
            };

            // Verificar si es una consulta sin paginación (limit >= 1000)
            const isNoPagination = parseInt(limit) >= 1000;

            let total = 0;
            let panos = [];

            if (isNoPagination) {
                // Consulta sin paginación
                const dataQuery = buildBaseQuery();
                panos = await dataQuery.orderBy('p.id_item', 'desc');
                total = panos.length;
                console.log('🔍 Consulta sin paginación - Resultados obtenidos:', total);
            } else {
                // Contar total para paginación (consulta separada y simple)
                try {
                    // Consulta simple de conteo sin JOINs complejos
                    const countResult = await db('pano').count('id_item as count').first();
                    total = parseInt(countResult.count || 0);
                    console.log('🔍 Total de paños encontrados:', total);
                } catch (countError) {
                    logger.warn('Error contando paños, usando 0:', countError.message);
                    console.error('❌ Error en conteo:', countError);
                    total = 0;
                }

                // Si no hay datos, devolver respuesta vacía
                if (total === 0) {
                    return res.json({
                success: true,
                        panos: [],
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                            total: 0,
                            totalPages: 0
                        }
                    });
                }

                // Obtener datos con paginación
                const dataQuery = buildBaseQuery();
                const offset = (page - 1) * limit;
                panos = await dataQuery
                    .orderBy('p.id_item', 'desc')
                    .limit(limit)
                    .offset(offset);
                console.log('🔍 Consulta con paginación - Resultados obtenidos:', panos.length);
            }

            const panosWithDetails = panos.map((pano) => {
                // Log temporal para debug
                console.log('🔍 Mapeando paño ID:', pano.id_item, 'Tipo:', pano.tipo_red);
                console.log('🔍 Datos RAW del paño:', {
                    calibre: pano.calibre,
                    cuadro: pano.cuadro,
                    pp_cuadro: pano.pp_cuadro,
                    torsion: pano.torsion,
                    refuerzo: pano.refuerzo,
                    color: pano.color,
                    presentacion: pano.presentacion,
                    ms_presentacion: pano.ms_presentacion,
                    grosor: pano.grosor,
                    color_tipo_red: pano.color_tipo_red
                });
                
                const result = {
                    id_item: pano.id_item,
                    id_mcr: pano.id_mcr,
                    largo_m: pano.largo_m,
                    ancho_m: pano.ancho_m,
                    area_m2: pano.area_m2,
                    estado: pano.estado,
                    ubicacion: pano.ubicacion,
                    precio_x_unidad: pano.precio_x_unidad,
                    created_at: pano.created_at,
                    updated_at: pano.updated_at,
                    tipo_red: pano.tipo_red,
                    unidad: pano.unidad,
                    marca: pano.marca,
                    descripcion: pano.descripcion,
                    stock_minimo: pano.stock_minimo,
                    estado_trabajo: pano.estado_trabajo,
                    // Campos específicos de nylon
                    calibre: pano.calibre,
                    cuadro: pano.cuadro || pano.pp_cuadro, // Usar el cuadro correspondiente
                    torsion: pano.torsion,
                    refuerzo: pano.refuerzo,
                    // Campos específicos de lona
                    color: pano.color,
                    presentacion: pano.presentacion || pano.ms_presentacion, // Usar la presentación correspondiente
                    // Campos específicos de polipropileno
                    grosor: pano.grosor,
                    // Campos específicos de malla sombra
                    color_tipo_red: pano.color_tipo_red
                };

                console.log('🔍 Datos mapeados:', {
                    calibre: result.calibre,
                    cuadro: result.cuadro,
                    torsion: result.torsion,
                    refuerzo: result.refuerzo,
                    color: result.color,
                    presentacion: result.presentacion,
                    grosor: result.grosor,
                    color_tipo_red: result.color_tipo_red
                });

                // Generar especificaciones formateadas
                result.especificaciones = panosController.generateSpecifications(result);

                return result;
            });

            const response = {
                success: true,
                panos: panosWithDetails
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
            logger.error('Error obteniendo paños:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/panos/:id - Obtener paño específico
    getPanoById: async (req, res) => {
        try {
            const { id } = req.params;

            // Verificar si existe la vista materializada
            const viewExists = await checkViewExists('mv_panos_resumen');
            let pano;
            
            if (viewExists) {
                pano = await db('mv_panos_resumen')
                    .where('id_item', id)
                    .first();
            } else {
                // Consulta con JOINs a las tablas hijas
                pano = await db('pano as p')
                    .select(
                        'p.*',
                        'rp.tipo_red',
                        'rp.unidad',
                        'rp.marca',
                        'rp.descripcion as descripcion_producto',
                        // Campos específicos de nylon
                        'n.calibre',
                        'n.cuadro',
                        'n.torsion',
                        'n.refuerzo',
                        // Campos específicos de lona
                        'l.color',
                        'l.presentacion',
                        // Campos específicos de polipropileno
                        'pp.grosor',
                        'pp.cuadro as pp_cuadro',
                        // Campos específicos de malla sombra
                        'ms.color_tipo_red',
                        'ms.presentacion as ms_presentacion'
                    )
                    .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
                    .leftJoin('nylon as n', 'p.id_mcr', 'n.id_mcr')
                    .leftJoin('lona as l', 'p.id_mcr', 'l.id_mcr')
                    .leftJoin('polipropileno as pp', 'p.id_mcr', 'pp.id_mcr')
                    .leftJoin('malla_sombra as ms', 'p.id_mcr', 'ms.id_mcr')
                    .where('p.id_item', id)
                    .first();
            }

            if (!pano) {
                throw new NotFoundError('Paño no encontrado');
            }

            // Si no es vista materializada, procesar los campos específicos
            if (!viewExists && pano) {
                pano = {
                    ...pano,
                    // Campos específicos de nylon
                    calibre: pano.calibre,
                    cuadro: pano.cuadro || pano.pp_cuadro,
                    torsion: pano.torsion,
                    refuerzo: pano.refuerzo,
                    // Campos específicos de lona
                    color: pano.color,
                    presentacion: pano.presentacion || pano.ms_presentacion,
                    // Campos específicos de polipropileno
                    grosor: pano.grosor,
                    // Campos específicos de malla sombra
                    color_tipo_red: pano.color_tipo_red
                };

                // Generar especificaciones formateadas
                pano.especificaciones = panosController.generateSpecifications(pano);
            }

            res.json({
                success: true,
                data: pano
            });

        } catch (error) {
            logger.error('Error obteniendo paño:', error);
            throw error;
        }
    },

    // POST /api/v1/inventario/panos - Crear nuevo paño
    createPano: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const {
                id_mcr, // Ahora recibimos el id_mcr del catálogo
                largo_m,
                ancho_m,
                estado,
                ubicacion,
                precio_x_unidad,
                stock_minimo
            } = req.body;

            // Validaciones básicas
            if (!id_mcr) {
                throw new ValidationError('El id_mcr es requerido');
            }

            const estadosValidos = ['bueno', 'regular', 'malo', 'usado 50%'];
            if (!estadosValidos.includes(estado)) {
                throw new ValidationError('Estado inválido');
            }

            // Validar largo y ancho
            if (!largo_m || parseFloat(largo_m) <= 0) {
                throw new ValidationError('El largo debe ser mayor a 0');
            }
            if (!ancho_m || parseFloat(ancho_m) <= 0) {
                throw new ValidationError('El ancho debe ser mayor a 0');
            }

            // Verificar que el id_mcr existe en red_producto
            const redProducto = await trx('red_producto')
                .where('id_mcr', id_mcr)
                .first();

            if (!redProducto) {
                throw new ValidationError('El tipo de red seleccionado no existe en el catálogo');
            }

            // Crear paño usando el id_mcr del catálogo
            const [id_item] = await trx('pano').insert({
                id_mcr, // Usar el id_mcr del catálogo
                largo_m: parseFloat(largo_m),
                ancho_m: parseFloat(ancho_m),
                estado,
                ubicacion,
                precio_x_unidad: parseFloat(precio_x_unidad || 0),
                created_at: db.fn.now(),
                updated_at: db.fn.now(),
                stock_minimo: parseFloat(stock_minimo || 0),
                estado_trabajo: 'Libre' // Establecer estado de trabajo por defecto
            }).returning('id_item');

            await trx.commit();

            res.status(201).json({
                success: true,
                message: 'Paño creado exitosamente',
                data: { id_item, id_mcr }
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error creando paño:', error);
            throw error;
        }
    },

    // PUT /api/v1/inventario/panos/:id - Actualizar paño
    updatePano: async (req, res) => {
        const trx = await db.transaction();

        try {
            const { id } = req.params;
            const {
                tipo_red,
                largo_m,
                ancho_m,
                estado,
                ubicacion,
                precio_x_unidad,
                descripcion,
                // Campos específicos por tipo
                calibre,
                cuadro,
                torsion,
                refuerzo,
                color,
                presentacion,
                grosor,
                stock_minimo
            } = req.body;

            console.log('🔍 Backend - Datos recibidos para actualizar paño ID:', id);
            console.log('🔍 Backend - Body completo:', req.body);
            console.log('🔍 Backend - Campos específicos:', { calibre, cuadro, torsion, refuerzo, color, presentacion, grosor });

            // Verificar que el paño existe
            const panoExistente = await trx('pano')
                .where('id_item', id)
                .first();

            if (!panoExistente) {
                throw new NotFoundError('Paño no encontrado');
            }

            // Obtener el registro de red_producto
            const redProducto = await trx('red_producto')
                .where('id_mcr', panoExistente.id_mcr)
                .first();

            if (!redProducto) {
                throw new NotFoundError('Producto de red no encontrado');
            }

            // Validaciones
            const tiposValidos = ['lona', 'nylon', 'polipropileno', 'malla sombra'];
            if (tipo_red && !tiposValidos.includes(tipo_red.toLowerCase())) {
                throw new ValidationError('Tipo de paño inválido');
            }

            const estadosValidos = ['bueno', 'regular', 'malo', 'usado 50%'];
            if (estado && !estadosValidos.includes(estado)) {
                throw new ValidationError('Estado inválido');
            }

            // Validar largo y ancho si se proporcionan
            if (largo_m !== undefined && (!largo_m || parseFloat(largo_m) <= 0)) {
                throw new ValidationError('El largo debe ser mayor a 0');
            }
            if (ancho_m !== undefined && (!ancho_m || parseFloat(ancho_m) <= 0)) {
                throw new ValidationError('El ancho debe ser mayor a 0');
            }

            // Actualizar tabla pano
            const updatePanoData = {};
            if (largo_m !== undefined) updatePanoData.largo_m = parseFloat(largo_m);
            if (ancho_m !== undefined) updatePanoData.ancho_m = parseFloat(ancho_m);
            if (estado) updatePanoData.estado = estado;
            if (ubicacion !== undefined) updatePanoData.ubicacion = ubicacion;
            if (precio_x_unidad !== undefined) updatePanoData.precio_x_unidad = parseFloat(precio_x_unidad);
            if (stock_minimo !== undefined) updatePanoData.stock_minimo = parseFloat(stock_minimo);
            updatePanoData.updated_at = db.fn.now();

            await trx('pano')
                .where('id_item', id)
                .update(updatePanoData);

            // Actualizar red_producto si cambió el tipo o descripción
            const updateRedProductoData = {};
            if (tipo_red && tipo_red !== redProducto.tipo_red) {
                updateRedProductoData.tipo_red = tipo_red.toLowerCase();
            }
            if (descripcion !== undefined) {
                updateRedProductoData.descripcion = descripcion;
            }

            if (Object.keys(updateRedProductoData).length > 0) {
                await trx('red_producto')
                    .where('id_mcr', panoExistente.id_mcr)
                    .update(updateRedProductoData);
            }

            // Actualizar tabla específica según el tipo
            const currentTipo = tipo_red || redProducto.tipo_red;
            
            switch (currentTipo) {
                case 'nylon':
                    const updateNylonData = {};
                    if (calibre !== undefined) updateNylonData.calibre = calibre;
                    if (cuadro !== undefined) updateNylonData.cuadro = cuadro;
                    if (torsion !== undefined) updateNylonData.torsion = torsion;
                    if (refuerzo !== undefined) updateNylonData.refuerzo = refuerzo === 'Sí' || refuerzo === true;
                    
                    if (Object.keys(updateNylonData).length > 0) {
                        await trx('nylon')
                            .where('id_mcr', panoExistente.id_mcr)
                            .update(updateNylonData);
                    }
                    break;
                    
                case 'lona':
                    const updateLonaData = {};
                    if (color !== undefined) updateLonaData.color = color;
                    if (presentacion !== undefined) updateLonaData.presentacion = presentacion;
                    if (Object.keys(updateLonaData).length > 0) {
                        // Verificar si existe el registro en lona
                        const existingLona = await trx('lona')
                            .where('id_mcr', panoExistente.id_mcr)
                            .first();
                        if (existingLona) {
                            await trx('lona')
                                .where('id_mcr', panoExistente.id_mcr)
                                .update(updateLonaData);
                        } else {
                            updateLonaData.id_mcr = panoExistente.id_mcr;
                            await trx('lona').insert(updateLonaData);
                        }
                    }
                    break;
                    
                case 'polipropileno':
                    const updatePolipropilenoData = {};
                    if (grosor !== undefined) updatePolipropilenoData.grosor = grosor;
                    if (cuadro !== undefined) updatePolipropilenoData.cuadro = cuadro;
                    if (Object.keys(updatePolipropilenoData).length > 0) {
                        const existingPolipropileno = await trx('polipropileno')
                            .where('id_mcr', panoExistente.id_mcr)
                            .first();
                        if (existingPolipropileno) {
                            await trx('polipropileno')
                                .where('id_mcr', panoExistente.id_mcr)
                                .update(updatePolipropilenoData);
                        } else {
                            updatePolipropilenoData.id_mcr = panoExistente.id_mcr;
                            await trx('polipropileno').insert(updatePolipropilenoData);
                        }
                    }
                    break;
                    
                case 'malla sombra':
                    const updateMallaData = {};
                    if (color !== undefined) updateMallaData.color_tipo_red = color;
                    if (presentacion !== undefined) updateMallaData.presentacion = presentacion;
                    if (Object.keys(updateMallaData).length > 0) {
                        const existingMalla = await trx('malla_sombra')
                            .where('id_mcr', panoExistente.id_mcr)
                            .first();
                        if (existingMalla) {
                            await trx('malla_sombra')
                                .where('id_mcr', panoExistente.id_mcr)
                                .update(updateMallaData);
                        } else {
                            updateMallaData.id_mcr = panoExistente.id_mcr;
                            await trx('malla_sombra').insert(updateMallaData);
                        }
                    }
                    break;
            }

            await trx.commit();

            res.json({
                success: true,
                message: 'Paño actualizado exitosamente'
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error actualizando paño:', error);
            throw error;
        }
    },

    // DELETE /api/v1/inventario/panos/:id - Eliminar paño
    deletePano: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id } = req.params;

            // Verificar que el paño existe
            const panoExistente = await trx('pano')
                .where('id_item', id)
                .first();

            if (!panoExistente) {
                throw new NotFoundError('Paño no encontrado');
            }

            // Verificar si el paño está siendo usado en alguna orden (excepto cancelada)
            const ordenesUsandoPano = await trx('trabajo_corte as tc')
                .join('orden_produccion as op', 'tc.id_op', 'op.id_op')
                .where('tc.id_item', id)
                .whereNot('op.estado', 'cancelada') // Permitir eliminar solo si está en orden cancelada
                .select('op.id_op', 'op.numero_op', 'op.estado')
                .first();

            if (ordenesUsandoPano) {
                throw new ValidationError(
                    `No se puede eliminar el paño porque está siendo usado en la orden ${ordenesUsandoPano.numero_op} (estado: ${ordenesUsandoPano.estado}). ` +
                    `Los paños solo se pueden eliminar si están ligados a órdenes canceladas.`
                );
            }

            // Verificar también en orden_produccion_detalle para materiales extras (excepto cancelada)
            const materialesUsandoPano = await trx('orden_produccion_detalle as opd')
                .join('orden_produccion as op', 'opd.id_op', 'op.id_op')
                .where('opd.id_item', id)
                .whereNot('op.estado', 'cancelada') // Permitir eliminar solo si está en orden cancelada
                .select('op.id_op', 'op.numero_op', 'op.estado', 'opd.tipo_item')
                .first();

            if (materialesUsandoPano) {
                throw new ValidationError(
                    `No se puede eliminar el paño porque está siendo usado como ${materialesUsandoPano.tipo_item} en la orden ${materialesUsandoPano.numero_op} (estado: ${materialesUsandoPano.estado}). ` +
                    `Los materiales solo se pueden eliminar si están ligados a órdenes canceladas.`
                );
            }

            // Eliminar paño
            await trx('pano')
                .where('id_item', id)
                .del();

            await trx.commit();

            res.json({
                success: true,
                message: 'Paño eliminado exitosamente'
            });

        } catch (error) {
            await trx.rollback();
            logger.error('Error eliminando paño:', error);
            throw error;
        }
    },

    // POST /api/v1/inventario/panos/entrada
    entradaPano: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id_item, cantidad, descripcion } = req.body;
            if (!id_item || !cantidad || isNaN(cantidad) || cantidad <= 0) {
                return res.status(400).json({ success: false, message: 'Datos inválidos' });
            }

            // Verificar que el paño existe
            const pano = await trx('pano').where({ id_item }).first();
            if (!pano) {
                await trx.rollback();
                return res.status(404).json({ success: false, message: 'Paño no encontrado' });
            }

            // Registrar movimiento
            await trx('movimiento_inventario').insert({
                id_item,
                tipo_mov: 'AJUSTE_IN',
                cantidad,
                unidad: 'm²',
                notas: descripcion || null,
                fecha: new Date(),
                id_usuario: req.user.id
            });

            // Actualizar área del paño
            const nuevaArea = (pano.area_m2 || 0) + parseFloat(cantidad);
            // Calculate new dimensions keeping proportions
            let nuevoLargo = pano.largo_m;
            let nuevoAncho = pano.ancho_m;
            if (pano.area_m2 > 0) {
                const factor = Math.sqrt(nuevaArea / pano.area_m2);
                nuevoLargo = pano.largo_m * factor;
                nuevoAncho = pano.ancho_m * factor;
            }
            await trx('pano')
                .where({ id_item })
                .update({
                    largo_m: nuevoLargo,
                    ancho_m: nuevoAncho,
                    updated_at: db.fn.now()
                });

            await trx.commit();

            // Invalidar cache
            await cache.delPattern('inventario:*');
            
            // Refrescar vista materializada si existe
            const viewExists = await checkViewExists('mv_panos_resumen');
            if (viewExists) {
                await db.raw('REFRESH MATERIALIZED VIEW mv_panos_resumen');
            }

            res.json({ 
                success: true, 
                message: 'Entrada registrada correctamente',
                data: {
                    id_item,
                    cantidad_agregada: cantidad,
                    area_anterior: pano.area_m2 || 0,
                    area_nueva: nuevaArea
                }
            });
        } catch (error) {
            await trx.rollback();
            logger.error('Error en entrada de paño:', error);
            res.status(500).json({ success: false, message: 'Error registrando entrada' });
        }
    },

    // POST /api/v1/inventario/panos/salida
    salidaPano: async (req, res) => {
        const trx = await db.transaction();
        
        try {
            const { id_item, cantidad, descripcion } = req.body;
            if (!id_item || !cantidad || isNaN(cantidad) || cantidad <= 0) {
                return res.status(400).json({ success: false, message: 'Datos inválidos' });
            }

            // Obtener paño actual
            const pano = await trx('pano').where({ id_item }).first();
            if (!pano) {
                await trx.rollback();
                return res.status(404).json({ success: false, message: 'Paño no encontrado' });
            }

            const stockActual = pano.area_m2 || 0;
            if (cantidad > stockActual) {
                await trx.rollback();
                return res.status(400).json({ 
                    success: false, 
                    message: 'No hay suficiente stock disponible',
                    data: {
                        stock_disponible: stockActual,
                        cantidad_solicitada: cantidad
                    }
                });
            }

            // Registrar movimiento
            await trx('movimiento_inventario').insert({
                id_item,
                tipo_mov: 'AJUSTE_OUT',
                cantidad,
                unidad: 'm²',
                notas: descripcion || null,
                fecha: new Date(),
                id_usuario: req.user.id
            });

            // Actualizar área del paño
            const nuevaArea = stockActual - parseFloat(cantidad);
            // Calculate new dimensions keeping proportions
            let nuevoLargo = pano.largo_m;
            let nuevoAncho = pano.ancho_m;
            if (pano.area_m2 > 0) {
                const factor = Math.sqrt(nuevaArea / pano.area_m2);
                nuevoLargo = pano.largo_m * factor;
                nuevoAncho = pano.ancho_m * factor;
            }
            await trx('pano')
                .where({ id_item })
                .update({
                    largo_m: nuevoLargo,
                    ancho_m: nuevoAncho,
                    updated_at: db.fn.now()
                });

            await trx.commit();

            // Invalidar cache
            await cache.delPattern('inventario:*');
            
            // Refrescar vista materializada si existe
            const viewExists = await checkViewExists('mv_panos_resumen');
            if (viewExists) {
                await db.raw('REFRESH MATERIALIZED VIEW mv_panos_resumen');
            }

            res.json({ 
                success: true, 
                message: 'Salida registrada correctamente',
                data: {
                    id_item,
                    cantidad_retirada: cantidad,
                    area_anterior: stockActual,
                    area_nueva: nuevaArea
                }
            });
        } catch (error) {
            await trx.rollback();
            logger.error('Error en salida de paño:', error);
            res.status(500).json({ success: false, message: 'Error registrando salida' });
        }
    },

    // GET /api/v1/inventario/panos/subgrupos - Obtener subgrupos disponibles
    getSubgrupos: async (req, res) => {
        try {
            const subgrupos = await db('pano')
                .select('tipo_red')
                .distinct()
                .whereNotNull('tipo_red')
                .orderBy('tipo_red');

            const subgruposList = subgrupos.map(item => item.tipo_red);

            res.json({
                success: true,
                data: subgruposList
            });

        } catch (error) {
            logger.error('Error obteniendo subgrupos de paños:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/panos/calibres - Obtener calibres disponibles
    getCalibres: async (req, res) => {
        try {
            const { tipo_red } = req.query;
            
            let query = db('pano')
                .select('calibre')
                .distinct()
                .whereNotNull('calibre');

            if (tipo_red) {
                query = query.where('tipo_red', tipo_red);
            }

            const calibres = await query.orderBy('calibre');
            const calibresList = calibres.map(item => item.calibre);

            res.json({
                success: true,
                data: calibresList
            });

        } catch (error) {
            logger.error('Error obteniendo calibres:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/panos/catalogos/nylon - Obtener catálogos para nylon
    getNylonCatalogos: async (req, res) => {
        try {
            // Obtener valores únicos de calibre
            const calibres = await db('nylon')
                .distinct('calibre')
                .whereNotNull('calibre')
                .where('calibre', '!=', '')
                .orderBy('calibre');

            // Obtener valores únicos de cuadro
            const cuadros = await db('nylon')
                .distinct('cuadro')
                .whereNotNull('cuadro')
                .where('cuadro', '!=', '')
                .orderBy('cuadro');

            // Obtener valores únicos de torsión
            const torsiones = await db('nylon')
                .distinct('torsion')
                .whereNotNull('torsion')
                .where('torsion', '!=', '')
                .orderBy('torsion');

            res.json({
                success: true,
                data: {
                    calibres: calibres.map(c => c.calibre),
                    cuadros: cuadros.map(c => c.cuadro),
                    torsiones: torsiones.map(t => t.torsion)
                }
            });

        } catch (error) {
            logger.error('Error obteniendo catálogos de nylon:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/panos/catalogos/polipropileno - Obtener catálogos para polipropileno
    getPolipropilenoCatalogos: async (req, res) => {
        try {
            // Obtener valores únicos de grosor
            const grosores = await db('polipropileno')
                .distinct('grosor')
                .whereNotNull('grosor')
                .where('grosor', '!=', '')
                .orderBy('grosor');

            // Obtener valores únicos de cuadro
            const cuadros = await db('polipropileno')
                .distinct('cuadro')
                .whereNotNull('cuadro')
                .where('cuadro', '!=', '')
                .orderBy('cuadro');

            res.json({
                success: true,
                data: {
                    grosores: grosores.map(g => g.grosor),
                    cuadros: cuadros.map(c => c.cuadro)
                }
            });

        } catch (error) {
            logger.error('Error obteniendo catálogos de polipropileno:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/panos/catalogos/lona - Obtener catálogos para lona
    getLonaCatalogos: async (req, res) => {
        try {
            // Obtener valores únicos de color
            const colores = await db('lona')
                .distinct('color')
                .whereNotNull('color')
                .where('color', '!=', '')
                .orderBy('color');

            // Obtener valores únicos de presentación
            const presentaciones = await db('lona')
                .distinct('presentacion')
                .whereNotNull('presentacion')
                .where('presentacion', '!=', '')
                .orderBy('presentacion');

            res.json({
                success: true,
                data: {
                    colores: colores.map(c => c.color),
                    presentaciones: presentaciones.map(p => p.presentacion)
                }
            });

        } catch (error) {
            logger.error('Error obteniendo catálogos de lona:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/panos/catalogos/malla-sombra - Obtener catálogos para malla sombra
    getMallaSombraCatalogos: async (req, res) => {
        try {
            // Obtener valores únicos de color_tipo_red
            const colorTiposRed = await db('malla_sombra')
                .distinct('color_tipo_red')
                .whereNotNull('color_tipo_red')
                .where('color_tipo_red', '!=', '')
                .orderBy('color_tipo_red');

            // Obtener valores únicos de presentación
            const presentaciones = await db('malla_sombra')
                .distinct('presentacion')
                .whereNotNull('presentacion')
                .where('presentacion', '!=', '')
                .orderBy('presentacion');

            res.json({
                success: true,
                data: {
                    colorTiposRed: colorTiposRed.map(c => c.color_tipo_red),
                    presentaciones: presentaciones.map(p => p.presentacion)
                }
            });

        } catch (error) {
            logger.error('Error obteniendo catálogos de malla sombra:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/panos/catalogos/nylon/full - Obtener datos completos de nylon
    getNylonFullData: async (req, res) => {
        try {
            const nylonData = await db('nylon')
                .select('id_mcr', 'calibre', 'cuadro', 'torsion', 'refuerzo')
                .orderBy('calibre')
                .orderBy('cuadro')
                .orderBy('torsion');

            res.json({
                success: true,
                data: nylonData
            });

        } catch (error) {
            logger.error('Error obteniendo datos completos de nylon:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/panos/catalogos/polipropileno/full - Obtener datos completos de polipropileno
    getPolipropilenoFullData: async (req, res) => {
        try {
            const polipropilenoData = await db('polipropileno')
                .select('id_mcr', 'grosor', 'cuadro')
                .orderBy('grosor')
                .orderBy('cuadro');

            res.json({
                success: true,
                data: polipropilenoData
            });

        } catch (error) {
            logger.error('Error obteniendo datos completos de polipropileno:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/panos/catalogos/lona/full - Obtener datos completos de lona
    getLonaFullData: async (req, res) => {
        try {
            const lonaData = await db('lona')
                .select('id_mcr', 'color', 'presentacion')
                .orderBy('color')
                .orderBy('presentacion');

            res.json({
                success: true,
                data: lonaData
            });

        } catch (error) {
            logger.error('Error obteniendo datos completos de lona:', error);
            throw error;
        }
    },

    // GET /api/v1/inventario/panos/catalogos/malla-sombra/full - Obtener datos completos de malla sombra
    getMallaSombraFullData: async (req, res) => {
        try {
            const mallaSombraData = await db('malla_sombra')
                .select('id_mcr', 'color_tipo_red', 'presentacion')
                .orderBy('color_tipo_red')
                .orderBy('presentacion');

            res.json({
                success: true,
                data: mallaSombraData
            });

        } catch (error) {
            logger.error('Error obteniendo datos completos de malla sombra:', error);
            throw error;
        }
    },

    // Nueva función: Encontrar paños adecuados para dimensiones requeridas
    findSuitablePanos: async (altura_req, ancho_req, tipo_red = null, min_area_threshold = 0) => {
        logger.info('Buscando paños adecuados:', {
            altura_req,
            ancho_req,
            tipo_red,
            min_area_threshold
        });

        // Estandarizar: asegurar altura >= ancho
        if (altura_req < ancho_req) {
            [altura_req, ancho_req] = [ancho_req, altura_req];
        }

        logger.info('Dimensiones estandarizadas:', { altura_req, ancho_req });

        let query = db('pano as p')
            .select('p.*', 'rp.tipo_red')
            .leftJoin('red_producto as rp', 'p.id_mcr', 'rp.id_mcr')
            .where(function() {
                this.where('p.estado_trabajo', 'Libre')
                    .orWhereNull('p.estado_trabajo');
            })
            // Buscar paños donde ambas dimensiones sean suficientes (con rotación)
            .where(function() {
                this.where(function() {
                    // Caso 1: largo_m >= altura_req Y ancho_m >= ancho_req
                    this.where('p.largo_m', '>=', altura_req)
                        .andWhere('p.ancho_m', '>=', ancho_req);
                }).orWhere(function() {
                    // Caso 2: largo_m >= ancho_req Y ancho_m >= altura_req (rotación)
                    this.where('p.largo_m', '>=', ancho_req)
                        .andWhere('p.ancho_m', '>=', altura_req);
                });
            })
            .whereRaw('p.area_m2 >= ?', [min_area_threshold])
            // Excluir panos que están en órdenes aprobadas (en_proceso o completada)
            .whereNotExists(function() {
                this.select('*')
                    .from('trabajo_corte as tc')
                    .join('orden_produccion as op', 'tc.id_op', 'op.id_op')
                    .whereRaw('tc.id_item = p.id_item')
                    .whereIn('op.estado', ['en_proceso', 'completada']);
            });

        if (tipo_red) {
            query = query.whereRaw('LOWER(rp.tipo_red) = ?', [tipo_red.toLowerCase()]);
        }

        // Ordenar por área ascendente (preferir más pequeños para minimizar desperdicio)
        const panos = await query.orderBy('p.area_m2', 'asc');

        logger.info('Paños encontrados:', {
            cantidad: panos.length,
            paños: panos.map(p => ({
                id_item: p.id_item,
                largo_m: p.largo_m,
                ancho_m: p.ancho_m,
                area_m2: p.area_m2,
                tipo_red: p.tipo_red
            }))
        });

        return panos;
    },

    // Nueva función: Computar cortes guillotine y generar remanentes
    computeGuillotineCuts: (pano, altura_req, ancho_req) => {
        // Permitir rotación: asignar dimensiones para mejor fit
        let pano_h = Math.max(pano.largo_m, pano.ancho_m);
        let pano_w = Math.min(pano.largo_m, pano.ancho_m);
        let req_h = Math.max(altura_req, ancho_req);
        let req_w = Math.min(altura_req, ancho_req);

        if (req_h > pano_h || req_w > pano_w) {
            // Intentar rotar requerimiento
            [req_h, req_w] = [req_w, req_h];
            if (req_h > pano_h || req_w > pano_w) {
                throw new Error('No fit possible even with rotation');
            }
        }

        const remnants = [];

        // Determinar número de remanentes basado en coincidencias
        const match_h = req_h === pano_h;
        const match_w = req_w === pano_w;

        if (match_h && match_w) {
            // Coincidencia perfecta: 0 remanentes, consumir entero
            return { remnants: [], waste: 0, consume_full: true };
        } else if (match_h || match_w) {
            // Coincidencia en una dimensión: 1 remanente
            if (match_h) {
                remnants.push({ altura_m: req_h, ancho_m: pano_w - req_w });
            } else {
                remnants.push({ altura_m: pano_h - req_h, ancho_m: req_w });
            }
        } else {
            // Sin coincidencias: 2 remanentes (corte en esquina)
            remnants.push({ altura_m: req_h, ancho_m: pano_w - req_w }); // Remanente horizontal
            remnants.push({ altura_m: pano_h - req_h, ancho_m: pano_w }); // Remanente vertical (L-shape, but split)
        }

        // Calcular desperdicio (áreas <=0)
        const waste = remnants.reduce((sum, r) => (r.altura_m > 0 && r.ancho_m > 0 ? sum : sum + Math.abs(r.altura_m * r.ancho_m)), 0);

        // Filtrar remanentes válidos (dimensiones >0)
        const validRemnants = remnants.filter(r => r.altura_m > 0 && r.ancho_m > 0);

        return { remnants: validRemnants, waste, consume_full: validRemnants.length === 0 };
    },

    // Nueva función: Calcular dimensiones recomendadas para múltiples cortes
    calculateRecommendedDimensionsHelper: (pano, areaTotal) => {
        console.log('🔍 calculateRecommendedDimensionsHelper llamado con:', { pano, areaTotal });
        
        if (areaTotal <= 0) {
            console.log('❌ Área total <= 0, retornando dimensiones 0');
            return { largo: 0, ancho: 0 };
        }

        const panoLargo = parseFloat(pano.largo_m) || 0;
        const panoAncho = parseFloat(pano.ancho_m) || 0;
        
        console.log('🔍 Dimensiones del paño:', { panoLargo, panoAncho });
        
        // Determinar cuál es la dimensión mayor del paño (altura)
        const dimensionMayor = Math.max(panoLargo, panoAncho);
        const dimensionMenor = Math.min(panoLargo, panoAncho);
        
        console.log('🔍 Dimensiones ordenadas:', { dimensionMayor, dimensionMenor });
        
        // NUEVO ALGORITMO: Calcular dimensiones más equilibradas
        // Buscar la mejor combinación de largo y ancho que se ajuste al paño
        let mejorLargo = 0;
        let mejorAncho = 0;
        let mejorRatio = Infinity; // Buscar el ratio más cercano a 1 (cuadrado)
        
        // Probar diferentes combinaciones de largo y ancho
        for (let largo = 0.1; largo <= dimensionMayor; largo += 0.1) {
            const ancho = areaTotal / largo;
            
            // Verificar que las dimensiones quepan en el paño
            if (largo <= dimensionMayor && ancho <= dimensionMenor) {
                const ratio = Math.max(largo, ancho) / Math.min(largo, ancho);
                if (ratio < mejorRatio) {
                    mejorRatio = ratio;
                    mejorLargo = largo;
                    mejorAncho = ancho;
                }
            }
            
            // También probar con ancho como dimensión mayor
            if (ancho <= dimensionMayor && largo <= dimensionMenor) {
                const ratio = Math.max(ancho, largo) / Math.min(ancho, largo);
                if (ratio < mejorRatio) {
                    mejorRatio = ratio;
                    mejorLargo = ancho;
                    mejorAncho = largo;
                }
            }
        }
        
        // Si no se encontró una combinación válida, usar el algoritmo anterior como fallback
        if (mejorLargo === 0 || mejorAncho === 0) {
            console.log('⚠️ Usando algoritmo fallback');
            const alturaRecomendada = dimensionMayor;
            const anchoRecomendado = areaTotal / alturaRecomendada;
            
            if (anchoRecomendado > dimensionMenor) {
                mejorLargo = dimensionMenor;
                mejorAncho = areaTotal / dimensionMenor;
            } else {
                mejorLargo = alturaRecomendada;
                mejorAncho = anchoRecomendado;
            }
        }
        
        const resultado = {
            largo: Math.round(mejorLargo * 1000) / 1000, // Redondear a 3 decimales
            ancho: Math.round(mejorAncho * 1000) / 1000
        };
        
        console.log('✅ Dimensiones calculadas (equilibradas):', resultado);
        console.log('📊 Ratio largo/ancho:', Math.max(resultado.largo, resultado.ancho) / Math.min(resultado.largo, resultado.ancho));
        
        return resultado;
    },

    // Nueva función: Crear trabajo de corte y plan de piezas
    createCutJob: async (trx, id_op, id_item, altura_req, ancho_req, umbral_sobrante_m2 = 5.0, order_seq = 1, id_operador) => {
        try {
            // NO cambiar el estado del paño aquí - se cambiará cuando se apruebe la orden
            // await trx('pano').where('id_item', id_item).update({ estado_trabajo: 'En progreso' });

            // Computar cortes
            const pano = await trx('pano').where('id_item', id_item).first();
            const { remnants, waste, consume_full } = panosController.computeGuillotineCuts(pano, altura_req, ancho_req);

            logger.info('Computando cortes para paño:', {
                id_item,
                pano_largo: pano.largo_m,
                pano_ancho: pano.ancho_m,
                pano_area: pano.area_m2,
                altura_req,
                ancho_req,
                remnants_count: remnants.length,
                consume_full,
                waste
            });

            // Insertar remanentes temporales si hay
            for (const remnant of remnants) {
                if (remnant.altura_m * remnant.ancho_m >= umbral_sobrante_m2) {
                    // Asegurar que altura_m sea siempre la dimensión mayor
                    const altura_m = Math.max(remnant.altura_m, remnant.ancho_m);
                    const ancho_m = Math.min(remnant.altura_m, remnant.ancho_m);
                    
                    await trx('panos_sobrantes').insert({
                        id_item_padre: id_item,
                        altura_m: altura_m,
                        ancho_m: ancho_m,
                        id_op,
                        estado: 'Pendiente'
                    });
                } else {
                    // Log desperdicio
                    await trx('movimiento_inventario').insert({
                        tipo_mov: 'AJUSTE_OUT',
                        cantidad: remnant.altura_m * remnant.ancho_m,
                        unidad: 'm²',
                        notas: 'Desperdicio por debajo del umbral',
                        id_item,
                        id_op,
                        id_usuario: id_operador
                    });
                }
            }

            // Crear trabajo_corte
            const job = await trx('trabajo_corte').insert({
                id_item,
                altura_req,
                ancho_req,
                estado: 'Planeado',
                id_operador,
                id_op,
                umbral_sobrante_m2,
                order_seq
            }).returning('job_id');
            const job_id = job[0].job_id;

            // Poblar plan_corte_pieza (principal + remanentes)
            await trx('plan_corte_pieza').insert({
                job_id,
                seq: 0,
                rol_pieza: 'Objetivo',
                altura_plan: altura_req,
                ancho_plan: ancho_req
            });

            // Insertar remanentes en plan_corte_pieza
            for (let idx = 0; idx < remnants.length; idx++) {
                const remnant = remnants[idx];
                if (remnant.altura_m > 0 && remnant.ancho_m > 0) {
                    await trx('plan_corte_pieza').insert({
                        job_id,
                        seq: idx + 1,
                        rol_pieza: 'Sobrante',
                        altura_plan: remnant.altura_m,
                        ancho_plan: remnant.ancho_m
                    });
                }
            }

            // LÓGICA CORREGIDA: El paño debe mantenerse en estado "Libre" hasta que se apruebe la orden
            // Solo se marcará como "Consumido" cuando se ejecute el corte
            // NO cambiar el estado aquí - se cambiará cuando se apruebe la orden a "Reservado"
            // y cuando se ejecute el corte a "Consumido"

            logger.info('Trabajo de corte creado - paño mantiene estado Libre:', {
                id_item,
                job_id,
                remnants_count: remnants.length,
                estado_actual: 'Libre'
            });

            return job_id;
        } catch (error) {
            throw error;
        }
    },
};

module.exports = panosController;