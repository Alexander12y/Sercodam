import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { materialesApi } from '../../services/api';

// Thunks
export const fetchMateriales = createAsyncThunk(
  'materiales/fetchMateriales',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await materialesApi.getMateriales(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar materiales');
    }
  }
);

export const fetchMaterialById = createAsyncThunk(
  'materiales/fetchMaterialById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await materialesApi.getMaterialById(id);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar material');
    }
  }
);

export const createMaterial = createAsyncThunk(
  'materiales/createMaterial',
  async (materialData, { rejectWithValue }) => {
    try {
      const response = await materialesApi.createMaterial(materialData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al crear material');
    }
  }
);

export const updateMaterial = createAsyncThunk(
  'materiales/updateMaterial',
  async ({ id, materialData }, { rejectWithValue }) => {
    try {
      const response = await materialesApi.updateMaterial(id, materialData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al actualizar material');
    }
  }
);

export const deleteMaterial = createAsyncThunk(
  'materiales/deleteMaterial',
  async (id, { rejectWithValue }) => {
    try {
      await materialesApi.deleteMaterial(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al eliminar material');
    }
  }
);

export const fetchCategorias = createAsyncThunk(
  'materiales/fetchCategorias',
  async (_, { rejectWithValue }) => {
    try {
      const response = await materialesApi.getCategorias();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar categorías');
    }
  }
);

export const fetchSubgrupos = createAsyncThunk(
  'materiales/fetchSubgrupos',
  async (_, { rejectWithValue }) => {
    try {
      const response = await materialesApi.getSubgrupos();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al cargar subgrupos');
    }
  }
);

export const entradaMaterial = createAsyncThunk(
  'materiales/entradaMaterial',
  async (entradaData, { rejectWithValue }) => {
    try {
      const response = await materialesApi.entradaMaterial(entradaData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al registrar entrada');
    }
  }
);

export const salidaMaterial = createAsyncThunk(
  'materiales/salidaMaterial',
  async (salidaData, { rejectWithValue }) => {
    try {
      const response = await materialesApi.salidaMaterial(salidaData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error al registrar salida');
    }
  }
);

const initialState = {
  lista: [],
  materialSeleccionado: null,
  categorias: [],
  subgrupos: [],
  pagination: {
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  },
  loading: false,
  error: null,
  successMessage: null
};

const materialesSlice = createSlice({
  name: 'materiales',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccessMessage: (state) => {
      state.successMessage = null;
    },
    setMaterialSeleccionado: (state, action) => {
      state.materialSeleccionado = action.payload;
    },
    clearMaterialSeleccionado: (state) => {
      state.materialSeleccionado = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchMateriales
      .addCase(fetchMateriales.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMateriales.fulfilled, (state, action) => {
        state.loading = false;
        state.lista = action.payload.materiales || [];
        state.pagination = action.payload.pagination || initialState.pagination;
      })
      .addCase(fetchMateriales.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // fetchMaterialById
      .addCase(fetchMaterialById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMaterialById.fulfilled, (state, action) => {
        state.loading = false;
        state.materialSeleccionado = action.payload.data;
      })
      .addCase(fetchMaterialById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // createMaterial
      .addCase(createMaterial.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMaterial.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
      })
      .addCase(createMaterial.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // updateMaterial
      .addCase(updateMaterial.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMaterial.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        // Actualizar el material en la lista si existe
        const index = state.lista.findIndex(m => m.id_item === action.payload.data.id_item);
        if (index !== -1) {
          state.lista[index] = { ...state.lista[index], ...action.payload.data };
        }
      })
      .addCase(updateMaterial.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // deleteMaterial
      .addCase(deleteMaterial.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMaterial.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = 'Material eliminado exitosamente';
        // Remover el material de la lista
        state.lista = state.lista.filter(m => m.id_item !== action.payload);
      })
      .addCase(deleteMaterial.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // fetchCategorias
      .addCase(fetchCategorias.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCategorias.fulfilled, (state, action) => {
        state.loading = false;
        state.categorias = action.payload.data || [];
      })
      .addCase(fetchCategorias.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // fetchSubgrupos
      .addCase(fetchSubgrupos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubgrupos.fulfilled, (state, action) => {
        state.loading = false;
        state.subgrupos = action.payload.data || [];
      })
      .addCase(fetchSubgrupos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // entradaMaterial
      .addCase(entradaMaterial.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(entradaMaterial.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        // Actualizar la cantidad en la lista
        const index = state.lista.findIndex(m => m.id_item === action.payload.data.id_item);
        if (index !== -1) {
          state.lista[index].cantidad_disponible = action.payload.data.cantidad_nueva;
        }
      })
      .addCase(entradaMaterial.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      
      // salidaMaterial
      .addCase(salidaMaterial.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(salidaMaterial.fulfilled, (state, action) => {
        state.loading = false;
        state.successMessage = action.payload.message;
        // Actualizar la cantidad en la lista
        const index = state.lista.findIndex(m => m.id_item === action.payload.data.id_item);
        if (index !== -1) {
          state.lista[index].cantidad_disponible = action.payload.data.cantidad_nueva;
        }
      })
      .addCase(salidaMaterial.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { 
  clearError, 
  clearSuccessMessage, 
  setMaterialSeleccionado, 
  clearMaterialSeleccionado 
} = materialesSlice.actions;

export default materialesSlice.reducer; 