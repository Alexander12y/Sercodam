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
    } else if (error.response?.status === 429) {
      // Rate limiting - mostrar mensaje más amigable
      console.warn('Rate limit alcanzado. Esperando antes de reintentar...');
      
      // Retornar un error más descriptivo
      return Promise.reject({
        ...error,
        message: 'Demasiadas solicitudes. Por favor, espera un momento antes de continuar.'
      });
    } else if (error.response?.status >= 500) {
      // Errores del servidor
      console.error('Error del servidor:', error.response?.data);
      return Promise.reject({
        ...error,
        message: 'Error interno del servidor. Por favor, intenta de nuevo más tarde.'
      });
    }
    
    return Promise.reject(error);
  }
);

// API de órdenes
export const ordenesApi = {
  // Obtener todas las órdenes
  getOrdenes: (params = {}) => api.get('/ordenes', { params }),
  
      // Obtener órdenes borrador
    getOrdenesBorradores: () => api.get('/ordenes/borradores'),
  
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
  
  // Aprobar orden
  approveOrden: (id) => api.post(`/ordenes/${id}/approve`),

  // Eliminar orden
  deleteOrden: (id) => api.delete(`/ordenes/${id}`),
  
  // Eliminar orden
  deleteOrden: (id) => api.delete(`/ordenes/${id}`),
  
  // Agregar materiales a orden
  agregarMateriales: (id, data) => api.post(`/ordenes/${id}/materiales`, data),
  
  // Asignar herramientas a orden
  asignarHerramientas: (id, data) => api.post(`/ordenes/${id}/herramientas`, data),
  
  // Obtener estadísticas
  getEstadisticas: () => api.get('/ordenes/stats/resumen'),
  
  // Buscar clientes para autocompletado
  searchClientes: (query) => api.get(`/ordenes/clientes/search?q=${query}`),
};

// API de autenticación
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (profileData) => api.put('/auth/me', profileData),
  changePassword: (passwordData) => api.post('/auth/change-password', passwordData),
  
  // Gestión de usuarios (solo admin)
  getUsers: (params = '') => api.get(`/auth/users?${params}`),
  getUserById: (id) => api.get(`/auth/users/${id}`),
  createUser: (userData) => api.post('/auth/users', userData),
  updateUser: (id, userData) => api.put(`/auth/users/${id}`, userData),
  deactivateUser: (id) => api.delete(`/auth/users/${id}`),
  activateUser: (id) => api.post(`/auth/users/${id}/activate`),
  
  // 2FA
  login2FA: (data) => api.post('/auth/login/2fa', data),
  setup2FA: () => api.post('/auth/2fa/setup'),
  verify2FA: (data) => api.post('/auth/2fa/verify', data),
  resetUser2FA: (id) => api.post(`/auth/users/${id}/reset-2fa`),
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
  // Nuevos endpoints para datos completos del catálogo
  getNylonFullData: () => api.get('/inventario/panos/catalogos/nylon/full'),
  getPolipropilenoFullData: () => api.get('/inventario/panos/catalogos/polipropileno/full'),
  getLonaFullData: () => api.get('/inventario/panos/catalogos/lona/full'),
  getMallaSombraFullData: () => api.get('/inventario/panos/catalogos/malla-sombra/full'),
  calculateRecommendedDimensions: (data) => api.post('/inventario/panos/calculate-dimensions', data),
  findIdMcrBySpecs: (data) => api.post('/inventario/panos/find-id-mcr', data),
  // Nuevos endpoints para redes producto (catálogo)
  getRedesProducto: (params = {}) => api.get('/inventario/redes-producto', { params }),
  getRedesProductoCatalogos: (params = {}) => api.get('/inventario/redes-producto/catalogos', { params }),
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

// API de drafts
export const draftsApi = {
  saveDraft: (data) => api.post('/drafts', data),
  getDraftByUser: (idUsuario) => api.get(`/drafts/user/${idUsuario}`),
  getAllDrafts: (params = {}) => api.get('/drafts', { params }),
  deleteDraft: (idDraft) => api.delete(`/drafts/${idDraft}`),
  deleteUserDraft: (idUsuario) => api.delete(`/drafts/user/${idUsuario}`),
  cleanupExpiredDrafts: () => api.post('/drafts/cleanup'),
};

// API de drafts de cotizaciones
export const cotizacionesDraftsApi = {
  saveDraft: (data) => api.post('/cotizaciones-drafts', data),
  getDraftByUser: (idUsuario) => api.get(`/cotizaciones-drafts/user/${idUsuario}`),
  getAllDrafts: (params = {}) => api.get('/cotizaciones-drafts', { params }),
  deleteDraft: (idDraft) => api.delete(`/cotizaciones-drafts/${idDraft}`),
  deleteUserDraft: (idUsuario) => api.delete(`/cotizaciones-drafts/user/${idUsuario}`),
  cleanupExpiredDrafts: () => api.post('/cotizaciones-drafts/cleanup'),
};

