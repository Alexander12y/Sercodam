#!/bin/bash

# Script de Deployment para Sercodam OP
# Uso: ./deploy.sh [production|staging]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Verificar argumentos
ENVIRONMENT=${1:-production}
if [[ "$ENVIRONMENT" != "production" && "$ENVIRONMENT" != "staging" ]]; then
    error "Entorno debe ser 'production' o 'staging'"
fi

log "Iniciando deployment para entorno: $ENVIRONMENT"

# Verificar que estamos en el directorio correcto
if [[ ! -f "package.json" && ! -d "sercodam-backend" ]]; then
    error "Debe ejecutar este script desde la raíz del proyecto"
fi

# Verificar dependencias del sistema
log "Verificando dependencias del sistema..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    error "Node.js no está instalado"
fi

# Verificar npm
if ! command -v npm &> /dev/null; then
    error "npm no está instalado"
fi

# Verificar PM2
if ! command -v pm2 &> /dev/null; then
    warn "PM2 no está instalado. Instalando..."
    npm install -g pm2
fi

# Verificar variables de entorno
log "Verificando archivos de configuración..."

if [[ ! -f "sercodam-backend/.env" ]]; then
    error "Archivo .env no encontrado en sercodam-backend/"
fi

if [[ ! -f "sercodam-frontend/.env" ]]; then
    error "Archivo .env no encontrado en sercodam-frontend/"
fi

# Backup del estado actual
log "Creando backup del estado actual..."
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

if [[ -d "sercodam-backend/dist" ]]; then
    cp -r sercodam-backend/dist "$BACKUP_DIR/"
fi

if [[ -d "sercodam-frontend/dist" ]]; then
    cp -r sercodam-frontend/dist "$BACKUP_DIR/"
fi

# Deployment del Backend
log "Desplegando backend..."

cd sercodam-backend

# Instalar dependencias
log "Instalando dependencias del backend..."
npm ci --only=production

# Ejecutar migraciones
log "Ejecutando migraciones de base de datos..."
npx knex migrate:latest

# Ejecutar seeds si es necesario
if [[ "$ENVIRONMENT" == "staging" ]]; then
    log "Ejecutando seeds para staging..."
    npx knex seed:run
fi

cd ..

# Deployment del Frontend
log "Desplegando frontend..."

cd sercodam-frontend

# Instalar dependencias
log "Instalando dependencias del frontend..."
npm ci

# Build de producción
log "Construyendo aplicación frontend..."
npm run build

cd ..

# Reiniciar servicios
log "Reiniciando servicios..."

# Detener servicios existentes
if pm2 list | grep -q "sercodam-backend"; then
    log "Deteniendo servicios existentes..."
    pm2 stop sercodam-backend || true
    pm2 delete sercodam-backend || true
fi

# Iniciar backend con PM2
log "Iniciando backend con PM2..."
cd sercodam-backend
pm2 start ecosystem.config.js --env $ENVIRONMENT
cd ..

# Guardar configuración de PM2
pm2 save

# Verificar estado de los servicios
log "Verificando estado de los servicios..."
sleep 5

if pm2 list | grep -q "sercodam-backend.*online"; then
    log "✅ Backend iniciado correctamente"
else
    error "❌ Error al iniciar el backend"
fi

# Health check
log "Realizando health check..."
HEALTH_CHECK_URL="http://localhost:4000/health"
if command -v curl &> /dev/null; then
    if curl -f -s "$HEALTH_CHECK_URL" > /dev/null; then
        log "✅ Health check exitoso"
    else
        warn "⚠️  Health check falló, pero el servicio puede estar iniciando..."
    fi
else
    warn "⚠️  curl no disponible, saltando health check"
fi

# Limpiar backups antiguos (mantener solo los últimos 5)
log "Limpiando backups antiguos..."
cd backups
ls -t | tail -n +6 | xargs -r rm -rf
cd ..

# Resumen del deployment
log "🎉 Deployment completado exitosamente!"
log "📊 Resumen:"
log "   - Entorno: $ENVIRONMENT"
log "   - Backend: $(pm2 list | grep sercodam-backend | awk '{print $4}')"
log "   - Frontend: Construido en sercodam-frontend/dist/"
log "   - Backup: $BACKUP_DIR"

if [[ "$ENVIRONMENT" == "production" ]]; then
    log "🔗 URLs:"
    log "   - Frontend: https://tu-dominio.com"
    log "   - API: https://tu-dominio.com/api/v1"
    log "   - Health: https://tu-dominio.com/health"
fi

log "📝 Comandos útiles:"
log "   - Ver logs: pm2 logs sercodam-backend"
log "   - Reiniciar: pm2 restart sercodam-backend"
log "   - Estado: pm2 status" 