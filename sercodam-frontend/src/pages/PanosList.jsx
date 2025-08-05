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
  Fab,
  Divider,
  Pagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPanos, deletePano } from '../store/slices/panosSlice';
import PanoModal from '../components/forms/PanoModal';
import { panosApi } from '../services/api';

const PanosList = () => {
  const dispatch = useDispatch();
  const { lista: panos, loading, error, pagination } = useSelector((state) => state.panos);
  
  const [filters, setFilters] = useState({
    tipo_red: '',
    estado: '',
    search: '' // Añadido para consistencia
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPano, setSelectedPano] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [panoToDelete, setPanoToDelete] = useState(null);

  const tiposValidos = ['lona', 'nylon', 'polipropileno', 'malla sombra'];
  const estadosValidos = ['Bueno', 'Regular', 'Malo', 'Usado 50%'];

  useEffect(() => {
    loadPanos();
  }, [currentPage, pageSize]);

  const loadPanos = () => {
    const params = {
      page: currentPage,
      limit: pageSize,
      ...filters
    };
    dispatch(fetchPanos(params));
  };

  const handleFilterChange = (field) => (event) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleApplyFilters = () => {
      setCurrentPage(1);
      loadPanos();
  };

  const handleClearFilters = () => {
    setFilters({ tipo_red: '', estado: '', search: '' });
    setCurrentPage(1);
    dispatch(fetchPanos({ page: 1, limit: pageSize }));
  };

  const handleCreate = () => {
    setSelectedPano(null);
    setModalOpen(true);
  };

  const handleEdit = (pano) => {
    setSelectedPano(pano);
    setModalOpen(true);
  };

  const handleView = (pano) => {
    setSelectedPano(pano);
    setDetailModalOpen(true);
  };

  const handleDelete = (pano) => {
    setPanoToDelete(pano);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!panoToDelete) return;
    try {
      // Usar la acción de Redux en lugar de la llamada directa a la API
      await dispatch(deletePano(panoToDelete.id_item)).unwrap();
      // Ya no es necesario llamar a loadPanos() aquí, porque el slice se encarga de actualizar el estado.
    } catch (error) {
      // El error ya se maneja en el slice y se guarda en el estado de Redux
      console.error('Fallo al eliminar paño:', error);
    } finally {
      setDeleteDialogOpen(false);
      setPanoToDelete(null);
    }
  };

  const handleModalSuccess = () => {
    loadPanos();
  };

  const getEstadoColor = (estado) => {
    if (!estado) return 'default';
    const normalized = estado.toString().toLowerCase();
    const colors = {
      'bueno': 'success',
      'regular': 'warning',
      'malo': 'error',
      'usado 50%': 'info',
    };
    return colors[normalized] || 'default';
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

  const getEstadoTrabajoColor = (estadoTrabajo) => {
    const colors = {
      'Libre': 'success',
      'Reservado': 'warning',
      'En progreso': 'info',
      'Consumido': 'error',
    };
    return colors[estadoTrabajo] || 'default';
  };

  // Eliminar el array filtrado, ya que ahora confiamos en los datos de Redux
  // const filteredPanos = panosArray.filter(pano => { ... });

  const renderSpecifications = (pano) => {
    // Si el backend ya generó las especificaciones, usarlas directamente
    if (pano.especificaciones) {
      return (
        <Typography variant="caption" style={{ whiteSpace: 'pre-line' }} color="text.secondary">
          {pano.especificaciones}
        </Typography>
      );
    }
    
    // Fallback: generar especificaciones desde campos individuales
    switch (pano.tipo_red) {
      case 'nylon':
        return (
          <Box>
            <Typography variant="caption" display="block" color="text.secondary">
              Calibre: {pano.calibre || 'N/A'}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              Cuadro: {pano.cuadro || 'N/A'}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              Torsión: {pano.torsion || 'N/A'}
            </Typography>
            {pano.refuerzo !== undefined && pano.refuerzo !== null && (
              <Typography variant="caption" display="block" color="text.secondary">
                Refuerzo: {pano.refuerzo === true || pano.refuerzo === 't' ? 'Sí' : 'No'}
              </Typography>
            )}
          </Box>
        );
      case 'lona':
        return (
          <Box>
            <Typography variant="caption" display="block" color="text.secondary">
              Color: {pano.color || 'N/A'}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              Presentación: {pano.presentacion || 'N/A'}
            </Typography>
          </Box>
        );
      case 'polipropileno':
        return (
          <Box>
            <Typography variant="caption" display="block" color="text.secondary">
              Grosor: {pano.grosor || 'N/A'}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              Cuadro: {pano.cuadro || 'N/A'}
            </Typography>
          </Box>
        );
      case 'malla sombra':
        return (
          <Box>
            <Typography variant="caption" display="block" color="text.secondary">
              Color/Tipo: {pano.color_tipo_red || 'N/A'}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              Presentación: {pano.presentacion || 'N/A'}
            </Typography>
          </Box>
        );
      default:
        return <Typography variant="caption" color="text.secondary">Sin especificaciones</Typography>;
    }
  };

  const renderDetailSpecifications = (pano) => {
    // Si el backend ya generó las especificaciones, mostrarlas directamente
    if (pano.especificaciones) {
      return (
        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Especificaciones:
          </Typography>
          <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
            {pano.especificaciones}
          </Typography>
        </Grid>
      );
    }
    
    // Fallback: mostrar campos individuales
    switch (pano.tipo_red) {
      case 'nylon':
        return (
          <>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Calibre:</Typography>
              <Typography variant="body2">{pano.calibre || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Cuadro:</Typography>
              <Typography variant="body2">{pano.cuadro || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Torsión:</Typography>
              <Typography variant="body2">{pano.torsion || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Refuerzo:</Typography>
              <Typography variant="body2">
                {pano.refuerzo !== undefined && pano.refuerzo !== null 
                  ? (pano.refuerzo === true || pano.refuerzo === 't' ? 'Sí' : 'No')
                  : 'N/A'
                }
              </Typography>
            </Grid>
          </>
        );
      case 'lona':
        return (
          <>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Color:</Typography>
              <Typography variant="body2">{pano.color || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Presentación:</Typography>
              <Typography variant="body2">{pano.presentacion || 'N/A'}</Typography>
            </Grid>
          </>
        );
      case 'polipropileno':
        return (
          <>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Grosor:</Typography>
              <Typography variant="body2">{pano.grosor || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Cuadro:</Typography>
              <Typography variant="body2">{pano.cuadro || 'N/A'}</Typography>
            </Grid>
          </>
        );
      case 'malla sombra':
        return (
          <>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Color/Tipo:</Typography>
              <Typography variant="body2">{pano.color_tipo_red || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary">Presentación:</Typography>
              <Typography variant="body2">{pano.presentacion || 'N/A'}</Typography>
            </Grid>
          </>
        );
      default:
        return (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">Sin especificaciones disponibles</Typography>
          </Grid>
        );
    }
  };

  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Inventario de Paños
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadPanos}>
            Actualizar
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Nuevo Paño
          </Button>
        </Box>
      </Box>

      {/* Filtros consistentes */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Red</InputLabel>
                <Select value={filters.tipo_red} label="Tipo de Red" onChange={handleFilterChange('tipo_red')}>
                  <MenuItem value=""><em>Todos</em></MenuItem>
                  {tiposValidos.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select value={filters.estado} label="Estado" onChange={handleFilterChange('estado')}>
                  <MenuItem value=""><em>Todos</em></MenuItem>
                  {estadosValidos.map(e => <MenuItem key={e} value={e}>{e}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <TextField fullWidth label="Buscar..." value={filters.search} onChange={handleFilterChange('search')} placeholder="Código, color, etc." />
            </Grid>
            <Grid item xs={12} sm={12} md={3} sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={handleClearFilters} fullWidth>Limpiar</Button>
              <Button variant="contained" onClick={handleApplyFilters} fullWidth>Aplicar</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabla de paños */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Paños ({panos?.length || 0})
          </Typography>
          
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

          <TableContainer component={Paper}>
            <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Área (m²)</TableCell>
                  <TableCell>Mínimo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Estado Trabajo</TableCell>
                <TableCell>Ubicación</TableCell>
                  <TableCell>Especificaciones</TableCell>
                  <TableCell>Precio ($)</TableCell>
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
                ) : (panos || []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} align="center">
                      No se encontraron paños
                    </TableCell>
                  </TableRow>
                ) : (
                  (panos || []).map((pano) => (
                    <TableRow key={pano.id_item}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {pano.id_item}
                    </Typography>
                  </TableCell>
                      <TableCell>{pano.tipo_red || 'N/A'}</TableCell>
                      <TableCell style={{ color: (pano.area_m2 || 0) <= (pano.stock_minimo || 0) ? '#d32f2f' : 'inherit', fontWeight: 'bold' }}>
                        {pano.area_m2 || 0}
                      </TableCell>
                      <TableCell>{pano.stock_minimo ?? 0}</TableCell>
                  <TableCell>
                    <Chip
                          label={pano.estado || 'N/A'} 
                      color={getEstadoColor(pano.estado)}
                      size="small"
                    />
                  </TableCell>
                      <TableCell>
                        <Chip
                          label={pano.estado_trabajo || 'Libre'} 
                          color={getEstadoTrabajoColor(pano.estado_trabajo)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={pano.ubicacion || 'N/A'} 
                          color={getUbicacionColor(pano.ubicacion)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {renderSpecifications(pano)}
                      </TableCell>
                      <TableCell>${pano.precio_x_unidad || 0}</TableCell>
                  <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Ver detalles">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => handleView(pano)}
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
                                onClick={() => handleEdit(pano)}
                                color="warning"
                              >
                                <EditIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <span>
                              <IconButton 
                                size="small" 
                                onClick={() => handleDelete(pano)}
                                color="error"
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
        </CardContent>
      </Card>
      
      {/* Paginación */}
      {pagination && pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} paños
            </Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Por página</InputLabel>
              <Select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(event.target.value);
                  setCurrentPage(1);
                }}
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

      {/* Modal para crear/editar */}
      <PanoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        pano={selectedPano}
        onSuccess={handleModalSuccess}
      />

      {/* Modal de detalles */}
      <Dialog open={detailModalOpen} onClose={() => setDetailModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalles del Paño - Código: {selectedPano?.id_item}
        </DialogTitle>
        <DialogContent>
          {selectedPano && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Información Básica
                </Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Código:</Typography>
                <Typography variant="body2">{selectedPano.id_item}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Tipo:</Typography>
                <Typography variant="body2">{selectedPano.tipo_red || 'N/A'}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Área:</Typography>
                <Typography variant="body2">{selectedPano.area_m2 || 0} m²</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Estado:</Typography>
                <Chip 
                  label={selectedPano.estado || 'N/A'} 
                  color={getEstadoColor(selectedPano.estado)} 
                  size="small" 
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Estado Trabajo:</Typography>
                <Chip 
                  label={selectedPano.estado_trabajo || 'Libre'} 
                  color={getEstadoTrabajoColor(selectedPano.estado_trabajo)} 
                  size="small" 
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Ubicación:</Typography>
                <Chip 
                  label={selectedPano.ubicacion || 'N/A'} 
                  color={getUbicacionColor(selectedPano.ubicacion)} 
                  size="small" 
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="text.secondary">Precio por Unidad:</Typography>
                <Typography variant="body2">
                  ${selectedPano.precio_x_unidad || 0}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="text.secondary">Descripción:</Typography>
                <Typography variant="body2">
                  {selectedPano.descripcion || 'Sin descripción'}
                </Typography>
              </Grid>
              
              {/* Especificaciones específicas por tipo */}
              {selectedPano.tipo_red && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      Especificaciones de {selectedPano.tipo_red.charAt(0).toUpperCase() + selectedPano.tipo_red.slice(1)}
                    </Typography>
                  </Grid>
                  {renderDetailSpecifications(selectedPano)}
                </>
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
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Está seguro de que desea eliminar el paño Código: {panoToDelete?.id_item}?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PanosList; 