# Guía de Deployment - Sercodam OP

## Configuración para VPS

### 1. Variables de Entorno Backend

Crear archivo `.env` en `sercodam-backend/`:

```env
# Configuración del servidor
PORT=4000
NODE_ENV=production
API_VERSION=v1

# Configuración de CORS para VPS
CORS_ORIGIN=https://tu-dominio.com,http://localhost:3000,http://localhost:5173

# Configuración de rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Configuración de base de datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sercodam_db
DB_USER=sercodam_user
DB_PASSWORD=tu_password_seguro

# Configuración de Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=tu_redis_password

# Configuración de JWT
JWT_SECRET=tu_jwt_secret_muy_seguro_y_largo
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Configuración de logs
LOG_LEVEL=info
LOG_FILE_PATH=./src/logs

# Configuración de seguridad
BCRYPT_ROUNDS=12
```

### 2. Variables de Entorno Frontend

Crear archivo `.env` en `sercodam-frontend/`:

```env
# URL del API backend (para VPS)
VITE_API_URL=https://tu-dominio.com/api/v1

# Configuración de la aplicación
VITE_APP_TITLE=Sercodam - Orden de Producción
VITE_APP_VERSION=1.0.0
```

### 3. Configuración de Nginx

Crear archivo de configuración `/etc/nginx/sites-available/sercodam`:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    
    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name tu-dominio.com;
    
    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;
    
    # Configuración SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # Frontend (React)
    location / {
        root /var/www/sercodam-frontend/dist;
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

### 4. Configuración de PM2

Crear archivo `ecosystem.config.js` en la raíz del proyecto:

```javascript
module.exports = {
  apps: [
    {
      name: 'sercodam-backend',
      script: './sercodam-backend/src/server.js',
      cwd: './sercodam-backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024'
    }
  ]
};
```

### 5. Scripts de Deployment

#### Instalación de dependencias:
```bash
# Backend
cd sercodam-backend
npm install --production

# Frontend
cd ../sercodam-frontend
npm install
npm run build
```

#### Iniciar servicios:
```bash
# Iniciar backend con PM2
pm2 start ecosystem.config.js

# Configurar PM2 para iniciar automáticamente
pm2 startup
pm2 save

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 6. Configuración de Base de Datos

```sql
-- Crear usuario y base de datos
CREATE USER sercodam_user WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE sercodam_db OWNER sercodam_user;
GRANT ALL PRIVILEGES ON DATABASE sercodam_db TO sercodam_user;

-- Ejecutar migraciones
cd sercodam-backend
npx knex migrate:latest
npx knex seed:run
```

### 7. Configuración de Firewall

```bash
# Abrir puertos necesarios
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 8. Monitoreo y Logs

```bash
# Ver logs de PM2
pm2 logs sercodam-backend

# Ver logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Ver logs de la aplicación
tail -f sercodam-backend/src/logs/combined.log
```

### 9. Backup y Mantenimiento

```bash
# Backup de base de datos
pg_dump sercodam_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup de archivos
tar -czf sercodam_backup_$(date +%Y%m%d_%H%M%S).tar.gz sercodam-backend/ sercodam-frontend/
```

## Notas Importantes

1. **Seguridad**: Cambiar todas las contraseñas por defecto
2. **SSL**: Configurar certificados SSL con Let's Encrypt
3. **Backup**: Configurar backups automáticos
4. **Monitoreo**: Configurar alertas de monitoreo
5. **Updates**: Mantener el sistema actualizado regularmente 