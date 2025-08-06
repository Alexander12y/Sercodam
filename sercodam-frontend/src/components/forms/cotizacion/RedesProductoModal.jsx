import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Alert,
  Divider,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  Add as AddIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { fetchRedesProducto, fetchRedesProductoCatalogos } from '../../../store/slices/redesProductoSlice';
import { panosApi } from '../../../services/api';

const RedesProductoModal = ({ open, onClose, onRedSeleccionada }) => {
  const dispatch = useDispatch();
  const { lista: redes, loading, catalogos, loadingCatalogos } = useSelector((state) => state.redesProducto);

  // Estados para filtros
  const [filtros, setFiltros] = useState({
    tipo_red: '',
    marca: '',
    descripcion: '',
    search: ''
  });

  // Estados para filtros de especificaciones
  const [filtrosEspecificaciones, setFiltrosEspecificaciones] = useState({
    calibre: '',
    cuadro: '',
    torsion: '',
    refuerzo: '',
    color: '',
    presentacion: '',
    grosor: '',
    color_tipo_red: ''
  });

  // Estado para opciones filtradas
  const [filteredOptions, setFilteredOptions] = useState({
    cuadros: [],
    torsiones: [],
    presentaciones: []
  });

  // Estados para especificaciones de paños por tipo de red
  const [nylonCatalogos, setNylonCatalogos] = useState({
    calibres: [],
    cuadros: [],
    torsiones: []
  });
  const [polipropilenoCatalogos, setPolipropilenoCatalogos] = useState({
    grosores: [],
    cuadros: []
  });
  const [lonaCatalogos, setLonaCatalogos] = useState({
    colores: [],
    presentaciones: []
  });
  const [mallaSombraCatalogos, setMallaSombraCatalogos] = useState({
    colorTiposRed: [],
    presentaciones: []
  });

  // Estado para datos completos de catálogos
  const [catalogData, setCatalogData] = useState({
    nylon: [],
    polipropileno: [],
    lona: [],
    mallaSombra: []
  });

  // Estados para selección
  const [redSeleccionada, setRedSeleccionada] = useState(null);
  const [largoTomar, setLargoTomar] = useState(0);
  const [anchoTomar, setAnchoTomar] = useState(0);
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState(0);

  // Cargar catálogos al montar el componente
  useEffect(() => {
    if (open) {
      dispatch(fetchRedesProductoCatalogos());
    }
  }, [dispatch, open]);

  // Cargar redes cuando se abra el modal
  useEffect(() => {
    if (open) {
      // Cargar catálogos primero
      dispatch(fetchRedesProductoCatalogos());
      // Luego cargar todas las redes
      dispatch(fetchRedesProducto({ limit: 1000 }));
    }
  }, [dispatch, open]);

  // Cargar catálogos cuando se selecciona el tipo de red
  useEffect(() => {
    if (filtros.tipo_red === 'nylon') {
      loadNylonCatalogos();
    } else if (filtros.tipo_red === 'polipropileno') {
      loadPolipropilenoCatalogos();
    } else if (filtros.tipo_red === 'lona') {
      loadLonaCatalogos();
    } else if (filtros.tipo_red === 'malla sombra') {
      loadMallaSombraCatalogos();
    }
  }, [filtros.tipo_red]);

  // Filtrar opciones cuando cambian las selecciones
  useEffect(() => {
    if (filtros.tipo_red === 'nylon') {
      filterNylonOptions();
    } else if (filtros.tipo_red === 'polipropileno') {
      filterPolipropilenoOptions();
    } else if (filtros.tipo_red === 'lona') {
      filterLonaOptions();
    } else if (filtros.tipo_red === 'malla sombra') {
      filterMallaSombraOptions();
    }
  }, [filtros.tipo_red, filtrosEspecificaciones.calibre, filtrosEspecificaciones.grosor, filtrosEspecificaciones.color, filtrosEspecificaciones.color_tipo_red, catalogData]);

  // Limpiar estados cuando se cierre el modal
  useEffect(() => {
    if (!open) {
      setRedSeleccionada(null);
      setLargoTomar(0);
      setAnchoTomar(0);
      setCantidad(1);
      setPrecioUnitario(0);
      setFiltros({
        tipo_red: '',
        marca: '',
        descripcion: '',
        search: ''
      });
      setFiltrosEspecificaciones({
        calibre: '',
        cuadro: '',
        torsion: '',
        refuerzo: '',
        color: '',
        presentacion: '',
        grosor: '',
        color_tipo_red: ''
      });
      setFilteredOptions({
        cuadros: [],
        torsiones: [],
        presentaciones: []
      });
    }
  }, [open]);

  const handleFiltroChange = (campo) => (event) => {
    const value = event.target.value;
    setFiltros(prev => ({
      ...prev,
      [campo]: value
    }));

    // Si cambia el tipo de red, limpiar filtros de especificaciones
    if (campo === 'tipo_red') {
      setFiltrosEspecificaciones({
        calibre: '',
        cuadro: '',
        torsion: '',
        refuerzo: '',
        color: '',
        presentacion: '',
        grosor: '',
        color_tipo_red: ''
      });
      setFilteredOptions({
        cuadros: [],
        torsiones: [],
        presentaciones: []
      });
    }
  };

  const handleEspecificacionChange = (field) => (event) => {
    const value = event.target.value;
    setFiltrosEspecificaciones(prev => {
      const newData = { ...prev, [field]: value };
      
      // Limpiar campos dependientes
      if (field === 'calibre') {
        newData.cuadro = '';
        newData.torsion = '';
        newData.refuerzo = '';
      } else if (field === 'grosor') {
        newData.cuadro = '';
      } else if (field === 'color') {
        newData.presentacion = '';
      } else if (field === 'color_tipo_red') {
        newData.presentacion = '';
      }
      
      return newData;
    });
  };

  // Funciones de carga de catálogos
  const loadNylonCatalogos = async () => {
    try {
      const response = await panosApi.getNylonCatalogos();
      setNylonCatalogos(response.data.data);
      
      // Cargar datos completos para filtrar
      const fullDataResponse = await panosApi.getNylonFullData();
      setCatalogData(prev => ({ ...prev, nylon: fullDataResponse.data.data }));
    } catch (error) {
      console.error('Error cargando catálogos de nylon:', error);
    }
  };

  const loadPolipropilenoCatalogos = async () => {
    try {
      const response = await panosApi.getPolipropilenoCatalogos();
      setPolipropilenoCatalogos(response.data.data);
      
      // Cargar datos completos para filtrar
      const fullDataResponse = await panosApi.getPolipropilenoFullData();
      setCatalogData(prev => ({ ...prev, polipropileno: fullDataResponse.data.data }));
    } catch (error) {
      console.error('Error cargando catálogos de polipropileno:', error);
    }
  };

  const loadLonaCatalogos = async () => {
    try {
      const response = await panosApi.getLonaCatalogos();
      setLonaCatalogos(response.data.data);
      
      // Cargar datos completos para filtrar
      const fullDataResponse = await panosApi.getLonaFullData();
      setCatalogData(prev => ({ ...prev, lona: fullDataResponse.data.data }));
    } catch (error) {
      console.error('Error cargando catálogos de lona:', error);
    }
  };

  const loadMallaSombraCatalogos = async () => {
    try {
      const response = await panosApi.getMallaSombraCatalogos();
      setMallaSombraCatalogos(response.data.data);
      
      // Cargar datos completos para filtrar
      const fullDataResponse = await panosApi.getMallaSombraFullData();
      setCatalogData(prev => ({ ...prev, mallaSombra: fullDataResponse.data.data }));
    } catch (error) {
      console.error('Error cargando catálogos de malla sombra:', error);
    }
  };

  // Funciones de filtrado
  const filterNylonOptions = () => {
    if (!filtrosEspecificaciones.calibre) {
      setFilteredOptions(prev => ({ ...prev, cuadros: [], torsiones: [] }));
      return;
    }
    
    const filtered = catalogData.nylon.filter(item => item.calibre === filtrosEspecificaciones.calibre);
    const cuadros = [...new Set(filtered.map(item => item.cuadro))].filter(Boolean);
    const torsiones = [...new Set(filtered.map(item => item.torsion))].filter(Boolean);

    setFilteredOptions(prev => ({ ...prev, cuadros, torsiones }));
  };

  const filterPolipropilenoOptions = () => {
    if (!filtrosEspecificaciones.grosor) {
      setFilteredOptions(prev => ({ ...prev, cuadros: [] }));
      return;
    }

    const filtered = catalogData.polipropileno.filter(item => item.grosor === filtrosEspecificaciones.grosor);
    const cuadros = [...new Set(filtered.map(item => item.cuadro))].filter(Boolean);

    setFilteredOptions(prev => ({ ...prev, cuadros }));
  };

  const filterLonaOptions = () => {
    if (!filtrosEspecificaciones.color) {
      setFilteredOptions(prev => ({ ...prev, presentaciones: [] }));
      return;
    }

    const filtered = catalogData.lona.filter(item => item.color === filtrosEspecificaciones.color);
    const presentaciones = [...new Set(filtered.map(item => item.presentacion))].filter(Boolean);

    setFilteredOptions(prev => ({ ...prev, presentaciones }));
  };

  const filterMallaSombraOptions = () => {
    if (!filtrosEspecificaciones.color_tipo_red) {
      setFilteredOptions(prev => ({ ...prev, presentaciones: [] }));
      return;
    }

    const filtered = catalogData.mallaSombra.filter(item => item.color_tipo_red === filtrosEspecificaciones.color_tipo_red);
    const presentaciones = [...new Set(filtered.map(item => item.presentacion))].filter(Boolean);

    setFilteredOptions(prev => ({ ...prev, presentaciones }));
  };

  const handleBuscarRedes = async () => {
    try {
      console.log('🔍 handleBuscarRedes - Iniciando búsqueda con filtros:', filtros, filtrosEspecificaciones);
      
      const params = { limit: 1000 };
      
      // Aplicar filtros básicos SOLO si hay filtros activos
      if (filtros.tipo_red) params.tipo_red = filtros.tipo_red;
      if (filtros.marca) params.marca = filtros.marca;
      if (filtros.descripcion) params.descripcion = filtros.descripcion;
      if (filtros.search) params.search = filtros.search;
      
      // Aplicar filtros de especificaciones según el tipo de red
      const tipoRed = filtros.tipo_red?.toLowerCase();
      if (tipoRed === 'nylon') {
        if (filtrosEspecificaciones.calibre) params.calibre = filtrosEspecificaciones.calibre;
        if (filtrosEspecificaciones.cuadro) params.cuadro = filtrosEspecificaciones.cuadro;
        if (filtrosEspecificaciones.torsion) params.torsion = filtrosEspecificaciones.torsion;
        if (filtrosEspecificaciones.refuerzo) params.refuerzo = filtrosEspecificaciones.refuerzo;
      } else if (tipoRed === 'lona') {
        if (filtrosEspecificaciones.color) params.color = filtrosEspecificaciones.color;
        if (filtrosEspecificaciones.presentacion) params.presentacion = filtrosEspecificaciones.presentacion;
      } else if (tipoRed === 'polipropileno') {
        if (filtrosEspecificaciones.grosor) params.grosor = filtrosEspecificaciones.grosor;
        if (filtrosEspecificaciones.cuadro) params.cuadro = filtrosEspecificaciones.cuadro;
      } else if (tipoRed === 'malla sombra') {
        if (filtrosEspecificaciones.color_tipo_red) params.color_tipo_red = filtrosEspecificaciones.color_tipo_red;
        if (filtrosEspecificaciones.presentacion) params.presentacion = filtrosEspecificaciones.presentacion;
      }
      
      console.log('🔍 handleBuscarRedes - Parámetros enviados:', params);
      
      // Usar Redux para cargar las redes filtradas
      await dispatch(fetchRedesProducto(params));
      
      console.log('✅ handleBuscarRedes - Filtros aplicados correctamente');
    } catch (error) {
      console.error('❌ handleBuscarRedes - Error aplicando filtros:', error);
    }
  };

  const handleLimpiarFiltros = () => {
    console.log('🧹 handleLimpiarFiltros - Limpiando filtros');
    
    setFiltros({
      tipo_red: '',
      marca: '',
      descripcion: '',
      search: ''
    });
    setFiltrosEspecificaciones({
      calibre: '',
      cuadro: '',
      torsion: '',
      refuerzo: '',
      color: '',
      presentacion: '',
      grosor: '',
      color_tipo_red: ''
    });
    setFilteredOptions({
      cuadros: [],
      torsiones: [],
      presentaciones: []
    });
    
    // Recargar datos iniciales sin filtros
    dispatch(fetchRedesProducto({ limit: 1000 }));
  };

  const handleAgregarRed = () => {
    if (redSeleccionada && largoTomar > 0 && anchoTomar > 0 && cantidad > 0 && precioUnitario > 0) {
      const areaTomar = largoTomar * anchoTomar;
      const precioTotalPorArea = precioUnitario * areaTomar;
      const subtotal = cantidad * precioTotalPorArea;

      // Generar especificaciones formateadas
      let especificacionesTexto = '';
      if (redSeleccionada.especificaciones) {
        const specs = [];
        Object.entries(redSeleccionada.especificaciones).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            const label = key === 'calibre' ? 'Calibre' :
                         key === 'cuadro' ? 'Cuadro' :
                         key === 'torsion' ? 'Torsión' :
                         key === 'refuerzo' ? 'Refuerzo' :
                         key === 'color' ? 'Color' :
                         key === 'presentacion' ? 'Presentación' :
                         key === 'grosor' ? 'Grosor' :
                         key === 'color_tipo_red' ? 'Color/Tipo' : key;
            specs.push(`${label}: ${value}`);
          }
        });
        especificacionesTexto = specs.join(', ');
      }

      const redData = {
        id_mcr: redSeleccionada.id_mcr,
        tipo_red: redSeleccionada.tipo_red,
        descripcion: redSeleccionada.descripcion,
        marca: redSeleccionada.marca,
        especificaciones: redSeleccionada.especificaciones,
        largo_tomar: largoTomar,
        ancho_tomar: anchoTomar,
        area_tomar: areaTomar,
        cantidad: cantidad,
        precio_por_m2: precioUnitario,
        precio_total_por_area: precioTotalPorArea,
        subtotal: subtotal,
        especificaciones_texto: especificacionesTexto
      };

      onRedSeleccionada(redData);
      
      // Limpiar estados
      setRedSeleccionada(null);
      setLargoTomar(0);
      setAnchoTomar(0);
      setCantidad(1);
      setPrecioUnitario(0);
      onClose();
    }
  };

  const renderFiltrosEspecificaciones = () => {
    if (!filtros.tipo_red) return null;

    const tipoRed = filtros.tipo_red.toLowerCase();

    switch (tipoRed) {
      case 'nylon':
        return (
          <>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Filtrar por Calibre</InputLabel>
                <Select
                  value={filtrosEspecificaciones.calibre}
                  onChange={handleEspecificacionChange('calibre')}
                  label="Filtrar por Calibre"
                >
                  <MenuItem value="">
                    <em>Todos los calibres</em>
                  </MenuItem>
                  {nylonCatalogos.calibres?.map(calibre => (
                    <MenuItem key={calibre} value={calibre}>
                      {calibre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth disabled={!filtrosEspecificaciones.calibre}>
                <InputLabel>Filtrar por Cuadro</InputLabel>
                <Select
                  value={filtrosEspecificaciones.cuadro}
                  onChange={handleEspecificacionChange('cuadro')}
                  label="Filtrar por Cuadro"
                >
                  <MenuItem value="">
                    <em>Todos los cuadros</em>
                  </MenuItem>
                                     {filteredOptions.cuadros.map(cuadro => (
                     <MenuItem key={cuadro} value={cuadro}>
                       {cuadro}
                     </MenuItem>
                   ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth disabled={!filtrosEspecificaciones.calibre}>
                <InputLabel>Filtrar por Torsión</InputLabel>
                <Select
                  value={filtrosEspecificaciones.torsion}
                  onChange={handleEspecificacionChange('torsion')}
                  label="Filtrar por Torsión"
                >
                  <MenuItem value="">
                    <em>Todas las torsiones</em>
                  </MenuItem>
                                     {filteredOptions.torsiones.map(torsion => (
                     <MenuItem key={torsion} value={torsion}>
                       {torsion}
                     </MenuItem>
                   ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth disabled={!filtrosEspecificaciones.calibre}>
                <InputLabel>Filtrar por Refuerzo</InputLabel>
                <Select
                  value={filtrosEspecificaciones.refuerzo}
                  onChange={handleEspecificacionChange('refuerzo')}
                  label="Filtrar por Refuerzo"
                >
                  <MenuItem value="">
                    <em>Todos</em>
                  </MenuItem>
                  <MenuItem value="true">Con Refuerzo</MenuItem>
                  <MenuItem value="false">Sin Refuerzo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </>
        );
      
      case 'lona':
        return (
          <>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Filtrar por Color</InputLabel>
                <Select
                  value={filtrosEspecificaciones.color}
                  onChange={handleEspecificacionChange('color')}
                  label="Filtrar por Color"
                >
                  <MenuItem value="">
                    <em>Todos los colores</em>
                  </MenuItem>
                  {lonaCatalogos.colores?.map(color => (
                    <MenuItem key={color} value={color}>
                      {color}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!filtrosEspecificaciones.color}>
                <InputLabel>Filtrar por Presentación</InputLabel>
                <Select
                  value={filtrosEspecificaciones.presentacion}
                  onChange={handleEspecificacionChange('presentacion')}
                  label="Filtrar por Presentación"
                >
                  <MenuItem value="">
                    <em>Todas las presentaciones</em>
                  </MenuItem>
                                     {filteredOptions.presentaciones.map(presentacion => (
                     <MenuItem key={presentacion} value={presentacion}>
                       {presentacion}
                     </MenuItem>
                   ))}
                </Select>
              </FormControl>
            </Grid>
          </>
        );
      
      case 'polipropileno':
        return (
          <>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Filtrar por Grosor</InputLabel>
                <Select
                  value={filtrosEspecificaciones.grosor}
                  onChange={handleEspecificacionChange('grosor')}
                  label="Filtrar por Grosor"
                >
                  <MenuItem value="">
                    <em>Todos los grosores</em>
                  </MenuItem>
                  {polipropilenoCatalogos.grosores?.map(grosor => (
                    <MenuItem key={grosor} value={grosor}>
                      {grosor}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!filtrosEspecificaciones.grosor}>
                <InputLabel>Filtrar por Cuadro</InputLabel>
                <Select
                  value={filtrosEspecificaciones.cuadro}
                  onChange={handleEspecificacionChange('cuadro')}
                  label="Filtrar por Cuadro"
                >
                  <MenuItem value="">
                    <em>Todos los cuadros</em>
                  </MenuItem>
                                     {filteredOptions.cuadros.map(cuadro => (
                     <MenuItem key={cuadro} value={cuadro}>
                       {cuadro}
                     </MenuItem>
                   ))}
                </Select>
              </FormControl>
            </Grid>
          </>
        );
      
      case 'malla sombra':
        return (
          <>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Filtrar por Color/Tipo</InputLabel>
                <Select
                  value={filtrosEspecificaciones.color_tipo_red}
                  onChange={handleEspecificacionChange('color_tipo_red')}
                  label="Filtrar por Color/Tipo"
                >
                  <MenuItem value="">
                    <em>Todos los colores/tipos</em>
                  </MenuItem>
                  {mallaSombraCatalogos.colorTiposRed?.map(colorTipo => (
                    <MenuItem key={colorTipo} value={colorTipo}>
                      {colorTipo}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!filtrosEspecificaciones.color_tipo_red}>
                <InputLabel>Filtrar por Presentación</InputLabel>
                <Select
                  value={filtrosEspecificaciones.presentacion}
                  onChange={handleEspecificacionChange('presentacion')}
                  label="Filtrar por Presentación"
                >
                  <MenuItem value="">
                    <em>Todas las presentaciones</em>
                  </MenuItem>
                                     {filteredOptions.presentaciones.map(presentacion => (
                     <MenuItem key={presentacion} value={presentacion}>
                       {presentacion}
                     </MenuItem>
                   ))}
                </Select>
              </FormControl>
            </Grid>
          </>
        );
      
      default:
        return null;
    }
  };

  const renderRedSpecifications = (red) => {
    // Prioridad 1: Usar especificaciones_texto si existe
    if (red.especificaciones_texto && red.especificaciones_texto.trim()) {
      return red.especificaciones_texto;
    }
    
    // Prioridad 2: Usar especificaciones si existe
    if (red.especificaciones) {
      const specs = [];
      Object.entries(red.especificaciones).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          const label = key === 'calibre' ? 'Calibre' :
                       key === 'cuadro' ? 'Cuadro' :
                       key === 'torsion' ? 'Torsión' :
                       key === 'refuerzo' ? 'Refuerzo' :
                       key === 'color' ? 'Color' :
                       key === 'presentacion' ? 'Presentación' :
                       key === 'grosor' ? 'Grosor' :
                       key === 'color_tipo_red' ? 'Color/Tipo' : key;
          specs.push(`${label}: ${value}`);
        }
      });
      
      return specs.length > 0 ? specs.join(', ') : 'Sin especificaciones';
    }
    
    return 'Sin especificaciones';
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="xl"
      fullWidth
    >
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <AddIcon sx={{ mr: 1 }} />
          <Typography variant="h6">
            Seleccionar Red del Catálogo
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
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo de Red</InputLabel>
                  <Select
                    value={filtros.tipo_red}
                    onChange={handleFiltroChange('tipo_red')}
                    label="Tipo de Red"
                  >
                    <MenuItem value="">
                      <em>Todos los tipos</em>
                    </MenuItem>
                    <MenuItem value="nylon">Nylon</MenuItem>
                    <MenuItem value="lona">Lona</MenuItem>
                    <MenuItem value="polipropileno">Polipropileno</MenuItem>
                    <MenuItem value="malla sombra">Malla Sombra</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Marca"
                  value={filtros.marca}
                  onChange={handleFiltroChange('marca')}
                  placeholder="Filtrar por marca..."
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Descripción"
                  value={filtros.descripcion}
                  onChange={handleFiltroChange('descripcion')}
                  placeholder="Filtrar por descripción..."
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Buscar"
                  value={filtros.search}
                  onChange={handleFiltroChange('search')}
                  placeholder="ID, descripción, marca..."
                />
              </Grid>
              
              {/* Filtros de especificaciones */}
              {filtros.tipo_red && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }}>
                      <Chip 
                        label="Filtros de Especificaciones" 
                        color="primary" 
                        variant="outlined"
                        size="small"
                      />
                    </Divider>
                  </Grid>
                  {renderFiltrosEspecificaciones()}
                </>
              )}

              <Grid item xs={12} md={6}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<SearchIcon />}
                  onClick={handleBuscarRedes}
                  disabled={loading}
                >
                  {loading ? 'Buscando...' : 'Buscar Redes'}
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

        {/* Tabla de redes */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" mb={2}>
              Redes Disponibles ({redes && Array.isArray(redes) ? redes.length : 0} encontradas)
            </Typography>
            
            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Seleccionar</strong></TableCell>
                    <TableCell><strong>ID</strong></TableCell>
                    <TableCell><strong>Descripción</strong></TableCell>
                    <TableCell><strong>Tipo</strong></TableCell>
                    <TableCell><strong>Marca</strong></TableCell>
                    <TableCell><strong>Especificaciones</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {redes && Array.isArray(redes) ? (
                    redes.map((red) => (
                      <TableRow 
                        key={red.id_mcr} 
                        hover
                        selected={redSeleccionada?.id_mcr === red.id_mcr}
                        onClick={() => setRedSeleccionada(red)}
                        sx={{ 
                          cursor: 'pointer',
                          backgroundColor: redSeleccionada?.id_mcr === red.id_mcr 
                            ? 'rgba(59, 130, 246, 0.08)' 
                            : 'transparent',
                          border: redSeleccionada?.id_mcr === red.id_mcr 
                            ? '2px solid #3b82f6' 
                            : 'none',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: redSeleccionada?.id_mcr === red.id_mcr 
                              ? 'rgba(59, 130, 246, 0.12)' 
                              : 'rgba(59, 130, 246, 0.04)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 8px rgba(59, 130, 246, 0.15)',
                          }
                        }}
                      >
                        <TableCell>
                          <Button
                            size="small"
                            variant={redSeleccionada?.id_mcr === red.id_mcr ? "contained" : "outlined"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setRedSeleccionada(red);
                            }}
                            sx={{
                              backgroundColor: redSeleccionada?.id_mcr === red.id_mcr 
                                ? '#3b82f6' 
                                : 'transparent',
                              color: redSeleccionada?.id_mcr === red.id_mcr 
                                ? 'white' 
                                : '#3b82f6',
                              borderColor: '#3b82f6',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: redSeleccionada?.id_mcr === red.id_mcr 
                                  ? '#2563eb' 
                                  : 'rgba(59, 130, 246, 0.08)',
                                transform: 'scale(1.02)',
                              }
                            }}
                          >
                            {redSeleccionada?.id_mcr === red.id_mcr ? "✓ Seleccionado" : "Seleccionar"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {red.id_mcr}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {red.descripcion || 'Sin descripción'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={red.tipo_red} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {red.marca || 'S/M'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ maxWidth: 200 }}>
                            {renderRedSpecifications(red)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography color="text.secondary">
                          {loading ? 'Cargando redes...' : 'No hay redes disponibles'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Formulario de especificaciones */}
        {redSeleccionada && (
          <Card>
            <CardContent>
              <Typography variant="h6" mb={2}>
                Especificaciones de la Red Seleccionada
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Largo a tomar (m)"
                    value={largoTomar}
                    onChange={(e) => setLargoTomar(parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Ancho a tomar (m)"
                    value={anchoTomar}
                    onChange={(e) => setAnchoTomar(parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Cantidad"
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Precio por m² ($)"
                    value={precioUnitario}
                    onChange={(e) => setPrecioUnitario(parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.01 }}
                    helperText="Precio por metro cuadrado"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Área seleccionada:</strong> {(largoTomar * anchoTomar).toFixed(2)} m²
                      <br />
                      <strong>Precio total por área:</strong> ${((largoTomar * anchoTomar) * precioUnitario).toFixed(2)}
                      <br />
                      <strong>Subtotal (con cantidad):</strong> ${((largoTomar * anchoTomar) * precioUnitario * cantidad).toFixed(2)}
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={handleAgregarRed}
          variant="contained"
          disabled={!redSeleccionada || largoTomar <= 0 || anchoTomar <= 0 || cantidad <= 0 || precioUnitario <= 0}
        >
          Agregar Red a la Cotización
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RedesProductoModal; 