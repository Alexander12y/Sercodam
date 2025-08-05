import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import ConceptosExtraSection from './ConceptosExtraSection';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Autocomplete,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  Filter as FilterIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  FilterList as FilterListIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { updateCurrentCotizacion, addItem, updateItem, removeItem, calculateTotals } from '../../../store/slices/cotizacionesSlice';
import { fetchPanos } from '../../../store/slices/panosSlice';
import { fetchMateriales } from '../../../store/slices/materialesSlice';
import { panosApi, inventarioApi } from '../../../services/api';
import { SUBGRUPOS_CATEGORIAS_MATERIALES } from '../../../constants/materialesConstants';

// ===== SECCIÓN 1: INFORMACIÓN GENERAL =====
export const SeccionGeneral = ({ cotizacion, onUpdate }) => {
  const dispatch = useDispatch();
  const { clientes } = useSelector((state) => state.clientes);

  // Definir los tipos de proyectos y sus títulos correspondientes (usando valores exactos del enum)
  const tiposProyectos = {
    'Redes Industriales': {
      label: 'Redes Industriales',
      titulos: [
        'Redes para Racks Selectivos',
        'Redes Anticaída',
        'Redes para Manejo de Carga'
      ]
    },
    'Redes de Construcción': {
      label: 'Redes de Construcción',
      titulos: [
        'Red perimetral Sistema V (Horca)',
        'Red anticaidas Sistema T (Bandeja)',
        'Red anticaidas Sistema S (Forjado Reutilizable)',
        'Sistema Tipo – U',
        'Malla Anti-escombro'
      ]
    },
    'Redes Deportivas': {
      label: 'Redes Deportivas',
      titulos: [
        'Redes para Golf',
        'Redes para Beisból',
        'Redes para Fútbol',
        'Redes para Pádel y Tenis'
      ]
    },
    'Artículos Deportivos': {
      label: 'Artículos Deportivos',
      titulos: [
        'Redes de Tenis y Pádel',
        'Redes de Voleibol',
        'Postes para canchas de tenis y padel',
        'Jaulas individuales para tiro de Golf'
      ]
    },
    'OTRO': {
      label: 'Otro',
      titulos: []
    }
  };

  // Obtener las opciones de títulos basadas en el tipo de proyecto seleccionado
  const getTitulosDisponibles = () => {
    const tipoSeleccionado = cotizacion.tipo_proyecto;
    if (tipoSeleccionado && tiposProyectos[tipoSeleccionado]) {
      return tiposProyectos[tipoSeleccionado].titulos;
    }
    return [];
  };

  // Validación de props
  if (!cotizacion) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Información General
          </Typography>
          <Typography color="text.secondary">
            Cargando información...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const handleChange = (field, value) => {
    const updatedData = { [field]: value };
    
    // Si se cambia el tipo de proyecto, limpiar el título del proyecto
    if (field === 'tipo_proyecto') {
      updatedData.titulo_proyecto = '';
    }
    
    dispatch(updateCurrentCotizacion(updatedData));
    if (onUpdate) onUpdate(updatedData);
  };

  const handleClienteChange = (cliente) => {
    if (cliente) {
      const updatedData = {
        id_cliente: cliente.id_cliente,
        nombre_cliente: cliente.nombre_cliente,
        empresa_cliente: cliente.empresa_cliente || '',
        email_cliente: cliente.email_cliente || '',
        telefono_cliente: cliente.telefono_cliente || ''
      };
      dispatch(updateCurrentCotizacion(updatedData));
      if (onUpdate) onUpdate(updatedData);
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Información General
        </Typography>
        
        <Grid container spacing={3}>
          {/* Selección de Cliente */}
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={clientes || []}
              getOptionLabel={(option) => `${option.nombre_cliente}${option.empresa_cliente ? ` - ${option.empresa_cliente}` : ''}`}
              value={clientes?.find(c => c.id_cliente === cotizacion.id_cliente) || null}
              onChange={(event, newValue) => handleClienteChange(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente"
                  required
                  fullWidth
                />
              )}
            />
          </Grid>

          {/* Tipo de Proyecto */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Proyecto</InputLabel>
              <Select
                value={cotizacion.tipo_proyecto || ''}
                label="Tipo de Proyecto"
                onChange={(e) => handleChange('tipo_proyecto', e.target.value)}
                required
              >
                <MenuItem value="">
                  <em>Selecciona un tipo de proyecto</em>
                </MenuItem>
                {Object.entries(tiposProyectos).map(([key, config]) => (
                  <MenuItem key={key} value={key}>
                    {config.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Título del Proyecto */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Título del Proyecto</InputLabel>
              <Select
                value={cotizacion.titulo_proyecto || ''}
                label="Título del Proyecto"
                onChange={(e) => handleChange('titulo_proyecto', e.target.value)}
                disabled={!cotizacion.tipo_proyecto || cotizacion.tipo_proyecto === 'OTRO'}
                required
              >
                <MenuItem value="">
                  <em>
                    {!cotizacion.tipo_proyecto 
                      ? 'Primero selecciona un tipo de proyecto' 
                      : cotizacion.tipo_proyecto === 'OTRO' 
                        ? 'Para "Otro" puedes escribir libremente' 
                        : 'Selecciona un título de proyecto'
                    }
                  </em>
                </MenuItem>
                {getTitulosDisponibles().map((titulo) => (
                  <MenuItem key={titulo} value={titulo}>
                    {titulo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Campo de texto libre para "Otro" */}
          {cotizacion.tipo_proyecto === 'OTRO' && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Título del Proyecto (Personalizado)"
                value={cotizacion.titulo_proyecto || ''}
                onChange={(e) => handleChange('titulo_proyecto', e.target.value)}
                placeholder="Escribe el título de tu proyecto..."
                required
              />
            </Grid>
          )}

          {/* Días de Validez */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Días de Validez"
              value={cotizacion.dias_validez || 15}
              onChange={(e) => handleChange('dias_validez', parseInt(e.target.value))}
              inputProps={{ min: 1, max: 365 }}
            />
          </Grid>

          {/* Tiempo de Entrega */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Tiempo de Entrega"
              value={cotizacion.tiempo_entrega || ''}
              onChange={(e) => handleChange('tiempo_entrega', e.target.value)}
              placeholder="Ej: 15 días hábiles"
            />
          </Grid>

          {/* Incluye Instalación */}
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={cotizacion.incluye_instalacion || false}
                  onChange={(e) => handleChange('incluye_instalacion', e.target.checked)}
                />
              }
              label="Incluye Instalación"
            />
          </Grid>

          {/* Tiempo de Instalación (solo si incluye instalación) */}
          {cotizacion.incluye_instalacion && (
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tiempo de Instalación"
                value={cotizacion.tiempo_instalacion || ''}
                onChange={(e) => handleChange('tiempo_instalacion', e.target.value)}
                placeholder="Ej: 3 días"
              />
            </Grid>
          )}


        </Grid>
      </CardContent>
    </Card>
  );
};

// ===== SECCIÓN 2: PRODUCTOS =====
export const SeccionProductos = ({ cotizacion, onUpdate }) => {
  const dispatch = useDispatch();
  const { lista: panos, loading: panosLoading } = useSelector((state) => state.panos);
  const { lista: materiales, loading: materialesLoading } = useSelector((state) => state.materiales);

  // Constantes para filtros
  const tiposRed = ['nylon', 'lona', 'polipropileno', 'malla sombra'];
  const estados = ['bueno', 'regular', 'malo', '50%'];
  const ubicaciones = ['Bodega CDMX', 'Querétaro', 'Oficina', 'Instalación'];

  // Estados para productos
  const [tipoProducto, setTipoProducto] = useState('');
  const [descripcionProducto, setDescripcionProducto] = useState('');
  const [cantidadProducto, setCantidadProducto] = useState(1);
  const [precioUnitarioProducto, setPrecioUnitarioProducto] = useState(0);

  // Estados para paños
  const [modalPanosOpen, setModalPanosOpen] = useState(false);
  const [panosDisponibles, setPanosDisponibles] = useState([]);
  const [panoSeleccionado, setPanoSeleccionado] = useState(null);
  const [largoTomar, setLargoTomar] = useState(0);
  const [anchoTomar, setAnchoTomar] = useState(0);
  const [cantidadPano, setCantidadPano] = useState(1);
  const [precioUnitarioPano, setPrecioUnitarioPano] = useState(0);

  // Función para renderizar especificaciones de paños (copiada de PanosList.jsx)
  const renderPanoSpecifications = (pano) => {
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
  const [filtrosPanos, setFiltrosPanos] = useState({
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

  // Estados para materiales
  const [modalMaterialesOpen, setModalMaterialesOpen] = useState(false);
  const [materialesDisponibles, setMaterialesDisponibles] = useState([]);
  const [materialSeleccionado, setMaterialSeleccionado] = useState(null);
  const [cantidadMaterial, setCantidadMaterial] = useState(1);
  const [precioUnitarioMaterial, setPrecioUnitarioMaterial] = useState(0);
  // Estados para filtros de materiales
  const [filtrosMateriales, setFiltrosMateriales] = useState({
    subgrupo: '',
    categoria: '',
    busqueda: ''
  });
  const [subgrupos] = useState(Object.keys(SUBGRUPOS_CATEGORIAS_MATERIALES));
  const [categorias, setCategorias] = useState([]);

  // Estados para errores de validación de stock
  const [errorStockPano, setErrorStockPano] = useState("");
  const [errorStockMaterial, setErrorStockMaterial] = useState("");

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

  // Opciones filtradas basadas en selecciones previas
  const [filteredOptions, setFilteredOptions] = useState({
    cuadros: [],
    torsiones: [],
    presentaciones: []
  });

  // Datos completos del catálogo para filtrar
  const [catalogData, setCatalogData] = useState({
    nylon: [],
    lona: [],
    polipropileno: [],
    mallaSombra: []
  });

  // Estados para filtros de especificaciones por tipo de red
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

  // Estados para producto personalizado
  const [modalProductoPersonalizadoOpen, setModalProductoPersonalizadoOpen] = useState(false);

  // Validación de props
  if (!cotizacion) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Productos y Servicios
          </Typography>
          <Typography color="text.secondary">
            Cargando información...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Cargar datos al montar el componente
  useEffect(() => {
    dispatch(fetchPanos());
    dispatch(fetchMateriales());
  }, [dispatch]);

  // Procesar datos de Redux para paños
  useEffect(() => {
    if (panos && Array.isArray(panos)) {
      console.log('🔍 Procesando paños de Redux:', panos.length);
      setPanosDisponibles(panos);
    }
  }, [panos]);

  // Procesar datos de Redux para materiales
  useEffect(() => {
    if (materiales && Array.isArray(materiales)) {
      console.log('🔍 Procesando materiales de Redux:', materiales.length);
      setMaterialesDisponibles(materiales);
    }
  }, [materiales]);

  // Auto-popular precio cuando se selecciona un paño
  useEffect(() => {
    if (panoSeleccionado && panoSeleccionado.precio_x_unidad) {
      setPrecioUnitarioPano(parseFloat(panoSeleccionado.precio_x_unidad) || 0);
    }
  }, [panoSeleccionado]);

  // Auto-popular precio cuando se selecciona un material
  useEffect(() => {
    if (materialSeleccionado && materialSeleccionado.precio_x_unidad) {
      setPrecioUnitarioMaterial(parseFloat(materialSeleccionado.precio_x_unidad) || 0);
    }
  }, [materialSeleccionado]);

  // Limpiar errores cuando se abren los modales
  useEffect(() => {
    if (modalPanosOpen) {
      setErrorStockPano("");
    }
  }, [modalPanosOpen]);

  useEffect(() => {
    if (modalMaterialesOpen) {
      setErrorStockMaterial("");
    }
  }, [modalMaterialesOpen]);

  // Limpiar especificaciones cuando se cierra el modal de paños
  useEffect(() => {
    if (!modalPanosOpen) {
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
  }, [modalPanosOpen]);

  // Cargar catálogos cuando se selecciona un tipo de red
  useEffect(() => {
    if (panoSeleccionado && panoSeleccionado.tipo_red) {
      const tipoRed = panoSeleccionado.tipo_red.toLowerCase();
      if (tipoRed === 'nylon') {
        loadNylonCatalogos();
      } else if (tipoRed === 'polipropileno') {
        loadPolipropilenoCatalogos();
      } else if (tipoRed === 'lona') {
        loadLonaCatalogos();
      } else if (tipoRed === 'malla sombra') {
        loadMallaSombraCatalogos();
      }
    }
  }, [panoSeleccionado]);

  // Cargar catálogos cuando se selecciona un tipo de red en los filtros
  useEffect(() => {
    if (filtrosPanos.tipo_red) {
      const tipoRed = filtrosPanos.tipo_red.toLowerCase();
      if (tipoRed === 'nylon') {
        loadNylonCatalogos();
      } else if (tipoRed === 'polipropileno') {
        loadPolipropilenoCatalogos();
      } else if (tipoRed === 'lona') {
        loadLonaCatalogos();
      } else if (tipoRed === 'malla sombra') {
        loadMallaSombraCatalogos();
      }
    }
  }, [filtrosPanos.tipo_red]);

  // Filtrar opciones cuando cambian las especificaciones
  useEffect(() => {
    if (panoSeleccionado && panoSeleccionado.tipo_red) {
      const tipoRed = panoSeleccionado.tipo_red.toLowerCase();
      if (tipoRed === 'nylon') {
        filterNylonOptions();
      } else if (tipoRed === 'polipropileno') {
        filterPolipropilenoOptions();
      } else if (tipoRed === 'lona') {
        filterLonaOptions();
      } else if (tipoRed === 'malla sombra') {
        filterMallaSombraOptions();
      }
    }
  }, [panoSeleccionado, filtrosEspecificaciones, catalogData]);

  // Funciones para cargar catálogos
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

  // Funciones para manejar cambios en especificaciones
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

  const handleAddItem = () => {
    dispatch(addItem());
    dispatch(calculateTotals());
  };

  const handleUpdateItem = (index, field, value) => {
    dispatch(updateItem({ index, itemData: { [field]: value } }));
  };

  const handleRemoveItem = (index) => {
    dispatch(removeItem(index));
  };

  // Funciones para paños
  const handleFiltroPanosChange = (campo) => (event) => {
    setFiltrosPanos(prev => ({
      ...prev,
      [campo]: event.target.value
    }));
  };

  const handleBuscarPanos = async () => {
    console.log('🔍 handleBuscarPanos - Iniciando búsqueda con filtros:', filtrosPanos);
    
    try {
      const params = { limit: 1000 }; // Sin paginación, traer todos
      
      // Aplicar filtros SOLO si hay filtros activos
      if (filtrosPanos.tipo_red) params.tipo_red = filtrosPanos.tipo_red;
      if (filtrosPanos.estado) params.estado = filtrosPanos.estado;
      if (filtrosPanos.ubicacion) params.ubicacion = filtrosPanos.ubicacion;
      if (filtrosPanos.busqueda) params.search = filtrosPanos.busqueda;
      if (filtrosPanos.largo_min) params.largo_min = filtrosPanos.largo_min;
      if (filtrosPanos.largo_max) params.largo_max = filtrosPanos.largo_max;
      if (filtrosPanos.ancho_min) params.ancho_min = filtrosPanos.ancho_min;
      if (filtrosPanos.ancho_max) params.ancho_max = filtrosPanos.ancho_max;
      if (filtrosPanos.area_min) params.area_min = filtrosPanos.area_min;
      if (filtrosPanos.area_max) params.area_max = filtrosPanos.area_max;
      
      // Aplicar filtros de especificaciones según el tipo de red
      const tipoRed = filtrosPanos.tipo_red?.toLowerCase();
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
      
      // Usar Redux para cargar los paños filtrados
      await dispatch(fetchPanos(params));
      
      console.log('✅ Filtros aplicados correctamente');
    } catch (error) {
      console.error('❌ Error aplicando filtros:', error);
    }
  };

  const handleLimpiarFiltrosPanos = () => {
    setFiltrosPanos({
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
    dispatch(fetchPanos({ limit: 1000 }));
  };

  const handleAgregarPano = () => {
    if (panoSeleccionado && largoTomar > 0 && anchoTomar > 0 && cantidadPano > 0 && precioUnitarioPano > 0) {
      // Validación de stock disponible (área)
      const largoDisponible = Number(panoSeleccionado.largo_m) || 0;
      const anchoDisponible = Number(panoSeleccionado.ancho_m) || 0;
      setErrorStockPano("");
      
      if (largoTomar > largoDisponible) {
        setErrorStockPano(`No puedes tomar más largo del disponible. Largo disponible: ${largoDisponible.toFixed(2)} m`);
        return;
      }
      if (anchoTomar > anchoDisponible) {
        setErrorStockPano(`No puedes tomar más ancho del disponible. Ancho disponible: ${anchoDisponible.toFixed(2)} m`);
        return;
      }
      
      const areaTomar = largoTomar * anchoTomar;
      const areaDisponible = panoSeleccionado.area_m2 || (largoDisponible * anchoDisponible);
      
      if (areaTomar > areaDisponible) {
        setErrorStockPano(`No puedes tomar más área de la disponible. Área disponible: ${areaDisponible.toFixed(2)} m²`);
        return;
      }
      
      // Calcular precio total por área (precio por metro cuadrado × área)
      const precioTotalPorArea = precioUnitarioPano * areaTomar;
      const subtotal = cantidadPano * precioTotalPorArea;
      
      // Usar las especificaciones del paño seleccionado del inventario
      let especificacionesTexto = '';
      if (panoSeleccionado.especificaciones) {
        especificacionesTexto = panoSeleccionado.especificaciones;
      } else {
        // Fallback: generar especificaciones desde campos individuales
        const tipoRed = panoSeleccionado.tipo_red?.toLowerCase();
        switch (tipoRed) {
          case 'nylon':
            especificacionesTexto = `Calibre: ${panoSeleccionado.calibre || 'N/A'}, Cuadro: ${panoSeleccionado.cuadro || 'N/A'}, Torsión: ${panoSeleccionado.torsion || 'N/A'}, Refuerzo: ${panoSeleccionado.refuerzo !== undefined && panoSeleccionado.refuerzo !== null ? (panoSeleccionado.refuerzo === true || panoSeleccionado.refuerzo === 't' ? 'Sí' : 'No') : 'N/A'}`;
            break;
          case 'lona':
            especificacionesTexto = `Color: ${panoSeleccionado.color || 'N/A'}, Presentación: ${panoSeleccionado.presentacion || 'N/A'}`;
            break;
          case 'polipropileno':
            especificacionesTexto = `Grosor: ${panoSeleccionado.grosor || 'N/A'}, Cuadro: ${panoSeleccionado.cuadro || 'N/A'}`;
            break;
          case 'malla sombra':
            especificacionesTexto = `Color/Tipo: ${panoSeleccionado.color_tipo_red || 'N/A'}, Presentación: ${panoSeleccionado.presentacion || 'N/A'}`;
            break;
          default:
            especificacionesTexto = 'Sin especificaciones';
        }
      }
      
      const newItem = {
        partida: String.fromCharCode(65 + (cotizacion.detalle?.length || 0)),
        orden_index: (cotizacion.detalle?.length || 0) + 1,
        id_item: panoSeleccionado.id_item,
        cantidad: cantidadPano,
        precio_unitario: precioTotalPorArea, // Precio total por área
        subtotal: subtotal,
        notas: `Paño: ${panoSeleccionado.descripcion || panoSeleccionado.id_item}`,
        caracteristicas: `Tipo: ${panoSeleccionado.tipo_red}, Dimensiones: ${largoTomar.toFixed(2)}m × ${anchoTomar.toFixed(2)}m, Área: ${areaTomar.toFixed(2)}m², Precio/m²: $${precioUnitarioPano.toFixed(2)}, Especificaciones: ${especificacionesTexto}`,
        catalogo: 'CATALOGO_1',
        tipo_item: 'PANO',
        estado: 'por aprobar',
        metadata: {
          pano_data: panoSeleccionado,
          largo_tomar: largoTomar,
          ancho_tomar: anchoTomar,
          area_tomar: areaTomar,
          precio_por_m2: precioUnitarioPano
        }
      };

      dispatch(updateCurrentCotizacion({
        detalle: [...(cotizacion.detalle || []), newItem]
      }));
      dispatch(calculateTotals());

      // Limpiar estados
      setPanoSeleccionado(null);
      setLargoTomar(0);
      setAnchoTomar(0);
      setCantidadPano(1);
      setPrecioUnitarioPano(0);
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
      setErrorStockPano("");
      setModalPanosOpen(false);
    }
  };

  // Funciones para materiales
  const handleFiltroMaterialesChange = (campo) => (event) => {
    setFiltrosMateriales(prev => ({
      ...prev,
      [campo]: event.target.value
    }));
  };

  const handleSubgrupoChange = (event) => {
    const selectedSubgrupo = event.target.value;
    setFiltrosMateriales(prev => ({
      ...prev,
      subgrupo: selectedSubgrupo,
      categoria: ''
    }));
    
    if (selectedSubgrupo) {
      setCategorias(SUBGRUPOS_CATEGORIAS_MATERIALES[selectedSubgrupo] || []);
    } else {
      setCategorias([]);
    }
  };

  const handleBuscarMateriales = async () => {
    console.log('🔍 handleBuscarMateriales - Iniciando búsqueda con filtros:', filtrosMateriales);
    
    try {
      const params = { limit: 1000 }; // Sin paginación, traer todos
      
      // Aplicar filtros SOLO si hay filtros activos
      if (filtrosMateriales.categoria) params.categoria = filtrosMateriales.categoria;
      if (filtrosMateriales.busqueda) params.search = filtrosMateriales.busqueda;
      
      // Usar Redux para cargar los materiales filtrados
      await dispatch(fetchMateriales(params));
      
      console.log('✅ Filtros de materiales aplicados correctamente');
    } catch (error) {
      console.error('❌ Error aplicando filtros de materiales:', error);
    }
  };

  const handleLimpiarFiltrosMateriales = () => {
    setFiltrosMateriales({
      subgrupo: '',
      categoria: '',
      busqueda: ''
    });
    setCategorias([]);
    // Recargar datos iniciales sin filtros
    dispatch(fetchMateriales({ limit: 1000 }));
  };

  const handleAgregarMaterial = () => {
    if (materialSeleccionado && cantidadMaterial > 0 && precioUnitarioMaterial > 0) {
      // Validación de stock disponible
      setErrorStockMaterial("");
      if (cantidadMaterial > (materialSeleccionado.cantidad_disponible || 0)) {
        setErrorStockMaterial(`No hay suficiente stock disponible. Stock actual: ${materialSeleccionado.cantidad_disponible || 0}`);
        return;
      }
      
      const subtotal = cantidadMaterial * precioUnitarioMaterial;
      
      const newItem = {
        partida: String.fromCharCode(65 + (cotizacion.detalle?.length || 0)),
        orden_index: (cotizacion.detalle?.length || 0) + 1,
        id_item: materialSeleccionado.id_material_extra,
        cantidad: cantidadMaterial,
        precio_unitario: precioUnitarioMaterial,
        subtotal: subtotal,
        notas: `Material: ${materialSeleccionado.descripcion || materialSeleccionado.id_material_extra}`,
        caracteristicas: `Categoría: ${materialSeleccionado.categoria}, Marca: ${materialSeleccionado.marca || 'N/A'}`,
        catalogo: 'CATALOGO_2',
        tipo_item: 'MATERIAL',
        estado: 'por aprobar',
        metadata: {
          material_data: materialSeleccionado
        }
      };

      dispatch(updateCurrentCotizacion({
        detalle: [...(cotizacion.detalle || []), newItem]
      }));
      dispatch(calculateTotals());

      // Limpiar estados
      setMaterialSeleccionado(null);
      setCantidadMaterial(1);
      setPrecioUnitarioMaterial(0);
      setErrorStockMaterial("");
      setModalMaterialesOpen(false);
    }
  };

  // Funciones para producto personalizado
  const handleAgregarProductoPersonalizado = () => {
    if (descripcionProducto && cantidadProducto > 0 && precioUnitarioProducto > 0) {
      const subtotal = cantidadProducto * precioUnitarioProducto;
      
      const newItem = {
        partida: String.fromCharCode(65 + (cotizacion.detalle?.length || 0)),
        orden_index: (cotizacion.detalle?.length || 0) + 1,
        id_item: null,
        cantidad: cantidadProducto,
        precio_unitario: precioUnitarioProducto,
        subtotal: subtotal,
        notas: descripcionProducto,
        caracteristicas: tipoProducto,
        catalogo: 'CATALOGO_3',
        tipo_item: 'SERVICIO',
        estado: 'por aprobar',
        metadata: {
          tipo: 'personalizado'
        }
      };

      dispatch(updateCurrentCotizacion({
        detalle: [...(cotizacion.detalle || []), newItem]
      }));
      dispatch(calculateTotals());

      // Limpiar estados
      setDescripcionProducto('');
      setTipoProducto('');
      setCantidadProducto(1);
      setPrecioUnitarioProducto(0);
      setModalProductoPersonalizadoOpen(false);
    }
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



  // Función para renderizar filtros de especificaciones por tipo de red
  const renderFiltrosEspecificaciones = () => {
    if (!filtrosPanos.tipo_red) return null;

    const tipoRed = filtrosPanos.tipo_red.toLowerCase();

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
                  {nylonCatalogos.calibres.map(calibre => (
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
                  <MenuItem value="Sí">Con Refuerzo</MenuItem>
                  <MenuItem value="No">Sin Refuerzo</MenuItem>
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
                  {lonaCatalogos.colores.map(color => (
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
                  {polipropilenoCatalogos.grosores.map(grosor => (
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
                  {mallaSombraCatalogos.colorTiposRed.map(colorTipo => (
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

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Productos y Servicios
          </Typography>
          <Box display="flex" gap={1}>
          <Button
              variant="outlined"
            startIcon={<AddIcon />}
              onClick={() => setModalPanosOpen(true)}
              size="small"
            >
              Agregar Paño
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setModalMaterialesOpen(true)}
              size="small"
            >
              Agregar Material
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setModalProductoPersonalizadoOpen(true)}
              size="small"
            >
              Producto Personalizado
          </Button>
          </Box>
        </Box>

        {cotizacion.detalle && cotizacion.detalle.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell width="5%">Partida</TableCell>
                  <TableCell width="10%">Cantidad</TableCell>
                  <TableCell width="25%">Producto/Concepto</TableCell>
                  <TableCell width="30%">Características/Descripción</TableCell>
                  <TableCell width="15%">Precio Unitario</TableCell>
                  <TableCell width="15%">Subtotal</TableCell>
                  <TableCell width="5%">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cotizacion.detalle.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {item.partida}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={item.cantidad || 1}
                        onChange={(e) => handleUpdateItem(index, 'cantidad', parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {item.notas || 'Producto'}
                      </Typography>
                      <Chip 
                        label={item.tipo_item} 
                              size="small"
                        color="primary" 
                        variant="outlined"
                        sx={{ mt: 0.5 }}
                            />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {item.caracteristicas || 'Sin especificaciones'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={item.precio_unitario || 0}
                        onChange={(e) => handleUpdateItem(index, 'precio_unitario', parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        ${((item.cantidad || 0) * (item.precio_unitario || 0)).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">
            No hay productos agregados. Usa los botones arriba para agregar paños, materiales o productos personalizados.
          </Alert>
        )}

        {/* Totales */}
        {cotizacion.detalle && cotizacion.detalle.length > 0 && (
          <Box mt={3} display="flex" justifyContent="flex-end">
            <Box textAlign="right">
              <Typography variant="h6">
                Subtotal: ${cotizacion.subtotal?.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="h6" color="primary">
                IVA (16%): ${cotizacion.iva?.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="h5" fontWeight="bold" color="error">
                Total: ${cotizacion.total?.toFixed(2) || '0.00'}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Modal de selección de paños */}
        <Dialog 
          open={modalPanosOpen} 
          onClose={() => setModalPanosOpen(false)}
          maxWidth="xl"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center">
              <InventoryIcon sx={{ mr: 1 }} />
              <Typography variant="h6">
                Seleccionar Paño para Cotización
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {errorStockPano && (
              <Alert severity="error" sx={{ mb: 2 }}>{errorStockPano}</Alert>
            )}
            
            {/* Información general */}
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>🔍 Filtrado automático aplicado:</strong> Solo se muestran paños con estado de trabajo "Libre" 
                (disponibles para nuevas cotizaciones). Los paños "Reservado", "En progreso" o "Consumido" no aparecen 
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
                        value={filtrosPanos.tipo_red} 
                        onChange={handleFiltroPanosChange('tipo_red')}
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
                        value={filtrosPanos.estado} 
                        onChange={handleFiltroPanosChange('estado')}
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
                        value={filtrosPanos.ubicacion} 
                        onChange={handleFiltroPanosChange('ubicacion')}
                        label="Ubicación"
                      >
                        <MenuItem value="">Todas las ubicaciones</MenuItem>
                        {ubicaciones.map(ubic => (
                          <MenuItem key={ubic} value={ubic}>{ubic}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Buscar"
                      value={filtrosPanos.busqueda}
                      onChange={handleFiltroPanosChange('busqueda')}
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
                      value={filtrosPanos.largo_min}
                      onChange={handleFiltroPanosChange('largo_min')}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Largo max (m)"
                      type="number"
                      value={filtrosPanos.largo_max}
                      onChange={handleFiltroPanosChange('largo_max')}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Ancho min (m)"
                      type="number"
                      value={filtrosPanos.ancho_min}
                      onChange={handleFiltroPanosChange('ancho_min')}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Ancho max (m)"
                      type="number"
                      value={filtrosPanos.ancho_max}
                      onChange={handleFiltroPanosChange('ancho_max')}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Área min (m²)"
                      type="number"
                      value={filtrosPanos.area_min}
                      onChange={handleFiltroPanosChange('area_min')}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Área max (m²)"
                      type="number"
                      value={filtrosPanos.area_max}
                      onChange={handleFiltroPanosChange('area_max')}
                    />
                  </Grid>
                  
                  {/* Filtros de especificaciones */}
                  {filtrosPanos.tipo_red && (
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
                        onClick={handleBuscarPanos}
                        disabled={panosLoading}
                      >
                      {panosLoading ? 'Buscando...' : 'Buscar Paños'}
                      </Button>
                  </Grid>
                  <Grid item xs={12} md={6}>
                      <Button
                      fullWidth
                        variant="outlined"
                        startIcon={<ClearIcon />}
                        onClick={handleLimpiarFiltrosPanos}
                      >
                      Limpiar Filtros
                      </Button>
                  </Grid>
                </Grid>
                

              </CardContent>
            </Card>

            {/* Tabla de paños */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Paños Disponibles ({panosDisponibles && Array.isArray(panosDisponibles) ? panosDisponibles.length : 0} encontrados)
                </Typography>
                
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Seleccionar</strong></TableCell>
                        <TableCell><strong>Descripción</strong></TableCell>
                        <TableCell><strong>Tipo</strong></TableCell>
                        <TableCell><strong>Dimensiones</strong></TableCell>
                        <TableCell><strong>Estado</strong></TableCell>
                        <TableCell><strong>Ubicación</strong></TableCell>
                        <TableCell><strong>Especificaciones</strong></TableCell>
                        <TableCell><strong>Precio/m² ($)</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {panosDisponibles && Array.isArray(panosDisponibles) ? (
                        panosDisponibles.map((pano) => (
                          <TableRow 
                            key={pano.id_item} 
                            hover
                            selected={panoSeleccionado?.id_item === pano.id_item}
                            onClick={() => setPanoSeleccionado(pano)}
                            sx={{ 
                              cursor: 'pointer',
                              backgroundColor: panoSeleccionado?.id_item === pano.id_item 
                                ? 'rgba(59, 130, 246, 0.08)' 
                                : 'transparent',
                              border: panoSeleccionado?.id_item === pano.id_item 
                                ? '2px solid #3b82f6' 
                                : 'none',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: panoSeleccionado?.id_item === pano.id_item 
                                  ? 'rgba(59, 130, 246, 0.12)' 
                                  : 'rgba(59, 130, 246, 0.04)',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 8px rgba(59, 130, 246, 0.15)',
                              },
                              '&:hover .MuiTableCell-root': {
                                backgroundColor: 'rgba(59, 130, 246, 0.04)',
                                transition: 'background-color 0.2s ease',
                              }
                            }}
                          >
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              <Button
                                size="small"
                                variant={panoSeleccionado?.id_item === pano.id_item ? "contained" : "outlined"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPanoSeleccionado(pano);
                                }}
                                sx={{
                                  backgroundColor: panoSeleccionado?.id_item === pano.id_item 
                                    ? '#3b82f6' 
                                    : 'transparent',
                                  color: panoSeleccionado?.id_item === pano.id_item 
                                    ? 'white' 
                                    : '#3b82f6',
                                  borderColor: '#3b82f6',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    backgroundColor: panoSeleccionado?.id_item === pano.id_item 
                                      ? '#2563eb' 
                                      : 'rgba(59, 130, 246, 0.08)',
                                    transform: 'scale(1.02)',
                                  }
                                }}
                              >
                                {panoSeleccionado?.id_item === pano.id_item ? "✓ Seleccionado" : "Seleccionar"}
                              </Button>
                            </TableCell>
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              <Typography variant="body2" fontWeight="medium">
                                {pano.descripcion || pano.id_item}
                              </Typography>
                            </TableCell>
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              <Chip 
                                label={pano.tipo_red} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              <Typography variant="body2">
                                {Number(pano.largo_m || 0).toFixed(2)} × {Number(pano.ancho_m || 0).toFixed(2)} m
                              </Typography>
                            </TableCell>
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              <Chip 
                                label={pano.estado} 
                                size="small" 
                                color={getEstadoColor(pano.estado)}
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              <Typography variant="body2">
                                {pano.ubicacion || 'S/L'}
                              </Typography>
                            </TableCell>
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              {renderPanoSpecifications(pano)}
                            </TableCell>
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              <Typography variant="body2" fontWeight="medium">
                                ${pano.precio_x_unidad || 0}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            <Typography color="text.secondary">
                              {panosLoading ? 'Cargando paños...' : 'No hay paños disponibles'}
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
            {panoSeleccionado && (
              <Card>
                <CardContent>
                  <Typography variant="h6" mb={2}>
                    Especificaciones del Paño Seleccionado
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
                        value={cantidadPano}
                        onChange={(e) => setCantidadPano(parseInt(e.target.value) || 1)}
                        inputProps={{ min: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Precio por m² ($)"
                        value={precioUnitarioPano}
                        onChange={(e) => setPrecioUnitarioPano(parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0, step: 0.01 }}
                        helperText="Precio por metro cuadrado"
                      />
                    </Grid>
                    

                    
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mt: 1 }}>
                        <Typography variant="body2">
                          <strong>Área seleccionada:</strong> {(largoTomar * anchoTomar).toFixed(2)} m²
                          <br />
                          <strong>Precio total por área:</strong> ${((largoTomar * anchoTomar) * precioUnitarioPano).toFixed(2)}
                          <br />
                          <strong>Subtotal (con cantidad):</strong> ${((largoTomar * anchoTomar) * precioUnitarioPano * cantidadPano).toFixed(2)}
                        </Typography>
                      </Alert>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Mensaje de error de stock */}
            {errorStockPano && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errorStockPano}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalPanosOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleAgregarPano}
              variant="contained"
              disabled={!panoSeleccionado || largoTomar <= 0 || anchoTomar <= 0 || cantidadPano <= 0 || precioUnitarioPano <= 0}
            >
              Agregar Paño a la Cotización
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de selección de materiales */}
        <Dialog 
          open={modalMaterialesOpen} 
          onClose={() => setModalMaterialesOpen(false)}
          maxWidth="xl"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center">
              <CategoryIcon sx={{ mr: 1 }} />
              <Typography variant="h6">
                Seleccionar Material para Cotización
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
                      <InputLabel>Subgrupo</InputLabel>
                      <Select
                        value={filtrosMateriales.subgrupo}
                        onChange={handleSubgrupoChange}
                        label="Subgrupo"
                      >
                        <MenuItem value="">Todos los subgrupos</MenuItem>
                        {subgrupos.map(sub => (
                          <MenuItem key={sub} value={sub}>{sub}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Categoría</InputLabel>
                      <Select
                        value={filtrosMateriales.categoria}
                        onChange={handleFiltroMaterialesChange('categoria')}
                        label="Categoría"
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
                      label="Buscar"
                      value={filtrosMateriales.busqueda}
                      onChange={handleFiltroMaterialesChange('busqueda')}
                      placeholder="ID, descripción, marca..."
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Box display="flex" gap={1}>
                      <Button
                        variant="contained"
                        startIcon={<SearchIcon />}
                        onClick={handleBuscarMateriales}
                        disabled={materialesLoading}
                        size="small"
                      >
                        {materialesLoading ? <CircularProgress size={20} /> : 'Buscar'}
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<ClearIcon />}
                        onClick={handleLimpiarFiltrosMateriales}
                        size="small"
                      >
                        Limpiar
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Tabla de materiales */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" mb={2}>
                  Materiales Disponibles ({materialesDisponibles && Array.isArray(materialesDisponibles) ? materialesDisponibles.length : 0} encontrados)
                </Typography>
                
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Seleccionar</strong></TableCell>
                        <TableCell><strong>Descripción</strong></TableCell>
                        <TableCell><strong>Categoría</strong></TableCell>
                        <TableCell><strong>Marca</strong></TableCell>
                        <TableCell><strong>Stock</strong></TableCell>
                        <TableCell><strong>Precio ($)</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {materialesDisponibles && Array.isArray(materialesDisponibles) ? (
                        materialesDisponibles.map((material) => (
                          <TableRow 
                            key={material.id_material_extra} 
                            hover
                            selected={materialSeleccionado?.id_material_extra === material.id_material_extra}
                            onClick={() => setMaterialSeleccionado(material)}
                            sx={{ 
                              cursor: 'pointer',
                              backgroundColor: materialSeleccionado?.id_material_extra === material.id_material_extra 
                                ? 'rgba(59, 130, 246, 0.08)' 
                                : 'transparent',
                              border: materialSeleccionado?.id_material_extra === material.id_material_extra 
                                ? '2px solid #3b82f6' 
                                : 'none',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                backgroundColor: materialSeleccionado?.id_material_extra === material.id_material_extra 
                                  ? 'rgba(59, 130, 246, 0.12)' 
                                  : 'rgba(59, 130, 246, 0.04)',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 8px rgba(59, 130, 246, 0.15)',
                              },
                              '&:hover .MuiTableCell-root': {
                                backgroundColor: 'rgba(59, 130, 246, 0.04)',
                                transition: 'background-color 0.2s ease',
                              }
                            }}
                          >
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              <Button
                                size="small"
                                variant={materialSeleccionado?.id_material_extra === material.id_material_extra ? "contained" : "outlined"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMaterialSeleccionado(material);
                                }}
                                sx={{
                                  backgroundColor: materialSeleccionado?.id_material_extra === material.id_material_extra 
                                    ? '#3b82f6' 
                                    : 'transparent',
                                  color: materialSeleccionado?.id_material_extra === material.id_material_extra 
                                    ? 'white' 
                                    : '#3b82f6',
                                  borderColor: '#3b82f6',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    backgroundColor: materialSeleccionado?.id_material_extra === material.id_material_extra 
                                      ? '#2563eb' 
                                      : 'rgba(59, 130, 246, 0.08)',
                                    transform: 'scale(1.02)',
                                  }
                                }}
                              >
                                {materialSeleccionado?.id_material_extra === material.id_material_extra ? "✓ Seleccionado" : "Seleccionar"}
                              </Button>
                            </TableCell>
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              <Typography variant="body2" fontWeight="medium">
                                {material.descripcion || material.id_material_extra}
                              </Typography>
                            </TableCell>
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              <Chip 
                                label={material.categoria} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              <Typography variant="body2">
                                {material.marca || 'S/M'}
                              </Typography>
                            </TableCell>
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              <Chip 
                                label={material.cantidad_disponible || 0}
                                size="small" 
                                color={(material.cantidad_disponible || 0) < 10 ? 'error' : 'success'}
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                }
                              }}
                            >
                              <Typography variant="body2" fontWeight="medium">
                                ${material.precio_x_unidad || 0}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            <Typography color="text.secondary">
                              {materialesLoading ? 'Cargando materiales...' : 'No hay materiales disponibles'}
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
            {materialSeleccionado && (
              <Card>
                <CardContent>
                  <Typography variant="h6" mb={2}>
                    Especificaciones del Material Seleccionado
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Cantidad"
                        value={cantidadMaterial}
                        onChange={(e) => setCantidadMaterial(parseInt(e.target.value) || 1)}
                        inputProps={{ min: 1 }}
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="number"
                        label="Precio Unitario ($)"
                        value={precioUnitarioMaterial}
                        onChange={(e) => setPrecioUnitarioMaterial(parseFloat(e.target.value) || 0)}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Mensaje de error de stock */}
            {errorStockMaterial && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {errorStockMaterial}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalMaterialesOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleAgregarMaterial}
              variant="contained"
              disabled={!materialSeleccionado || cantidadMaterial <= 0 || precioUnitarioMaterial <= 0}
            >
              Agregar Material
            </Button>
          </DialogActions>
        </Dialog>

        {/* Modal de producto personalizado */}
        <Dialog 
          open={modalProductoPersonalizadoOpen} 
          onClose={() => setModalProductoPersonalizadoOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" alignItems="center">
              <AddIcon sx={{ mr: 1 }} />
              <Typography variant="h6">
                Agregar Producto/Servicio Personalizado
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Tipo de Producto/Servicio"
                  value={tipoProducto}
                  onChange={(e) => setTipoProducto(e.target.value)}
                  placeholder="Ej: Instalación, Servicio de corte, Mantenimiento, etc."
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descripción del Producto/Servicio"
                  value={descripcionProducto}
                  onChange={(e) => setDescripcionProducto(e.target.value)}
                  placeholder="Descripción detallada del producto o servicio..."
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Cantidad"
                  value={cantidadProducto}
                  onChange={(e) => setCantidadProducto(parseInt(e.target.value) || 1)}
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Precio Unitario ($)"
                  value={precioUnitarioProducto}
                  onChange={(e) => setPrecioUnitarioProducto(parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalProductoPersonalizadoOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleAgregarProductoPersonalizado}
              variant="contained"
              disabled={!descripcionProducto || cantidadProducto <= 0 || precioUnitarioProducto <= 0}
            >
              Agregar Producto
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

// ===== SECCIÓN 3: CONDICIONES =====
export const SeccionCondiciones = ({ cotizacion, onUpdate }) => {
  const dispatch = useDispatch();

  // Validación de props
  if (!cotizacion) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Condiciones de Pago y Envío
          </Typography>
          <Typography color="text.secondary">
            Cargando información...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const handleChange = (field, value) => {
    const updatedData = { [field]: value };
    dispatch(updateCurrentCotizacion(updatedData));
    if (onUpdate) onUpdate(updatedData);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Condiciones de Pago y Envío
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Condiciones de Pago"
              value={cotizacion.condiciones_pago || ''}
              onChange={(e) => handleChange('condiciones_pago', e.target.value)}
              placeholder="Ej: 50% al firmar contrato, 50% al entregar materiales..."
              helperText="Especifica las condiciones de pago para este proyecto"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Condiciones de Envío"
              value={cotizacion.condiciones_envio || ''}
              onChange={(e) => handleChange('condiciones_envio', e.target.value)}
              placeholder="Ej: Flete incluido hasta CDMX, adicional para otros estados..."
              helperText="Especifica las condiciones de envío y entrega"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// ===== SECCIÓN 4: INFORMACIÓN ADICIONAL =====
export const SeccionAdicional = ({ cotizacion, onUpdate }) => {
  const dispatch = useDispatch();

  // Validación de props
  if (!cotizacion) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Información Adicional (Opcional)
          </Typography>
          <Typography color="text.secondary">
            Cargando información...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const handleChange = (field, value) => {
    const updatedData = { [field]: value };
    dispatch(updateCurrentCotizacion(updatedData));
    if (onUpdate) onUpdate(updatedData);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Información Adicional (Opcional)
        </Typography>
        
        <Grid container spacing={3}>
          {/* Garantía */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={cotizacion.incluye_garantia || false}
                  onChange={(e) => handleChange('incluye_garantia', e.target.checked)}
                />
              }
              label="Incluir Texto de Garantía"
            />
            {cotizacion.incluye_garantia && (
              <Alert severity="info" sx={{ mt: 1 }}>
                Se incluirá automáticamente el texto estándar de garantía de Sercodam.
              </Alert>
            )}
          </Grid>

          {/* Instalación */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={cotizacion.incluye_instalacion_seccion || false}
                  onChange={(e) => handleChange('incluye_instalacion_seccion', e.target.checked)}
                />
              }
              label="Incluir Sección de Instalación"
            />
          </Grid>

          {/* Campos de instalación cuando está habilitada */}
          {cotizacion.incluye_instalacion_seccion && (
            <>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Ingresa lo que incluye la instalación"
                  value={cotizacion.instalacion_incluye || ''}
                  onChange={(e) => handleChange('instalacion_incluye', e.target.value)}
                  placeholder="Ejemplo: Mano de obra certificada, herramientas, materiales de fijación, traslado..."
                  helperText="Detalla todos los conceptos incluidos en el servicio de instalación"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Ingresa lo que NO incluye la instalación"
                  value={cotizacion.instalacion_no_incluye || ''}
                  onChange={(e) => handleChange('instalacion_no_incluye', e.target.value)}
                  placeholder="Ejemplo: Grúas especiales, permisos municipales, trabajos en horarios nocturnos..."
                  helperText="Especifica las exclusiones del servicio de instalación"
                />
              </Grid>
            </>
          )}

          {/* Observaciones */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Observaciones"
              value={cotizacion.observaciones || ''}
              onChange={(e) => handleChange('observaciones', e.target.value)}
              placeholder="Observaciones adicionales sobre el proyecto..."
            />
          </Grid>

          {/* No Incluye */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="No Incluye"
              value={cotizacion.no_incluye || ''}
              onChange={(e) => handleChange('no_incluye', e.target.value)}
              placeholder="Especifica qué no está incluido en la cotización..."
            />
          </Grid>

          {/* Notas */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Notas"
              value={cotizacion.notas || ''}
              onChange={(e) => handleChange('notas', e.target.value)}
              placeholder="Notas adicionales..."
            />
          </Grid>

          {/* Conceptos Extra Dinámicos */}
          <Grid item xs={12}>
            <ConceptosExtraSection 
              conceptos={cotizacion.conceptos_extra_list || []}
              onChange={(conceptos) => handleChange('conceptos_extra_list', conceptos)}
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// ===== SECCIÓN 5: CLÁUSULA PERSONALIZADA =====
export const SeccionClausula = ({ cotizacion, onUpdate }) => {
  const dispatch = useDispatch();

  // Validación de props
  if (!cotizacion) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Cláusula Personalizada (Opcional)
          </Typography>
          <Typography color="text.secondary">
            Cargando información...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const handleChange = (field, value) => {
    const updatedData = { [field]: value };
    dispatch(updateCurrentCotizacion(updatedData));
    if (onUpdate) onUpdate(updatedData);
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Cláusula Personalizada (Opcional)
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Título de la Cláusula"
              value={cotizacion.titulo_clausula_personalizada || ''}
              onChange={(e) => handleChange('titulo_clausula_personalizada', e.target.value)}
              placeholder="Ej: Condiciones Especiales, Requisitos Técnicos..."
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Descripción de la Cláusula"
              value={cotizacion.descripcion_clausula_personalizada || ''}
              onChange={(e) => handleChange('descripcion_clausula_personalizada', e.target.value)}
              placeholder="Describe la cláusula personalizada..."
              helperText="Esta cláusula aparecerá al final de la cotización con el título especificado"
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}; 