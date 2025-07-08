import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Typography,
  Button,
  Container,
} from '@mui/material';
import {
  Security as SecurityIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const RequireRole = ({ children, roles = [] }) => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Si no hay usuario autenticado, redirigir al login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si no se especifican roles, permitir acceso
  if (roles.length === 0) {
    return children;
  }

  // Verificar si el usuario tiene uno de los roles requeridos
  const hasRequiredRole = roles.includes(user.rol);

  if (!hasRequiredRole) {
    return (
      <Container maxWidth="md">
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <SecurityIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            Acceso Denegado
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            No tienes permisos para acceder a esta página.
            <br />
            Roles requeridos: {roles.join(', ')}
            <br />
            Tu rol: {user.rol}
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
          >
            Volver
          </Button>
        </Box>
      </Container>
    );
  }

  return children;
};

export default RequireRole; 