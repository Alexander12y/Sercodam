import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { useSelector } from 'react-redux';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import OrdenesList from './pages/OrdenesList';
import OrdenDetail from './pages/OrdenDetail';
import CreateOrden from './pages/CreateOrden';
import PanosList from './pages/PanosList';
import MaterialesList from './pages/MaterialesList';
import Login from './pages/Login';

function RequireAuth({ children }) {
  const { isAuthenticated } = useSelector((state) => state.auth);
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
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
                  <Route path="/inventario/panos" element={<PanosList />} />
                  <Route path="/inventario/materiales" element={<MaterialesList />} />
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