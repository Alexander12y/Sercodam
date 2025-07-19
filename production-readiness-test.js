const axios = require('axios');
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno del backend
const backendEnvPath = path.join(__dirname, 'sercodam-backend', '.env');
if (fs.existsSync(backendEnvPath)) {
    require('dotenv').config({ path: backendEnvPath });
} else {
    require('dotenv').config();
}

// Configuración
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api/v1';
const TEST_USER = {
    username: 'admin',
    password: 'Admin123!'
};

let authToken = null;
let testResults = [];

// Función para agregar resultado de prueba
function addTestResult(testName, success, details = '') {
    const result = {
        test: testName,
        success,
        details,
        timestamp: new Date().toISOString()
    };
    testResults.push(result);
    console.log(`${success ? '✅' : '❌'} ${testName}: ${details}`);
    return result;
}

// 1. Verificar variables de entorno
async function testEnvironmentVariables() {
    console.log('\n🔧 PRUEBA 1: Variables de Entorno');
    console.log('==================================');
    
    const requiredVars = [
        'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
        'JWT_SECRET', 'NODE_ENV'
    ];
    
    const missingVars = [];
    requiredVars.forEach(varName => {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    });
    
    if (missingVars.length > 0) {
        addTestResult('Variables de entorno', false, `Faltan: ${missingVars.join(', ')}`);
    } else {
        addTestResult('Variables de entorno', true, 'Todas las variables requeridas están configuradas');
    }
    
    // Verificar configuración de Redis
    if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
        addTestResult('Configuración Redis', true, `Host: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
    } else {
        addTestResult('Configuración Redis', false, 'Variables de Redis no configuradas');
    }
}

// 2. Verificar conexión a base de datos
async function testDatabaseConnection() {
    console.log('\n🗄️ PRUEBA 2: Conexión a Base de Datos');
    console.log('=====================================');
    
    if (!process.env.DB_HOST || !process.env.DB_PASSWORD) {
        addTestResult('Conexión PostgreSQL', false, 'Variables de DB no configuradas');
        return;
    }
    
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    });
    
    try {
        await client.connect();
        addTestResult('Conexión PostgreSQL', true, 'Conexión exitosa');
        
        // Verificar tablas principales
        const tables = ['usuario', 'materiales_extras', 'herramientas', 'inventario_item'];
        for (const table of tables) {
            try {
                const result = await client.query(`SELECT COUNT(*) FROM catalogo_1.${table}`);
                addTestResult(`Tabla ${table}`, true, `${result.rows[0].count} registros`);
            } catch (error) {
                addTestResult(`Tabla ${table}`, false, error.message);
            }
        }
        
        await client.end();
    } catch (error) {
        addTestResult('Conexión PostgreSQL', false, error.message);
    }
}

// 3. Verificar que el servidor esté corriendo
async function testServerStatus() {
    console.log('\n🚀 PRUEBA 3: Estado del Servidor');
    console.log('===============================');
    
    try {
        const response = await axios.get(`${API_BASE_URL.replace('/api/v1', '')}/health`, {
            timeout: 5000
        });
        addTestResult('Servidor corriendo', true, `Status: ${response.status}`);
    } catch (error) {
        addTestResult('Servidor corriendo', false, error.message);
    }
}

// 4. Probar autenticación
async function testAuthentication() {
    console.log('\n🔐 PRUEBA 4: Autenticación');
    console.log('==========================');
    
    try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
            username: TEST_USER.username,
            password: TEST_USER.password
        });
        
        if (response.data.success && response.data.token) {
            authToken = response.data.token;
            addTestResult('Login exitoso', true, 'Token obtenido correctamente');
        } else {
            addTestResult('Login exitoso', false, 'Respuesta inesperada del servidor');
        }
    } catch (error) {
        addTestResult('Login exitoso', false, error.response?.data?.message || error.message);
    }
}

// 5. Probar rutas principales con autenticación
async function testProtectedRoutes() {
    console.log('\n🛡️ PRUEBA 5: Rutas Protegidas');
    console.log('=============================');
    
    if (!authToken) {
        addTestResult('Rutas protegidas', false, 'No hay token de autenticación');
        return;
    }
    
    const headers = { Authorization: `Bearer ${authToken}` };
    
    // Lista de rutas a probar
    const routes = [
        { name: 'Materiales', path: '/inventario/materiales', method: 'get' },
        { name: 'Herramientas', path: '/inventario/herramientas', method: 'get' },
        { name: 'Órdenes', path: '/ordenes', method: 'get' },
        { name: 'Clientes', path: '/clientes', method: 'get' },
        { name: 'Catálogos', path: '/catalogos/panos', method: 'get' }
    ];
    
    for (const route of routes) {
        try {
            const response = await axios[route.method](`${API_BASE_URL}${route.path}`, { headers });
            addTestResult(`Ruta ${route.name}`, true, `Status: ${response.status}`);
        } catch (error) {
            addTestResult(`Ruta ${route.name}`, false, error.response?.status || error.message);
        }
    }
}

// 6. Verificar archivos de configuración
async function testConfigurationFiles() {
    console.log('\n📁 PRUEBA 6: Archivos de Configuración');
    console.log('=====================================');
    
    const requiredFiles = [
        'sercodam-backend/src/config/database.js',
        'sercodam-backend/src/config/redis.js',
        'sercodam-backend/src/config/logger.js',
        'sercodam-backend/knexfile.js',
        'sercodam-backend/ecosystem.config.js'
    ];
    
    for (const file of requiredFiles) {
        if (fs.existsSync(file)) {
            addTestResult(`Archivo ${path.basename(file)}`, true, 'Archivo encontrado');
        } else {
            addTestResult(`Archivo ${path.basename(file)}`, false, 'Archivo no encontrado');
        }
    }
}

// 7. Verificar dependencias
async function testDependencies() {
    console.log('\n📦 PRUEBA 7: Dependencias');
    console.log('=========================');
    
    const packageJsonPath = 'sercodam-backend/package.json';
    if (fs.existsSync(packageJsonPath)) {
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const requiredDeps = ['express', 'pg', 'redis', 'jsonwebtoken', 'bcryptjs'];
            
            for (const dep of requiredDeps) {
                if (packageJson.dependencies[dep]) {
                    addTestResult(`Dependencia ${dep}`, true, `Versión: ${packageJson.dependencies[dep]}`);
                } else {
                    addTestResult(`Dependencia ${dep}`, false, 'No encontrada');
                }
            }
        } catch (error) {
            addTestResult('Package.json', false, error.message);
        }
    } else {
        addTestResult('Package.json', false, 'Archivo no encontrado');
    }
}

// 8. Verificar estructura de directorios
async function testDirectoryStructure() {
    console.log('\n📂 PRUEBA 8: Estructura de Directorios');
    console.log('=====================================');
    
    const requiredDirs = [
        'sercodam-backend/src/controllers',
        'sercodam-backend/src/routes',
        'sercodam-backend/src/middleware',
        'sercodam-backend/src/migrations',
        'sercodam-backend/src/config'
    ];
    
    for (const dir of requiredDirs) {
        if (fs.existsSync(dir)) {
            addTestResult(`Directorio ${path.basename(dir)}`, true, 'Directorio encontrado');
        } else {
            addTestResult(`Directorio ${path.basename(dir)}`, false, 'Directorio no encontrado');
        }
    }
}

// 9. Verificar logs y permisos
async function testLogsAndPermissions() {
    console.log('\n📝 PRUEBA 9: Logs y Permisos');
    console.log('============================');
    
    const logsDir = 'sercodam-backend/src/logs';
    if (fs.existsSync(logsDir)) {
        addTestResult('Directorio de logs', true, 'Directorio de logs existe');
    } else {
        addTestResult('Directorio de logs', false, 'Directorio de logs no existe');
    }
}

// 10. Verificar configuración de producción
async function testProductionConfig() {
    console.log('\n🏭 PRUEBA 10: Configuración de Producción');
    console.log('========================================');
    
    // Verificar que NODE_ENV esté configurado
    if (process.env.NODE_ENV) {
        addTestResult('NODE_ENV configurado', true, `Valor: ${process.env.NODE_ENV}`);
    } else {
        addTestResult('NODE_ENV configurado', false, 'Variable no configurada');
    }
    
    // Verificar JWT_SECRET
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length > 10) {
        addTestResult('JWT_SECRET configurado', true, 'Secret válido configurado');
    } else {
        addTestResult('JWT_SECRET configurado', false, 'Secret no configurado o muy corto');
    }
    
    // Verificar configuración de CORS
    if (process.env.CORS_ORIGIN) {
        addTestResult('CORS configurado', true, `Origin: ${process.env.CORS_ORIGIN}`);
    } else {
        addTestResult('CORS configurado', false, 'CORS_ORIGIN no configurado');
    }
}

// 11. Generar reporte final
async function generateReport() {
    console.log('\n📊 REPORTE FINAL');
    console.log('================');
    
    const totalTests = testResults.length;
    const passedTests = testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total de pruebas: ${totalTests}`);
    console.log(`✅ Exitosas: ${passedTests}`);
    console.log(`❌ Fallidas: ${failedTests}`);
    console.log(`📈 Porcentaje de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
        console.log('\n❌ PRUEBAS FALLIDAS:');
        console.log('===================');
        testResults.filter(r => !r.success).forEach(result => {
            console.log(`- ${result.test}: ${result.details}`);
        });
    }
    
    // Guardar reporte en archivo
    const report = {
        timestamp: new Date().toISOString(),
        summary: {
            total: totalTests,
            passed: passedTests,
            failed: failedTests,
            successRate: ((passedTests / totalTests) * 100).toFixed(1)
        },
        results: testResults
    };
    
    fs.writeFileSync('production-readiness-report.json', JSON.stringify(report, null, 2));
    console.log('\n📄 Reporte guardado en: production-readiness-report.json');
    
    return failedTests === 0;
}

// Función principal
async function runProductionReadinessTests() {
    console.log('🚀 PRUEBAS DE PREPARACIÓN PARA PRODUCCIÓN');
    console.log('========================================');
    console.log(`⏰ Iniciado: ${new Date().toLocaleString()}`);
    
    try {
        await testEnvironmentVariables();
        await testDatabaseConnection();
        await testServerStatus();
        await testAuthentication();
        await testProtectedRoutes();
        await testConfigurationFiles();
        await testDependencies();
        await testDirectoryStructure();
        await testLogsAndPermissions();
        await testProductionConfig();
        
        const allPassed = await generateReport();
        
        if (allPassed) {
            console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON! El backend está listo para producción.');
        } else {
            console.log('\n⚠️ Algunas pruebas fallaron. Revisa los errores antes de desplegar.');
        }
        
    } catch (error) {
        console.error('❌ Error ejecutando pruebas:', error.message);
    }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
    runProductionReadinessTests();
}

module.exports = { runProductionReadinessTests }; 