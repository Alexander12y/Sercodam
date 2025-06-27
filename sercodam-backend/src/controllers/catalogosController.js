const db = require('../config/database');
const logger = require('../config/logger');
const { NotFoundError } = require('../middleware/errorHandler');

const catalogosController = {
    // GET /api/v1/catalogos/panos - Obtener Catálogo 1 (Redes por tramo)
    getCatalogosPanos: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 50, 
                search, 
                tipo_red,
                calibre,
                estado,
                ubicacion,
                sortBy = 'nombre',
                sortOrder = 'asc'
            } = req.query;

            // Consulta principal sin JOIN para evitar problemas
            let query = db('pano').select('*');

            // Filtro de búsqueda
            if (search) {
                query = query.where(function() {
                    this.where('nombre', 'ilike', `%${search}%`)
                          .orWhere('codigo', 'ilike', `%${search}%`);
                });
            }

            // Filtro por calibre
            if (calibre) {
                query = query.where('calibre', calibre);
            }

            // Filtro por estado
            if (estado) {
                query = query.where('estado', estado);
            }

            // Filtro por ubicación
            if (ubicacion) {
                query = query.where('ubicacion', ubicacion);
            }

            // Contar total para paginación
            const { count } = await query.clone().count('* as count').first();
            const total = parseInt(count);

            // Aplicar paginación y ordenamiento
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const panos = await query
                .orderBy(sortBy, sortOrder)
                .limit(parseInt(limit))
                .offset(offset);

            res.json({
                success: true,
                data: {
                    panos,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo catálogo de paños:', error);
            throw error;
        }
    },

    // GET /api/v1/catalogos/materiales - Obtener Catálogo 2 (Materiales consumibles)
    getCatalogosMateriales: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 50, 
                search, 
                subgrupo,
                estado,
                ubicacion,
                sortBy = 'nombre',
                sortOrder = 'asc'
            } = req.query;

            let query = db('materiales_extra')
                .select('*');

            // Filtro de búsqueda
            if (search) {
                query = query.where(function() {
                    this.where('nombre', 'ilike', `%${search}%`)
                          .orWhere('codigo', 'ilike', `%${search}%`)
                          .orWhere('descripcion', 'ilike', `%${search}%`);
                });
            }

            // Filtro por subgrupo
            if (subgrupo) {
                query = query.where('subgrupo', subgrupo);
            }

            // Filtro por estado
            if (estado) {
                query = query.where('estado', estado);
            }

            // Filtro por ubicación
            if (ubicacion) {
                query = query.where('ubicacion', ubicacion);
            }

            // Contar total para paginación
            const totalQuery = query.clone();
            const { count } = await totalQuery.count('* as count').first();
            const total = parseInt(count);

            // Aplicar paginación y ordenamiento
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const materiales = await query
                .orderBy(sortBy, sortOrder)
                .limit(parseInt(limit))
                .offset(offset);

            res.json({
                success: true,
                data: {
                    materiales,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo catálogo de materiales:', error);
            throw error;
        }
    },

    // GET /api/v1/catalogos/herramientas - Obtener Catálogo 3 (Herramientas reutilizables)
    getCatalogosHerramientas: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 50, 
                search, 
                subgrupo,
                estado,
                ubicacion,
                sortBy = 'nombre',
                sortOrder = 'asc'
            } = req.query;

            let query = db('herramientas')
                .select('*');

            // Filtro de búsqueda
            if (search) {
                query = query.where(function() {
                    this.where('nombre', 'ilike', `%${search}%`)
                          .orWhere('codigo', 'ilike', `%${search}%`)
                          .orWhere('descripcion', 'ilike', `%${search}%`);
                });
            }

            // Filtro por subgrupo
            if (subgrupo) {
                query = query.where('subgrupo', subgrupo);
            }

            // Filtro por estado
            if (estado) {
                query = query.where('estado', estado);
            }

            // Filtro por ubicación
            if (ubicacion) {
                query = query.where('ubicacion', ubicacion);
            }

            // Contar total para paginación
            const totalQuery = query.clone();
            const { count } = await totalQuery.count('* as count').first();
            const total = parseInt(count);

            // Aplicar paginación y ordenamiento
            const offset = (parseInt(page) - 1) * parseInt(limit);
            const herramientas = await query
                .orderBy(sortBy, sortOrder)
                .limit(parseInt(limit))
                .offset(offset);

            res.json({
                success: true,
                data: {
                    herramientas,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit))
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo catálogo de herramientas:', error);
            throw error;
        }
    },

    // GET /api/v1/catalogos/panos/subgrupos - Obtener subgrupos de paños
    getSubgruposPanos: async (req, res) => {
        try {
            const subgrupos = await db('pano')
                .select('red_producto.tipo_red')
                .distinct()
                .leftJoin('red_producto', 'pano.id_mcr', 'red_producto.id_mcr')
                .whereNotNull('red_producto.tipo_red')
                .orderBy('red_producto.tipo_red');

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

    // GET /api/v1/catalogos/materiales/subgrupos - Obtener subgrupos de materiales
    getSubgruposMateriales: async (req, res) => {
        try {
            const subgrupos = await db('materiales_extra')
                .select('subgrupo')
                .distinct()
                .whereNotNull('subgrupo')
                .orderBy('subgrupo');

            const subgruposList = subgrupos.map(item => item.subgrupo);

            res.json({
                success: true,
                data: subgruposList
            });

        } catch (error) {
            logger.error('Error obteniendo subgrupos de materiales:', error);
            throw error;
        }
    },

    // GET /api/v1/catalogos/herramientas/subgrupos - Obtener subgrupos de herramientas
    getSubgruposHerramientas: async (req, res) => {
        try {
            const subgrupos = await db('herramientas')
                .select('subgrupo')
                .distinct()
                .whereNotNull('subgrupo')
                .orderBy('subgrupo');

            const subgruposList = subgrupos.map(item => item.subgrupo);

            res.json({
                success: true,
                data: subgruposList
            });

        } catch (error) {
            logger.error('Error obteniendo subgrupos de herramientas:', error);
            throw error;
        }
    }
};

module.exports = catalogosController; 