import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { herramientasApi } from '../../services/api';

// Cache simple para evitar llamadas repetitivas
const cache = {
  categorias: { data: null, timestamp: 0 },
  estados: { data: null, timestamp: 0 },
  ubicaciones: { data: null, timestamp: 0 }
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Función helper para verificar caché
const getCachedData = (key) => {
  const cached = cache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

// Función helper para guardar en caché
const setCachedData = (key, data) => {
  cache[key] = { data, timestamp: Date.now() };
};

// Async thunks
export const fetchHerramientas = createAsyncThunk(
  'herramientas/fetchHerramientas',
  async (params = {}) => {
    const response = await herramientasApi.getHerramientas(params);
    return response.data;
  }
);

export const fetchCategorias = createAsyncThunk(
  'herramientas/fetchCategorias',
  async (_, { getState }) => {
    // Verificar caché primero
    const cachedData = getCachedData('categorias');
    if (cachedData) {
      return cachedData;
    }

    const response = await herramientasApi.getCategorias();
    const data = response.data;
    
    // Guardar en caché
    setCachedData('categorias', data);
    
    return data;
  }
);

export const fetchEstados = createAsyncThunk(
  'herramientas/fetchEstados',
  async (_, { getState }) => {
    // Verificar caché primero
    const cachedData = getCachedData('estados');
    if (cachedData) {
      return cachedData;
    }

    const response = await herramientasApi.getEstados();
    const data = response.data;
    
    // Guardar en caché
    setCachedData('estados', data);
    
    return data;
  }
);

export const fetchUbicaciones = createAsyncThunk(
  'herramientas/fetchUbicaciones',
  async (_, { getState }) => {
    // Verificar caché primero
    const cachedData = getCachedData('ubicaciones');
    if (cachedData) {
      return cachedData;
    }

    const response = await herramientasApi.getUbicaciones();
    const data = response.data;
    
    // Guardar en caché
    setCachedData('ubicaciones', data);
    
    return data;
  }
);

export const fetchHerramientaById = createAsyncThunk(
  'herramientas/fetchHerramientaById',
  async (id) => {
    const response = await herramientasApi.getHerramientaById(id);
    return response.data;
  }
);

export const createHerramienta = createAsyncThunk(
  'herramientas/createHerramienta',
  async (herramientaData) => {
    const response = await herramientasApi.createHerramienta(herramientaData);
    return response.data;
  }
);

export const updateHerramienta = createAsyncThunk(
  'herramientas/updateHerramienta',
  async ({ id, data }) => {
    const response = await herramientasApi.updateHerramienta(id, data);
    return response.data;
  }
);

export const deleteHerramienta = createAsyncThunk(
  'herramientas/deleteHerramienta',
  async (id) => {
    const response = await herramientasApi.deleteHerramienta(id);
    return { id, ...response.data };
  }
);

export const entradaHerramienta = createAsyncThunk(
  'herramientas/entradaHerramienta',
  async (data) => {
    const response = await herramientasApi.entradaHerramienta(data);
    return response.data;
  }
);

export const salidaHerramienta = createAsyncThunk(
  'herramientas/salidaHerramienta',
  async (data) => {
    const response = await herramientasApi.salidaHerramienta(data);
    return response.data;
  }
);

// Función para limpiar caché
export const clearCache = () => {
  Object.keys(cache).forEach(key => {
    cache[key] = { data: null, timestamp: 0 };
  });
};

// Función para limpiar caché específico
export const clearSpecificCache = (key) => {
  if (cache[key]) {
    cache[key] = { data: null, timestamp: 0 };
  }
};

const initialState = {
  lista: [],
  herramientaActual: null,
  categorias: [],
  estados: [],
  ubicaciones: [],
  loading: false,
  error: null,
  successMessage: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  },
};

const herramientasSlice = createSlice({
  name: 'herramientas',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    clearHerramientaActual: (state) => {
      state.herramientaActual = null;
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchHerramientas
      .addCase(fetchHerramientas.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHerramientas.fulfilled, (state, action) => {
        state.loading = false;
        state.lista = action.payload.data?.herramientas || action.payload.herramientas || [];
        state.pagination = action.payload.data?.pagination || action.payload.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0,
        };
      })
      .addCase(fetchHerramientas.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // fetchCategorias
      .addCase(fetchCategorias.fulfilled, (state, action) => {
        state.categorias = action.payload.data || action.payload;
      })
      // fetchEstados
      .addCase(fetchEstados.fulfilled, (state, action) => {
        state.estados = action.payload.data || action.payload;
      })
      // fetchUbicaciones
      .addCase(fetchUbicaciones.fulfilled, (state, action) => {
        state.ubicaciones = action.payload.data || action.payload;
      })
      // fetchHerramientaById
      .addCase(fetchHerramientaById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHerramientaById.fulfilled, (state, action) => {
        state.loading = false;
        state.herramientaActual = action.payload.data || action.payload;
      })
      .addCase(fetchHerramientaById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // createHerramienta
      .addCase(createHerramienta.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createHerramienta.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message || 'Herramienta creada exitosamente';
        // Agregar la nueva herramienta a la lista
        const nuevaHerramienta = action.payload.data || action.payload;
        if (nuevaHerramienta) {
          state.lista.unshift(nuevaHerramienta);
        }
      })
      .addCase(createHerramienta.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // updateHerramienta
      .addCase(updateHerramienta.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateHerramienta.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message || 'Herramienta actualizada exitosamente';
        const herramientaActualizada = action.payload.data || action.payload;
        if (herramientaActualizada) {
          // Actualizar en la lista
          const index = state.lista.findIndex(
            (herramienta) => herramienta.id_item === herramientaActualizada.id_item
          );
          if (index !== -1) {
            state.lista[index] = herramientaActualizada;
          }
          // Actualizar herramienta actual si es la misma
          if (state.herramientaActual && state.herramientaActual.id_item === herramientaActualizada.id_item) {
            state.herramientaActual = herramientaActualizada;
          }
        }
      })
      .addCase(updateHerramienta.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // deleteHerramienta
      .addCase(deleteHerramienta.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteHerramienta.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message || 'Herramienta eliminada exitosamente';
        // Eliminar de la lista
        state.lista = state.lista.filter(
          (herramienta) => herramienta.id_item !== action.payload.id
        );
        // Limpiar herramienta actual si es la eliminada
        if (state.herramientaActual && state.herramientaActual.id_item === action.payload.id) {
          state.herramientaActual = null;
        }
      })
      .addCase(deleteHerramienta.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // entradaHerramienta
      .addCase(entradaHerramienta.fulfilled, (state, action) => {
        state.successMessage = action.payload.message || 'Entrada registrada exitosamente';
        // Actualizar cantidad en la lista
        const { id, cantidad_nueva } = action.payload.data;
        const index = state.lista.findIndex(
          (herramienta) => herramienta.id_item === id
        );
        if (index !== -1) {
          state.lista[index].cantidad_disponible = cantidad_nueva;
        }
        // Actualizar herramienta actual si es la misma
        if (state.herramientaActual && state.herramientaActual.id_item === id) {
          state.herramientaActual.cantidad_disponible = cantidad_nueva;
        }
      })
      // salidaHerramienta
      .addCase(salidaHerramienta.fulfilled, (state, action) => {
        state.successMessage = action.payload.message || 'Salida registrada exitosamente';
        // Actualizar cantidad en la lista
        const { id, cantidad_nueva } = action.payload.data;
        const index = state.lista.findIndex(
          (herramienta) => herramienta.id_item === id
        );
        if (index !== -1) {
          state.lista[index].cantidad_disponible = cantidad_nueva;
        }
        // Actualizar herramienta actual si es la misma
        if (state.herramientaActual && state.herramientaActual.id_item === id) {
          state.herramientaActual.cantidad_disponible = cantidad_nueva;
        }
      });
  },
});

export const { 
  clearError, 
  clearSuccessMessage, 
  clearHerramientaActual, 
  setPagination 
} = herramientasSlice.actions;

export default herramientasSlice.reducer; 