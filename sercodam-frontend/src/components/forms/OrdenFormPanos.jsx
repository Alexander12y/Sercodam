import React, { useState, useEffect } from 'react';
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
  Divider,
  Alert
} from '@mui/material';
import { 
  Add as AddIcon, 
  Search as SearchIcon, 
  Clear as ClearIcon,
  Inventory as InventoryIcon,
  FilterList as FilterIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPanos } from '../../store/slices/panosSlice';
import { panosApi } from '../../services/api';

const OrdenFormPanos = ({ panosSeleccionados, setPanosSeleccionados, onDraftSave }) => {
  const dispatch = useDispatch();
  const { lista: panosRedux, loading: loadingRedux } = useSelector((state) => state.panos);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [panos, setPanos] = useState([]);

  const [largoTomar, setLargoTomar] = useState(0);
  const [anchoTomar, setAnchoTomar] = useState(0);
  const [panoSeleccionado, setPanoSeleccionado] = useState(null);
  const [errorStock, setErrorStock] = useState("");
  const [umbralSobrante, setUmbralSobrante] = useState(0.5); // Default to 0.5, user can change
  
  // Filtros
  const [filtros, setFiltros] = useState({
    tipo_red: '',
    estado: '',
    ubicacion: '',
    busqueda: '',
    largo_min: '',
    largo_max: '',
    ancho_min: '',
    ancho_max: '',
    area_min: '',
    area_max: ''
  });

  const tiposRed = ['nylon', 'lona', 'polipropileno', 'malla sombra'];
  const estados = ['bueno', 'regular', 'malo', '50%'];
  const ubicaciones = ['Bodega CDMX', 'Querétaro', 'Oficina', 'Instalación'];

  // Cargar datos iniciales cuando se monta el componente
  useEffect(() => {
    console.log('🔍 useEffect inicial - Estado de Redux:', {
      panosReduxLength: panosRedux?.length || 0,
      loadingRedux: loadingRedux
    });
    
    if (panosRedux.length === 0 && !loadingRedux) {
      console.log('🔍 Cargando datos iniciales...');
      loadPanos();
    }
  }, [panosRedux.length, loadingRedux]);

  // Procesar datos de Redux y aplicar filtros
  useEffect(() => {
    console.log('🔍 useEffect - Datos de Redux recibidos:', {
      panosReduxLength: panosRedux?.length || 0,
      panosRedux: panosRedux
    });
    
    if (panosRedux && panosRedux.length > 0) {
      let panosFiltrados = [...panosRedux];
      
      // Filtrar solo paños disponibles para nuevas órdenes (estado_trabajo = 'Libre')
      panosFiltrados = panosFiltrados.filter(p => 
        p.estado_trabajo === 'Libre' || p.estado_trabajo === null || p.estado_trabajo === undefined
      );
      
      // Log para verificar especificaciones
      if (panosFiltrados.length > 0) {
        console.log('🔍 OrdenFormPanos - Primer paño de Redux:', {
          id_item: panosFiltrados[0].id_item,
          tipo_red: panosFiltrados[0].tipo_red,
          especificaciones: panosFiltrados[0].especificaciones,
          tiene_especificaciones: !!panosFiltrados[0].especificaciones,
          longitud_especificaciones: panosFiltrados[0].especificaciones?.length
        });
      }
      
      // Filtros adicionales en el frontend
      if (filtros.largo_min) {
        panosFiltrados = panosFiltrados.filter(p => 
          Number(p.largo_m) >= Number(filtros.largo_min)
        );
      }
      if (filtros.largo_max) {
        panosFiltrados = panosFiltrados.filter(p => 
          Number(p.largo_m) <= Number(filtros.largo_max)
        );
      }
      if (filtros.ancho_min) {
        panosFiltrados = panosFiltrados.filter(p => 
          Number(p.ancho_m) >= Number(filtros.ancho_min)
        );
      }
      if (filtros.ancho_max) {
        panosFiltrados = panosFiltrados.filter(p => 
          Number(p.ancho_m) <= Number(filtros.ancho_max)
        );
      }
      if (filtros.area_min) {
        panosFiltrados = panosFiltrados.filter(p => 
          Number(p.area_m2) >= Number(filtros.area_min)
        );
      }
      if (filtros.area_max) {
        panosFiltrados = panosFiltrados.filter(p => 
          Number(p.area_m2) <= Number(filtros.area_max)
        );
      }
      
      console.log('🔍 Actualizando estado local con paños filtrados:', {
        panosFiltradosLength: panosFiltrados.length,
        primerPano: panosFiltrados[0] ? {
          id_item: panosFiltrados[0].id_item,
          tipo_red: panosFiltrados[0].tipo_red,
          especificaciones: panosFiltrados[0].especificaciones,
          tiene_especificaciones: !!panosFiltrados[0].especificaciones
        } : null
      });
      setPanos(panosFiltrados);
    }
  }, [panosRedux, filtros]);

  // Función para guardar draft cuando cambian los paños
  const saveDraftOnChange = (newPanosSeleccionados) => {
    if (onDraftSave) {
      onDraftSave(newPanosSeleccionados);
    }
  };

  const loadPanos = async () => {
    try {
      const params = { limit: 1000 }; // Sin paginación, traer todos
      
      // Aplicar filtros
      if (filtros.tipo_red) params.tipo_red = filtros.tipo_red;
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.ubicacion) params.ubicacion = filtros.ubicacion;
      if (filtros.busqueda) params.search = filtros.busqueda;
      
      // Usar Redux para cargar los paños
      await dispatch(fetchPanos(params));
      
      // Los datos se cargarán automáticamente en panosRedux
    } catch (error) {
      console.error('Error cargando paños:', error);
    }
  };

  const handleBuscar = () => {
    loadPanos();
  };

  const handleLimpiarFiltros = () => {
    setFiltros({
      tipo_red: '',
      estado: '',
      ubicacion: '',
      busqueda: '',
      largo_min: '',
      largo_max: '',
      ancho_min: '',
      ancho_max: '',
      area_min: '',
      area_max: ''
    });
  };

  const handleAgregar = () => {
    if (panoSeleccionado && largoTomar > 0 && anchoTomar > 0) {
      const largoDisponible = Number(panoSeleccionado.largo_m) || 0;
      const anchoDisponible = Number(panoSeleccionado.ancho_m) || 0;
      setErrorStock("");
      if (largoTomar > largoDisponible) {
        setErrorStock(`No puedes tomar más largo del disponible. Largo disponible: ${largoDisponible.toFixed(2)} m`);
        return;
      }
      if (anchoTomar > anchoDisponible) {
        setErrorStock(`No puedes tomar más ancho del disponible. Ancho disponible: ${anchoDisponible.toFixed(2)} m`);
        return;
      }
      const areaTomar = largoTomar * anchoTomar;
      if (areaTomar > (panoSeleccionado.area_m2 || (largoDisponible * anchoDisponible))) {
        setErrorStock(`No puedes tomar más área de la disponible. Área disponible: ${(panoSeleccionado.area_m2 || (largoDisponible * anchoDisponible)).toFixed(2)} m²`);
        return;
      }
      // Siempre cantidad 1 salvo que el usuario indique explícitamente lo contrario
      const newPanosSeleccionados = [
        ...panosSeleccionados,
        {
          ...panoSeleccionado,
          largo_tomar: largoTomar,
          ancho_tomar: anchoTomar,
          cantidad: 1,
          area_tomar: areaTomar,
          umbral_sobrante_m2: umbralSobrante // Include threshold
        }
      ];
      setPanosSeleccionados(newPanosSeleccionados);
      saveDraftOnChange(newPanosSeleccionados);
      setPanoSeleccionado(null);
      setLargoTomar(0);
      setAnchoTomar(0);
      setUmbralSobrante(0.5); // Reset
      setModalOpen(false);
    }
  };

  const handleFiltroChange = (campo) => (event) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: event.target.value
    }));
  };

  const handleEliminarPano = (index) => {
    const newPanosSeleccionados = panosSeleccionados.filter((_, i) => i !== index);
    setPanosSeleccionados(newPanosSeleccionados);
    saveDraftOnChange(newPanosSeleccionados);
  };

  const getEstadoColor = (estado) => {
    switch (estado?.toLowerCase()) {
      case 'bueno': return 'success';
      case 'regular': return 'warning';
      case 'malo': return 'error';
      case '50%': return 'info';
      default: return 'default';
    }
  };

  const getEstadoTrabajoColor = (estadoTrabajo) => {
    switch (estadoTrabajo?.toLowerCase()) {
      case 'libre': return 'success';
      case 'reservado': return 'warning'; 
      case 'en progreso': return 'info';
      case 'consumido': return 'error';
      default: return 'success'; // Default to success for null/undefined (treated as Libre)
    }
  };

  // Calcular estadísticas
  const panosArray = Array.isArray(panosSeleccionados) ? panosSeleccionados : [];
  const totalArea = panosArray.reduce((sum, p) => sum + (Number(p.cantidad) || 0), 0);
  const totalPiezas = panosArray.length;
  const tiposUnicos = [...new Set(panosArray.map(p => p.tipo_red))];

  return (
    <Grid container spacing={3}>
      {/* Header con información */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Box display="flex" alignItems="center">
                <InventoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" component="h2">
                  Gestión de Paños para la Orden
                </Typography>
              </Box>
              <Chip 
                label="Solo Paños Disponibles" 
                color="success" 
                variant="outlined"
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary">
                    {panosArray.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Paños Seleccionados
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="success.main">
                    {totalArea.toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Área Total (m²)
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    {totalPiezas}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Piezas Totales
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box textAlign="center">
                  <Typography variant="h4" color="warning.main">
                    {tiposUnicos.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Tipos de Red
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
          Seleccionar Paños para la Orden
        </Button>
      </Grid>

      {/* Lista de paños seleccionados */}
      {panosArray.length > 0 && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FilterIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Paños Seleccionados ({panosArray.length})
                </Typography>
              </Box>
              
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Descripción</strong></TableCell>
                      <TableCell><strong>Tipo</strong></TableCell>
                      <TableCell><strong>Dimensiones Disponibles</strong></TableCell>
                      <TableCell><strong>Dimensiones a Tomar</strong></TableCell>
                      <TableCell><strong>Área a Tomar (m²)</strong></TableCell>
                      <TableCell><strong>Umbral Remanente (m²)</strong></TableCell> {/* New column */}
                      <TableCell><strong>Estado</strong></TableCell>
                      <TableCell><strong>Ubicación</strong></TableCell>
                      <TableCell><strong>Acciones</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {panosArray.map((p, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {p.descripcion || p.id_item}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={p.tipo_red} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {Number(p.largo_m || 0).toFixed(2)} × {Number(p.ancho_m || 0).toFixed(2)} m
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium" color="primary">
                            {Number(p.largo_tomar || 0).toFixed(2)} × {Number(p.ancho_tomar || 0).toFixed(2)} m
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium" color="success.main">
                            {(Number(p.cantidad) || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="secondary">
                            {p.umbral_sobrante_m2 !== undefined ? Number(p.umbral_sobrante_m2).toFixed(2) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={p.estado} 
                            size="small" 
                            color={getEstadoColor(p.estado)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {p.ubicacion || 'S/L'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleEliminarPano(idx)}
                            title="Eliminar paño"
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

      {/* Modal de selección de paños */}
      <Dialog 
        open={modalOpen} 
        onClose={() => setModalOpen(false)}
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <InventoryIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              Seleccionar Paños para la Orden
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {errorStock && (
            <Alert severity="error" sx={{ mb: 2 }}>{errorStock}</Alert>
          )}
          
          {/* Información general */}
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>🔍 Filtrado automático aplicado:</strong> Solo se muestran paños con estado de trabajo "Libre" 
              (disponibles para nuevas órdenes). Los paños "Reservado", "En progreso" o "Consumido" no aparecen 
              porque ya están asignados a otras órdenes.
            </Typography>
          </Alert>
          
          {/* Filtros */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <FilterIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Filtros de Búsqueda</Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="tipo-red-label">Tipo de Red</InputLabel>
                    <Select 
                      labelId="tipo-red-label"
                      value={filtros.tipo_red} 
                      onChange={handleFiltroChange('tipo_red')}
                      label="Tipo de Red"
                    >
                      <MenuItem value="">Todos los tipos</MenuItem>
                      {tiposRed.map(tipo => (
                        <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="estado-label">Estado</InputLabel>
                    <Select 
                      labelId="estado-label"
                      value={filtros.estado} 
                      onChange={handleFiltroChange('estado')}
                      label="Estado"
                    >
                      <MenuItem value="">Todos los estados</MenuItem>
                      {estados.map(estado => (
                        <MenuItem key={estado} value={estado}>{estado}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="ubicacion-label">Ubicación</InputLabel>
                    <Select 
                      labelId="ubicacion-label"
                      value={filtros.ubicacion} 
                      onChange={handleFiltroChange('ubicacion')}
                      label="Ubicación"
                    >
                      <MenuItem value="">Todas las ubicaciones</MenuItem>
                      {ubicaciones.map(ubicacion => (
                        <MenuItem key={ubicacion} value={ubicacion}>{ubicacion}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Buscar"
                    value={filtros.busqueda}
                    onChange={handleFiltroChange('busqueda')}
                    placeholder="Descripción, ID..."
                  />
                </Grid>
                
                {/* Filtros de dimensiones */}
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Largo min (m)"
                    type="number"
                    value={filtros.largo_min}
                    onChange={handleFiltroChange('largo_min')}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Largo max (m)"
                    type="number"
                    value={filtros.largo_max}
                    onChange={handleFiltroChange('largo_max')}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Ancho min (m)"
                    type="number"
                    value={filtros.ancho_min}
                    onChange={handleFiltroChange('ancho_min')}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Ancho max (m)"
                    type="number"
                    value={filtros.ancho_max}
                    onChange={handleFiltroChange('ancho_max')}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Área min (m²)"
                    type="number"
                    value={filtros.area_min}
                    onChange={handleFiltroChange('area_min')}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Área max (m²)"
                    type="number"
                    value={filtros.area_max}
                    onChange={handleFiltroChange('area_max')}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<SearchIcon />}
                    onClick={handleBuscar}
                                                disabled={loadingRedux}
                  >
                                          {loadingRedux ? 'Buscando...' : 'Buscar Paños'}
                  </Button>
                </Grid>
                <Grid item xs={12} md={6}>
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

          {/* Tabla de paños */}
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center">
                  <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6">
                    Paños Disponibles ({panos.length} encontrados)
                  </Typography>
                </Box>
                <Chip 
                  label="Solo Estado: Libre" 
                  color="success" 
                  size="small"
                  variant="outlined"
                />
              </Box>
              
              {panos.length === 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>No hay paños disponibles</strong> con los filtros aplicados.
                    <br />
                    Los paños mostrados están filtrados para incluir únicamente aquellos con estado de trabajo "Libre" 
                    (no asignados a órdenes en proceso).
                  </Typography>
                </Alert>
              )}
              
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Seleccionar</strong></TableCell>
                      <TableCell><strong>Descripción</strong></TableCell>
                      <TableCell><strong>Tipo</strong></TableCell>
                      <TableCell><strong>Dimensiones</strong></TableCell>
                      <TableCell><strong>Área (m²)</strong></TableCell>
                      <TableCell><strong>Estado</strong></TableCell>
                      <TableCell><strong>Estado Trabajo</strong></TableCell>
                      <TableCell><strong>Ubicación</strong></TableCell>
                      <TableCell><strong>Especificaciones</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {panos.map(pano => (
                      <TableRow 
                        key={pano.id_item}
                        hover
                        selected={panoSeleccionado?.id_item === pano.id_item}
                        onClick={() => setPanoSeleccionado(pano)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Button
                            size="small"
                            variant={panoSeleccionado?.id_item === pano.id_item ? "contained" : "outlined"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPanoSeleccionado(pano);
                            }}
                          >
                            Seleccionar
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {pano.descripcion || pano.id_item}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={pano.tipo_red} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {Number(pano.largo_m || 0).toFixed(2)} × {Number(pano.ancho_m || 0).toFixed(2)} m
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {(Number(pano.area_m2) || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={pano.estado} 
                            size="small" 
                            color={getEstadoColor(pano.estado)}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={pano.estado_trabajo || 'Libre'} 
                            size="small" 
                            color={getEstadoTrabajoColor(pano.estado_trabajo)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {pano.ubicacion || 'S/L'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" style={{ whiteSpace: 'pre-line', fontSize: '0.75rem' }}>
                            {(() => {
                              console.log('🔍 Renderizando especificaciones para paño:', {
                                id_item: pano.id_item,
                                tipo_red: pano.tipo_red,
                                especificaciones: pano.especificaciones,
                                tiene_especificaciones: !!pano.especificaciones,
                                todas_las_propiedades: Object.keys(pano)
                              });
                              return pano.especificaciones || 'Sin especificaciones';
                            })()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Área a tomar */}
          {panoSeleccionado && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <InfoIcon sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6">
                    Paño Seleccionado
                  </Typography>
                </Box>
                
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={8}>
                    <Typography variant="body1" fontWeight="medium">
                      {panoSeleccionado.descripcion || panoSeleccionado.id_item}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Tipo: {panoSeleccionado.tipo_red} • 
                      Dimensiones: {Number(panoSeleccionado.largo_m || 0).toFixed(2)} × {Number(panoSeleccionado.ancho_m || 0).toFixed(2)} m • 
                      Área Disponible: {(Number(panoSeleccionado.area_m2) || 0).toFixed(2)} m²
                    </Typography>
                    {panoSeleccionado.especificaciones && (
                      <Typography variant="body2" color="textSecondary" style={{ whiteSpace: 'pre-line', marginTop: 1 }}>
                        <strong>Especificaciones:</strong><br />
                        {panoSeleccionado.especificaciones}
                      </Typography>
                    )}
                  </Grid>
                  
                  {/* Campos de dimensiones */}
                  <Grid item xs={12}>
                    <Box sx={{ 
                      p: 2, 
                      bgcolor: 'grey.50', 
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                        Dimensiones a tomar:
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Largo a tomar (m)"
                            type="number"
                            value={largoTomar}
                            onChange={(e) => setLargoTomar(Number(e.target.value))}
                            inputProps={{ 
                              min: 0.01, 
                              max: Number(panoSeleccionado.largo_m) || 0,
                              step: 0.01 
                            }}
                            size="small"
                            fullWidth
                            helperText={`Máximo: ${(Number(panoSeleccionado.largo_m) || 0).toFixed(2)} m`}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Ancho a tomar (m)"
                            type="number"
                            value={anchoTomar}
                            onChange={(e) => setAnchoTomar(Number(e.target.value))}
                            inputProps={{ 
                              min: 0.01, 
                              max: Number(panoSeleccionado.ancho_m) || 0,
                              step: 0.01 
                            }}
                            size="small"
                            fullWidth
                            helperText={`Máximo: ${(Number(panoSeleccionado.ancho_m) || 0).toFixed(2)} m`}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Área a tomar (m²)"
                            type="text"
                            value={(largoTomar * anchoTomar).toFixed(2)}
                            size="small"
                            fullWidth
                            InputProps={{
                              readOnly: true,
                              style: { 
                                backgroundColor: '#FFFFFF',
                                color: 'black',
                                fontWeight: 'bold'
                              }
                            }}
                            InputLabelProps={{
                              style: { color: 'black', fontWeight: 'bold' }
                            }}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            label="Umbral Remanente (m²)"
                            type="number"
                            value={umbralSobrante}
                            onChange={e => setUmbralSobrante(Number(e.target.value))}
                            inputProps={{ min: 0, step: 0.01 }}
                            size="small"
                            fullWidth
                            helperText="Remanentes menores a este valor serán descartados como desperdicio."
                          />
                        </Grid>
                      </Grid>
                    </Box>
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
            disabled={!panoSeleccionado || (largoTomar < 0.01 || anchoTomar < 0.01)}
          >
            Agregar Paño a la Orden
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
};

export default OrdenFormPanos; 