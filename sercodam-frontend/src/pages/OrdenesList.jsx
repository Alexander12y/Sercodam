import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip,
  Container,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pause as PauseIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrdenes, cambiarEstadoOrden } from '../store/slices/ordenesSlice';
import { useSnackbar } from 'notistack';

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
    case 'pausada':
      return 'default';
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

const OrdenesList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { ordenes, loading, error, pagination } = useSelector((state) => state.ordenes);
  
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    orden: null,
    action: null,
    title: '',
    message: ''
  });

  useEffect(() => {
    loadOrdenes();
  }, [currentPage, filtroEstado, filtroBusqueda]);

  const loadOrdenes = () => {
    const params = {
      page: currentPage,
      limit: 20,
      ...(filtroEstado && { estado: filtroEstado }),
      ...(filtroBusqueda && { cliente: filtroBusqueda })
    };
    dispatch(fetchOrdenes(params));
  };

  const handleVerOrden = (id) => {
    navigate(`/ordenes/${id}`);
  };

  const handleEditarOrden = (id) => {
    navigate(`/ordenes/${id}/editar`);
  };

  const handleCambiarEstado = (orden, nuevoEstado) => {
    const acciones = {
      'en_proceso': { title: 'Iniciar Producción', message: '¿Estás seguro de que quieres iniciar la producción de esta orden?' },
      'completada': { title: 'Completar Orden', message: '¿Estás seguro de que quieres marcar esta orden como completada?' },
      'cancelada': { title: 'Cancelar Orden', message: '¿Estás seguro de que quieres cancelar esta orden? Esta acción no se puede deshacer.' },
      'pausada': { title: 'Pausar Orden', message: '¿Estás seguro de que quieres pausar esta orden?' }
    };

    setConfirmDialog({
      open: true,
      orden,
      action: nuevoEstado,
      title: acciones[nuevoEstado]?.title || 'Cambiar Estado',
      message: acciones[nuevoEstado]?.message || '¿Estás seguro de que quieres cambiar el estado de esta orden?'
    });
  };

  const confirmarAccion = async () => {
    try {
      await dispatch(cambiarEstadoOrden({ 
        id: confirmDialog.orden.id_op, 
        estado: confirmDialog.action 
      })).unwrap();
      
      enqueueSnackbar(`Estado cambiado exitosamente a ${getEstadoText(confirmDialog.action)}`, { 
        variant: 'success' 
      });
      
      loadOrdenes(); // Recargar la lista
    } catch (error) {
      enqueueSnackbar('Error al cambiar el estado de la orden', { 
        variant: 'error' 
      });
    } finally {
      setConfirmDialog({ open: false, orden: null, action: null, title: '', message: '' });
    }
  };

  const canStart = (estado) => estado === 'pendiente';
  const canComplete = (estado) => estado === 'en_proceso';
  const canCancel = (estado) => ['pendiente', 'en_proceso', 'pausada'].includes(estado);
  const canPause = (estado) => estado === 'en_proceso';

  if (loading && ordenes.length === 0) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Órdenes de Producción
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadOrdenes}
            sx={{ mr: 1 }}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/ordenes/nueva')}
          >
            Nueva Orden
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar las órdenes: {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Buscar por cliente"
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                size="small"
                placeholder="Escribe el nombre del cliente..."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filtroEstado}
                  label="Estado"
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <MenuItem value="">Todos los estados</MenuItem>
                  <MenuItem value="pendiente">Pendiente</MenuItem>
                  <MenuItem value="en_proceso">En Proceso</MenuItem>
                  <MenuItem value="completada">Completada</MenuItem>
                  <MenuItem value="cancelada">Cancelada</MenuItem>
                  <MenuItem value="pausada">Pausada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabla de órdenes */}
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Número OP</strong></TableCell>
              <TableCell><strong>Cliente</strong></TableCell>
              <TableCell><strong>Fecha Creación</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell><strong>Prioridad</strong></TableCell>
              <TableCell><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordenes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No se encontraron órdenes
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              ordenes.map((orden) => (
                <TableRow key={orden.id_op} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontWeight="medium">
                      {orden.numero_op}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {orden.cliente}
                    </Typography>
                    {orden.observaciones && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {orden.observaciones}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {orden.fecha_creacion ? 
                      new Date(orden.fecha_creacion).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      }) : 
                      (orden.fecha_op ? 
                        new Date(orden.fecha_op).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : '-')
                    }
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getEstadoText(orden.estado)}
                      color={getEstadoColor(orden.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getPrioridadText(orden.prioridad)}
                      color={getPrioridadColor(orden.prioridad)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Tooltip title="Ver detalles">
                        <IconButton
                          size="small"
                          onClick={() => handleVerOrden(orden.id_op)}
                          color="primary"
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Editar">
                        <IconButton
                          size="small"
                          onClick={() => handleEditarOrden(orden.id_op)}
                          color="warning"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>

                      {canStart(orden.estado) && (
                        <Tooltip title="Iniciar Producción">
                          <IconButton
                            size="small"
                            onClick={() => handleCambiarEstado(orden, 'en_proceso')}
                            color="success"
                          >
                            <PlayArrowIcon />
                          </IconButton>
                        </Tooltip>
                      )}

                      {canComplete(orden.estado) && (
                        <Tooltip title="Completar">
                          <IconButton
                            size="small"
                            onClick={() => handleCambiarEstado(orden, 'completada')}
                            color="success"
                          >
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                      )}

                      {canPause(orden.estado) && (
                        <Tooltip title="Pausar">
                          <IconButton
                            size="small"
                            onClick={() => handleCambiarEstado(orden, 'pausada')}
                            color="warning"
                          >
                            <PauseIcon />
                          </IconButton>
                        </Tooltip>
                      )}

                      {canCancel(orden.estado) && (
                        <Tooltip title="Cancelar">
                          <IconButton
                            size="small"
                            onClick={() => handleCambiarEstado(orden, 'cancelada')}
                            color="error"
                          >
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={pagination.totalPages}
            page={currentPage}
            onChange={(event, value) => setCurrentPage(value)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Información de resultados */}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Mostrando {ordenes.length} de {pagination?.total || 0} órdenes
        </Typography>
      </Box>

      {/* Dialog de confirmación */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, orden: null, action: null, title: '', message: '' })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog({ open: false, orden: null, action: null, title: '', message: '' })}
          >
            Cancelar
          </Button>
          <Button 
            onClick={confirmarAccion} 
            variant="contained" 
            color="primary"
            autoFocus
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OrdenesList; 