import React, { useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Pending as PendingIcon,
  CheckCircle as CheckCircleIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrdenes } from '../store/slices/ordenesSlice';

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '50%',
            p: 1,
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const dispatch = useDispatch();
  const { ordenes, loading, error } = useSelector((state) => state.ordenes);

  useEffect(() => {
    dispatch(fetchOrdenes());
  }, [dispatch]);

  // Calcular estadísticas
  const totalOrdenes = ordenes.length;
  const ordenesPendientes = ordenes.filter(orden => orden.estado === 'pendiente').length;
  const ordenesCompletadas = ordenes.filter(orden => orden.estado === 'completada').length;
  const ordenesEnProceso = ordenes.filter(orden => orden.estado === 'en_proceso').length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error al cargar los datos: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Órdenes"
            value={totalOrdenes}
            icon={<AssignmentIcon sx={{ color: 'white' }} />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pendientes"
            value={ordenesPendientes}
            icon={<PendingIcon sx={{ color: 'white' }} />}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="En Proceso"
            value={ordenesEnProceso}
            icon={<BuildIcon sx={{ color: 'white' }} />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completadas"
            value={ordenesCompletadas}
            icon={<CheckCircleIcon sx={{ color: 'white' }} />}
            color="#4caf50"
          />
        </Grid>
      </Grid>

      {totalOrdenes === 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" color="text.secondary" align="center">
              No hay órdenes de producción registradas
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Crea tu primera orden de producción para comenzar
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Dashboard; 