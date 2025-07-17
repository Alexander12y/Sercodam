const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { cache } = require('../config/redis');
const logger = require('../config/logger');
const { generateTokens, invalidateToken } = require('../middleware/auth');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

class AuthController {
    // POST /api/v1/auth/login
    async login(req, res) {
        try {
            const { username, password } = req.body;

            // Buscar usuario
            const user = await db('usuario')
                .where({ username, activo: true })
                .first();

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales inválidas'
                });
            }

            // Verificar contraseña
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Credenciales inválidas'
                });
            }

            // Si el usuario tiene 2FA activado, pedir código
            if (user.twofa_enabled) {
                // Generar tempToken (JWT corto, solo para 2FA)
                const tempToken = jwt.sign(
                    { userId: user.id, username: user.username, twofa: true },
                    process.env.JWT_SECRET,
                    { expiresIn: '5m' }
                );
                return res.status(200).json({
                    success: false,
                    require2FA: true,
                    message: 'Se requiere código 2FA',
                    tempToken
                });
            }

            // Generar tokens normales
            const { accessToken, refreshToken } = generateTokens(user);

            // Crear sesión
            const sessionId = uuidv4();
            const sessionData = {
                id: sessionId,
                userId: user.id,
                accessToken,
                refreshToken,
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip,
                createdAt: new Date(),
                lastActivity: new Date()
            };

            // Guardar sesión en Redis
            await cache.set(`session:${sessionId}`, JSON.stringify(sessionData), 7 * 24 * 60 * 60); // 7 días

            // Actualizar última actividad del usuario
            await db('usuario')
                .where({ id: user.id })
                .update({ 
                    ultima_actividad: new Date(),
                    ultimo_login: new Date()
                });

            logger.info(`Usuario ${user.username} inició sesión desde ${req.ip}`);

            res.json({
                success: true,
                message: 'Login exitoso',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        nombre: user.nombre,
                        email: user.email,
                        rol: user.rol,
                        activo: user.activo,
                        twofa_enabled: user.twofa_enabled || false
                    },
                    tokens: {
                        accessToken,
                        refreshToken
                    },
                    sessionId
                }
            });

        } catch (error) {
            logger.error('Error en login:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // POST /api/v1/auth/logout
    async logout(req, res) {
        try {
            const { sessionId } = req.body;
            const token = req.token;

            // Invalidar token actual
            await invalidateToken(token);

            // Eliminar sesión si se proporciona sessionId
            if (sessionId) {
                await cache.del(`session:${sessionId}`);
            }

            logger.info(`Usuario ${req.user.username} cerró sesión`);

            res.json({
                success: true,
                message: 'Logout exitoso'
            });

        } catch (error) {
            logger.error('Error en logout:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // POST /api/v1/auth/refresh
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({
                    success: false,
                    message: 'Refresh token requerido'
                });
            }

            // Verificar refresh token
            const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
            
            // Buscar usuario
            const user = await db('usuario')
                .where({ id: decoded.userId, activo: true })
                .first();

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Usuario no encontrado o inactivo'
                });
            }

            // Generar nuevos tokens
            const newTokens = generateTokens(user);

            res.json({
                success: true,
                message: 'Tokens renovados',
                data: {
                    accessToken: newTokens.accessToken,
                    refreshToken: newTokens.refreshToken
                }
            });

        } catch (error) {
            logger.error('Error en refresh token:', error);
            
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Refresh token inválido'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // GET /api/v1/auth/me
    async getCurrentUser(req, res) {
        try {
            const user = await db('usuario')
                .where({ id: req.user.id })
                .select('id', 'username', 'nombre', 'email', 'rol', 'activo', 'ultima_actividad')
                .first();

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            res.json({
                success: true,
                data: user
            });

        } catch (error) {
            logger.error('Error obteniendo usuario actual:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // PUT /api/v1/auth/me
    async updateProfile(req, res) {
        try {
            const { nombre, email } = req.body;
            const userId = req.user.id;

            // Verificar que el email no esté en uso por otro usuario
            if (email) {
                const existingUser = await db('usuario')
                    .where({ email })
                    .whereNot({ id: userId })
                    .first();

                if (existingUser) {
                    return res.status(400).json({
                        success: false,
                        message: 'El email ya está en uso'
                    });
                }
            }

            // Actualizar perfil
            await db('usuario')
                .where({ id: userId })
                .update({
                    nombre: nombre || req.user.nombre,
                    email: email || req.user.email,
                    actualizado_en: new Date()
                });

            logger.info(`Usuario ${req.user.username} actualizó su perfil`);

            res.json({
                success: true,
                message: 'Perfil actualizado correctamente'
            });

        } catch (error) {
            logger.error('Error actualizando perfil:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // POST /api/v1/auth/change-password
    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            const userId = req.user.id;

            // Obtener usuario con contraseña
            const user = await db('usuario')
                .where({ id: userId })
                .first();

            // Verificar contraseña actual
            const isValidPassword = await bcrypt.compare(currentPassword, user.password);
            if (!isValidPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Contraseña actual incorrecta'
                });
            }

            // Encriptar nueva contraseña
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            // Actualizar contraseña
            await db('usuario')
                .where({ id: userId })
                .update({
                    password: hashedPassword,
                    actualizado_en: new Date()
                });

            logger.info(`Usuario ${req.user.username} cambió su contraseña`);

            res.json({
                success: true,
                message: 'Contraseña cambiada correctamente'
            });

        } catch (error) {
            logger.error('Error cambiando contraseña:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // POST /api/v1/auth/users
    async createUser(req, res) {
        try {
            const { username, password, nombre, email, rol, activo } = req.body;

            // Validación robusta de datos
            const validationErrors = [];
            if (!username || username.length < 3) validationErrors.push('El nombre de usuario es obligatorio y debe tener al menos 3 caracteres.');
            if (!nombre || nombre.length < 3) validationErrors.push('El nombre es obligatorio y debe tener al menos 3 caracteres.');
            if (!email || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) validationErrors.push('El email no es válido.');
            if (!password || password.length < 8) validationErrors.push('La contraseña debe tener al menos 8 caracteres.');

            if (validationErrors.length > 0) {
                return res.status(400).json({ success: false, message: validationErrors.join(' ') });
            }

            // Verificar que el usuario no exista
            const existingUser = await db('usuario').where({ username }).first();
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'El nombre de usuario ya está en uso'
                });
            }

            // Verificar que el email no exista
            if (email) {
                const existingEmail = await db('usuario').where({ email }).first();
                if (existingEmail) {
                    return res.status(400).json({
                        success: false,
                        message: 'El email ya está en uso'
                    });
                }
            }

            // Encriptar contraseña
            const hashedPassword = await bcrypt.hash(password, 12);

            // Crear usuario y asegurar que retorna el id
            let userIdArr;
            try {
                userIdArr = await db('usuario').insert({
                    username,
                    password: hashedPassword,
                    nombre,
                    email,
                    rol: rol || 'usuario',
                    activo: typeof activo === 'boolean' ? activo : true,
                    creado_en: new Date(),
                    actualizado_en: new Date()
                }).returning('id');
            } catch (err) {
                logger.error('Error en el insert de usuario:', err);
                return res.status(500).json({ success: false, message: 'Error al crear el usuario en la base de datos.' });
            }

            const userId = Array.isArray(userIdArr) ? (userIdArr[0]?.id || userIdArr[0]) : userIdArr;
            if (!userId) {
                return res.status(500).json({ success: false, message: 'No se pudo crear el usuario.' });
            }

            logger.info(`Usuario ${req.user.username} creó el usuario ${username}`);

            res.status(201).json({
                success: true,
                message: 'Usuario creado correctamente',
                data: { id: userId }
            });

        } catch (error) {
            logger.error('Error creando usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // GET /api/v1/auth/users
    async getUsers(req, res) {
        try {
            const { page = 1, limit = 10, search, rol } = req.query;
            const offset = (page - 1) * limit;

            // Construir query base para filtros
            let baseQuery = db('usuario');

            // Aplicar filtros
            if (search) {
                baseQuery = baseQuery.where(function() {
                    this.where('username', 'ilike', `%${search}%`)
                          .orWhere('nombre', 'ilike', `%${search}%`)
                          .orWhere('email', 'ilike', `%${search}%`);
                });
            }

            if (rol) {
                baseQuery = baseQuery.where({ rol });
            }

            // Obtener total de registros
            const [{ total }] = await baseQuery.clone().count('* as total');

            // Obtener usuarios paginados
            const users = await baseQuery
                .select('id', 'username', 'nombre', 'email', 'rol', 'activo', 'creado_en', 'ultima_actividad')
                .orderBy('creado_en', 'desc')
                .limit(limit)
                .offset(offset);

            res.json({
                success: true,
                data: {
                    users,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total,
                        pages: Math.ceil(total / limit)
                    }
                }
            });

        } catch (error) {
            logger.error('Error obteniendo usuarios:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // GET /api/v1/auth/users/:id
    async getUserById(req, res) {
        try {
            const { id } = req.params;

            const user = await db('usuario')
                .where({ id })
                .select('id', 'username', 'nombre', 'email', 'rol', 'activo', 'creado_en', 'ultima_actividad')
                .first();

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            res.json({
                success: true,
                data: user
            });

        } catch (error) {
            logger.error('Error obteniendo usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // PUT /api/v1/auth/users/:id
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { nombre, email, rol, activo, password } = req.body;

            // Verificar que el usuario existe
            const existingUser = await db('usuario')
                .where({ id })
                .first();

            if (!existingUser) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            // Verificar que el email no esté en uso por otro usuario
            if (email && email !== existingUser.email) {
                const emailExists = await db('usuario')
                    .where({ email })
                    .whereNot({ id })
                    .first();

                if (emailExists) {
                    return res.status(400).json({
                        success: false,
                        message: 'El email ya está en uso'
                    });
                }
            }

            // Preparar datos de actualización
            const updateData = {
                nombre: nombre || existingUser.nombre,
                email: email || existingUser.email,
                rol: rol || existingUser.rol,
                activo: activo !== undefined ? activo : existingUser.activo,
                actualizado_en: new Date()
            };

            // Si se proporciona una nueva contraseña, hashearla
            if (password && password.trim()) {
                const hashedPassword = await bcrypt.hash(password, 12);
                updateData.password = hashedPassword;
            }

            // Actualizar usuario
            await db('usuario')
                .where({ id })
                .update(updateData);

            logger.info(`Usuario ${req.user.username} actualizó el usuario ${existingUser.username}${password ? ' (incluyendo contraseña)' : ''}`);

            res.json({
                success: true,
                message: 'Usuario actualizado correctamente'
            });

        } catch (error) {
            logger.error('Error actualizando usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // DELETE /api/v1/auth/users/:id
    async deactivateUser(req, res) {
        try {
            const { id } = req.params;

            // Verificar que el usuario existe
            const user = await db('usuario')
                .where({ id })
                .first();

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            // No permitir desactivar el propio usuario
            if (id === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: 'No puedes desactivar tu propia cuenta'
                });
            }

            // Desactivar usuario
            await db('usuario')
                .where({ id })
                .update({
                    activo: false,
                    actualizado_en: new Date()
                });

            logger.info(`Usuario ${req.user.username} desactivó el usuario ${user.username}`);

            res.json({
                success: true,
                message: 'Usuario desactivado correctamente'
            });

        } catch (error) {
            logger.error('Error desactivando usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // POST /api/v1/auth/users/:id/activate
    async activateUser(req, res) {
        try {
            const { id } = req.params;

            // Verificar que el usuario existe
            const user = await db('usuario')
                .where({ id })
                .first();

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            // Activar usuario
            await db('usuario')
                .where({ id })
                .update({
                    activo: true,
                    actualizado_en: new Date()
                });

            logger.info(`Usuario ${req.user.username} activó el usuario ${user.username}`);

            res.json({
                success: true,
                message: 'Usuario activado correctamente'
            });

        } catch (error) {
            logger.error('Error activando usuario:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // POST /api/v1/auth/users/:id/reset-password
    async resetUserPassword(req, res) {
        try {
            const { id } = req.params;
            const { newPassword } = req.body;

            // Verificar que el usuario existe
            const user = await db('usuario')
                .where({ id })
                .first();

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuario no encontrado'
                });
            }

            // Encriptar nueva contraseña
            const hashedPassword = await bcrypt.hash(newPassword, 12);

            // Actualizar contraseña
            await db('usuario')
                .where({ id })
                .update({
                    password: hashedPassword,
                    actualizado_en: new Date()
                });

            logger.info(`Usuario ${req.user.username} reseteó la contraseña del usuario ${user.username}`);

            res.json({
                success: true,
                message: 'Contraseña reseteada correctamente'
            });

        } catch (error) {
            logger.error('Error reseteando contraseña:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // GET /api/v1/auth/sessions
    async getActiveSessions(req, res) {
        try {
            const userId = req.user.id;
            const sessions = [];

            // Obtener todas las sesiones del usuario desde Redis
            const keys = await cache.keys(`session:*`);
            
            for (const key of keys) {
                const sessionData = await cache.get(key);
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    if (session.userId === userId) {
                        sessions.push({
                            id: session.id,
                            userAgent: session.userAgent,
                            ipAddress: session.ipAddress,
                            createdAt: session.createdAt,
                            lastActivity: session.lastActivity
                        });
                    }
                }
            }

            res.json({
                success: true,
                data: sessions
            });

        } catch (error) {
            logger.error('Error obteniendo sesiones:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // DELETE /api/v1/auth/sessions/:sessionId
    async terminateSession(req, res) {
        try {
            const { sessionId } = req.params;
            const userId = req.user.id;

            // Verificar que la sesión pertenece al usuario
            const sessionData = await cache.get(`session:${sessionId}`);
            if (!sessionData) {
                return res.status(404).json({
                    success: false,
                    message: 'Sesión no encontrada'
                });
            }

            const session = JSON.parse(sessionData);
            if (session.userId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'No tienes permisos para cerrar esta sesión'
                });
            }

            // Eliminar sesión
            await cache.del(`session:${sessionId}`);

            logger.info(`Usuario ${req.user.username} cerró la sesión ${sessionId}`);

            res.json({
                success: true,
                message: 'Sesión cerrada correctamente'
            });

        } catch (error) {
            logger.error('Error cerrando sesión:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // DELETE /api/v1/auth/sessions
    async terminateAllSessions(req, res) {
        try {
            const userId = req.user.id;
            const currentSessionId = req.body.sessionId; // ID de la sesión actual

            // Obtener todas las sesiones del usuario
            const keys = await cache.keys(`session:*`);
            
            for (const key of keys) {
                const sessionData = await cache.get(key);
                if (sessionData) {
                    const session = JSON.parse(sessionData);
                    if (session.userId === userId && session.id !== currentSessionId) {
                        await cache.del(key);
                    }
                }
            }

            logger.info(`Usuario ${req.user.username} cerró todas las sesiones excepto la actual`);

            res.json({
                success: true,
                message: 'Todas las sesiones cerradas correctamente'
            });

        } catch (error) {
            logger.error('Error cerrando sesiones:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // POST /api/v1/auth/verify-token
    async verifyToken(req, res) {
        try {
            // Si llegamos aquí, el token es válido (middleware ya lo verificó)
            res.json({
                success: true,
                message: 'Token válido',
                data: {
                    user: req.user
                }
            });

        } catch (error) {
            logger.error('Error verificando token:', error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor'
            });
        }
    }

    // POST /api/v1/auth/2fa/setup
    async setup2FA(req, res) {
        try {
            const userId = req.user.id;
            // Verificar si el usuario ya tiene 2FA activado
            const user = await db('usuario').where({ id: userId }).first();
            if (user && user.twofa_enabled) {
                return res.status(400).json({
                    success: false,
                    message: '2FA ya está activado para este usuario.'
                });
            }
            // Generar secreto TOTP
            const secret = speakeasy.generateSecret({
                name: `Sercodam (${req.user.username})`,
                length: 32
            });
            // Guardar el secreto temporalmente en la base de datos (no activar 2FA aún)
            await db('usuario').where({ id: userId }).update({ twofa_secret: secret.base32 });
            // Generar QR para Google Authenticator
            const otpauthUrl = secret.otpauth_url;
            const qrDataUrl = await qrcode.toDataURL(otpauthUrl);
            res.json({
                success: true,
                message: 'Secreto y QR generados',
                data: {
                    qr: qrDataUrl,
                    secret: secret.base32
                }
            });
        } catch (error) {
            logger.error('Error generando 2FA:', error);
            res.status(500).json({ success: false, message: 'Error generando 2FA' });
        }
    }

    // POST /api/v1/auth/2fa/verify
    async verify2FA(req, res) {
        try {
            const userId = req.user.id;
            const { token } = req.body;
            const user = await db('usuario').where({ id: userId }).first();
            if (!user || !user.twofa_secret) {
                return res.status(400).json({ success: false, message: 'No hay secreto 2FA configurado' });
            }
            const verified = speakeasy.totp.verify({
                secret: user.twofa_secret,
                encoding: 'base32',
                token,
                window: 1
            });
            if (!verified) {
                return res.status(400).json({ success: false, message: 'Código 2FA inválido' });
            }
            // Activar 2FA
            await db('usuario').where({ id: userId }).update({ twofa_enabled: true });
            res.json({ success: true, message: '2FA activado correctamente' });
        } catch (error) {
            logger.error('Error verificando 2FA:', error);
            res.status(500).json({ success: false, message: 'Error verificando 2FA' });
        }
    }

    // POST /api/v1/auth/login/2fa
    async login2FA(req, res) {
        try {
            const { tempToken, token } = req.body;
            if (!tempToken || !token) {
                return res.status(400).json({ success: false, message: 'Faltan datos para 2FA' });
            }
            // Verificar tempToken
            let payload;
            try {
                payload = jwt.verify(tempToken, process.env.JWT_SECRET);
            } catch (err) {
                return res.status(401).json({ success: false, message: 'TempToken inválido o expirado' });
            }
            if (!payload.twofa || !payload.userId) {
                return res.status(401).json({ success: false, message: 'TempToken inválido' });
            }
            // Buscar usuario
            const user = await db('usuario').where({ id: payload.userId, activo: true }).first();
            if (!user || !user.twofa_enabled || !user.twofa_secret) {
                return res.status(401).json({ success: false, message: '2FA no está activado para este usuario' });
            }
            // Verificar código TOTP
            const verified = speakeasy.totp.verify({
                secret: user.twofa_secret,
                encoding: 'base32',
                token,
                window: 1
            });
            if (!verified) {
                return res.status(401).json({ success: false, message: 'Código 2FA inválido' });
            }
            // Generar tokens normales
            const { accessToken, refreshToken } = generateTokens(user);
            // Crear sesión
            const sessionId = uuidv4();
            const sessionData = {
                id: sessionId,
                userId: user.id,
                accessToken,
                refreshToken,
                userAgent: req.get('User-Agent'),
                ipAddress: req.ip,
                createdAt: new Date(),
                lastActivity: new Date()
            };
            await cache.set(`session:${sessionId}`, JSON.stringify(sessionData), 7 * 24 * 60 * 60);
            await db('usuario').where({ id: user.id }).update({ ultima_actividad: new Date(), ultimo_login: new Date() });
            logger.info(`Usuario ${user.username} inició sesión con 2FA desde ${req.ip}`);
            res.json({
                success: true,
                message: 'Login exitoso con 2FA',
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        nombre: user.nombre,
                        email: user.email,
                        rol: user.rol,
                        activo: user.activo,
                        twofa_enabled: user.twofa_enabled || false
                    },
                    tokens: {
                        accessToken,
                        refreshToken
                    },
                    sessionId
                }
            });
        } catch (error) {
            logger.error('Error en login 2FA:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor' });
        }
    }

    // POST /api/v1/auth/users/:id/reset-2fa
    async reset2FA(req, res) {
        try {
            const { id } = req.params;
            // Solo admin puede usar este endpoint
            if (!req.user || req.user.rol !== 'admin') {
                return res.status(403).json({ success: false, message: 'Solo un administrador puede resetear el 2FA de un usuario.' });
            }
            // Verificar que el usuario existe
            const user = await db('usuario').where({ id }).first();
            if (!user) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }
            // Resetear 2FA
            await db('usuario').where({ id }).update({ twofa_secret: null, twofa_enabled: false });
            res.json({ success: true, message: '2FA reseteado correctamente para el usuario.' });
        } catch (error) {
            logger.error('Error reseteando 2FA:', error);
            res.status(500).json({ success: false, message: 'Error reseteando 2FA' });
        }
    }
}

module.exports = new AuthController(); 