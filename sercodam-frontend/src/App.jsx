import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { authApi } from './services/api';
import { setUser, logout } from './store/slices/authSlice';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import OrdenesList from './pages/OrdenesList';
import OrdenDetail from './pages/OrdenDetail';
import EditOrden from './pages/EditOrden';
import CreateOrden from './pages/CreateOrden';
import PanosList from './pages/PanosList';
import MaterialesList from './pages/MaterialesList';
import HerramientasList from './pages/HerramientasList';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import Login from './pages/Login';

function RequireAuth({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const dispatch = useDispatch();
  const { user, token } = useSelector((state) => state.auth);

  useEffect(() => {
    // Si hay token pero no hay usuario, intenta restaurar la sesión
    if (token && !user) {
      authApi.getProfile()
        .then(res => {
          if (res.data && res.data.success && res.data.data) {
            dispatch(setUser(res.data.data));
          } else {
            dispatch(logout());
          }
        })
        .catch(() => {
          dispatch(logout());
        });
    }
  }, [token, user, dispatch]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/ordenes" element={<OrdenesList />} />
                  <Route path="/ordenes/nueva" element={<CreateOrden />} />
                  <Route path="/ordenes/:id" element={<OrdenDetail />} />
                  <Route path="/ordenes/:id/editar" element={<EditOrden />} />
                  <Route path="/inventario/panos" element={<PanosList />} />
                  <Route path="/inventario/materiales" element={<MaterialesList />} />
                  <Route path="/inventario/herramientas" element={<HerramientasList />} />
                  <Route path="/perfil" element={<Profile />} />
                  <Route path="/cambiar-contraseña" element={<ChangePassword />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </Box>
  );
}

export default App; 