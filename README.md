# Sercodam - Sistema de Órdenes de Producción

Sistema completo de gestión de órdenes de producción para la empresa Sercodam, incluyendo inventario de materiales, paños, herramientas y gestión de cortes.

## 🚀 Características Principales

### Backend (Node.js + Express + Knex)
- **Gestión de Usuarios**: Autenticación JWT con roles
- **Inventario Completo**: 
  - Paños (nylon, lona, polipropileno, malla sombra)
  - Materiales
  - Herramientas
- **Órdenes de Producción**: 
  - Creación y gestión completa
  - Estados: borrador, pendiente, en_proceso, completada, cancelada
  - Sistema de cortes guillotine para paños
- **Movimientos de Inventario**: Entradas, salidas y ajustes
- **Base de Datos**: PostgreSQL con migraciones y seeds

### Frontend (React + Vite + Redux Toolkit)
- **Interfaz Moderna**: Diseño responsive con componentes reutilizables
- **Gestión de Estado**: Redux Toolkit para estado global
- **Formularios Dinámicos**: Adaptables según tipo de material
- **Dashboard**: Vista general del sistema
- **Gestión de Cortes**: Interfaz para ejecutar cortes de paños

## 📁 Estructura del Proyecto

```
Sercodam-OP/
├── sercodam-backend/          # Backend Node.js
│   ├── src/
│   │   ├── config/           # Configuración de BD, Redis, etc.
│   │   ├── controllers/      # Controladores de la API
│   │   ├── middleware/       # Middleware de autenticación y errores
│   │   ├── migrations/       # Migraciones de base de datos
│   │   ├── routes/           # Rutas de la API
│   │   ├── seeds/            # Datos iniciales
│   │   ├── services/         # Servicios (PDF, webhooks)
│   │   └── validators/       # Validación de datos
│   ├── package.json
│   └── knexfile.js
├── sercodam-frontend/         # Frontend React
│   ├── src/
│   │   ├── components/       # Componentes reutilizables
│   │   ├── pages/           # Páginas principales
│   │   ├── store/           # Redux store y slices
│   │   ├── services/        # Servicios de API
│   │   └── hooks/           # Custom hooks
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **Knex.js** - Query builder para PostgreSQL
- **PostgreSQL** - Base de datos principal
- **Redis** - Cache y sesiones
- **JWT** - Autenticación
- **Multer** - Manejo de archivos
- **PDFKit** - Generación de PDFs

### Frontend
- **React 18** - Biblioteca de UI
- **Vite** - Build tool y dev server
- **Redux Toolkit** - Gestión de estado
- **React Router** - Navegación
- **Axios** - Cliente HTTP
- **Tailwind CSS** - Framework de estilos

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

### 1. Clonar el repositorio
```bash
git clone https://github.com/Alexander12y/Sercodam.git
cd Sercodam
```

### 2. Configurar Base de Datos
```bash
# Crear base de datos PostgreSQL
createdb sercodam_db

# Configurar variables de entorno
cp sercodam-backend/config/development.js.example sercodam-backend/config/development.js
# Editar el archivo con tus credenciales
```

### 3. Instalar dependencias
```bash
# Backend
cd sercodam-backend
npm install

# Frontend
cd ../sercodam-frontend
npm install
```

### 4. Ejecutar migraciones y seeds
```bash
cd sercodam-backend
npm run migrate
npm run seed
```

### 5. Iniciar servicios
```bash
# Backend (puerto 3001)
cd sercodam-backend
npm run dev

# Frontend (puerto 5173)
cd sercodam-frontend
npm run dev
```

## 📊 Funcionalidades del Sistema

### Gestión de Inventario
- **Paños**: Soporte para múltiples tipos (nylon, lona, polipropileno, malla sombra)
- **Materiales**: Gestión de materiales con especificaciones
- **Herramientas**: Control de herramientas y equipos
- **Movimientos**: Entradas, salidas y ajustes de inventario

### Órdenes de Producción
- **Estados**: Borrador → Pendiente → En Proceso → Completada/Cancelada
- **Materiales**: Asignación de materiales por orden
- **Cortes**: Sistema de cortes guillotine para paños
- **PDFs**: Generación automática de documentos

### Sistema de Cortes
- **Algoritmo Guillotine**: Optimización de cortes en paños
- **Remanentes**: Gestión de sobrantes reutilizables
- **Planificación**: Visualización del plan de cortes
- **Ejecución**: Interfaz para ejecutar cortes

## 🔧 Configuración de Desarrollo

### Variables de Entorno
```bash
# Backend (.env)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sercodam_db
DB_USER=tu_usuario
DB_PASSWORD=tu_password
JWT_SECRET=tu_jwt_secret
REDIS_URL=redis://localhost:6379
```

### Scripts Disponibles
```bash
# Backend
npm run dev          # Desarrollo con nodemon
npm run start        # Producción
npm run migrate      # Ejecutar migraciones
npm run seed         # Ejecutar seeds
npm run test         # Ejecutar tests

# Frontend
npm run dev          # Desarrollo
npm run build        # Build de producción
npm run preview      # Preview del build
```

## 📝 API Endpoints

### Autenticación
- `POST /api/v1/auth/login` - Iniciar sesión
- `POST /api/v1/auth/logout` - Cerrar sesión
- `GET /api/v1/auth/profile` - Obtener perfil

### Inventario
- `GET /api/v1/inventario/panos` - Listar paños
- `POST /api/v1/inventario/panos` - Crear paño
- `PUT /api/v1/inventario/panos/:id` - Actualizar paño
- `DELETE /api/v1/inventario/panos/:id` - Eliminar paño

### Órdenes
- `GET /api/v1/ordenes` - Listar órdenes
- `POST /api/v1/ordenes` - Crear orden
- `PUT /api/v1/ordenes/:id` - Actualizar orden
- `DELETE /api/v1/ordenes/:id` - Eliminar orden

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Autores

- **Alexander** - *Desarrollo inicial* - [Alexander12y](https://github.com/Alexander12y)

## 🙏 Agradecimientos

- Equipo de desarrollo de Sercodam
- Comunidad de Node.js y React
- Contribuidores del proyecto

---

**Sercodam** - Sistema de Órdenes de Producción v1.0