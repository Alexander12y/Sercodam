import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Tooltip,
  Container,
  CircularProgress,
  Paper,
  Pagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  PictureAsPdf as PdfIcon,
  Send as SendIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Transform as ConvertIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import SendCotizacionModal from '../components/modals/SendCotizacionModal';
import {
  fetchCotizaciones,
  changeEstadoCotizacion,
  generatePDF,
  convertirAOrden,
  setFilters,
  setPagination,
  clearError
} from '../store/slices/cotizacionesSlice';
import { useSnackbar } from 'notistack';

// Componente para el chip de estado
const EstadoChip = ({ estado }) => {
  const getEstadoConfig = (estado) => {
    switch (estado) {
      case 'por aprobar':
        return { color: 'warning', label: 'Por Aprobar' };
      case 'aprobada':
        return { color: 'success', label: 'Aprobada' };
      case 'no aprobada':
        return { color: 'error', label: 'No Aprobada' };
      case 'enviada':
        return { color: 'info', label: 'Enviada' };
      case 'convertida':
        return { color: 'primary', label: 'Convertida' };
      case 'rechazada':
        return { color: 'error', label: 'Rechazada' };
      default:
        return { color: 'default', label: estado };
    }
  };

  const config = getEstadoConfig(estado);
  return <Chip color={config.color} label={config.label} size="small" />;
};

