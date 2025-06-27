import axios from 'axios';

// Configuración base de axios
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API de órdenes
export const ordenesApi = {
  // Obtener todas las órdenes
  getOrdenes: (params = {}) => api.get('/ordenes', { params }),
  
  // Obtener órdenes pendientes
  getOrdenesPendientes: () => api.get('/ordenes/pendientes'),
  
  // Obtener órdenes activas
  getOrdenesActivas: () => api.get('/ordenes/activas'),
  
  // Obtener órdenes completadas
  getOrdenesCompletadas: (params = {}) => api.get('/ordenes/completadas', { params }),
  
  // Obtener orden por ID
  getOrdenById: (id) => api.get(`/ordenes/${id}`),
  
  // Obtener detalle completo de orden
  getOrdenDetalle: (id) => api.get(`/ordenes/${id}/detalle`),
  
  // Crear nueva orden
  createOrden: (data) => api.post('/ordenes', data),
  
  // Actualizar orden
  updateOrden: (id, data) => api.put(`/ordenes/${id}`, data),
  
  // Cambiar estado de orden
  cambiarEstadoOrden: (id, data) => api.patch(`/ordenes/${id}/estado`, data),
  
  // Agregar materiales a orden
  agregarMateriales: (id, data) => api.post(`/ordenes/${id}/materiales`, data),
  
  // Asignar herramientas a orden
  asignarHerramientas: (id, data) => api.post(`/ordenes/${id}/herramientas`, data),
  
  // Obtener estadísticas
  getEstadisticas: () => api.get('/ordenes/stats/resumen'),
};

// API de autenticación
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  getProfile: () => api.get('/auth/profile'),
};

// API de inventario (para obtener materiales y herramientas)
export const inventarioApi = {
  getItems: (params = {}) => api.get('/inventario/items', { params }),
  getHerramientas: (params = {}) => api.get('/inventario/herramientas', { params }),
  getMateriales: (params = {}) => api.get('/inventario/materiales', { params }),
  getPanos: (params = {}) => api.get('/inventario/panos', { params }),
};

// API de paños (alias para inventarioApi.getPanos)
export const panosApi = {
  getPanos: (params = {}) => api.get('/inventario/panos', { params }),
  getPanoById: (id) => api.get(`/inventario/panos/${id}`),
  createPano: (data) => api.post('/inventario/panos', data),
  updatePano: (id, data) => api.put(`/inventario/panos/${id}`, data),
  deletePano: (id) => api.delete(`/inventario/panos/${id}`),
  postEntradaPano: (data) => api.post('/inventario/panos/entrada', data),
  postSalidaPano: (data) => api.post('/inventario/panos/salida', data),
  getMovimientosPano: (id_item) => api.get(`/inventario/panos/${id_item}/movimientos`),
  getNylonCatalogos: () => api.get('/inventario/panos/catalogos/nylon'),
  getPolipropilenoCatalogos: () => api.get('/inventario/panos/catalogos/polipropileno'),
  getLonaCatalogos: () => api.get('/inventario/panos/catalogos/lona'),
  getMallaSombraCatalogos: () => api.get('/inventario/panos/catalogos/malla-sombra'),
};

// API de materiales
export const materialesApi = {
  getMateriales: (params = {}) => api.get('/inventario/materiales', { params }),
  getMaterialById: (id) => api.get(`/inventario/materiales/${id}`),
  createMaterial: (data) => api.post('/inventario/materiales', data),
  updateMaterial: (id, data) => api.put(`/inventario/materiales/${id}`, data),
  deleteMaterial: (id) => api.delete(`/inventario/materiales/${id}`),
  getCategorias: () => api.get('/inventario/materiales/categorias'),
  getSubgrupos: () => api.get('/inventario/materiales/subgrupos'),
  getMaterialesPorCategoria: (categoria, params = {}) => 
    api.get(`/inventario/materiales/categoria/${categoria}`, { params }),
  entradaMaterial: (data) => api.post('/inventario/materiales/entrada', data),
  salidaMaterial: (data) => api.post('/inventario/materiales/salida', data),
};

export default api; 