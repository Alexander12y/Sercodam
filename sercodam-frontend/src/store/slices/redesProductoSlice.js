import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { panosApi } from '../../services/api';

export const fetchRedesProducto = createAsyncThunk(
  'redesProducto/fetchRedesProducto',
  async (params, { rejectWithValue }) => {
    try {
      console.log('🔍 fetchRedesProducto - Iniciando llamada al API con params:', params);
      const res = await panosApi.getRedesProducto(params);
      console.log('✅ fetchRedesProducto - Respuesta exitosa:', res);
      return res.data;
    } catch (err) {
      console.error('❌ fetchRedesProducto - Error completo:', err);
      console.error('❌ fetchRedesProducto - Error response:', err.response);
      console.error('❌ fetchRedesProducto - Error data:', err.response?.data);
      return rejectWithValue(err.response?.data?.message || 'Error al obtener redes producto');
    }
  }
);

export const fetchRedesProductoCatalogos = createAsyncThunk(
  'redesProducto/fetchRedesProductoCatalogos',
  async (params, { rejectWithValue }) => {
    try {
      console.log('🔍 fetchRedesProductoCatalogos - Iniciando llamada al API con params:', params);
      const res = await panosApi.getRedesProductoCatalogos(params);
      console.log('✅ fetchRedesProductoCatalogos - Respuesta exitosa:', res);
      return res.data;
    } catch (err) {
      console.error('❌ fetchRedesProductoCatalogos - Error completo:', err);
      console.error('❌ fetchRedesProductoCatalogos - Error response:', err.response);
      console.error('❌ fetchRedesProductoCatalogos - Error data:', err.response?.data);
      return rejectWithValue(err.response?.data?.message || 'Error al obtener catálogos de redes producto');
    }
  }
);

const initialState = {
  lista: [],
  catalogos: {},
  loading: false,
  loadingCatalogos: false,
  error: null,
  errorCatalogos: null,
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  }
};

const redesProductoSlice = createSlice({
  name: 'redesProducto',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
      state.errorCatalogos = null;
    },
    clearRedesProducto: (state) => {
      state.lista = [];
      state.catalogos = {};
      state.loading = false;
      state.loadingCatalogos = false;
      state.error = null;
      state.errorCatalogos = null;
      state.pagination = {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0
      };
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchRedesProducto
      .addCase(fetchRedesProducto.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRedesProducto.fulfilled, (state, action) => {
        state.loading = false;
        state.lista = action.payload.data || [];
        state.pagination = action.payload.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0
        };
      })
      .addCase(fetchRedesProducto.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Error al obtener redes producto';
      })
      // fetchRedesProductoCatalogos
      .addCase(fetchRedesProductoCatalogos.pending, (state) => {
        state.loadingCatalogos = true;
        state.errorCatalogos = null;
      })
      .addCase(fetchRedesProductoCatalogos.fulfilled, (state, action) => {
        state.loadingCatalogos = false;
        state.catalogos = action.payload.data || {};
      })
      .addCase(fetchRedesProductoCatalogos.rejected, (state, action) => {
        state.loadingCatalogos = false;
        state.errorCatalogos = action.payload || 'Error al obtener catálogos de redes producto';
      });
  }
});

export const { clearError, clearRedesProducto } = redesProductoSlice.actions;
export default redesProductoSlice.reducer; 