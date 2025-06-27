import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrdenById, cambiarEstadoOrden } from '../store/slices/ordenesSlice';

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'pendiente':
      return 'warning';
    case 'en_proceso':
      return 'info';
    case 'completada':
      return 'success';
    case 'cancelada':
      return 'error';
    default:
      return 'default';
  }
};

const getEstadoText = (estado) => {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente';
    case 'en_proceso':
      return 'En Proceso';
    case 'completada':
      return 'Completada';
    case 'cancelada':
      return 'Cancelada';
    default:
      return estado;
  }
};

const OrdenDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { ordenActual, loading, error } = useSelector((state) => state.ordenes);

  useEffect(() => {
    if (id) {
      dispatch(fetchOrdenById(id));
    }
  }, [dispatch, id]);

  const handleCambiarEstado = (nuevoEstado) => {
    dispatch(cambiarEstadoOrden({ id, estado: nuevoEstado }));
  };

  const canStart = ordenActual?.estado === 'pendiente';
  const canComplete = ordenActual?.estado === 'en_proceso';
  const canCancel = ['pendiente', 'en_proceso'].includes(ordenActual?.estado);

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
        Error al cargar la orden: {error}
      </Alert>
    );
  }

  if (!ordenActual) {
    return (
      <Alert severity="info">
        No se encontró la orden solicitada
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/ordenes')}
          sx={{ mr: 2 }}
        >
          Volver
        </Button>
        <Typography variant="h4" component="h1">
          Orden de Producción: {ordenActual.numero_op}
        </Typography>
      </Box>

      {/* Acciones */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/ordenes/${id}/editar`)}
            >
              Editar
            </Button>
            
            {canStart && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PlayArrowIcon />}
                onClick={() => handleCambiarEstado('en_proceso')}
              >
                Iniciar Producción
              </Button>
            )}
            
            {canComplete && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleCambiarEstado('completada')}
              >
                Completar
              </Button>
            )}
            
            {canCancel && (
              <Button
                variant="contained"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => handleCambiarEstado('cancelada')}
              >
                Cancelar
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Información principal */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Información General
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Número OP
                  </Typography>
                  <Typography variant="body1">
                    {ordenActual.numero_op}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Estado
                  </Typography>
                  <Chip
                    label={getEstadoText(ordenActual.estado)}
                    color={getEstadoColor(ordenActual.estado)}
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Fecha de Creación
                  </Typography>
                  <Typography variant="body1">
                    {ordenActual.fecha_creacion ? new Date(ordenActual.fecha_creacion).toLocaleDateString() : '-'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Prioridad
                  </Typography>
                  <Chip
                    label={ordenActual.prioridad === 'media' ? 'Media' : ordenActual.prioridad || 'Media'}
                    color={ordenActual.prioridad === 'alta' ? 'error' : 'default'}
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Descripción
                  </Typography>
                  <Typography variant="body1">
                    {ordenActual.descripcion || 'Sin descripción'}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Información adicional */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detalles Adicionales
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Cantidad"
                    secondary={ordenActual.cantidad || 'No especificada'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Unidad"
                    secondary={ordenActual.unidad || 'No especificada'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Fecha Inicio"
                    secondary={ordenActual.fecha_inicio ? new Date(ordenActual.fecha_inicio).toLocaleDateString() : 'No iniciada'}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Fecha Fin"
                    secondary={ordenActual.fecha_fin ? new Date(ordenActual.fecha_fin).toLocaleDateString() : 'No completada'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Sección de materiales y herramientas (placeholder) */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Materiales y Herramientas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Esta funcionalidad estará disponible próximamente
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OrdenDetail; 