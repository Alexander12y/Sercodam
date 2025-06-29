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
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPanos } from '../store/slices/panosSlice';
import PanoModal from '../components/forms/PanoModal';
import { panosApi } from '../services/api';

const PanosList = () => {
  const dispatch = useDispatch();
  const { lista: panos, loading, error } = useSelector((state) => state.panos);
  
  const [filters, setFilters] = useState({
    tipo_red: '',
    estado: '',
    area_min: '',
    area_max: ''
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPano, setSelectedPano] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [panoToDelete, setPanoToDelete] = useState(null);

  const tiposValidos = ['lona', 'nylon', 'polipropileno', 'malla sombra'];
  const estadosValidos = ['bueno', 'regular', 'malo', '50%'];

  useEffect(() => {
    loadPanos();
  }, []);

  const loadPanos = () => {
    const params = {};
    if (filters.tipo_red) params.tipo_red = filters.tipo_red;
    if (filters.estado) params.estado = filters.estado;
    if (filters.area_min) params.area_min = filters.area_min;
    if (filters.area_max) params.area_max = filters.area_max;
    
    dispatch(fetchPanos(params));
  };

  const handleFilterChange = (field) => (event) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleApplyFilters = () => {
      loadPanos();
  };

  const handleClearFilters = () => {
    setFilters({
      tipo_red: '',
      estado: '',
      area_min: '',
      area_max: ''
    });
    dispatch(fetchPanos());
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
    try {
      await panosApi.deletePano(panoToDelete.id_item);
      loadPanos();
      setDeleteDialogOpen(false);
      setPanoToDelete(null);
    } catch (error) {
      console.error('Error eliminando paño:', error);
      alert(error.response?.data?.message || 'Error al eliminar el paño');
    }
  };

  const handleModalSuccess = () => {
    loadPanos();
  };

  const getEstadoColor = (estado) => {
    const colors = {
      'bueno': 'success',
      'regular': 'warning',
      'malo': 'error',
      '50%': 'info',
    };
    return colors[estado] || 'default';
  };

  // Asegurar que panos sea un array
  const panosArray = Array.isArray(panos) ? panos : [];
  
  const filteredPanos = panosArray.filter(pano => {
    if (filters.tipo_red && pano.tipo_red !== filters.tipo_red) return false;
    if (filters.estado && pano.estado !== filters.estado) return false;
    if (filters.area_min && pano.area_m2 < parseFloat(filters.area_min)) return false;
    if (filters.area_max && pano.area_m2 > parseFloat(filters.area_max)) return false;
    return true;
  });

  const renderSpecifications = (pano) => {
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

  return (
    <Container maxWidth="xl">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Catálogo de Paños
      </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadPanos}
            sx={{ mr: 1 }}
          >
            Actualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Nuevo Paño
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
              Filtros
            </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="tipo-red-filter-label">Tipo de Red</InputLabel>
                <Select
                  labelId="tipo-red-filter-label"
                  value={filters.tipo_red}
                  onChange={handleFilterChange('tipo_red')}
                  label="Tipo de Red"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {tiposValidos.map(tipo => (
                    <MenuItem key={tipo} value={tipo}>
                      {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel id="estado-filter-label">Estado</InputLabel>
                <Select
                  labelId="estado-filter-label"
                  value={filters.estado}
                  onChange={handleFilterChange('estado')}
                  label="Estado"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {estadosValidos.map(estado => (
                    <MenuItem key={estado} value={estado}>
                      <Chip label={estado} color={getEstadoColor(estado)} size="small" />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Área mínima (m²)"
                type="number"
                value={filters.area_min}
                onChange={handleFilterChange('area_min')}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                size="small"
                label="Área máxima (m²)"
                type="number"
                value={filters.area_max}
                onChange={handleFilterChange('area_max')}
                inputProps={{ min: 0, step: 0.01 }}
              />
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

      {/* Tabla de paños */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Paños ({filteredPanos.length})
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
                <TableCell>ID</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Área (m²)</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Ubicación</TableCell>
                  <TableCell>Especificaciones</TableCell>
                  <TableCell>Precio ($)</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filteredPanos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No se encontraron paños
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPanos.map((pano) => (
                    <TableRow key={pano.id_item}>
                  <TableCell>{pano.id_item}</TableCell>
                      <TableCell>{pano.tipo_red || 'N/A'}</TableCell>
                      <TableCell>{pano.area_m2 || 0}</TableCell>
                  <TableCell>
                    <Chip
                          label={pano.estado || 'N/A'} 
                      color={getEstadoColor(pano.estado)}
                      size="small"
                    />
                  </TableCell>
                      <TableCell>{pano.ubicacion || 'N/A'}</TableCell>
                      <TableCell>
                        {renderSpecifications(pano)}
                      </TableCell>
                      <TableCell>${pano.precio_x_unidad || 0}</TableCell>
                  <TableCell>
                        <Box>
                          <Tooltip title="Ver detalles">
                            <IconButton
                              size="small"
                              onClick={() => handleView(pano)}
                              color="primary"
                            >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                          <Tooltip title="Editar">
                        <IconButton 
                          size="small" 
                              onClick={() => handleEdit(pano)}
                              color="warning"
                        >
                              <EditIcon />
                        </IconButton>
                      </Tooltip>
                          <Tooltip title="Eliminar">
                        <IconButton 
                          size="small" 
                              onClick={() => handleDelete(pano)}
                          color="error"
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
        </CardContent>
      </Card>

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
          Detalles del Paño - ID: {selectedPano?.id_item}
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
                <Typography variant="subtitle2" color="text.secondary">ID:</Typography>
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
                <Typography variant="subtitle2" color="text.secondary">Ubicación:</Typography>
                <Typography variant="body2">{selectedPano.ubicacion || 'N/A'}</Typography>
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
            ¿Está seguro de que desea eliminar el paño ID: {panoToDelete?.id_item}?
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