const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const authController = require('../controllers/authController');
const { validateLogin, validateUserCreation, validatePasswordChange } = require('../validators/authValidator');

// POST /api/v1/auth/login - Iniciar sesión
router.post('/login',
    validateLogin,
    asyncHandler(authController.login)
);

// POST /api/v1/auth/logout - Cerrar sesión
router.post('/logout',
    authenticateToken,
    asyncHandler(authController.logout)
);

// POST /api/v1/auth/refresh - Refrescar token
router.post('/refresh',
    asyncHandler(authController.refreshToken)
);

// GET /api/v1/auth/me - Obtener información del usuario actual
router.get('/me',
    authenticateToken,
    asyncHandler(authController.getCurrentUser)
);

// PUT /api/v1/auth/me - Actualizar perfil del usuario actual
router.put('/me',
    authenticateToken,
    asyncHandler(authController.updateProfile)
);

// POST /api/v1/auth/change-password - Cambiar contraseña
router.post('/change-password',
    authenticateToken,
    validatePasswordChange,
    asyncHandler(authController.changePassword)
);

// POST /api/v1/auth/users - Crear nuevo usuario (solo admin)
router.post('/users',
    authenticateToken,
    requireRole(['admin']),
    validateUserCreation,
    asyncHandler(authController.createUser)
);

// GET /api/v1/auth/users - Obtener lista de usuarios (solo admin/supervisor)
router.get('/users',
    authenticateToken,
    requireRole(['admin', 'supervisor']),
    asyncHandler(authController.getUsers)
);

// GET /api/v1/auth/users/:id - Obtener usuario específico (solo admin/supervisor)
router.get('/users/:id',
    authenticateToken,
    requireRole(['admin', 'supervisor']),
    asyncHandler(authController.getUserById)
);

// PUT /api/v1/auth/users/:id - Actualizar usuario (solo admin)
router.put('/users/:id',
    authenticateToken,
    requireRole(['admin']),
    asyncHandler(authController.updateUser)
);

// DELETE /api/v1/auth/users/:id - Desactivar usuario (solo admin)
router.delete('/users/:id',
    authenticateToken,
    requireRole(['admin']),
    asyncHandler(authController.deactivateUser)
);

// POST /api/v1/auth/users/:id/activate - Activar usuario (solo admin)
router.post('/users/:id/activate',
    authenticateToken,
    requireRole(['admin']),
    asyncHandler(authController.activateUser)
);

// POST /api/v1/auth/users/:id/reset-password - Reset contraseña usuario (solo admin)
router.post('/users/:id/reset-password',
    authenticateToken,
    requireRole(['admin']),
    asyncHandler(authController.resetUserPassword)
);

// GET /api/v1/auth/sessions - Obtener sesiones activas del usuario
router.get('/sessions',
    authenticateToken,
    asyncHandler(authController.getActiveSessions)
);

// DELETE /api/v1/auth/sessions/:sessionId - Cerrar sesión específica
router.delete('/sessions/:sessionId',
    authenticateToken,
    asyncHandler(authController.terminateSession)
);

// DELETE /api/v1/auth/sessions - Cerrar todas las sesiones excepto la actual
router.delete('/sessions',
    authenticateToken,
    asyncHandler(authController.terminateAllSessions)
);

// POST /api/v1/auth/verify-token - Verificar validez del token
router.post('/verify-token',
    authenticateToken,
    asyncHandler(authController.verifyToken)
);

// 2FA endpoints
router.post('/2fa/setup', authenticateToken, asyncHandler(authController.setup2FA));
router.post('/2fa/verify', authenticateToken, asyncHandler(authController.verify2FA));

// Login 2FA
router.post('/login/2fa', asyncHandler(authController.login2FA));

// POST /api/v1/auth/users/:id/reset-2fa - Resetear 2FA de un usuario (solo admin)
router.post('/users/:id/reset-2fa',
    authenticateToken,
    requireRole(['admin']),
    asyncHandler(authController.reset2FA)
);

module.exports = router;
