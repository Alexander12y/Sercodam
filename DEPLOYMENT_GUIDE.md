# 🚀 Guía Completa de Deployment - SERCODAM OP

## 📋 Resumen del Proyecto

**Sercodam OP** es un sistema de gestión de órdenes de producción para SERCODAM, empresa especializada en redes deportivas, industriales y de construcción. El sistema incluye:

- **Backend**: Node.js + Express + PostgreSQL + Redis
- **Frontend**: React + Vite + Material-UI
- **Base de datos**: PostgreSQL con migraciones Knex
- **Cache**: Redis con fallback automático
- **Autenticación**: JWT + 2FA
- **PDF**: Generación automática de órdenes
- **Webhooks**: Integración con Make.com

---

## 🎯 Objetivo del Deployment

Desplegar el sistema en un VPS con Rocky Linux para que los usuarios de SERCODAM puedan acceder a través de un dominio y optimizar sus procesos de producción.

---

## 🔧 Preparación del Proyecto

### 1. Verificación Pre-Deployment

```bash
# Ejecutar verificación completa
chmod +x verify-deployment.sh
./verify-deployment.sh
```

### 2. Limpieza del Proyecto

```bash
# Ejecutar limpieza automática
chmod +x cleanup-for-deployment.sh
./cleanup-for-deployment.sh
```

### 3. Configuración de Variables de Entorno

#### Backend (.env en sercodam-backend/)

```env
# Configuración del servidor
PORT=4000
NODE_ENV=production
API_VERSION=v1

# Configuración de CORS para VPS
CORS_ORIGIN=https://op.sercodam.com,https://ordenes.sercodam.com

# Configuración de rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Configuración de base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sercodam_db
DB_USER=sercodam_user
DB_PASSWORD=tu_password_seguro_y_complejo
DB_SCHEMA=catalogo_1

# Configuración de Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=tu_redis_password_seguro

# Configuración de JWT
JWT_SECRET=tu_jwt_secret_muy_seguro_y_largo_minimo_32_caracteres
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Configuración de logs
LOG_LEVEL=info
LOG_FILE_PATH=./src/logs

# Configuración de seguridad
BCRYPT_ROUNDS=12

# Configuración de webhooks (opcional)
MAKE_WEBHOOK_URL=https://hook.eu1.make.com/tu-webhook-id
MAKE_API_KEY=tu-api-key
MAKE_WEBHOOK_SECRET=sercodam_make_webhook_2025
```

#### Frontend (.env en sercodam-frontend/)

```env
# URL del API backend (para VPS)
VITE_API_URL=https://op.sercodam.com/api/v1

# Configuración de la aplicación
VITE_APP_TITLE=Sercodam - Orden de Producción
VITE_APP_VERSION=1.0.0
```

---

## 🖥️ Configuración del VPS (Rocky Linux)

### 1. Actualización del Sistema

```bash
# Actualizar sistema
sudo dnf update -y
sudo dnf upgrade -y

# Reiniciar si es necesario
sudo reboot
```

### 2. Instalación de Dependencias

```bash
# Instalar Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# Instalar PostgreSQL 15+
sudo dnf install -y postgresql15-server postgresql15

# Instalar Redis
sudo dnf install -y redis

# Instalar Nginx
sudo dnf install -y nginx

# Instalar herramientas adicionales
sudo dnf install -y git curl wget unzip
```

### 3. Configuración de PostgreSQL

```bash
# Inicializar base de datos
sudo postgresql-setup --initdb

# Habilitar y iniciar PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Crear usuario y base de datos
sudo -u postgres psql << EOF
CREATE USER sercodam_user WITH PASSWORD 'tu_password_seguro_y_complejo';
CREATE DATABASE sercodam_db OWNER sercodam_user;
GRANT ALL PRIVILEGES ON DATABASE sercodam_db TO sercodam_user;
\c sercodam_db
CREATE SCHEMA IF NOT EXISTS catalogo_1;
GRANT ALL ON SCHEMA catalogo_1 TO sercodam_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA catalogo_1 TO sercodam_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA catalogo_1 TO sercodam_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA catalogo_1 GRANT ALL ON TABLES TO sercodam_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA catalogo_1 GRANT ALL ON SEQUENCES TO sercodam_user;
EOF
```

### 4. Configuración de Redis

```bash
# Configurar Redis
sudo cp /etc/redis.conf /etc/redis.conf.backup
sudo sed -i 's/# requirepass foobared/requirepass tu_redis_password_seguro/' /etc/redis.conf
sudo sed -i 's/bind 127.0.0.1/bind 127.0.0.1/' /etc/redis.conf

# Habilitar y iniciar Redis
sudo systemctl enable redis
sudo systemctl start redis

# Verificar Redis
redis-cli -a tu_redis_password_seguro ping
```

### 5. Instalación de PM2

```bash
# Instalar PM2 globalmente
sudo npm install -g pm2

# Configurar PM2 para iniciar automáticamente
pm2 startup
# Seguir las instrucciones que aparecen
```

---

## 📁 Configuración del Proyecto

### 1. Clonar el Repositorio

```bash
# Crear directorio para la aplicación
sudo mkdir -p /var/www
sudo chown $USER:$USER /var/www

# Clonar repositorio
cd /var/www
git clone https://github.com/your-username/sercodam-op.git
cd sercodam-op

# Dar permisos
chmod +x *.sh
```

### 2. Configurar Variables de Entorno

```bash
# Crear archivos .env
cp sercodam-backend/.env.example sercodam-backend/.env
cp sercodam-frontend/.env.example sercodam-frontend/.env

# Editar variables de entorno
nano sercodam-backend/.env
nano sercodam-frontend/.env
```

