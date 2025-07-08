import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { clientesApi } from '../../services/api';

// Async thunks
export const fetchClientes = createAsyncThunk(
  'clientes/fetchClientes',
  async (params = {}) => {
    const response = await clientesApi.getClientes(params);
    return response.data;
  }
);

export const searchClientes = createAsyncThunk(
  'clientes/searchClientes',
  async (query) => {
    const response = await clientesApi.searchClientes(query);
    return response.data;
  }
);

export const fetchClienteById = createAsyncThunk(
  'clientes/fetchClienteById',
  async (id) => {
    const response = await clientesApi.getClienteById(id);
    return response.data;
  }
);

export const fetchOrdenesCliente = createAsyncThunk(
  'clientes/fetchOrdenesCliente',
  async ({ id, params = {} }) => {
    const response = await clientesApi.getOrdenesCliente(id, params);
    return response.data;
  }
);

export const createCliente = createAsyncThunk(
  'clientes/createCliente',
  async (clienteData) => {
    const response = await clientesApi.createCliente(clienteData);
    return response.data;
  }
);

export const updateCliente = createAsyncThunk(
  'clientes/updateCliente',
  async ({ id, data }) => {
    const response = await clientesApi.updateCliente(id, data);
    return response.data;
  }
);

export const deleteCliente = createAsyncThunk(
  'clientes/deleteCliente',
  async (id) => {
    await clientesApi.deleteCliente(id);
    return id;
  }
);

const clientesSlice = createSlice({
  name: 'clientes',
  initialState: {
    clientes: [],
    searchResults: [],
    currentCliente: null,
    ordenesCliente: [],
    loading: false,
    searchLoading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0
    },
    ordenesClientePagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    }
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentCliente: (state) => {
      state.currentCliente = null;
    },
    clearOrdenesCliente: (state) => {
      state.ordenesCliente = [];
      state.ordenesClientePagination = {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
      };
    },
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    setSearchResults: (state, action) => {
      state.searchResults = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchClientes
      .addCase(fetchClientes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientes.fulfilled, (state, action) => {
        state.loading = false;
        state.clientes = action.payload.clientes;
        if (action.payload.pagination) {
          state.pagination = action.payload.pagination;
        }
      })
      .addCase(fetchClientes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // searchClientes
      .addCase(searchClientes.pending, (state) => {
        state.searchLoading = true;
      })
      .addCase(searchClientes.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.clientes;
      })
      .addCase(searchClientes.rejected, (state, action) => {
        state.searchLoading = false;
        state.error = action.error.message;
      })
      // fetchClienteById
      .addCase(fetchClienteById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClienteById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCliente = action.payload.data;
      })
      .addCase(fetchClienteById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // fetchOrdenesCliente
      .addCase(fetchOrdenesCliente.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrdenesCliente.fulfilled, (state, action) => {
        state.loading = false;
        state.ordenesCliente = action.payload.data.ordenes;
        state.ordenesClientePagination = action.payload.data.pagination;
      })
      .addCase(fetchOrdenesCliente.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // createCliente
      .addCase(createCliente.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCliente.fulfilled, (state, action) => {
        state.loading = false;
        state.clientes.unshift(action.payload.data);
      })
      .addCase(createCliente.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // updateCliente
      .addCase(updateCliente.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCliente.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.clientes.findIndex(
          cliente => cliente.id_cliente === action.payload.data.id_cliente
        );
        if (index !== -1) {
          state.clientes[index] = action.payload.data;
        }
        if (state.currentCliente && state.currentCliente.id_cliente === action.payload.data.id_cliente) {
          state.currentCliente = action.payload.data;
        }
      })
      .addCase(updateCliente.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      // deleteCliente
      .addCase(deleteCliente.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCliente.fulfilled, (state, action) => {
        state.loading = false;
        state.clientes = state.clientes.filter(
          cliente => cliente.id_cliente !== action.payload
        );
      })
      .addCase(deleteCliente.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});

export const { 
  clearError, 
  clearCurrentCliente, 
  clearOrdenesCliente, 
  clearSearchResults,
  setSearchResults 
} = clientesSlice.actions;

export default clientesSlice.reducer; 