import React, { useEffect, useState } from 'react';
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
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Tooltip,
  IconButton,
  TextField
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pause as PauseIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrdenById, cambiarEstadoOrden } from '../store/slices/ordenesSlice';
import { useSnackbar } from 'notistack';
import api from '../services/api';

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'en_proceso':
      return 'info';
    case 'completada':
      return 'success';
    case 'cancelada':
      return 'error';
    case 'pausada':
      return 'default';
    default:
      return 'default';
  }
};

const getEstadoText = (estado) => {
  switch (estado) {
    case 'en_proceso':
      return 'En Proceso';
    case 'completada':
      return 'Completada';
    case 'cancelada':
      return 'Cancelada';
    case 'pausada':
      return 'Pausada';
    default:
      return estado;
  }
};

const getPrioridadColor = (prioridad) => {
  switch (prioridad) {
    case 'alta':
      return 'error';
    case 'media':
      return 'warning';
    case 'baja':
      return 'success';
    default:
      return 'default';
  }
};

const getPrioridadText = (prioridad) => {
  switch (prioridad) {
    case 'alta':
      return 'Alta';
    case 'media':
      return 'Media';
    case 'baja':
      return 'Baja';
    default:
      return 'Media';
  }
};

const OrdenDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { ordenActual, loading, error } = useSelector((state) => state.ordenes);
  
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: null,
    title: '',
    message: ''
  });
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchOrdenById(id));
    }
  }, [dispatch, id]);

  const handleCambiarEstado = (estado) => {
    setNuevoEstado(estado);
    setDialogOpen(true);
  };

  const confirmarAccion = async () => {
    try {
      await dispatch(cambiarEstadoOrden({ id, estado: nuevoEstado, notas })).unwrap();
      enqueueSnackbar('Estado actualizado exitosamente', { variant: 'success' });
      setDialogOpen(false);
      setNotas('');
      // Recargar la orden
      dispatch(fetchOrdenById(id));
    } catch (error) {
      enqueueSnackbar('Error al actualizar el estado', { variant: 'error' });
    }
  };

  const handleGenerarPDF = async () => {
    try {
      setLoadingPdf(true);
      
      // Siempre generar el PDF (ya no hay campo pdf_generado en la base de datos)
      await api.get(`/ordenes/${id}/pdf`);
      
      // Ahora descargar el PDF
      const response = await api.get(`/ordenes/${id}/pdf/download`, {
        responseType: 'blob'
      });

      // Crear un blob con el PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      
      // Crear URL del blob
      const url = window.URL.createObjectURL(blob);
      
      // Crear elemento de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = `orden_produccion_${ordenActual.numero_op}.pdf`;
      
      // Simular clic para descargar
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      enqueueSnackbar('PDF descargado exitosamente', { variant: 'success' });
    } catch (error) {
      console.error('Error descargando PDF:', error);
      enqueueSnackbar('Error al descargar el PDF', { variant: 'error' });
    } finally {
      setLoadingPdf(false);
    }
  };

  const canStart = ordenActual?.estado === 'en_proceso';
  const canComplete = ordenActual?.estado === 'completada';
  const canCancel = ['en_proceso', 'pausada'].includes(ordenActual?.estado);
  const canPause = ordenActual?.estado === 'en_proceso';

  if (loading && !ordenActual) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar la orden: {error}
        </Alert>
      </Container>
    );
  }

  if (!ordenActual) {
    return (
      <Container maxWidth="xl">
        <Alert severity="info">
          No se encontró la orden solicitada
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
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
        <Box sx={{ ml: 'auto' }}>
          <Tooltip title="Actualizar">
            <IconButton
              onClick={() => dispatch(fetchOrdenById(id))}
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
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
                color="success"
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

            {canPause && (
              <Button
                variant="contained"
                color="warning"
                startIcon={<PauseIcon />}
                onClick={() => handleCambiarEstado('pausada')}
              >
                Pausar
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

            <Button
              variant="contained"
              color="primary"
              startIcon={loadingPdf ? <CircularProgress size={20} color="inherit" /> : <PdfIcon />}
              onClick={handleGenerarPDF}
              disabled={loadingPdf}
            >
              {loadingPdf ? 'Descargando...' : 'Descargar PDF'}
            </Button>
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
                  <Typography variant="body1" fontFamily="monospace" fontWeight="medium">
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
                    Cliente
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {ordenActual.cliente}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Prioridad
                  </Typography>
                  <Chip
                    label={getPrioridadText(ordenActual.prioridad)}
                    color={getPrioridadColor(ordenActual.prioridad)}
                    variant="outlined"
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Fecha de Creación
                  </Typography>
                  <Typography variant="body1">
                    {ordenActual.fecha_creacion ? 
                      new Date(ordenActual.fecha_creacion).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 
                      (ordenActual.fecha_op ? 
                        new Date(ordenActual.fecha_op).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : '-')
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Fecha de Inicio
                  </Typography>
                  <Typography variant="body1">
                    {ordenActual.fecha_inicio ? 
                      new Date(ordenActual.fecha_inicio).toLocaleDateString('es-ES') : 
                      'No definida'
                    }
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Fecha de Fin
                  </Typography>
                  <Typography variant="body1">
                    {ordenActual.fecha_fin ? 
                      new Date(ordenActual.fecha_fin).toLocaleDateString('es-ES') : 
                      'No definida'
                    }
                  </Typography>
                </Grid>
                {ordenActual.observaciones && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Observaciones
                    </Typography>
                    <Typography variant="body1">
                      {ordenActual.observaciones}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Estado y progreso */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Estado Actual
              </Typography>
              <Box sx={{ textAlign: 'center', py: 2 }}>
                <Chip
                  label={getEstadoText(ordenActual.estado)}
                  color={getEstadoColor(ordenActual.estado)}
                  size="large"
                  sx={{ fontSize: '1.1rem', py: 1 }}
                />
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Progreso de la Orden
              </Typography>
              <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
                <Box 
                  sx={{ 
                    width: `${getProgresoOrden(ordenActual.estado)}%`, 
                    height: 8, 
                    bgcolor: getEstadoColor(ordenActual.estado) === 'success' ? 'success.main' : 'primary.main',
                    transition: 'width 0.3s ease'
                  }} 
                />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {getProgresoOrden(ordenActual.estado)}% completado
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog de confirmación */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      >
        <DialogTitle>Cambiar Estado de Orden</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            ¿Estás seguro de que quieres cambiar el estado de la orden a "{getEstadoText(nuevoEstado)}"?
          </Typography>
          <TextField
            fullWidth
            label="Notas (opcional)"
            multiline
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Agregar notas sobre el cambio de estado..."
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogOpen(false)}
          >
            Cancelar
          </Button>
          <Button 
            onClick={confirmarAccion}
            variant="contained"
            color="primary"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Función auxiliar para calcular el progreso
const getProgresoOrden = (estado) => {
  switch (estado) {
    case 'en_proceso':
      return 50;
    case 'completada':
      return 100;
    case 'cancelada':
      return 0;
    case 'pausada':
      return 25;
    default:
      return 0;
  }
};

export default OrdenDetail; 