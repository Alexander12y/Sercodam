const jwt = require('jsonwebtoken');
const { cache } = require('../config/redis');
const logger = require('../config/logger');
const db = require('../config/database');

// Middleware para verificar JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        console.log('🔍 DEBUG - Auth Header:', authHeader);
        console.log('🔍 DEBUG - Token:', token ? token.substring(0, 20) + '...' : 'No token');

        if (!token) {
            console.log('❌ DEBUG - No token provided');
            return res.status(401).json({
                success: false,
                message: 'Token de acceso requerido'
            });
        }

        // Check if token is blacklisted
        const isBlacklisted = await cache.exists(`blacklist:${token}`);
        if (isBlacklisted) {
            console.log('❌ DEBUG - Token is blacklisted');
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ DEBUG - Token decoded:', { userId: decoded.userId, username: decoded.username, rol: decoded.rol });

        // Check if user still exists and is active
        const user = await db('usuario')
            .where({ id: decoded.userId })
            .first();

        console.log('🔍 DEBUG - User from DB:', user ? { id: user.id, username: user.username, activo: user.activo } : 'User not found');

        if (!user || !user.activo) {
            console.log('❌ DEBUG - User not found or inactive');
            return res.status(401).json({
                success: false,
                message: 'Usuario no encontrado o inactivo'
            });
        }

        // Add user info to request
        req.user = {
            id: user.id,
            username: user.username,
            nombre: user.nombre,
            rol: user.rol,
            activo: user.activo
        };

        req.token = token;
        console.log('✅ DEBUG - Authentication successful for user:', req.user.username);
        next();

    } catch (error) {
        console.log('❌ DEBUG - Auth error:', error.message);
        logger.error('Error en autenticación:', error);

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Token inválido'
            });
        }

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expirado'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Middleware para verificar roles específicos
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Autenticación requerida'
            });
        }

        const userRoles = Array.isArray(req.user.rol) ? req.user.rol : [req.user.rol];
        const requiredRoles = Array.isArray(roles) ? roles : [roles];

        const hasRequiredRole = requiredRoles.some(role =>
            userRoles.includes(role)
        );

        if (!hasRequiredRole) {
            return res.status(403).json({
                success: false,
                message: 'Permisos insuficientes'
            });
        }

        next();
    };
};

// Middleware para verificar webhooks de Make.com
const authenticateWebhook = (req, res, next) => {
    try {
        const webhookSecret = req.headers['x-webhook-secret'];

        if (!webhookSecret || webhookSecret !== process.env.MAKE_WEBHOOK_SECRET) {
            logger.warn('Intento de acceso no autorizado a webhook:', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                headers: req.headers
            });

            return res.status(401).json({
                success: false,
                message: 'No autorizado'
            });
        }

        next();
    } catch (error) {
        logger.error('Error en autenticación de webhook:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
};

// Middleware opcional de autenticación (no falla si no hay token)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return next();
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await db('usuario')
            .where({ id: decoded.userId })
            .first();

        if (user && user.activo) {
            req.user = {
                id: user.id,
                username: user.username,
                nombre: user.nombre,
                rol: user.rol,
                activo: user.activo
            };
        }

        next();
    } catch (error) {
        // Si hay error en token opcional, continúa sin usuario
        next();
    }
};

// Helper para generar tokens
const generateTokens = (user) => {
    const payload = {
        userId: user.id,
        username: user.username,
        rol: user.rol
    };

    const accessToken = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    const refreshToken = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );

    return { accessToken, refreshToken };
};

// Helper para invalidar token (blacklist)
const invalidateToken = async (token) => {
    try {
        const decoded = jwt.decode(token);
        if (decoded && decoded.exp) {
            const ttl = decoded.exp - Math.floor(Date.now() / 1000);
            if (ttl > 0) {
                await cache.set(`blacklist:${token}`, true, ttl);
            }
        }
    } catch (error) {
        logger.error('Error invalidating token:', error);
    }
};

module.exports = {
    authenticateToken,
    requireRole,
    authenticateWebhook,
    optionalAuth,
    generateTokens,
    invalidateToken
};
