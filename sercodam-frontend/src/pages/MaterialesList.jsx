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
  fetchMateriales, 
  deleteMaterial,
  clearError,
  clearSuccessMessage 
} from '../store/slices/materialesSlice';
import MaterialModal from '../components/forms/MaterialModal';
import MovimientoModal from '../components/forms/MovimientoModal';
import { SUBGRUPOS_CATEGORIAS_MATERIALES } from '../constants/materialesConstants';

const MaterialesList = () => {
  const dispatch = useDispatch();
  const { 
    lista: materiales, 
    categorias,
    loading, 
    error,
    successMessage,
    pagination 
  } = useSelector((state) => state.materiales);
  
  const [filters, setFilters] = useState({
    subgrupo: '',
    categoria: '',
    estado_calidad: '',
    ubicacion: '',
    search: ''
  });
  const [categoriasFiltradas, setCategoriasFiltradas] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [movimientoModalOpen, setMovimientoModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState(null);
  const [tipoMovimiento, setTipoMovimiento] = useState('entrada');

  const estadosValidos = ['Bueno', 'Regular', 'Usado 50%', 'Malo'];
  const ubicacionesValidas = ['Bodega CDMX', 'Querétaro', 'Oficina', 'Instalación'];

  useEffect(() => {
    loadMateriales();
  }, [currentPage, pageSize]);

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

  const loadMateriales = () => {
    const params = {
      page: currentPage,
      limit: pageSize
    };

    if (filters.categoria) {
        params.categoria = filters.categoria;
    } else if (filters.subgrupo) {
        const categoriasDelSubgrupo = SUBGRUPOS_CATEGORIAS_MATERIALES[filters.subgrupo] || [];
        if (categoriasDelSubgrupo.length > 0) {
            params.categorias = categoriasDelSubgrupo;
        }
    }

    if (filters.estado_calidad) params.estado_calidad = filters.estado_calidad;
    if (filters.ubicacion) params.ubicacion = filters.ubicacion;
    if (filters.search) params.search = filters.search;
    
    dispatch(fetchMateriales(params));
  };

  const handleFilterChange = (field) => (event) => {
    const value = event.target.value;
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'subgrupo') {
      if (value) {
        setCategoriasFiltradas(SUBGRUPOS_CATEGORIAS_MATERIALES[value] || []);
        setFilters(prev => ({ ...prev, categoria: '' }));
      } else {
        setCategoriasFiltradas([]);
      }
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    loadMateriales();
  };

  const handleClearFilters = () => {
    setFilters({
      subgrupo: '',
      categoria: '',
      estado_calidad: '',
      ubicacion: '',
      search: ''
    });
    setCategoriasFiltradas([]);
    setCurrentPage(1);
    dispatch(fetchMateriales({ page: 1, limit: pageSize }));
  };

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (event) => {
    setPageSize(event.target.value);
    setCurrentPage(1);
  };

  const handleCreate = () => {
    setSelectedMaterial(null);
    setModalOpen(true);
  };

  const handleEdit = (material) => {
    setSelectedMaterial(material);
    setModalOpen(true);
  };

  const handleView = (material) => {
    setSelectedMaterial(material);
    setDetailModalOpen(true);
  };

  const handleDelete = (material) => {
    setMaterialToDelete(material);
    setDeleteDialogOpen(true);
  };

  const handleMovimiento = (material, tipo) => {
    setSelectedMaterial(material);
    setTipoMovimiento(tipo);
    setMovimientoModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await dispatch(deleteMaterial(materialToDelete.id_item)).unwrap();
      loadMateriales();
      setDeleteDialogOpen(false);
      setMaterialToDelete(null);
    } catch (error) {
      console.error('Error eliminando material:', error);
    }
  };

  const handleModalSuccess = () => {
    loadMateriales();
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

  const materialesArray = Array.isArray(materiales) ? materiales : [];

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Inventario de Materiales Extra
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadMateriales}
            sx={{ mr: 1 }}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Nuevo Material
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
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth>
                <InputLabel>Subgrupo</InputLabel>
                <Select value={filters.subgrupo} label="Subgrupo" onChange={handleFilterChange('subgrupo')}>
                  <MenuItem value=""><em>Todos</em></MenuItem>
                  {Object.keys(SUBGRUPOS_CATEGORIAS_MATERIALES).map(sub => <MenuItem key={sub} value={sub}>{sub}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth disabled={!filters.subgrupo}>
                <InputLabel>Categoría</InputLabel>
                <Select value={filters.categoria} label="Categoría" onChange={handleFilterChange('categoria')}>
                  <MenuItem value=""><em>Todas</em></MenuItem>
                  {categoriasFiltradas.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
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
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth>
                <InputLabel>Ubicación</InputLabel>
                <Select
                  value={filters.ubicacion}
                  onChange={handleFilterChange('ubicacion')}
                  label="Ubicación"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {ubicacionesValidas.map((ubicacion) => (
                    <MenuItem key={ubicacion} value={ubicacion}>
                      {ubicacion}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <TextField fullWidth label="Buscar..." value={filters.search} onChange={handleFilterChange('search')} />
            </Grid>
            <Grid item xs={12} sm={12} md={2} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={handleClearFilters} fullWidth>Limpiar</Button>
              <Button variant="contained" onClick={handleApplyFilters} fullWidth>Aplicar</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabla de materiales */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Materiales ({pagination.total || materialesArray.length})
          </Typography>

          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Descripción</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell>Marca</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Mínimo</TableCell>
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
                    <TableCell colSpan={11} align="center">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : materialesArray.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center">
                      No se encontraron materiales
                    </TableCell>
                  </TableRow>
                ) : (
                  materialesArray.map((material) => (
                    <TableRow key={material.id_item}>
                      <TableCell>
                        <Typography variant="body2" fontFamily="monospace">
                          {material.id_material_extra}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {material.descripcion}
                        </Typography>
                        {material.presentacion && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {material.presentacion}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={material.categoria} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {material.marca || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          fontWeight="bold"
                          color={material.cantidad_disponible <= material.stock_minimo ? 'error' : 'inherit'}
                        >
                          {material.cantidad_disponible ?? 0}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {material.stock_minimo ?? 0}
                      </TableCell>
                      <TableCell>
                        {material.unidad || 'unidad'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={material.estado_calidad} 
                          size="small" 
                          color={getEstadoColor(material.estado_calidad)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={material.ubicacion} 
                          size="small" 
                          color={getUbicacionColor(material.ubicacion)}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {material.precioxunidad ? `$${material.precioxunidad}` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Ver detalles">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleView(material)}
                                color="primary"
                              >
                                <ViewIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(material)}
                                color="warning"
                              >
                                <EditIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Entrada">
                            <span>
                              <IconButton
                                size="small"
                                color="success"
                                onClick={() => handleMovimiento(material, 'entrada')}
                              >
                                <InputIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Salida">
                            <span>
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleMovimiento(material, 'salida')}
                              >
                                <OutputIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDelete(material)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </span>
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
                  Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} materiales
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

      {/* Modal de material */}
      <MaterialModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        material={selectedMaterial}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de movimiento */}
      <MovimientoModal
        open={movimientoModalOpen}
        onClose={() => setMovimientoModalOpen(false)}
        item={selectedMaterial}
        tipo={tipoMovimiento}
        onSuccess={handleModalSuccess}
        tipoItem="material"
        apiEndpoint={tipoMovimiento === 'entrada' ? 'entradaMaterial' : 'salidaMaterial'}
      />

      {/* Modal de detalles */}
      <Dialog open={detailModalOpen} onClose={() => setDetailModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalles del Material - Código: {selectedMaterial?.id_material_extra}
        </DialogTitle>
        <DialogContent>
          {selectedMaterial && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Información Básica
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Código:</Typography>
                <Typography variant="body2">{selectedMaterial.id_material_extra}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Descripción:</Typography>
                <Typography variant="body2">{selectedMaterial.descripcion}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Categoría:</Typography>
                <Typography variant="body2">{selectedMaterial.categoria}</Typography>
              </Grid>
              {selectedMaterial.presentacion && (
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">Presentación:</Typography>
                  <Typography variant="body2">{selectedMaterial.presentacion}</Typography>
                </Grid>
              )}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Cantidad Disponible:</Typography>
                <Typography variant="body2">{selectedMaterial.cantidad_disponible ?? 0}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Stock Mínimo:</Typography>
                <Typography variant="body2">{selectedMaterial.stock_minimo ?? 0}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Unidad:</Typography>
                <Typography variant="body2">{selectedMaterial.unidad}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Marca:</Typography>
                <Typography variant="body2">{selectedMaterial.marca || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Estado Calidad:</Typography>
                <Chip label={selectedMaterial.estado_calidad} size="small" color={getEstadoColor(selectedMaterial.estado_calidad)} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Ubicación:</Typography>
                <Chip 
                  label={selectedMaterial.ubicacion} 
                  size="small" 
                  color={getUbicacionColor(selectedMaterial.ubicacion)}
                  variant="outlined"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Precio por Unidad:</Typography>
                <Typography variant="body2">${selectedMaterial.precioxunidad ?? 0}</Typography>
              </Grid>
              {selectedMaterial.uso_principal && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">Uso Principal:</Typography>
                  <Typography variant="body2">{selectedMaterial.uso_principal}</Typography>
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

      {/* Dialog de confirmación de eliminación */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar el material "{materialToDelete?.descripcion}"?
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

export default MaterialesList; 