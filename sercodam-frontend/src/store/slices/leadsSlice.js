import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { leadsApi } from '../../services/api';

// Async thunks
export const fetchLeads = createAsyncThunk(
  'leads/fetchLeads',
  async (params = {}) => {
    const response = await leadsApi.getLeads(params);
    return response.data;
  }
);

export const fetchLeadsStats = createAsyncThunk(
  'leads/fetchLeadsStats',
  async () => {
    const response = await leadsApi.getLeadsStats();
    return response.data;
  }
);

export const fetchLeadById = createAsyncThunk(
  'leads/fetchLeadById',
  async (id) => {
    const response = await leadsApi.getLeadById(id);
    return response.data;
  }
);

export const updateLead = createAsyncThunk(
  'leads/updateLead',
  async ({ id, data }) => {
    const response = await leadsApi.updateLead(id, data);
    return response.data;
  }
);

export const deleteLead = createAsyncThunk(
  'leads/deleteLead',
  async (id) => {
    await leadsApi.deleteLead(id);
    return id;
  }
);

export const convertLeadToClient = createAsyncThunk(
  'leads/convertLeadToClient',
  async ({ id, notas_adicionales }, { rejectWithValue }) => {
    try {
      const response = await leadsApi.convertToClient(id, { notas_adicionales });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Error convirtiendo lead a cliente');
    }
  }
);

export const fetchUnreadLeadsCount = createAsyncThunk(
  'leads/fetchUnreadLeadsCount',
  async () => {
    const response = await leadsApi.getUnreadLeadsCount();
    return response.data;
  }
);

const leadsSlice = createSlice({
  name: 'leads',
  initialState: {
    leads: [],
    currentLead: null,
    stats: {
      total_leads: 0,
      leads_nuevos: 0,
      leads_en_revision: 0,
      leads_contactados: 0,
      leads_convertidos: 0,
      leads_descartados: 0,
      leads_no_leidos: 0,
      leads_hoy: 0,
      leads_semana: 0
    },
    unreadCount: 0,
    loading: false,
    statsLoading: false,
    error: null,
    pagination: {
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 0
    }
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentLead: (state) => {
      state.currentLead = null;
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    },
    decrementUnreadCount: (state) => {
      if (state.unreadCount > 0) {
        state.unreadCount -= 1;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchLeads
      .addCase(fetchLeads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeads.fulfilled, (state, action) => {
        state.loading = false;
        state.leads = action.payload.leads;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchLeads.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
      // fetchLeadsStats
      .addCase(fetchLeadsStats.pending, (state) => {
        state.statsLoading = true;
      })
      .addCase(fetchLeadsStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.stats = action.payload.stats;
      })
      .addCase(fetchLeadsStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.error = action.error.message;
      })
      
      // fetchLeadById
      .addCase(fetchLeadById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchLeadById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentLead = action.payload.data;
      })
      .addCase(fetchLeadById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
      // updateLead
      .addCase(updateLead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateLead.fulfilled, (state, action) => {
        state.loading = false;
        // Actualizar el lead en la lista
        const index = state.leads.findIndex(lead => lead.id_lead === action.payload.data.id_lead);
        if (index !== -1) {
          state.leads[index] = action.payload.data;
        }
        // Actualizar el lead actual si es el mismo
        if (state.currentLead && state.currentLead.id_lead === action.payload.data.id_lead) {
          state.currentLead = action.payload.data;
        }
      })
      .addCase(updateLead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
      // deleteLead
      .addCase(deleteLead.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteLead.fulfilled, (state, action) => {
        state.loading = false;
        // Remover el lead de la lista
        state.leads = state.leads.filter(lead => lead.id_lead !== action.payload);
        // Limpiar el lead actual si es el mismo
        if (state.currentLead && state.currentLead.id_lead === action.payload) {
          state.currentLead = null;
        }
      })
      .addCase(deleteLead.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      
      // fetchUnreadLeadsCount
      .addCase(fetchUnreadLeadsCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload.count;
      });
  }
});

export const { 
  clearError, 
  clearCurrentLead, 
  setUnreadCount, 
  incrementUnreadCount, 
  decrementUnreadCount 
} = leadsSlice.actions;

export default leadsSlice.reducer; 