// API de herramientas
export const herramientasApi = {
  // Obtener todas las herramientas
  getHerramientas: (params = {}) => api.get('/inventario/herramientas', { params }),
  
  // Obtener categorías
  getCategorias: () => api.get('/inventario/herramientas/categorias'),
  
  // Obtener estados de calidad
  getEstados: () => api.get('/inventario/herramientas/estados'),
  
  // Obtener ubicaciones
  getUbicaciones: () => api.get('/inventario/herramientas/ubicaciones'),
  
  // Obtener herramientas por categoría
  getHerramientasPorCategoria: (categoria, params = {}) => 
    api.get(`/inventario/herramientas/categoria/${categoria}`, { params }),
  
  // Obtener herramienta por ID
  getHerramientaById: (id) => api.get(`/inventario/herramientas/${id}`),
  
  // Crear nueva herramienta
  createHerramienta: (data) => api.post('/inventario/herramientas', data),
  
  // Actualizar herramienta
  updateHerramienta: (id, data) => api.put(`/inventario/herramientas/${id}`, data),
  
  // Eliminar herramienta
  deleteHerramienta: (id) => api.delete(`/inventario/herramientas/${id}`),
  
  // Registrar entrada
  entradaHerramienta: (data) => api.post('/inventario/herramientas/entrada', data),
  
  // Registrar salida
  salidaHerramienta: (data) => api.post('/inventario/herramientas/salida', data),
};

// API de clientes
export const clientesApi = {
  // Obtener todos los clientes
  getClientes: (params = {}) => api.get('/clientes', { params }),
  
  // Buscar clientes para autocompletado
  searchClientes: (query) => api.get(`/clientes/search?q=${query}`),
  
  // Obtener cliente por ID
  getClienteById: (id) => api.get(`/clientes/${id}`),
  
  // Obtener órdenes de un cliente
  getOrdenesCliente: (id, params = {}) => api.get(`/clientes/${id}/ordenes`, { params }),
  
  // Crear nuevo cliente
  createCliente: (data) => api.post('/clientes', data),
  
  // Actualizar cliente
  updateCliente: (id, data) => api.put(`/clientes/${id}`, data),
  
  // Eliminar cliente
  deleteCliente: (id) => api.delete(`/clientes/${id}`),
};

// API de leads
export const leadsApi = {
  // Obtener todos los leads
  getLeads: (params = {}) => api.get('/leads', { params }),
  
  // Obtener estadísticas de leads
  getLeadsStats: () => api.get('/leads/stats'),
  
  // Obtener lead por ID
  getLeadById: (id) => api.get(`/leads/${id}`),
  
  // Actualizar lead
  updateLead: (id, data) => api.put(`/leads/${id}`, data),
  
  // Eliminar lead
  deleteLead: (id) => api.delete(`/leads/${id}`),
  
  // Obtener conteo de leads no leídos
  getUnreadLeadsCount: () => api.get('/leads/unread/count'),
  
  // Convertir lead a cliente
  convertToClient: (id, data = {}) => api.post(`/leads/${id}/convert-to-client`, data),
};

// API del sistema de cotizaciones
export const cotizacionesApi = {
  getCotizaciones: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/cotizaciones${queryString ? `?${queryString}` : ''}`);
  },
  
  getCotizacionById: (id) => api.get(`/cotizaciones/${id}`),
  
  createCotizacion: (data) => api.post('/cotizaciones', data),
  
  updateCotizacion: (id, data) => api.put(`/cotizaciones/${id}`, data),
  
  deleteCotizacion: (id) => api.delete(`/cotizaciones/${id}`),
  
  changeEstado: (id, estado, notas = '') => 
    api.patch(`/cotizaciones/${id}/estado`, { estado, notas }),
  
  generatePDF: (id) => 
    api.get(`/cotizaciones/${id}/pdf`, { responseType: 'blob' }),
  
  generatePDFPreview: (id) => 
    api.get(`/cotizaciones/${id}/pdf-preview`, { responseType: 'blob' }),
  
  getEstadisticas: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/cotizaciones/estadisticas${queryString ? `?${queryString}` : ''}`);
  },
  
  convertirAOrden: (id) => api.post(`/cotizaciones/${id}/convertir-orden`),
  
  sendEmail: (id) => api.post(`/cotizaciones/${id}/send-email`)
};

// API del sistema de facturación
export const facturaApi = {
  // Obtener todas las facturas
  getFacturas: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/facturas${queryString ? `?${queryString}` : ''}`);
  },
  
  // Obtener factura por ID
  getFacturaById: (id) => api.get(`/facturas/${id}`),
  
  // Crear nueva factura
  createFactura: (data) => api.post('/facturas', data),
  
  // Actualizar factura
  updateFactura: (id, data) => api.put(`/facturas/${id}`, data),
  
  // Cambiar estado de factura
  changeStatus: (id, estado) => api.patch(`/facturas/${id}/status`, { estado }),
  
  // Registrar pago
  registerPayment: (id, data) => api.post(`/facturas/${id}/pagos`, data),
  
  // Eliminar factura
  deleteFactura: (id) => api.delete(`/facturas/${id}`),
  
  // Obtener estadísticas
  getStats: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/facturas/stats${queryString ? `?${queryString}` : ''}`);
  },
  
  // Generar PDF de factura
  generatePDF: (id) => api.get(`/facturas/${id}/pdf`, { responseType: 'blob' }),
  
  // Enviar factura por email
  sendEmail: (id) => api.post(`/facturas/${id}/send-email`)
};

export default api; 
