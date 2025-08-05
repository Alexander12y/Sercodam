import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { cotizacionesApi } from '../../services/api';

// Thunks async
export const fetchCotizaciones = createAsyncThunk(
  'cotizaciones/fetchCotizaciones',
  async ({ page = 1, limit = 10, filters = {} }, { rejectWithValue }) => {
    try {
      const response = await cotizacionesApi.getCotizaciones({ page, limit, ...filters });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error obteniendo cotizaciones');
    }
  }
);

export const fetchCotizacionById = createAsyncThunk(
  'cotizaciones/fetchCotizacionById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await cotizacionesApi.getCotizacionById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error obteniendo cotización');
    }
  }
);

export const createCotizacion = createAsyncThunk(
  'cotizaciones/createCotizacion',
  async (cotizacionData, { rejectWithValue }) => {
    try {
      const response = await cotizacionesApi.createCotizacion(cotizacionData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error creando cotización');
    }
  }
);

export const updateCotizacion = createAsyncThunk(
  'cotizaciones/updateCotizacion',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await cotizacionesApi.updateCotizacion(id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error actualizando cotización');
    }
  }
);

export const changeEstadoCotizacion = createAsyncThunk(
  'cotizaciones/changeEstado',
  async ({ id, estado, notas }, { rejectWithValue }) => {
    try {
      const response = await cotizacionesApi.changeEstado(id, estado, notas);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error cambiando estado');
    }
  }
);

