import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { panosApi } from '../../services/api';

export const fetchPanos = createAsyncThunk(
  'panos/fetchPanos',
  async (params, { rejectWithValue }) => {
    try {
      console.log('🔍 fetchPanos - Iniciando llamada al API con params:', params);
      const res = await panosApi.getPanos(params);
      console.log('✅ fetchPanos - Respuesta exitosa:', res);
      return res.data;
    } catch (err) {
      console.error('❌ fetchPanos - Error completo:', err);
      console.error('❌ fetchPanos - Error response:', err.response);
      console.error('❌ fetchPanos - Error data:', err.response?.data);
      return rejectWithValue(err.response?.data?.message || 'Error al obtener paños');
    }
  }
);

export const fetchPanoById = createAsyncThunk(
  'panos/fetchPanoById',
  async (id, { rejectWithValue }) => {
    try {
      const res = await panosApi.getPanoById(id);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Error al obtener paño');
    }
  }
);

export const registrarEntrada = createAsyncThunk(
  'panos/registrarEntrada',
  async (data, { rejectWithValue }) => {
    try {
      const res = await panosApi.postEntradaPano(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Error al registrar entrada');
    }
  }
);

export const registrarSalida = createAsyncThunk(
  'panos/registrarSalida',
  async (data, { rejectWithValue }) => {
    try {
      const res = await panosApi.postSalidaPano(data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Error al registrar salida');
    }
  }
);

export const fetchMovimientos = createAsyncThunk(
  'panos/fetchMovimientos',
  async (id_item, { rejectWithValue }) => {
    try {
      const res = await panosApi.getMovimientosPano(id_item);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Error al obtener movimientos');
    }
  }
);

export const deletePano = createAsyncThunk(
  'panos/deletePano',
  async (id_item, { rejectWithValue }) => {
    try {
      await panosApi.deletePano(id_item);
      return id_item; // Devolver el ID en caso de éxito
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Error al eliminar paño');
    }
  }
);

const panosSlice = createSlice({
  name: 'panos',
  initialState: {
    lista: [],
    loading: false,
    error: null,
    paginacion: { page: 1, limit: 50, total: 0, totalPages: 1 },
    seleccionado: null,
    movimientos: [],
    movimientosLoading: false,
    movimientosError: null,
    successMessage: null, // Para notificaciones
  },
  reducers: {
    clearSeleccionado(state) {
      state.seleccionado = null;
    },
    clearMovimientos(state) {
      state.movimientos = [];
      state.movimientosError = null;
    },
    clearError(state) {
      state.error = null;
    },
    clearSuccessMessage(state) {
      state.successMessage = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPanos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPanos.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        console.log('🔍 Slice - Payload recibido:', action.payload);
        
        if (action.payload && action.payload.panos) {
          state.lista = action.payload.panos;
        } else if (action.payload && Array.isArray(action.payload)) {
          state.lista = action.payload;
        } else if (action.payload && action.payload.data && action.payload.data.panos) {
          state.lista = action.payload.data.panos;
        } else {
          state.lista = [];
        }
        
        if (action.payload && action.payload.pagination) {
          state.paginacion = action.payload.pagination;
        } else if (action.payload && action.payload.data && action.payload.data.pagination) {
          state.paginacion = action.payload.data.pagination;
        } else {
          state.paginacion = { page: 1, limit: 50, total: state.lista.length, totalPages: 1 };
        }
        
        console.log('✅ Slice - Estado actualizado:', { lista: state.lista.length, paginacion: state.paginacion });
      })
      .addCase(fetchPanos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        console.error('❌ Slice - Error:', action.payload);
      })
      .addCase(fetchPanoById.pending, (state) => {
        state.seleccionado = null;
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPanoById.fulfilled, (state, action) => {
        state.loading = false;
        state.seleccionado = action.payload.data || action.payload;
      })
      .addCase(fetchPanoById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registrarEntrada.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registrarEntrada.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(registrarSalida.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registrarSalida.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMovimientos.pending, (state) => {
        state.movimientosLoading = true;
        state.movimientosError = null;
      })
      .addCase(fetchMovimientos.fulfilled, (state, action) => {
        state.movimientosLoading = false;
        state.movimientos = action.payload;
      })
      .addCase(fetchMovimientos.rejected, (state, action) => {
        state.movimientosLoading = false;
        state.movimientosError = action.payload;
      })
      .addCase(deletePano.pending, (state) => {
        state.loading = true; // O un `deleting: true` específico
      })
      .addCase(deletePano.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = "Paño eliminado con éxito";
        // Opcional: remover el paño de la lista sin recargar
        state.lista = state.lista.filter(pano => pano.id_item !== action.payload);
      })
      .addCase(deletePano.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearSeleccionado, clearMovimientos, clearError, clearSuccessMessage } = panosSlice.actions;
export default panosSlice.reducer;