const CotizacionesList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  
  const {
    cotizaciones,
    loading,
    error,
    pagination,
    filters,
    pdfGenerating
  } = useSelector((state) => state.cotizaciones);

  // Estados locales
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    cotizacion: null,
    action: null,
    title: '',
    message: ''
  });
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [selectedCotizacion, setSelectedCotizacion] = useState(null);

  useEffect(() => {
    loadCotizaciones();
  }, [currentPage, filtroEstado, filtroBusqueda]);

  const loadCotizaciones = () => {
    const params = {
      page: currentPage,
      limit: 20,
      ...(filtroEstado && { estado: filtroEstado }),
      ...(filtroBusqueda && { cliente: filtroBusqueda })
    };
    dispatch(fetchCotizaciones(params));
  };



  const handleVerCotizacion = (id) => {
    navigate(`/cotizaciones/${id}`);
  };

  const handleEditarCotizacion = (id) => {
    navigate(`/cotizaciones/editar/${id}`);
  };

  const handleGeneratePDF = async (id) => {
    try {
      await dispatch(generatePDF(id)).unwrap();
      enqueueSnackbar('PDF generado exitosamente', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Error generando PDF', { variant: 'error' });
    }
  };

  const handleCambiarEstado = (cotizacion, nuevoEstado) => {
    const acciones = {
      'aprobada': { 
        title: 'Aprobar Cotización', 
        message: '¿Estás seguro de que quieres aprobar esta cotización? Esto permitirá enviarla al cliente.' 
      },
      'enviada': { 
        title: 'Convertir a Orden', 
        message: '¿Estás seguro de que quieres convertir esta cotización en una orden de producción?' 
      },
      'rechazada': { 
        title: 'Rechazar Cotización', 
        message: '¿Estás seguro de que quieres rechazar esta cotización?' 
      }
    };

    setConfirmDialog({
      open: true,
      cotizacion,
      action: nuevoEstado,
      title: acciones[nuevoEstado]?.title || 'Cambiar Estado',
      message: acciones[nuevoEstado]?.message || '¿Estás seguro de que quieres cambiar el estado de esta cotización?'
    });
  };

  const confirmarAccion = async () => {
    try {
      if (confirmDialog.action === 'convertida') {
        // Convertir a orden
        await dispatch(convertirAOrden(confirmDialog.cotizacion.id_cotizacion)).unwrap();
        enqueueSnackbar('Cotización convertida a orden exitosamente', { variant: 'success' });
      } else {
        // Cambiar estado
        await dispatch(changeEstadoCotizacion({ 
          id: confirmDialog.cotizacion.id_cotizacion, 
          estado: confirmDialog.action 
        })).unwrap();
        
        enqueueSnackbar(`Estado cambiado exitosamente a ${getEstadoText(confirmDialog.action)}`, { 
          variant: 'success' 
        });
      }
      
      loadCotizaciones(); // Recargar la lista
    } catch (error) {
      const errorMessage = error.message || 'Error al cambiar el estado de la cotización';
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    } finally {
      setConfirmDialog({ open: false, cotizacion: null, action: null, title: '', message: '' });
    }
  };

  const handleEnviarCotizacion = (cotizacion) => {
    // Abrir modal de envío
    setSelectedCotizacion(cotizacion);
    setSendModalOpen(true);
  };

  const handleSendModalClose = () => {
    setSendModalOpen(false);
    setSelectedCotizacion(null);
    loadCotizaciones(); // Recargar para ver cambios de estado
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-MX');
  };

  const getEstadoText = (estado) => {
    switch (estado) {
      case 'por aprobar':
        return 'Por Aprobar';
      case 'aprobada':
        return 'Aprobada';
      case 'no aprobada':
        return 'No Aprobada';
      case 'enviada':
        return 'Enviada';
      case 'convertida':
        return 'Convertida';
      case 'rechazada':
        return 'Rechazada';
      default:
        return estado;
    }
  };

  const canApprove = (estado) => estado === 'por aprobar';
  const canSend = (estado) => estado === 'aprobada';
  const canConvert = (estado) => estado === 'enviada';
  const canReject = (estado) => estado === 'por aprobar' || estado === 'aprobada';

  if (loading && cotizaciones.length === 0) {
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
          Cotizaciones
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadCotizaciones}
            sx={{ mr: 1 }}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/cotizaciones/nueva')}
          >
            Nueva Cotización
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar las cotizaciones: {error}
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
                  <MenuItem value="por aprobar">Por Aprobar</MenuItem>
                  <MenuItem value="aprobada">Aprobada</MenuItem>
                  <MenuItem value="no aprobada">No Aprobada</MenuItem>
                  <MenuItem value="enviada">Enviada</MenuItem>
                  <MenuItem value="convertida">Convertida</MenuItem>
                  <MenuItem value="rechazada">Rechazada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabla de cotizaciones */}
      <TableContainer component={Paper} sx={{ mb: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Número</strong></TableCell>
              <TableCell><strong>Cliente</strong></TableCell>
              <TableCell><strong>Proyecto</strong></TableCell>
              <TableCell><strong>Total</strong></TableCell>
              <TableCell><strong>Estado</strong></TableCell>
              <TableCell><strong>Fecha</strong></TableCell>
              <TableCell><strong>Acciones</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cotizaciones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No se encontraron cotizaciones
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              cotizaciones.map((cotizacion) => (
                <TableRow key={cotizacion.id_cotizacion} hover>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace" fontWeight="medium">
                      {cotizacion.numero_cotizacion}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {cotizacion.nombre_cliente}
                    </Typography>
                    {cotizacion.empresa_cliente && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {cotizacion.empresa_cliente}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {cotizacion.titulo_proyecto}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {cotizacion.tipo_proyecto}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(cotizacion.total)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <EstadoChip estado={cotizacion.estado} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(cotizacion.fecha_creacion)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Tooltip title="Ver detalles">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleVerCotizacion(cotizacion.id_cotizacion)}
                            color="primary"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                      
                      <Tooltip title="Editar">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleEditarCotizacion(cotizacion.id_cotizacion)}
                            color="warning"
                          >
                            <EditIcon />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Generar PDF">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => handleGeneratePDF(cotizacion.id_cotizacion)}
                            color="info"
                            disabled={pdfGenerating}
                          >
                            <PdfIcon />
                          </IconButton>
                        </span>
                      </Tooltip>

                      {canApprove(cotizacion.estado) && (
                        <Tooltip title="Aprobar Cotización">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleCambiarEstado(cotizacion, 'aprobada')}
                              color="success"
                            >
                              <CheckIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}

                      {canSend(cotizacion.estado) && (
                        <Tooltip title="Enviar al Cliente">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleEnviarCotizacion(cotizacion)}
                              color="info"
                            >
                              <SendIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}

                      {canConvert(cotizacion.estado) && (
                        <Tooltip title="Convertir a Orden">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleCambiarEstado(cotizacion, 'convertida')}
                              color="primary"
                            >
                              <ConvertIcon />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}

                      {canReject(cotizacion.estado) && (
                        <Tooltip title="Rechazar">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleCambiarEstado(cotizacion, 'rechazada')}
                              color="error"
                            >
                              <CancelIcon />
                            </IconButton>
                          </span>
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
          Mostrando {cotizaciones.length} de {pagination?.total || 0} cotizaciones
        </Typography>
      </Box>

      {/* Dialog de confirmación */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, cotizacion: null, action: null, title: '', message: '' })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog({ open: false, cotizacion: null, action: null, title: '', message: '' })}
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

      {/* Modal de envío de cotización */}
      <SendCotizacionModal
        open={sendModalOpen}
        onClose={handleSendModalClose}
        cotizacion={selectedCotizacion}
      />
    </Container>
  );
};

export default CotizacionesList; 