export const generatePDF = createAsyncThunk(
  'cotizaciones/generatePDF',
  async (id, { rejectWithValue }) => {
    try {
      const response = await cotizacionesApi.generatePDF(id);
      
      // Crear un blob del PDF y descargarlo
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.href = url;
      link.download = `cotizacion-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Limpiar el URL
      window.URL.revokeObjectURL(url);
      
      return { id, success: true };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error generando PDF');
    }
  }
);

export const convertirAOrden = createAsyncThunk(
  'cotizaciones/convertirAOrden',
  async (id, { rejectWithValue }) => {
    try {
      const response = await cotizacionesApi.convertirAOrden(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error convirtiendo a orden');
    }
  }
);

export const sendCotizacionEmail = createAsyncThunk(
  'cotizaciones/sendEmail',
  async (id, { rejectWithValue }) => {
    try {
      const response = await cotizacionesApi.sendEmail(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error enviando email');
    }
  }
);

const initialState = {
  cotizaciones: [],
  currentCotizacion: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  },
  filters: {
    estado: '',
    cliente: '',
    fecha_desde: '',
    fecha_hasta: ''
  },
  pdfUrl: null,
  pdfGenerating: false,
  emailSending: false
};

const cotizacionesSlice = createSlice({
  name: 'cotizaciones',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentCotizacion: (state) => {
      state.currentCotizacion = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    clearPdfUrl: (state) => {
      if (state.pdfUrl) {
        URL.revokeObjectURL(state.pdfUrl);
        state.pdfUrl = null;
      }
    },
    // Para el formulario de cotización
    initNewCotizacion: (state) => {
      state.currentCotizacion = {
        // Sección 1: Información General
        id_cliente: null,
        lead_id: null, // Campo para referenciar leads
        nombre_cliente: '',
        empresa_cliente: '',
        email_cliente: '',
        telefono_cliente: '',
        titulo_proyecto: '',
        tipo_proyecto: '',
        incluye_instalacion: false,
        dias_validez: 15,
        tiempo_entrega: '',
        tiempo_instalacion: '',
        
        // Campos adicionales para leads
        lead_requerimientos: '',
        lead_presupuesto_estimado: null,
        
        // Sección 2: Productos (se inicializa vacío)
        detalle: [],
        
        // Sección 3: Condiciones de Pago
        condiciones_pago: '',
        condiciones_envio: '',
        
        // Sección 4: Información Adicional
        incluye_garantia: false,
        incluye_instalacion_seccion: false,
        observaciones: '',
        no_incluye: '',
        notas: '',
        conceptos_extra_list: [],
        
        // Sección 5: Cláusula Personalizada
        titulo_clausula_personalizada: '',
        descripcion_clausula_personalizada: '',
        
        // Totales (calculados automáticamente)
        subtotal: 0,
        iva: 0,
        total: 0,
        
        // Estado inicial
        estado: 'por aprobar'
      };
    },
    updateCurrentCotizacion: (state, action) => {
      if (state.currentCotizacion) {
        state.currentCotizacion = { ...state.currentCotizacion, ...action.payload };
      }
    },
    addItem: (state) => {
      if (state.currentCotizacion) {
        const newIndex = state.currentCotizacion.detalle.length;
        const partida = String.fromCharCode(65 + newIndex); // A, B, C, etc.
        
        state.currentCotizacion.detalle.push({
          partida,
          orden_index: newIndex + 1,
          id_item: null,
          cantidad: 1,
          precio_unitario: 0,
          subtotal: 0,
          notas: '',
          caracteristicas: '',
          catalogo: '',
          tipo_item: 'PANO',
          estado: 'por aprobar',
          metadata: null
        });
      }
    },
    updateItem: (state, action) => {
      const { index, itemData } = action.payload;
      if (state.currentCotizacion && state.currentCotizacion.detalle[index]) {
        const updatedItem = { ...state.currentCotizacion.detalle[index], ...itemData };
        // Recalcular subtotal del item
        updatedItem.subtotal = updatedItem.cantidad * updatedItem.precio_unitario;
        state.currentCotizacion.detalle[index] = updatedItem;
        
        // Recalcular totales
        cotizacionesSlice.caseReducers.calculateTotals(state);
      }
    },
    removeItem: (state, action) => {
      const index = action.payload;
      if (state.currentCotizacion) {
        state.currentCotizacion.detalle.splice(index, 1);
        
        // Recalcular partidas (A, B, C, etc.)
        state.currentCotizacion.detalle.forEach((item, idx) => {
          item.partida = String.fromCharCode(65 + idx);
          item.orden_index = idx + 1;
        });
        
        // Recalcular totales
        cotizacionesSlice.caseReducers.calculateTotals(state);
      }
    },
    calculateTotals: (state) => {
      if (state.currentCotizacion) {
        const subtotal = state.currentCotizacion.detalle.reduce(
          (sum, item) => sum + (item.subtotal || 0), 0
        );
        const iva = subtotal * 0.16;
        const total = subtotal + iva;
        
        state.currentCotizacion.subtotal = subtotal;
        state.currentCotizacion.iva = iva;
        state.currentCotizacion.total = total;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch cotizaciones
      .addCase(fetchCotizaciones.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCotizaciones.fulfilled, (state, action) => {
        state.loading = false;
        // Handle the response structure: { cotizaciones: [...], pagination: {...} }
        if (action.payload.cotizaciones) {
          state.cotizaciones = action.payload.cotizaciones;
          state.pagination = action.payload.pagination || state.pagination;
        } else {
          // Fallback for other response structures
          state.cotizaciones = action.payload.data || action.payload;
          if (action.payload.pagination) {
            state.pagination = action.payload.pagination;
          }
        }
      })
      .addCase(fetchCotizaciones.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Fetch cotización by ID
      .addCase(fetchCotizacionById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCotizacionById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCotizacion = action.payload.data || action.payload;
      })
      .addCase(fetchCotizacionById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Create cotización
      .addCase(createCotizacion.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCotizacion.fulfilled, (state, action) => {
        state.loading = false;
        state.cotizaciones.unshift(action.payload.data || action.payload);
        state.currentCotizacion = action.payload.data || action.payload;
      })
      .addCase(createCotizacion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // Update cotización
      .addCase(updateCotizacion.fulfilled, (state, action) => {
        const updatedCotizacion = action.payload.data || action.payload;
        const index = state.cotizaciones.findIndex(c => c.id_cotizacion === updatedCotizacion.id_cotizacion);
        if (index !== -1) {
          state.cotizaciones[index] = updatedCotizacion;
        }
        state.currentCotizacion = updatedCotizacion;
      })
      
      // Change estado
      .addCase(changeEstadoCotizacion.fulfilled, (state, action) => {
        const updatedCotizacion = action.payload.data || action.payload;
        const index = state.cotizaciones.findIndex(c => c.id_cotizacion === updatedCotizacion.id_cotizacion);
        if (index !== -1) {
          state.cotizaciones[index] = updatedCotizacion;
        }
        if (state.currentCotizacion?.id_cotizacion === updatedCotizacion.id_cotizacion) {
          state.currentCotizacion = updatedCotizacion;
        }
      })
      
      // Generate PDF
      .addCase(generatePDF.pending, (state) => {
        state.pdfGenerating = true;
        state.error = null;
      })
      .addCase(generatePDF.fulfilled, (state, action) => {
        state.pdfGenerating = false;
        state.pdfUrl = action.payload.pdfUrl;
      })
      .addCase(generatePDF.rejected, (state, action) => {
        state.pdfGenerating = false;
        state.error = action.payload;
      })
      
      // Send Email
      .addCase(sendCotizacionEmail.pending, (state) => {
        state.emailSending = true;
        state.error = null;
      })
      .addCase(sendCotizacionEmail.fulfilled, (state, action) => {
        state.emailSending = false;
        // Actualizar el estado de la cotización a "enviada"
        const updatedCotizacion = action.payload.data || action.payload;
        const index = state.cotizaciones.findIndex(c => c.id_cotizacion === updatedCotizacion.id_cotizacion);
        if (index !== -1) {
          state.cotizaciones[index].estado = 'enviada';
        }
        if (state.currentCotizacion?.id_cotizacion === updatedCotizacion.id_cotizacion) {
          state.currentCotizacion.estado = 'enviada';
        }
      })
      .addCase(sendCotizacionEmail.rejected, (state, action) => {
        state.emailSending = false;
        state.error = action.payload;
      });
  }
});

export const {
  clearError,
  clearCurrentCotizacion,
  setFilters,
  setPagination,
  clearPdfUrl,
  initNewCotizacion,
  updateCurrentCotizacion,
  addItem,
  updateItem,
  removeItem,
  calculateTotals
} = cotizacionesSlice.actions;

export default cotizacionesSlice.reducer; 