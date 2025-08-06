import { configureStore } from '@reduxjs/toolkit';
import ordenesReducer from './slices/ordenesSlice';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import panosReducer from './slices/panosSlice';
import materialesReducer from './slices/materialesSlice';
import herramientasReducer from './slices/herramientasSlice';
import clientesReducer from './slices/clientesSlice';
import leadsReducer from './slices/leadsSlice';
import cotizacionesReducer from './slices/cotizacionesSlice';
import redesProductoReducer from './slices/redesProductoSlice';

export const store = configureStore({
  reducer: {
    ordenes: ordenesReducer,
    auth: authReducer,
    ui: uiReducer,
    panos: panosReducer,
    materiales: materialesReducer,
    herramientas: herramientasReducer,
    clientes: clientesReducer,
    leads: leadsReducer,
    cotizaciones: cotizacionesReducer,
    redesProducto: redesProductoReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});
