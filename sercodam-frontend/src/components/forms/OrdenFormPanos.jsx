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
  Info as InfoIcon,
  ContentCut as ScissorsIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPanos } from '../../store/slices/panosSlice';
import { panosApi } from '../../services/api';
import CortesIndividualesModal from './CortesIndividualesModal';

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
  const [datosInicialsCargados, setDatosInicialesCargados] = useState(false);
  
  // Estados para cortes individuales
  const [modalCortesIndividualesOpen, setModalCortesIndividualesOpen] = useState(false);
  const [panoParaCortesIndividuales, setPanoParaCortesIndividuales] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
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

  const tiposRed = ['nylon', 'lona', 'polipropileno', 'malla sombra'];
  const estados = ['bueno', 'regular', 'malo', 'usado 50%'];
  const ubicaciones = ['Bodega CDMX', 'Querétaro', 'Oficina', 'Instalación'];

  // Cargar datos iniciales cuando se monta el componente (SOLO UNA VEZ, SIN FILTROS)
  useEffect(() => {
    if (!datosInicialsCargados && !loadingRedux) {
      console.log('🔍 Cargando datos iniciales sin filtros...');
      loadDatosIniciales();
    }
  }, [datosInicialsCargados, loadingRedux]);

  // Procesar datos de Redux y aplicar filtros
  useEffect(() => {
    if (panosRedux && panosRedux.length > 0) {
      let panosFiltrados = [...panosRedux];
      
      // Filtrar solo paños disponibles para nuevas órdenes (estado_trabajo = 'Libre')
      panosFiltrados = panosFiltrados.filter(p => 
        p.estado_trabajo === 'Libre' || p.estado_trabajo === null || p.estado_trabajo === undefined
      );
      
      console.log(`📊 Paños procesados: ${panosFiltrados.length} disponibles de ${panosRedux.length} totales`);
      
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
      
      console.log(`✅ ${panosFiltrados.length} paños listos para mostrar`);
      setPanos(panosFiltrados);
    } else {
      // Si no hay datos de Redux, mostrar array vacío
      setPanos([]);
      if (panosRedux?.length === 0) {
        console.log('📭 No se encontraron paños con los filtros aplicados');
      }
    }
  }, [panosRedux, filtros]);

  // Cargar catálogos cuando se selecciona un tipo de red en los filtros
  useEffect(() => {
    if (filtros.tipo_red) {
      const tipoRed = filtros.tipo_red.toLowerCase();
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
  }, [filtros.tipo_red]);

  // Filtrar opciones cuando cambian las especificaciones
  useEffect(() => {
    if (filtros.tipo_red) {
      const tipoRed = filtros.tipo_red.toLowerCase();
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
  }, [filtrosEspecificaciones, catalogData]);

  // Limpiar especificaciones cuando se cierra el modal
  useEffect(() => {
    if (!modalOpen) {
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
  }, [modalOpen]);

  // Función para guardar draft cuando cambian los paños
  const saveDraftOnChange = (newPanosSeleccionados) => {
    if (onDraftSave) {
      onDraftSave(newPanosSeleccionados);
    }
  };

  // Función para cargar datos iniciales SIN filtros (solo una vez)
  const loadDatosIniciales = async () => {
    try {
      console.log('🔍 Cargando TODOS los paños sin filtros...');
      const params = { limit: 1000 }; // Sin filtros, traer todos los paños
      
      await dispatch(fetchPanos(params));
      setDatosInicialesCargados(true);
      
      console.log('✅ Datos iniciales cargados correctamente');
    } catch (error) {
      console.error('❌ Error cargando datos iniciales:', error);
    }
  };

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

  // Función para renderizar filtros de especificaciones por tipo de red
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

  // Función para aplicar filtros (solo cuando el usuario busca)
  const loadPanos = async () => {
    try {
      console.log('🔍 Aplicando filtros:', filtros);
      const params = { limit: 1000 }; // Sin paginación, traer todos
      
      // Aplicar filtros SOLO si hay filtros activos
      if (filtros.tipo_red) params.tipo_red = filtros.tipo_red;
      if (filtros.estado) params.estado = filtros.estado;
      if (filtros.ubicacion) params.ubicacion = filtros.ubicacion;
      if (filtros.busqueda) params.search = filtros.busqueda;
      
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
      
      // Usar Redux para cargar los paños filtrados
      await dispatch(fetchPanos(params));
      
      console.log('✅ Filtros aplicados correctamente');
    } catch (error) {
      console.error('❌ Error aplicando filtros:', error);
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
    loadDatosIniciales();
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
          umbral_sobrante_m2: umbralSobrante, // Include threshold
          modo_corte: 'simple' // Agregar modo_corte para cortes simples
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

  // Funciones para cortes individuales
  const handleAbrirCortesIndividuales = (pano) => {
    setPanoParaCortesIndividuales(pano);
    setModalCortesIndividualesOpen(true);
  };

  const handleConfirmarCortesIndividuales = (datosCortes) => {
    const { cortesIndividuales, areaTotal, dimensionesRecomendadas, numeroCortes } = datosCortes;
    
    // Calcular área real basada en las dimensiones a tomar
    const areaReal = dimensionesRecomendadas.largo * dimensionesRecomendadas.ancho;
    
    // Crear el paño con información de cortes individuales
    const panoConCortes = {
      ...panoParaCortesIndividuales,
      largo_tomar: dimensionesRecomendadas.largo,
      ancho_tomar: dimensionesRecomendadas.ancho,
      cantidad: numeroCortes,
      area_tomar: areaReal, // Usar área real en lugar de areaTotal
      umbral_sobrante_m2: umbralSobrante,
      cortes_individuales: cortesIndividuales,
      modo_corte: 'individuales'
    };

    const newPanosSeleccionados = [...panosSeleccionados, panoConCortes];
    setPanosSeleccionados(newPanosSeleccionados);
    saveDraftOnChange(newPanosSeleccionados);
    
    // Cerrar modales y mostrar mensaje de éxito
    setModalCortesIndividualesOpen(false);
    setModalOpen(false);
    setPanoParaCortesIndividuales(null);
    setSuccessMessage(`✅ Paño agregado con ${numeroCortes} cortes individuales`);
    
    // Limpiar mensaje después de 3 segundos
    setTimeout(() => setSuccessMessage(''), 3000);
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

  const getEstadoTrabajoColor = (estadoTrabajo) => {
    switch (estadoTrabajo?.toLowerCase()) {
      case 'libre': return 'success';
      case 'reservado': return 'warning'; 
      case 'en progreso': return 'info';
      case 'consumido': return 'error';
      default: return 'success'; // Default to success for null/undefined (treated as Libre)
    }
  };

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

  // Calcular estadísticas
  const panosArray = Array.isArray(panosSeleccionados) ? panosSeleccionados : [];
  const totalArea = panosArray.reduce((sum, p) => {
    // Calcular área real: largo_tomar * ancho_tomar
    const areaPano = (Number(p.largo_tomar) || 0) * (Number(p.ancho_tomar) || 0);
    return sum + areaPano;
  }, 0);
  const totalPiezas = panosArray.length;
  const tiposUnicos = [...new Set(panosArray.map(p => p.tipo_red))];

  return (
    <Grid container spacing={3}>
      {/* Mensaje de éxito */}
      {successMessage && (
        <Grid item xs={12}>
          <Alert severity="success" onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        </Grid>
      )}
      
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
                      <TableCell><strong>Piezas</strong></TableCell>
                      <TableCell><strong>Umbral Remanente (m²)</strong></TableCell>
                      <TableCell><strong>Modo de Corte</strong></TableCell>
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
                            {((Number(p.largo_tomar) || 0) * (Number(p.ancho_tomar) || 0)).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium" color="info.main">
                            {p.modo_corte === 'individuales' && p.cortes_individuales 
                              ? p.cortes_individuales.length 
                              : (Number(p.cantidad) || 1)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="secondary">
                            {p.umbral_sobrante_m2 !== undefined ? Number(p.umbral_sobrante_m2).toFixed(2) : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={p.modo_corte === 'individuales' ? 'Cortes Individuales' : 'Corte Simple'} 
                            size="small" 
                            color={p.modo_corte === 'individuales' ? 'info' : 'default'}
                            variant="outlined"
                          />
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
                            {panoSeleccionado?.id_item === pano.id_item ? '✓ Seleccionado' : 'Seleccionar'}
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
                          <Typography variant="body2" fontWeight="medium">
                            {(Number(pano.area_m2) || 0).toFixed(2)}
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
                          <Chip 
                            label={pano.estado_trabajo || 'Libre'} 
                            size="small" 
                            color={getEstadoTrabajoColor(pano.estado_trabajo)}
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
                        <Grid item xs={12} md={8}>
                          <Button
                            variant="outlined"
                            startIcon={<ScissorsIcon />}
                            onClick={() => handleAbrirCortesIndividuales(panoSeleccionado)}
                            size="small"
                            fullWidth
                            sx={{ mt: 1 }}
                          >
                            Especificar Cortes Individuales
                          </Button>
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

      {/* Modal de cortes individuales */}
      <CortesIndividualesModal
        open={modalCortesIndividualesOpen}
        onClose={() => setModalCortesIndividualesOpen(false)}
        panoSeleccionado={panoParaCortesIndividuales}
        onConfirm={handleConfirmarCortesIndividuales}
        umbralSobrante={umbralSobrante}
        setUmbralSobrante={setUmbralSobrante}
      />
    </Grid>
  );
};

export default OrdenFormPanos; 