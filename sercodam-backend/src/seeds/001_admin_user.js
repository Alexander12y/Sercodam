const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
    // Limpiar tabla
    await knex('usuario').del();
    
    // Crear hash de contraseña
    const hashedPassword = await bcrypt.hash('Admin123!', 12);
    
    // Insertar usuario administrador
    await knex('usuario').insert([
        {
            username: 'admin',
            email: 'admin@sercodam.com',
            nombre: 'Administrador',
            apellido: 'Sistema',
            password: hashedPassword,
            rol: 'admin',
            activo: true,
            email_verificado: true,
            creado_en: new Date(),
            actualizado_en: new Date()
        },
        {
            username: 'supervisor',
            email: 'supervisor@sercodam.com',
            nombre: 'Supervisor',
            apellido: 'Producción',
            password: hashedPassword,
            rol: 'supervisor',
            activo: true,
            email_verificado: true,
            creado_en: new Date(),
            actualizado_en: new Date()
        },
        {
            username: 'operador',
            email: 'operador@sercodam.com',
            nombre: 'Operador',
            apellido: 'Producción',
            password: hashedPassword,
            rol: 'operador',
            activo: true,
            email_verificado: true,
            creado_en: new Date(),
            actualizado_en: new Date()
        }
    ]);
}; 