### 3. Instalar Dependencias

```bash
# Backend
cd sercodam-backend
npm ci --only=production

# Frontend
cd ../sercodam-frontend
npm ci
npm run build
cd ..
```

### 4. Configurar Base de Datos

```bash
# Ejecutar migraciones
cd sercodam-backend
npx knex migrate:latest

# Ejecutar seeds (opcional)
npx knex seed:run
cd ..
```

---

## 🌐 Configuración de Nginx

### 1. Configuración del Sitio

```bash
# Crear configuración de Nginx
sudo nano /etc/nginx/sites-available/sercodam
```

```nginx
server {
    listen 80;
    server_name op.sercodam.com ordenes.sercodam.com;
    
    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name op.sercodam.com ordenes.sercodam.com;
    
    # Certificados SSL (configurar después)
    ssl_certificate /etc/letsencrypt/live/op.sercodam.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/op.sercodam.com/privkey.pem;
    
    # Configuración SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Frontend (React)
    location / {
        root /var/www/sercodam-op/sercodam-frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Headers de seguridad
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:4000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Habilitar el Sitio

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/sercodam /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

## 🔒 Configuración de SSL

### 1. Instalar Certbot

```bash
# Instalar EPEL
sudo dnf install -y epel-release

# Instalar Certbot
sudo dnf install -y certbot python3-certbot-nginx
```

### 2. Obtener Certificados SSL

```bash
# Obtener certificado SSL
sudo certbot --nginx -d op.sercodam.com -d ordenes.sercodam.com

# Configurar renovación automática
sudo crontab -e
# Agregar línea: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🚀 Deployment Final

### 1. Iniciar la Aplicación

```bash
# Ejecutar deployment
cd /var/www/sercodam-op
./deploy.sh production
```

### 2. Verificar Estado

```bash
# Verificar PM2
pm2 status
pm2 logs sercodam-backend

# Verificar servicios
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis

# Health check
curl -f https://op.sercodam.com/health
```

### 3. Configurar Firewall

```bash
# Configurar firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

---

## 📊 Monitoreo y Mantenimiento

### 1. Logs

```bash
# Logs de la aplicación
pm2 logs sercodam-backend

# Logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs de PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### 2. Backup

```bash
# Script de backup automático
sudo nano /usr/local/bin/backup-sercodam.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/sercodam"

mkdir -p $BACKUP_DIR

# Backup de base de datos
pg_dump sercodam_db > $BACKUP_DIR/sercodam_db_$DATE.sql

# Backup de archivos
tar -czf $BACKUP_DIR/sercodam_files_$DATE.tar.gz /var/www/sercodam-op

# Limpiar backups antiguos (mantener últimos 7 días)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

```bash
# Hacer ejecutable y configurar cron
chmod +x /usr/local/bin/backup-sercodam.sh
sudo crontab -e
# Agregar línea: 0 2 * * * /usr/local/bin/backup-sercodam.sh
```

### 3. Actualizaciones

```bash
# Script de actualización
sudo nano /usr/local/bin/update-sercodam.sh
```

```bash
#!/bin/bash
cd /var/www/sercodam-op

# Backup antes de actualizar
/usr/local/bin/backup-sercodam.sh

# Actualizar código
git pull origin main

# Reinstalar dependencias
cd sercodam-backend && npm ci --only=production && cd ..
cd sercodam-frontend && npm ci && npm run build && cd ..

# Ejecutar migraciones
cd sercodam-backend && npx knex migrate:latest && cd ..

# Reiniciar aplicación
pm2 reload sercodam-backend
```

---

## 🔧 Solución de Problemas

### Problemas Comunes

1. **Error de conexión a base de datos**
   ```bash
   # Verificar PostgreSQL
   sudo systemctl status postgresql
   sudo -u postgres psql -c "\l"
   ```

2. **Error de conexión a Redis**
   ```bash
   # Verificar Redis
   sudo systemctl status redis
   redis-cli -a tu_password ping
   ```

3. **Error de permisos**
   ```bash
   # Verificar permisos
   ls -la /var/www/sercodam-op
   sudo chown -R $USER:$USER /var/www/sercodam-op
   ```

4. **Error de SSL**
   ```bash
   # Verificar certificados
   sudo certbot certificates
   sudo nginx -t
   ```

### Comandos Útiles

```bash
# Reiniciar servicios
pm2 restart sercodam-backend
sudo systemctl restart nginx
sudo systemctl restart postgresql
sudo systemctl restart redis

# Ver logs en tiempo real
pm2 logs sercodam-backend --lines 100
sudo tail -f /var/log/nginx/error.log

# Verificar puertos
sudo netstat -tlnp | grep :4000
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

---

## 📞 Soporte

Para problemas técnicos o soporte:

1. **Logs**: Revisar logs de la aplicación y servicios
2. **Documentación**: Consultar esta guía y documentación del proyecto
3. **Backup**: Restaurar desde backup si es necesario
4. **Contacto**: Contactar al equipo de desarrollo

---

## ✅ Checklist de Deployment

- [ ] VPS configurado con Rocky Linux
- [ ] Node.js 18+ instalado
- [ ] PostgreSQL configurado
- [ ] Redis configurado
- [ ] Nginx configurado
- [ ] SSL configurado
- [ ] Proyecto clonado y configurado
- [ ] Variables de entorno configuradas
- [ ] Base de datos migrada
- [ ] Aplicación desplegada con PM2
- [ ] Firewall configurado
- [ ] Backup configurado
- [ ] Monitoreo configurado
- [ ] Pruebas realizadas
- [ ] Documentación actualizada

---

**🎉 ¡El sistema está listo para producción!** 