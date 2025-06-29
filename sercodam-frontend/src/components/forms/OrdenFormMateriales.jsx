import React, { useEffect, useState } from 'react';
import {
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Card,
  CardContent
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Clear as ClearIcon,
  Inventory as InventoryIcon,
  FilterList as FilterIcon,
  Info as InfoIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { inventarioApi } from '../../services/api';

// Mapeo de subgrupos a categorías
const SUBGRUPOS_CATEGORIAS = {
  'Cintas y cintillos': ['Cintas', 'Banda aislante', 'Cinchos de nylon y cinchos hechos con piola'],
  'Piolas, cuerdas y lazos': ['Piolas', 'Cuerdas', 'Hilos de Nylon', 'Cables de acero', 'Cables marinos y cabos marinos'],
  'Ojillos, remaches y herrajes menores': ['Ojillos de Metal', 'Moldes para prensar ojillos', 'Hebillas', 'Ganchos'],
  'Plásticos, emplayes y adhesivos': ['Plastico para emplayado', 'Pegamento', 'Sellador', 'Thinner', 'Estopas'],
  'Taquetes, tornillos y sujetadores': ['Taquetes', 'Tornillos', 'Pijas', 'Tuercas', 'Rondanas de acero', 'Espárragos de acero'],
  'Herramientas desechables o limitadas': ['Agujas', 'Discos', 'Lijas para agua', 'Espátulas de plástico', 'Broquero de acero'],
  'Etiquetas y consumibles de señalización': ['Etiquetas', 'Esmalte en aerosol'],
  'Materiales de embalaje y sujeción temporal': ['Algodón industrial', 'Rafia de material plástico', 'Tapetes', 'Tablas'],
  'Herrajes y conexiones': ['Abrazaderas', 'Bisagra de acero', 'Candados', 'Cerrojos', 'Casquillos', 'Perro de acero'],
  'Cadenas y tensores': ['Cadenas de acero', 'Tensores', 'Poleas', 'Grifa de acero'],
  'Material eléctrico': ['Material Eléctrico', 'Cable pot (doble)', 'Caja de plástico de 14 x 6 cms con seguro'],
  'Aceites y lubricantes': ['Aceites', 'Ácido muriático'],
  'Anclajes y armellas': ['Ancla de acero', 'Armaderas'],
  'Placas y protectores': ['Placas de acero', 'Hojas de acero', 'Protectores de goma'],
  'Otros materiales': ['ÁCople para conexiones y mangueras', 'Clavos', 'Kit de supervivencia', 'Red de Nylon para Racks de LOréal', 'Redes Deportivas Terminadas', 'Rodillos', 'Tubos PVC', 'Zoclos', 'Tapas']
};

const OrdenFormMateriales = ({ materialesSeleccionados, setMaterialesSeleccionados, onDraftSave }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [subgrupos] = useState(Object.keys(SUBGRUPOS_CATEGORIAS));
  const [subgrupo, setSubgrupo] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [materialSeleccionado, setMaterialSeleccionado] = useState(null);

  // Función para guardar draft cuando cambian los materiales
  const saveDraftOnChange = (newMaterialesSeleccionados) => {
    if (onDraftSave) {
      onDraftSave(newMaterialesSeleccionados);
    }
  };

  useEffect(() => {
    loadAllMateriales();
  }, []);

  const loadAllMateriales = async () => {
    try {
      const response = await inventarioApi.getMateriales({ limit: 1000 });
      const allMateriales = response.data?.materiales || [];
      const categoriasUnicas = [...new Set(allMateriales.map(m => m.categoria))].filter(Boolean).sort();
      setCategorias(categoriasUnicas);
    } catch (error) {
      console.error('Error cargando materiales:', error);
    }
  };

  const handleSubgrupoChange = (event) => {
    const selectedSubgrupo = event.target.value;
    setSubgrupo(selectedSubgrupo);
    setCategoria('');
    
    if (selectedSubgrupo) {
      const categoriasDelSubgrupo = SUBGRUPOS_CATEGORIAS[selectedSubgrupo] || [];
      setCategorias(categoriasDelSubgrupo);
    } else {
      loadAllMateriales();
    }
  };

  const handleBuscar = async () => {
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (categoria) params.categoria = categoria;
      if (busqueda) params.search = busqueda;
      
      const response = await inventarioApi.getMateriales(params);
      const materialesOrdenados = (response.data?.materiales || []).sort((a, b) => 
        (a.descripcion || '').localeCompare(b.descripcion || '')
      );
      setMateriales(materialesOrdenados);
    } catch (error) {
      console.error('Error buscando materiales:', error);
      setMateriales([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiarFiltros = () => {
    setSubgrupo('');
    setCategoria('');
    setBusqueda('');
    setMateriales([]);
    loadAllMateriales();
  };

  const handleAgregar = () => {
    if (materialSeleccionado && cantidad > 0) {
      const newMaterialesSeleccionados = [
        ...materialesSeleccionados,
        { ...materialSeleccionado, cantidad }
      ];
      
      setMaterialesSeleccionados(newMaterialesSeleccionados);
      saveDraftOnChange(newMaterialesSeleccionados);
      
      setMaterialSeleccionado(null);
      setCantidad(1);
      setModalOpen(false);
    }
  };

  const handleEliminarMaterial = (index) => {
    const newMaterialesSeleccionados = materialesSeleccionados.filter((_, i) => i !== index);
    setMaterialesSeleccionados(newMaterialesSeleccionados);
    saveDraftOnChange(newMaterialesSeleccionados);
  };

  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'bueno': return 'success';
      case 'regular': return 'warning';
      case 'malo': return 'error';
      case 'usado 50%': return 'info';
      default: return 'default';
    }
  };

  // Calcular estadísticas
  const totalCantidad = materialesSeleccionados.reduce((sum, m) => sum + m.cantidad, 0);
  const totalValor = materialesSeleccionados.reduce((sum, m) => sum + (m.cantidad * (m.precioxunidad || 0)), 0);
  const categoriasUnicas = [...new Set(materialesSeleccionados.map(m => m.categoria))];
  const stockBajo = materialesSeleccionados.filter(m => (m.cantidad_disponible || 0) < 10).length;

  return (
    <Grid container spacing={3}>
      {/* Header con información */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" component="h2">
                Gestión de Materiales para la Orden
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {materialesSeleccionados.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Materiales Seleccionados
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {totalCantidad}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Cantidad Total
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    ${totalValor.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Valor Estimado
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {categoriasUnicas.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Categorías
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      {/* Botón principal */}
      <Grid item xs={12}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setModalOpen(true)}
          fullWidth
          size="large"
          sx={{ py: 2 }}
        >
          Seleccionar Materiales para la Orden
        </Button>
      </Grid>

      {/* Lista de materiales seleccionados */}
      {materialesSeleccionados.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FilterIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Materiales Seleccionados ({materialesSeleccionados.length})
                </Typography>
              </Box>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Descripción</strong></TableCell>
                      <TableCell><strong>Categoría</strong></TableCell>
                      <TableCell><strong>Marca</strong></TableCell>
                      <TableCell><strong>Stock</strong></TableCell>
                      <TableCell><strong>Cantidad</strong></TableCell>
                      <TableCell><strong>Valor</strong></TableCell>
                      <TableCell><strong>Acciones</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {materialesSeleccionados.map((m, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {m.descripcion || m.id_material_extra}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={m.categoria} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {m.marca || 'S/M'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={m.cantidad_disponible || 0}
                            size="small" 
                            color={(m.cantidad_disponible || 0) < 10 ? 'error' : 'success'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {m.cantidad}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            ${((m.precioxunidad || 0) * m.cantidad).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleEliminarMaterial(idx)}
                            title="Eliminar material"
                          >
                            <ClearIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Modal de selección de materiales */}
      <Dialog 
        open={modalOpen} 
        onClose={() => setModalOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <CategoryIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              Seleccionar Materiales para la Orden
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {/* Filtros */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FilterIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Filtros de Búsqueda</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="subgrupo-label">Subgrupo</InputLabel>
                    <Select
                      labelId="subgrupo-label"
                      value={subgrupo}
                      onChange={handleSubgrupoChange}
                      label="Subgrupo"
                    >
                      <MenuItem value="">Todos los subgrupos</MenuItem>
                      {subgrupos.map(sg => (
                        <MenuItem key={sg} value={sg}>{sg}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="categoria-label">Categoría</InputLabel>
                    <Select
                      labelId="categoria-label"
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      label="Categoría"
                      disabled={!subgrupo}
                    >
                      <MenuItem value="">Todas las categorías</MenuItem>
                      {categorias.map(cat => (
                        <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Buscar por nombre/código"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="ID, descripción, marca..."
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={handleBuscar}
                    disabled={loading}
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </Button>
                </Grid>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={handleLimpiarFiltros}
                  >
                    Limpiar Filtros
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Tabla de materiales */}
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">
                  Materiales Disponibles ({materiales.length} encontrados)
                </Typography>
              </Box>
              
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Seleccionar</strong></TableCell>
                      <TableCell><strong>Descripción</strong></TableCell>
                      <TableCell><strong>Categoría</strong></TableCell>
                      <TableCell><strong>Marca</strong></TableCell>
                      <TableCell><strong>Stock</strong></TableCell>
                      <TableCell><strong>Estado</strong></TableCell>
                      <TableCell><strong>Ubicación</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {materiales.map(material => (
                      <TableRow 
                        key={material.id_item}
                        hover
                        selected={materialSeleccionado?.id_item === material.id_item}
                        onClick={() => setMaterialSeleccionado(material)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Button
                            size="small"
                            variant={materialSeleccionado?.id_item === material.id_item ? "contained" : "outlined"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setMaterialSeleccionado(material);
                            }}
                          >
                            Seleccionar
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {material.descripcion || material.id_material_extra}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={material.categoria} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {material.marca || 'S/M'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={material.cantidad_disponible || 0}
                            size="small" 
                            color={(material.cantidad_disponible || 0) < 10 ? 'error' : 'success'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={material.estado_calidad} 
                            size="small" 
                            color={getEstadoColor(material.estado_calidad)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {material.ubicacion || 'S/L'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Cantidad */}
          {materialSeleccionado && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <InfoIcon sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6">
                    Material Seleccionado
                  </Typography>
                </Box>
                
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography variant="body1" fontWeight="medium">
                      {materialSeleccionado.descripcion || materialSeleccionado.id_material_extra}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Categoría: {materialSeleccionado.categoria} • 
                      Marca: {materialSeleccionado.marca || 'S/M'} • 
                      Stock: {materialSeleccionado.cantidad_disponible || 0} • 
                      Precio: ${(materialSeleccionado.precioxunidad || 0).toFixed(2)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Cantidad"
                      type="number"
                      value={cantidad}
                      onChange={(e) => setCantidad(Number(e.target.value))}
                      inputProps={{ min: 1, step: 0.01 }}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleAgregar}
            variant="contained"
            disabled={!materialSeleccionado || cantidad < 1}
          >
            Agregar Material a la Orden
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default OrdenFormMateriales; 