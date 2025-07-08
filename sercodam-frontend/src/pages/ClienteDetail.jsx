import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Alert,
  CircularProgress,
  Divider,
  Avatar,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import { 
  fetchClienteById, 
  fetchOrdenesCliente, 
  clearError,
  clearCurrentCliente,
  clearOrdenesCliente
} from '../store/slices/clientesSlice';
import ClienteModal from '../components/forms/ClienteModal';

const ClienteDetail = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { 
    currentCliente, 
    ordenesCliente, 
    loading, 
    error, 
    ordenesClientePagination 
  } = useSelector(state => state.clientes);

  const [modalOpen, setModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [estadoFilter, setEstadoFilter] = useState('');

  // Cargar datos del cliente y sus órdenes
  useEffect(() => {
    if (id) {
      dispatch(fetchClienteById(id));
      dispatch(fetchOrdenesCliente({
        id,
        params: {
          page: page + 1,
          limit: rowsPerPage,
          estado: estadoFilter
        }
      }));
    }
  }, [dispatch, id, page, rowsPerPage, estadoFilter]);

  // Limpiar datos al desmontar
  useEffect(() => {
    return () => {
      dispatch(clearCurrentCliente());
      dispatch(clearOrdenesCliente());
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleEditCliente = () => {
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    // Recargar datos del cliente después de editar
    if (id) {
      dispatch(fetchClienteById(id));
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleVerOrden = (idOrden) => {
    navigate(`/ordenes/${idOrden}`);
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'completada':
        return 'success';
      case 'en_proceso':
        return 'primary';
      case 'pausada':
        return 'warning';
      case 'cancelada':
        return 'error';
      default:
        return 'default';
    }
  };

  const getEstadoIcon = (estado) => {
    switch (estado) {
      case 'completada':
        return <CheckCircleIcon fontSize="small" />;
      case 'en_proceso':
        return <PlayArrowIcon fontSize="small" />;
      case 'pausada':
        return <PauseIcon fontSize="small" />;
      case 'cancelada':
        return <CancelIcon fontSize="small" />;
      default:
        return <AssignmentIcon fontSize="small" />;
    }
  };

  if (loading && !currentCliente) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!currentCliente) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Cliente no encontrado</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/clientes')}
          sx={{ textDecoration: 'none' }}
        >
          Clientes
        </Link>
        <Typography variant="body2" color="text.primary">
          {currentCliente.nombre_cliente}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/clientes')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            {currentCliente.nombre_cliente}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<EditIcon />}
          onClick={handleEditCliente}
          sx={{ borderRadius: 2 }}
        >
          Editar Cliente
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Información del Cliente */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                  <PersonIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {currentCliente.nombre_cliente}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ID: {currentCliente.id_cliente}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Información de Contacto */}
              <Box mb={2}>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                  Información de Contacto
                </Typography>
                
                {currentCliente.email && (
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <EmailIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {currentCliente.email}
                    </Typography>
                  </Box>
                )}
                
                {currentCliente.telefono && (
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <PhoneIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      {currentCliente.telefono}
                    </Typography>
                  </Box>
                )}
                
                <Box display="flex" alignItems="center" gap={1}>
                  <CalendarIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    Registrado: {formatFecha(currentCliente.fecha_registro)}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Estadísticas */}
              <Box>
                <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                  Estadísticas de Órdenes
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h6" fontWeight="bold" color="primary">
                        {currentCliente.stats?.total_ordenes || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h6" fontWeight="bold" color="success.main">
                        {currentCliente.stats?.ordenes_completadas || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Completadas
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h6" fontWeight="bold" color="info.main">
                        {currentCliente.stats?.ordenes_en_proceso || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        En Proceso
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box textAlign="center">
                      <Typography variant="h6" fontWeight="bold" color="error.main">
                        {currentCliente.stats?.ordenes_canceladas || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Canceladas
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Órdenes del Cliente */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="bold">
                Órdenes de Producción
              </Typography>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold' }}>Número OP</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Prioridad</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ordenesCliente.map((orden) => (
                    <TableRow key={orden.id_op} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {orden.numero_op}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getEstadoIcon(orden.estado)}
                          label={orden.estado.replace('_', ' ').toUpperCase()}
                          color={getEstadoColor(orden.estado)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={orden.prioridad.toUpperCase()}
                          color={orden.prioridad === 'urgente' ? 'error' : 
                                 orden.prioridad === 'alta' ? 'warning' : 'default'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatFecha(orden.fecha_op)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => handleVerOrden(orden.id_op)}
                          startIcon={<AssignmentIcon />}
                        >
                          Ver Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {ordenesCliente.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          Este cliente no tiene órdenes de producción
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            
            {/* Pagination */}
            {ordenesCliente.length > 0 && (
              <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={ordenesClientePagination.total}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Filas por página:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
              />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Modal para editar cliente */}
      <ClienteModal
        open={modalOpen}
        onClose={handleModalClose}
        cliente={currentCliente}
      />
    </Box>
  );
};

export default ClienteDetail; 