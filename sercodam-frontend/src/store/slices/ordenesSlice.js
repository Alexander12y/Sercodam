import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ordenesApi } from '../../services/api';

// Async thunks
export const fetchOrdenes = createAsyncThunk(
  'ordenes/fetchOrdenes',
  async (params = {}) => {
    const response = await ordenesApi.getOrdenes(params);
    return response.data;
  }
);

export const fetchOrdenById = createAsyncThunk(
  'ordenes/fetchOrdenById',
  async (id) => {
    const response = await ordenesApi.getOrdenById(id);
    return response.data;
  }
);

export const createOrden = createAsyncThunk(
  'ordenes/createOrden',
  async (ordenData) => {
    const response = await ordenesApi.createOrden(ordenData);
    return response.data;
  }
);

export const updateOrden = createAsyncThunk(
  'ordenes/updateOrden',
  async ({ id, data }) => {
    const response = await ordenesApi.updateOrden(id, data);
    return response.data;
  }
);

export const cambiarEstadoOrden = createAsyncThunk(
  'ordenes/cambiarEstadoOrden',
  async ({ id, estado }) => {
    const response = await ordenesApi.cambiarEstadoOrden(id, { estado });
    return response.data;
  }
);

const initialState = {
  ordenes: [],
  ordenActual: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
};

const ordenesSlice = createSlice({
  name: 'ordenes',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearOrdenActual: (state) => {
      state.ordenActual = null;
    },
    setPagination: (state, action) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchOrdenes
      .addCase(fetchOrdenes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrdenes.fulfilled, (state, action) => {
        state.loading = false;
        // Corregir acceso a los datos
        state.ordenes = action.payload.data?.ordenes || action.payload.ordenes || [];
        state.pagination = action.payload.data?.pagination || action.payload.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        };
      })
      .addCase(fetchOrdenes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // fetchOrdenById
      .addCase(fetchOrdenById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrdenById.fulfilled, (state, action) => {
        state.loading = false;
        state.ordenActual = action.payload.data || action.payload;
      })
      .addCase(fetchOrdenById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // createOrden
      .addCase(createOrden.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createOrden.fulfilled, (state, action) => {
        state.loading = false;
        // Agregar la nueva orden a la lista
        const nuevaOrden = action.payload.data || action.payload;
        if (nuevaOrden) {
          state.ordenes.unshift(nuevaOrden);
        }
      })
      .addCase(createOrden.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // updateOrden
      .addCase(updateOrden.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateOrden.fulfilled, (state, action) => {
        state.loading = false;
        const ordenActualizada = action.payload.data || action.payload;
        if (ordenActualizada) {
          // Actualizar la orden en la lista
          const index = state.ordenes.findIndex(
            (orden) => orden.id_op === ordenActualizada.id_op
          );
          if (index !== -1) {
            state.ordenes[index] = ordenActualizada;
          }
          // Actualizar orden actual si es la misma
          if (state.ordenActual && state.ordenActual.id_op === ordenActualizada.id_op) {
            state.ordenActual = ordenActualizada;
          }
        }
      })
      .addCase(updateOrden.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // cambiarEstadoOrden
      .addCase(cambiarEstadoOrden.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cambiarEstadoOrden.fulfilled, (state, action) => {
        state.loading = false;
        const ordenActualizada = action.payload.data || action.payload;
        if (ordenActualizada) {
          // Actualizar estado en la lista
          const index = state.ordenes.findIndex(
            (orden) => orden.id_op === ordenActualizada.id_op
          );
          if (index !== -1) {
            state.ordenes[index].estado = ordenActualizada.estado;
          }
          // Actualizar orden actual si es la misma
          if (state.ordenActual && state.ordenActual.id_op === ordenActualizada.id_op) {
            state.ordenActual.estado = ordenActualizada.estado;
          }
        }
      })
      .addCase(cambiarEstadoOrden.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { clearError, clearOrdenActual, setPagination } = ordenesSlice.actions;
export default ordenesSlice.reducer; 