import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Pagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Input as InputIcon,
  Output as OutputIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchHerramientas, 
  fetchCategorias, 
  fetchEstados,
  fetchUbicaciones,
  deleteHerramienta,
  clearError,
  clearSuccessMessage 
} from '../store/slices/herramientasSlice';
import HerramientaModal from '../components/forms/HerramientaModal';
import MovimientoModal from '../components/forms/MovimientoModal';

const HerramientasList = () => {
  const dispatch = useDispatch();
  const { 
    lista: herramientas, 
    categorias,
    estados,
    ubicaciones,
    loading, 
    error,
    successMessage,
    pagination 
  } = useSelector((state) => state.herramientas);
  
  const [filters, setFilters] = useState({
    categoria: '',
    estado_calidad: '',
    ubicacion: '',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [movimientoModalOpen, setMovimientoModalOpen] = useState(false);
  const [selectedHerramienta, setSelectedHerramienta] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [herramientaToDelete, setHerramientaToDelete] = useState(null);
  const [tipoMovimiento, setTipoMovimiento] = useState('entrada');

  const estadosValidos = ['Bueno', 'Regular', 'Usado 50%', 'Malo'];

  useEffect(() => {
    loadHerramientas();
  }, [currentPage, pageSize]);

  useEffect(() => {
    // Cargar datos estáticos solo una vez al montar el componente
    loadCategorias();
    loadEstados();
    loadUbicaciones();
  }, []); // Solo se ejecuta al montar el componente

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        dispatch(clearSuccessMessage());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch]);

  const loadHerramientas = () => {
    const params = {
      page: currentPage,
      limit: pageSize
    };
    if (filters.categoria) params.categoria = filters.categoria;
    if (filters.estado_calidad) params.estado_calidad = filters.estado_calidad;
    if (filters.ubicacion) params.ubicacion = filters.ubicacion;
    if (filters.search) params.search = filters.search;
    
    dispatch(fetchHerramientas(params));
  };

  const loadCategorias = () => {
    dispatch(fetchCategorias());
  };

  const loadEstados = () => {
    dispatch(fetchEstados());
  };

  const loadUbicaciones = () => {
    dispatch(fetchUbicaciones());
  };

  const handleFilterChange = (field) => (event) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadHerramientas();
  };

  const handleClearFilters = () => {
    setFilters({
      categoria: '',
      estado_calidad: '',
      ubicacion: '',
      search: ''
    });
    setCurrentPage(1);
    dispatch(fetchHerramientas({ page: 1, limit: pageSize }));
  };

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (event) => {
    setPageSize(event.target.value);
    setCurrentPage(1);
  };

  const handleCreate = () => {
    setSelectedHerramienta(null);
    setModalOpen(true);
  };

  const handleEdit = (herramienta) => {
    setSelectedHerramienta(herramienta);
    setModalOpen(true);
  };

  const handleView = (herramienta) => {
    setSelectedHerramienta(herramienta);
    setDetailModalOpen(true);
  };

  const handleDelete = (herramienta) => {
    setHerramientaToDelete(herramienta);
    setDeleteDialogOpen(true);
  };

  const handleMovimiento = (herramienta, tipo) => {
    setSelectedHerramienta(herramienta);
    setTipoMovimiento(tipo);
    setMovimientoModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await dispatch(deleteHerramienta(herramientaToDelete.id_item)).unwrap();
      loadHerramientas();
      setDeleteDialogOpen(false);
      setHerramientaToDelete(null);
    } catch (error) {
      console.error('Error eliminando herramienta:', error);
    }
  };

  const handleModalSuccess = () => {
    loadHerramientas();
  };

  const getEstadoColor = (estado) => {
    const colors = {
      'Bueno': 'success',
      'Regular': 'warning',
      'Usado 50%': 'info',
      'Malo': 'error',
    };
    return colors[estado] || 'default';
  };

  const getUbicacionColor = (ubicacion) => {
    const colors = {
      'Bodega CDMX': 'primary',
      'Querétaro': 'secondary',
      'Oficina': 'info',
      'Instalación': 'warning',
    };
    return colors[ubicacion] || 'default';
  };

  const herramientasArray = Array.isArray(herramientas) ? herramientas : [];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Inventario de Herramientas
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadHerramientas}
            sx={{ mr: 1 }}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Nueva Herramienta
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMessage}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filtros
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Buscar"
                value={filters.search}
                onChange={handleFilterChange('search')}
                placeholder="Código, descripción, categoría..."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={filters.categoria}
                  onChange={handleFilterChange('categoria')}
                  label="Categoría"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {categorias.map((categoria) => (
                    <MenuItem key={categoria} value={categoria}>
                      {categoria}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filters.estado_calidad}
                  onChange={handleFilterChange('estado_calidad')}
                  label="Estado"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {estadosValidos.map((estado) => (
                    <MenuItem key={estado} value={estado}>
                      {estado}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth>
                <InputLabel>Ubicación</InputLabel>
                <Select
                  value={filters.ubicacion}
                  onChange={handleFilterChange('ubicacion')}
                  label="Ubicación"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {ubicaciones.map((ubicacion) => (
                    <MenuItem key={ubicacion} value={ubicacion}>
                      {ubicacion}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={1}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleApplyFilters}
                size="small"
              >
                Filtrar
              </Button>
            </Grid>
            <Grid item xs={12} sm={6} md={1}>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleClearFilters}
                size="small"
              >
                Limpiar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabla de herramientas */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Herramientas ({pagination.total || herramientasArray.length})
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Código</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Marca</TableCell>
                  <TableCell>Stock</TableCell>
                  <TableCell>Unidad</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Ubicación</TableCell>
                  <TableCell>Precio</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : herramientasArray.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      No se encontraron herramientas
                    </TableCell>
                  </TableRow>
                ) : (
                  herramientasArray.map((herramienta) => (
                    <TableRow key={herramienta.id_item}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {herramienta.id_herramienta}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {herramienta.descripcion}
                        </Typography>
                        {herramienta.presentacion && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {herramienta.presentacion}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={herramienta.categoria} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {herramienta.marca || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color={herramienta.cantidad_disponible <= 0 ? 'error' : 'inherit'}
                        >
                          {herramienta.cantidad_disponible || 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {herramienta.unidad || 'unidad'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={herramienta.estado_calidad} 
                          size="small" 
                          color={getEstadoColor(herramienta.estado_calidad)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={herramienta.ubicacion} 
                          size="small" 
                          color={getUbicacionColor(herramienta.ubicacion)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {herramienta.precioxunidad ? `$${herramienta.precioxunidad}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Ver detalles">
                            <IconButton
                              size="small"
                              onClick={() => handleView(herramienta)}
                              color="primary"
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(herramienta)}
                              color="warning"
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Entrada">
                            <IconButton
                              size="small"
                              color="success"
                              onClick={() => handleMovimiento(herramienta, 'entrada')}
                            >
                              <InputIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Salida">
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleMovimiento(herramienta, 'salida')}
                            >
                              <OutputIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(herramienta)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Controles de paginación */}
          {pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} herramientas
                </Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Por página</InputLabel>
                  <Select
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    label="Por página"
                  >
                    <MenuItem value={25}>25</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                    <MenuItem value={200}>200</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Pagination
                count={pagination.totalPages}
                page={pagination.page}
                onChange={handlePageChange}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Modal de herramienta */}
      <HerramientaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        herramienta={selectedHerramienta}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de detalles */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Detalles de la Herramienta
        </DialogTitle>
        <DialogContent>
          {selectedHerramienta && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Código
                </Typography>
                <Typography variant="body1" fontFamily="monospace">
                  {selectedHerramienta.id_herramienta}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Descripción
                </Typography>
                <Typography variant="body1">
                  {selectedHerramienta.descripcion}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Categoría
                </Typography>
                <Typography variant="body1">
                  {selectedHerramienta.categoria}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Marca
                </Typography>
                <Typography variant="body1">
                  {selectedHerramienta.marca || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Stock Disponible
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {selectedHerramienta.cantidad_disponible || 0} {selectedHerramienta.unidad || 'unidad'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Estado
                </Typography>
                <Chip 
                  label={selectedHerramienta.estado_calidad} 
                  size="small" 
                  color={getEstadoColor(selectedHerramienta.estado_calidad)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Ubicación
                </Typography>
                <Typography variant="body1">
                  {selectedHerramienta.ubicacion || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Precio por Unidad
                </Typography>
                <Typography variant="body1">
                  {selectedHerramienta.precioxunidad ? `$${selectedHerramienta.precioxunidad}` : 'N/A'}
                </Typography>
              </Grid>
              {selectedHerramienta.presentacion && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Presentación
                  </Typography>
                  <Typography variant="body1">
                    {selectedHerramienta.presentacion}
                  </Typography>
                </Grid>
              )}
              {selectedHerramienta.uso_principal && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Uso Principal
                  </Typography>
                  <Typography variant="body1">
                    {selectedHerramienta.uso_principal}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailModalOpen(false)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de movimiento */}
      <MovimientoModal
        open={movimientoModalOpen}
        onClose={() => setMovimientoModalOpen(false)}
        item={selectedHerramienta}
        tipo={tipoMovimiento}
        onSuccess={handleModalSuccess}
        tipoItem="herramienta"
      />

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar la herramienta "{herramientaToDelete?.descripcion}"?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default HerramientasList; 