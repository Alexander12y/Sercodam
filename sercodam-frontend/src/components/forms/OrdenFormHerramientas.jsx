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
  CardContent,
  Alert
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Clear as ClearIcon,
  Build as BuildIcon,
  FilterList as FilterIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { herramientasApi } from '../../services/api';
import { SUBGRUPOS_CATEGORIAS_HERRAMIENTAS } from '../../constants/herramientasConstants';

// Mapeo de subgrupos a categorías de herramientas (AHORA IMPORTADO)
const SUBGRUPOS_CATEGORIAS = SUBGRUPOS_CATEGORIAS_HERRAMIENTAS;

const OrdenFormHerramientas = ({ herramientasSeleccionadas, setHerramientasSeleccionadas, onDraftSave }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [subgrupos] = useState(Object.keys(SUBGRUPOS_CATEGORIAS));
  const [subgrupo, setSubgrupo] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [herramientas, setHerramientas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [herramientaSeleccionada, setHerramientaSeleccionada] = useState(null);
  const [error, setError] = useState('');

  // Función para guardar draft cuando cambian las herramientas
  const saveDraftOnChange = (newHerramientasSeleccionadas) => {
    if (onDraftSave) {
      onDraftSave(newHerramientasSeleccionadas);
    }
  };

  useEffect(() => {
    loadAllHerramientas();
  }, []);

  const loadAllHerramientas = async () => {
    try {
      const res = await herramientasApi.getHerramientas({ limit: 1000 });
      const allHerramientas = res.data?.data?.herramientas || res.data?.herramientas || [];
      const categoriasUnicas = [...new Set(allHerramientas.map(h => h.categoria))].filter(Boolean).sort();
      setCategorias(categoriasUnicas);
    } catch (error) {
      console.error('Error cargando herramientas:', error);
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
      loadAllHerramientas();
    }
  };

  const handleBuscar = async () => {
    setLoading(true);
    try {
      let herramientasResult = [];
      const params = { limit: 1000 };

      if (categoria) {
        console.log('🔍 Buscando por categoría específica:', categoria);
        params.categoria = categoria;
      } else if (subgrupo) {
        console.log('🔍 Buscando por subgrupo:', subgrupo);
        const categoriasDelSubgrupo = SUBGRUPOS_CATEGORIAS[subgrupo] || [];
        if (categoriasDelSubgrupo.length > 0) {
          params.categorias = categoriasDelSubgrupo;
          console.log('📂 Enviando categorías al backend:', params.categorias);
        }
      } else if (busqueda) {
        console.log('🔍 Buscando por texto libre:', busqueda);
        params.search = busqueda;
      } else {
        console.log('⚠️ Sin filtros, cargando una muestra limitada.');
        params.limit = 50;
      }

      const response = await herramientasApi.getHerramientas(params);
      herramientasResult = response.data?.data?.herramientas || response.data?.herramientas || [];
      
      console.log(`📊 Búsqueda encontró: ${herramientasResult.length} herramientas`);

      const herramientasOrdenadas = herramientasResult.sort((a, b) => 
        (a.descripcion || a.id_herramienta || '').localeCompare(b.descripcion || b.id_herramienta || '')
      );
      setHerramientas(herramientasOrdenadas);
      
      console.log('✅ Búsqueda de herramientas completada. Total:', herramientasOrdenadas.length);
    } catch (error) {
      console.error('Error buscando herramientas:', error);
      setHerramientas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLimpiarFiltros = () => {
    setSubgrupo('');
    setCategoria('');
    setBusqueda('');
    setHerramientas([]);
    loadAllHerramientas();
  };

  const handleAgregar = () => {
    if (!herramientaSeleccionada) return;
    setError("");
    if (cantidad > (herramientaSeleccionada.cantidad_disponible || 0)) {
      setError(`No hay suficiente stock disponible. Stock actual: ${herramientaSeleccionada.cantidad_disponible || 0}`);
      return;
    }
    if (cantidad > 0) {
      const newHerramientasSeleccionadas = [
        ...herramientasSeleccionadas,
        { ...herramientaSeleccionada, cantidad }
      ];
      setHerramientasSeleccionadas(newHerramientasSeleccionadas);
      saveDraftOnChange(newHerramientasSeleccionadas);
      setHerramientaSeleccionada(null);
      setCantidad(1);
      setModalOpen(false);
    }
  };

  const handleEliminarHerramienta = (index) => {
    const newHerramientasSeleccionadas = herramientasSeleccionadas.filter((_, i) => i !== index);
    setHerramientasSeleccionadas(newHerramientasSeleccionadas);
    saveDraftOnChange(newHerramientasSeleccionadas);
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
  const totalHerramientas = herramientasSeleccionadas.reduce((sum, h) => sum + h.cantidad, 0);
  const subgruposUnicos = [...new Set(herramientasSeleccionadas.map(h => h.categoria))];
  const herramientasDisponibles = herramientas.filter(h => h.cantidad_disponible > 0).length;
  const herramientasEnUso = herramientas.filter(h => h.cantidad_disponible === 0).length;

  return (
    <Grid container spacing={3}>
      {/* Header con información */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <BuildIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" component="h2">
                Gestión de Herramientas para la Orden
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {herramientasSeleccionadas.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Herramientas Seleccionadas
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {totalHerramientas}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Cantidad Total
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    {herramientasDisponibles}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Disponibles
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {subgruposUnicos.length}
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
          Seleccionar Herramientas para la Orden
        </Button>
      </Grid>

      {/* Lista de herramientas seleccionadas */}
      {herramientasSeleccionadas.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FilterIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Herramientas Seleccionadas ({herramientasSeleccionadas.length})
                </Typography>
              </Box>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Descripción</strong></TableCell>
                      <TableCell><strong>Categoría</strong></TableCell>
                      <TableCell><strong>Estado</strong></TableCell>
                      <TableCell><strong>Stock</strong></TableCell>
                      <TableCell><strong>Ubicación</strong></TableCell>
                      <TableCell><strong>Cantidad</strong></TableCell>
                      <TableCell><strong>Acciones</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {herramientasSeleccionadas.map((h, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {h.descripcion || h.id_herramienta || h.id_item}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={h.categoria} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={h.estado_calidad} 
                            size="small" 
                            color={getEstadoColor(h.estado_calidad)}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={h.cantidad_disponible || 0}
                            size="small" 
                            color={(h.cantidad_disponible || 0) > 0 ? 'success' : 'error'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {h.ubicacion || 'S/L'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {h.cantidad}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleEliminarHerramienta(idx)}
                            title="Eliminar herramienta"
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

      {/* Modal de selección de herramientas */}
      <Dialog 
        open={modalOpen} 
        onClose={() => setModalOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <BuildIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              Seleccionar Herramientas para la Orden
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
                    <InputLabel id="subgrupo-herramientas-label">Subgrupo</InputLabel>
                    <Select
                      labelId="subgrupo-herramientas-label"
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
                    <InputLabel id="categoria-herramientas-label">Categoría</InputLabel>
                    <Select
                      labelId="categoria-herramientas-label"
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
                    label="Buscar por descripción/código"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    placeholder="Descripción, ID de herramienta..."
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

          {/* Tabla de herramientas */}
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">
                  Herramientas Disponibles ({herramientas.length} encontradas)
                </Typography>
              </Box>
              
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Seleccionar</strong></TableCell>
                      <TableCell><strong>Descripción</strong></TableCell>
                      <TableCell><strong>Categoría</strong></TableCell>
                      <TableCell><strong>Estado</strong></TableCell>
                      <TableCell><strong>Stock</strong></TableCell>
                      <TableCell><strong>Ubicación</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {herramientas.map(herramienta => (
                      <TableRow 
                        key={herramienta.id_item}
                        hover
                        selected={herramientaSeleccionada?.id_item === herramienta.id_item}
                        onClick={() => setHerramientaSeleccionada(herramienta)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Button
                            size="small"
                            variant={herramientaSeleccionada?.id_item === herramienta.id_item ? "contained" : "outlined"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setHerramientaSeleccionada(herramienta);
                            }}
                          >
                            Seleccionar
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {herramienta.descripcion || herramienta.id_herramienta || herramienta.id_item}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={herramienta.categoria} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
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
                            label={herramienta.cantidad_disponible || 0}
                            size="small" 
                            color={(herramienta.cantidad_disponible || 0) > 0 ? 'success' : 'error'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {herramienta.ubicacion || 'S/L'}
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
          {herramientaSeleccionada && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <InfoIcon sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6">
                    Herramienta Seleccionada
                  </Typography>
                </Box>
                
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography variant="body1" fontWeight="medium">
                      {herramientaSeleccionada.descripcion || herramientaSeleccionada.id_herramienta || herramientaSeleccionada.id_item}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Categoría: {herramientaSeleccionada.categoria} • 
                      Estado: {herramientaSeleccionada.estado_calidad} • 
                      Stock: {herramientaSeleccionada.cantidad_disponible || 0} • 
                      Ubicación: {herramientaSeleccionada.ubicacion || 'S/L'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Cantidad"
                      type="number"
                      value={cantidad}
                      onChange={(e) => setCantidad(Number(e.target.value))}
                      inputProps={{ min: 1, step: 1 }}
                      size="small"
                      fullWidth
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
          <Button 
            onClick={handleAgregar}
            variant="contained"
            disabled={!herramientaSeleccionada || cantidad < 1}
          >
            Agregar Herramienta a la Orden
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default OrdenFormHerramientas; 