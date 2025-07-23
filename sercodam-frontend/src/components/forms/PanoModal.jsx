import React, { useState, useEffect } from 'react';
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
  Divider
} from '@mui/material';
import { panosApi } from '../../services/api';

const PanoModal = ({ open, onClose, pano = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    tipo_red: '',
    largo_m: '',
    ancho_m: '',
    estado: '',
    ubicacion: 'Bodega CDMX',
    precio_x_unidad: '',
    descripcion: '',
    calibre: '',
    cuadro: '',
    torsion: '',
    refuerzo: '',
    color: '',
    presentacion: '',
    grosor: '',
    color_tipo_red: '',
    stock_minimo: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Catálogos completos
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

  const tiposValidos = ['lona', 'nylon', 'polipropileno', 'malla sombra'];
  const estadosValidos = ['bueno', 'regular', 'malo', '50%'];
  const ubicacionesValidas = ['Bodega CDMX', 'Querétaro', 'Oficina', 'Instalación'];

  const isEditing = !!pano;

  // Calcular área automáticamente
  const areaCalculada = formData.largo_m && formData.ancho_m 
    ? (parseFloat(formData.largo_m) * parseFloat(formData.ancho_m)).toFixed(2)
    : '';

  // Cargar catálogos cuando se selecciona el tipo
  useEffect(() => {
    if (formData.tipo_red === 'nylon') {
      loadNylonCatalogos();
    } else if (formData.tipo_red === 'polipropileno') {
      loadPolipropilenoCatalogos();
    } else if (formData.tipo_red === 'lona') {
      loadLonaCatalogos();
    } else if (formData.tipo_red === 'malla sombra') {
      loadMallaSombraCatalogos();
    }
  }, [formData.tipo_red]);

  // Filtrar opciones cuando cambian las selecciones
  useEffect(() => {
    if (formData.tipo_red === 'nylon') {
      filterNylonOptions();
    } else if (formData.tipo_red === 'polipropileno') {
      filterPolipropilenoOptions();
    } else if (formData.tipo_red === 'lona') {
      filterLonaOptions();
    } else if (formData.tipo_red === 'malla sombra') {
      filterMallaSombraOptions();
    }
  }, [formData.tipo_red, formData.calibre, formData.grosor, formData.color, formData.color_tipo_red, catalogData]);

  const loadNylonCatalogos = async () => {
    try {
      const response = await panosApi.getNylonCatalogos();
      setNylonCatalogos(response.data.data);
      
      // Cargar datos completos para filtrar
      const fullDataResponse = await panosApi.getNylonFullData();
      console.log('🔍 Datos completos de nylon cargados:', fullDataResponse.data.data);
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
    if (!formData.calibre) {
      setFilteredOptions(prev => ({ ...prev, cuadros: [], torsiones: [] }));
      return;
    }

    console.log('🔍 Filtrando nylon - calibre seleccionado:', formData.calibre);
    console.log('🔍 Datos de nylon disponibles:', catalogData.nylon);
    
    const filtered = catalogData.nylon.filter(item => item.calibre === formData.calibre);
    console.log('🔍 Elementos filtrados por calibre:', filtered);
    
    const cuadros = [...new Set(filtered.map(item => item.cuadro))].filter(Boolean);
    const torsiones = [...new Set(filtered.map(item => item.torsion))].filter(Boolean);
    
    console.log('🔍 Cuadros disponibles:', cuadros);
    console.log('🔍 Torsiones disponibles:', torsiones);

    setFilteredOptions(prev => ({ ...prev, cuadros, torsiones }));
  };

  const filterPolipropilenoOptions = () => {
    if (!formData.grosor) {
      setFilteredOptions(prev => ({ ...prev, cuadros: [] }));
      return;
    }

    const filtered = catalogData.polipropileno.filter(item => item.grosor === formData.grosor);
    const cuadros = [...new Set(filtered.map(item => item.cuadro))].filter(Boolean);

    setFilteredOptions(prev => ({ ...prev, cuadros }));
  };

  const filterLonaOptions = () => {
    if (!formData.color) {
      setFilteredOptions(prev => ({ ...prev, presentaciones: [] }));
      return;
    }

    const filtered = catalogData.lona.filter(item => item.color === formData.color);
    const presentaciones = [...new Set(filtered.map(item => item.presentacion))].filter(Boolean);

    setFilteredOptions(prev => ({ ...prev, presentaciones }));
  };

  const filterMallaSombraOptions = () => {
    if (!formData.color_tipo_red) {
      setFilteredOptions(prev => ({ ...prev, presentaciones: [] }));
      return;
    }

    const filtered = catalogData.mallaSombra.filter(item => item.color_tipo_red === formData.color_tipo_red);
    const presentaciones = [...new Set(filtered.map(item => item.presentacion))].filter(Boolean);

    setFilteredOptions(prev => ({ ...prev, presentaciones }));
  };

  // Limpiar campos dependientes cuando cambia la selección principal
  const handlePrimaryChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => {
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

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  // Obtener el id_mcr basado en las selecciones
  const getSelectedIdMcr = () => {
    if (!formData.tipo_red) return null;

    let catalogItems = [];
    let searchCriteria = {};

    switch (formData.tipo_red) {
      case 'nylon':
        catalogItems = catalogData.nylon;
        searchCriteria = {
          calibre: formData.calibre,
          cuadro: formData.cuadro,
          torsion: formData.torsion,
          refuerzo: formData.refuerzo === 'Sí'
        };
        break;
      case 'polipropileno':
        catalogItems = catalogData.polipropileno;
        searchCriteria = {
          grosor: formData.grosor,
          cuadro: formData.cuadro
        };
        break;
      case 'lona':
        catalogItems = catalogData.lona;
        searchCriteria = {
          color: formData.color,
          presentacion: formData.presentacion
        };
        break;
      case 'malla sombra':
        catalogItems = catalogData.mallaSombra;
        searchCriteria = {
          color_tipo_red: formData.color_tipo_red,
          presentacion: formData.presentacion
        };
        break;
    }

    // Filtrar por criterios no vacíos
    const validCriteria = Object.fromEntries(
      Object.entries(searchCriteria).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
    );

    const matchingItem = catalogItems.find(item => 
      Object.entries(validCriteria).every(([key, value]) => item[key] === value)
    );

    return matchingItem?.id_mcr || null;
  };

  useEffect(() => {
    if (pano) {
      setFormData({
        tipo_red: pano.tipo_red || '',
        largo_m: pano.largo_m || '',
        ancho_m: pano.ancho_m || '',
        estado: pano.estado || '',
        ubicacion: pano.ubicacion || '',
        precio_x_unidad: pano.precio_x_unidad || '',
        descripcion: pano.descripcion || '',
        calibre: pano.calibre || '',
        cuadro: pano.cuadro || '',
        torsion: pano.torsion || '',
        refuerzo: pano.refuerzo ? 'Sí' : 'No',
        color: pano.color || '',
        presentacion: pano.presentacion || '',
        grosor: pano.grosor || '',
        color_tipo_red: pano.color_tipo_red || '',
        stock_minimo: pano.stock_minimo || ''
      });
    } else {
      setFormData({
        tipo_red: '',
        largo_m: '',
        ancho_m: '',
        estado: '',
        ubicacion: 'Bodega CDMX',
        precio_x_unidad: '',
        descripcion: '',
        calibre: '',
        cuadro: '',
        torsion: '',
        refuerzo: '',
        color: '',
        presentacion: '',
        grosor: '',
        color_tipo_red: '',
        stock_minimo: ''
      });
    }
    setError('');
  }, [pano, open]);

  const validateForm = () => {
    if (!formData.tipo_red) {
      setError('El tipo de red es requerido');
      return false;
    }
    if (!formData.largo_m || parseFloat(formData.largo_m) <= 0) {
      setError('El largo debe ser mayor a 0');
      return false;
    }
    if (!formData.ancho_m || parseFloat(formData.ancho_m) <= 0) {
      setError('El ancho debe ser mayor a 0');
      return false;
    }
    
    // Validar que el largo sea mayor que el ancho
    const largo = parseFloat(formData.largo_m);
    const ancho = parseFloat(formData.ancho_m);
    if (largo <= ancho) {
      setError('El largo debe ser mayor que el ancho. Por convención del sistema, el largo representa la dimensión más grande del paño.');
      return false;
    }
    
    if (!formData.estado) {
      setError('El estado es requerido');
      return false;
    }
    if (!formData.ubicacion) {
      setError('La ubicación es requerida');
      return false;
    }

    // Validar que se seleccionó una combinación válida
    const selectedIdMcr = getSelectedIdMcr();
    if (!selectedIdMcr) {
      setError('Debe seleccionar una combinación válida de especificaciones');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    if (formData.precio_x_unidad === '' || formData.precio_x_unidad === null) {
      setLoading(false);
      setError('Debes ingresar un precio por unidad');
      return;
    }

    try {
      const selectedIdMcr = getSelectedIdMcr();
      
      const submitData = {
        id_mcr: selectedIdMcr, // Usar el id_mcr del catálogo
        largo_m: parseFloat(formData.largo_m),
        ancho_m: parseFloat(formData.ancho_m),
        estado: formData.estado,
        ubicacion: formData.ubicacion,
        precio_x_unidad: parseFloat(formData.precio_x_unidad || 0),
        stock_minimo: parseFloat(formData.stock_minimo || 0)
      };

      console.log('🔍 Datos que se van a enviar:', submitData);
      console.log('🔍 ID del paño a editar:', pano?.id_item);

      if (isEditing) {
        await panosApi.updatePano(pano.id_item, submitData);
      } else {
        await panosApi.createPano(submitData);
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const errorMessages = error.response.data.errors.map(err => err.message || err).join(', ');
        setError(`Errores de validación: ${errorMessages}`);
      } else {
        setError(error.response?.data?.message || 'Error al guardar el paño');
      }
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'bueno': return 'success';
      case 'regular': return 'warning';
      case 'malo': return 'error';
      case '50%': return 'info';
      default: return 'default';
    }
  };

  const renderSpecificFields = () => {
    switch (formData.tipo_red) {
      case 'nylon':
        return (
          <>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Calibre *</InputLabel>
                <Select
                  value={formData.calibre}
                  onChange={handlePrimaryChange('calibre')}
                  label="Calibre *"
                  required
                >
                  <MenuItem value="">
                    <em>Seleccione un calibre...</em>
                  </MenuItem>
                  {nylonCatalogos.calibres.map(calibre => (
                    <MenuItem key={calibre} value={calibre}>
                      {calibre}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!formData.calibre}>
                <InputLabel>Cuadro *</InputLabel>
                <Select
                  value={formData.cuadro}
                  onChange={handleChange('cuadro')}
                  label="Cuadro *"
                  required
                >
                  <MenuItem value="">
                    <em>Seleccione un cuadro...</em>
                  </MenuItem>
                  {filteredOptions.cuadros.map(cuadro => (
                    <MenuItem key={cuadro} value={cuadro}>
                      {cuadro}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!formData.calibre}>
                <InputLabel>Torsión *</InputLabel>
                <Select
                  value={formData.torsion}
                  onChange={handleChange('torsion')}
                  label="Torsión *"
                  required
                >
                  <MenuItem value="">
                    <em>Seleccione una torsión...</em>
                  </MenuItem>
                  {filteredOptions.torsiones.map(torsion => (
                    <MenuItem key={torsion} value={torsion}>
                      {torsion}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth disabled={!formData.calibre}>
                <InputLabel>Refuerzo *</InputLabel>
                <Select
                  value={formData.refuerzo}
                  onChange={handleChange('refuerzo')}
                  label="Refuerzo *"
                  required
                >
                  <MenuItem value="">
                    <em>Seleccione...</em>
                  </MenuItem>
                  <MenuItem value="Sí">Sí</MenuItem>
                  <MenuItem value="No">No</MenuItem>
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
                <InputLabel>Color *</InputLabel>
                <Select
                  value={formData.color}
                  onChange={handlePrimaryChange('color')}
                  label="Color *"
                  required
                >
                  <MenuItem value="">
                    <em>Seleccione un color...</em>
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
              <FormControl fullWidth disabled={!formData.color}>
                <InputLabel>Presentación *</InputLabel>
                <Select
                  value={formData.presentacion}
                  onChange={handleChange('presentacion')}
                  label="Presentación *"
                  required
                >
                  <MenuItem value="">
                    <em>Seleccione una presentación...</em>
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
                <InputLabel>Grosor *</InputLabel>
                <Select
                  value={formData.grosor}
                  onChange={handlePrimaryChange('grosor')}
                  label="Grosor *"
                  required
                >
                  <MenuItem value="">
                    <em>Seleccione un grosor...</em>
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
              <FormControl fullWidth disabled={!formData.grosor}>
                <InputLabel>Cuadro *</InputLabel>
                <Select
                  value={formData.cuadro}
                  onChange={handleChange('cuadro')}
                  label="Cuadro *"
                  required
                >
                  <MenuItem value="">
                    <em>Seleccione un cuadro...</em>
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
                <InputLabel>Color y Tipo de Red *</InputLabel>
                <Select
                  value={formData.color_tipo_red}
                  onChange={handlePrimaryChange('color_tipo_red')}
                  label="Color y Tipo de Red *"
                  required
                >
                  <MenuItem value="">
                    <em>Seleccione color y tipo...</em>
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
              <FormControl fullWidth disabled={!formData.color_tipo_red}>
                <InputLabel>Presentación *</InputLabel>
                <Select
                  value={formData.presentacion}
                  onChange={handleChange('presentacion')}
                  label="Presentación *"
                  required
                >
                  <MenuItem value="">
                    <em>Seleccione una presentación...</em>
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? 'Editar Paño' : 'Crear Nuevo Paño'}
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Tipo de Red */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Red *</InputLabel>
              <Select
                value={formData.tipo_red}
                onChange={handleChange('tipo_red')}
                label="Tipo de Red *"
                required
              >
                <MenuItem value="">
                  <em>Seleccione un tipo...</em>
                </MenuItem>
                {tiposValidos.map(tipo => (
                  <MenuItem key={tipo} value={tipo}>
                    {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Campos específicos según el tipo de red */}
          {renderSpecificFields()}

          <Divider sx={{ width: '100%', my: 2 }} />

          {/* Dimensiones */}
          <Grid item xs={12}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Convención de dimensiones:</strong> El largo debe ser mayor que el ancho. 
                El largo representa la dimensión más grande del paño (altura), mientras que el ancho 
                representa la dimensión menor (anchura).
              </Typography>
            </Alert>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Largo (metros) *"
              type="number"
              value={formData.largo_m}
              onChange={handleChange('largo_m')}
              inputProps={{ min: 0, step: 0.001 }}
              required
              helperText="Dimensión más grande del paño"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Ancho (metros) *"
              type="number"
              value={formData.ancho_m}
              onChange={handleChange('ancho_m')}
              inputProps={{ min: 0, step: 0.001 }}
              required
              helperText="Dimensión menor del paño"
            />
          </Grid>

          {/* Área calculada */}
          {areaCalculada && (
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Área calculada: <strong>{areaCalculada} m²</strong>
                </Typography>
              </Box>
            </Grid>
          )}

          {/* Estado */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Estado *</InputLabel>
              <Select
                value={formData.estado}
                onChange={handleChange('estado')}
                label="Estado *"
                required
              >
                <MenuItem value="">
                  <em>Seleccione un estado...</em>
                </MenuItem>
                {estadosValidos.map(estado => (
                  <MenuItem key={estado} value={estado}>
                    <Chip 
                      label={estado} 
                      color={getEstadoColor(estado)} 
                      size="small" 
                      sx={{ mr: 1 }}
                    />
                    {estado}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Ubicación */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Ubicación *</InputLabel>
              <Select
                value={formData.ubicacion}
                onChange={handleChange('ubicacion')}
                label="Ubicación *"
                required
              >
                <MenuItem value="">
                  <em>Seleccione una ubicación...</em>
                </MenuItem>
                {ubicacionesValidas.map(ubicacion => (
                  <MenuItem key={ubicacion} value={ubicacion}>
                    {ubicacion}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Precio por unidad */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Precio por unidad ($) *"
              type="number"
              value={formData.precio_x_unidad}
              onChange={handleChange('precio_x_unidad')}
              inputProps={{ min: 0, step: 0.01 }}
              required
            />
          </Grid>

          {/* Stock mínimo */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Stock mínimo"
              type="number"
              value={formData.stock_minimo}
              onChange={handleChange('stock_minimo')}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Cantidad mínima antes de alerta"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PanoModal; 