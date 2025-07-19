import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ordenesApi } from '../../services/api';

// Async thunks
export const fetchOrdenes = createAsyncThunk(
  'ordenes/fetchOrdenes',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await ordenesApi.getOrdenes(params);
      return response.data;
    } catch (err) {
      if (err.response && err.response.data) {
        return rejectWithValue(err.response.data);
      }
      throw err;
    }
  }
);

export const fetchOrdenById = createAsyncThunk(
  'ordenes/fetchOrdenById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await ordenesApi.getOrdenDetalle(id);
      return response.data;
    } catch (err) {
      if (err.response && err.response.data) {
        return rejectWithValue(err.response.data);
      }
      throw err;
    }
  }
);

export const createOrden = createAsyncThunk(
  'ordenes/createOrden',
  async (ordenData, { rejectWithValue }) => {
    try {
      const response = await ordenesApi.createOrden(ordenData);
      return response.data;
    } catch (err) {
      if (err.response && err.response.data) {
        return rejectWithValue(err.response.data);
      }
      throw err;
    }
  }
);

export const updateOrden = createAsyncThunk(
  'ordenes/updateOrden',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await ordenesApi.updateOrden(id, data);
      return response.data;
    } catch (err) {
      if (err.response && err.response.data) {
        return rejectWithValue(err.response.data);
      }
      throw err;
    }
  }
);

export const cambiarEstadoOrden = createAsyncThunk(
  'ordenes/cambiarEstadoOrden',
  async ({ id, estado }, { rejectWithValue }) => {
    try {
      const response = await ordenesApi.cambiarEstadoOrden(id, { estado });
      return response.data;
    } catch (err) {
      if (err.response && err.response.data) {
        return rejectWithValue(err.response.data);
      }
      throw err;
    }
  }
);

export const approveOrden = createAsyncThunk(
  'ordenes/approveOrden',
  async (id, { rejectWithValue }) => {
    try {
      const response = await ordenesApi.approveOrden(id);
      return response.data;
    } catch (err) {
      if (err.response && err.response.data) {
        return rejectWithValue(err.response.data);
      }
      throw err;
    }
  }
);

export const deleteOrden = createAsyncThunk(
  'ordenes/deleteOrden',
  async (id, { rejectWithValue }) => {
    try {
      const response = await ordenesApi.deleteOrden(id);
      return response.data;
    } catch (err) {
      if (err.response && err.response.data) {
        return rejectWithValue(err.response.data);
      }
      throw err;
    }
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
        state.error = action.payload?.message || action.error.message;
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
        state.error = action.payload?.message || action.error.message;
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
        state.error = action.payload || { message: action.error.message };
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
        state.error = action.payload?.message || action.error.message;
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
        state.error = action.payload?.message || action.error.message;
      })
      // approveOrden
      .addCase(approveOrden.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(approveOrden.fulfilled, (state, action) => {
        state.loading = false;
        const ordenActualizada = action.payload.data || action.payload;
        if (ordenActualizada) {
          // Actualizar estado en la lista
          const index = state.ordenes.findIndex(
            (orden) => orden.id_op === ordenActualizada.id_op
          );
          if (index !== -1) {
            state.ordenes[index].estado = 'en_proceso';
          }
          // Actualizar orden actual si es la misma
          if (state.ordenActual && state.ordenActual.id_op === ordenActualizada.id_op) {
            state.ordenActual.estado = 'en_proceso';
          }
        }
      })
      .addCase(approveOrden.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || action.error.message;
      })
      // deleteOrden
      .addCase(deleteOrden.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteOrden.fulfilled, (state, action) => {
        state.loading = false;
        // Remover la orden de la lista
        const ordenEliminada = action.payload.data || action.payload;
        if (ordenEliminada && ordenEliminada.id_op) {
          state.ordenes = state.ordenes.filter(
            (orden) => orden.id_op !== ordenEliminada.id_op
          );
        }
        // Limpiar orden actual si es la misma
        if (state.ordenActual && state.ordenActual.id_op === ordenEliminada?.id_op) {
          state.ordenActual = null;
        }
      })
      .addCase(deleteOrden.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || action.error.message;
      });
  },
});

export const { clearError, clearOrdenActual, setPagination } = ordenesSlice.actions;
export default ordenesSlice.reducer; 