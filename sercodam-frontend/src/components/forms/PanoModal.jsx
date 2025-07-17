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

  const tiposValidos = ['lona', 'nylon', 'polipropileno', 'malla sombra'];
  const estadosValidos = ['bueno', 'regular', 'malo', '50%'];
  const ubicacionesValidas = ['Bodega CDMX', 'Querétaro', 'Oficina', 'Instalación'];

  const isEditing = !!pano;

  // Calcular área automáticamente
  const areaCalculada = formData.largo_m && formData.ancho_m 
    ? (parseFloat(formData.largo_m) * parseFloat(formData.ancho_m)).toFixed(2)
    : '';

  // Cargar catálogos de nylon cuando se selecciona el tipo
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

  const loadNylonCatalogos = async () => {
    try {
      const response = await panosApi.getNylonCatalogos();
      setNylonCatalogos(response.data.data);
    } catch (error) {
      console.error('Error cargando catálogos de nylon:', error);
    }
  };

  const loadPolipropilenoCatalogos = async () => {
    try {
      const response = await panosApi.getPolipropilenoCatalogos();
      setPolipropilenoCatalogos(response.data.data);
    } catch (error) {
      console.error('Error cargando catálogos de polipropileno:', error);
    }
  };

  const loadLonaCatalogos = async () => {
    try {
      const response = await panosApi.getLonaCatalogos();
      setLonaCatalogos(response.data.data);
    } catch (error) {
      console.error('Error cargando catálogos de lona:', error);
    }
  };

  const loadMallaSombraCatalogos = async () => {
    try {
      const response = await panosApi.getMallaSombraCatalogos();
      setMallaSombraCatalogos(response.data.data);
    } catch (error) {
      console.error('Error cargando catálogos de malla sombra:', error);
    }
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

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

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
    if (!formData.estado) {
      setError('El estado es requerido');
      return false;
    }
    if (!formData.ubicacion) {
      setError('La ubicación es requerida');
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
      const submitData = {
        ...formData,
        largo_m: parseFloat(formData.largo_m),
        ancho_m: parseFloat(formData.ancho_m),
        precio_x_unidad: parseFloat(formData.precio_x_unidad || 0),
        refuerzo: formData.refuerzo === 'Sí'
      };

      // Eliminar stock_minimo si está vacío
      if (submitData.stock_minimo === '' || submitData.stock_minimo === null) {
        delete submitData.stock_minimo;
      }

      if (submitData.precio_x_unidad === '' || submitData.precio_x_unidad === null) {
        delete submitData.precio_x_unidad; // ya validado antes
      }

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
      
      // Mostrar errores específicos si existen
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
    const colors = {
      'bueno': 'success',
      'regular': 'warning',
      'malo': 'error',
      '50%': 'info',
    };
    return colors[estado] || 'default';
  };

  const renderSpecificFields = () => {
    switch (formData.tipo_red) {
      case 'nylon':
        return (
          <>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Calibre</InputLabel>
                <Select
                  value={formData.calibre}
                  onChange={handleChange('calibre')}
                  label="Calibre"
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
              <FormControl fullWidth>
                <InputLabel>Cuadro</InputLabel>
                <Select
                  value={formData.cuadro}
                  onChange={handleChange('cuadro')}
                  label="Cuadro"
                >
                  <MenuItem value="">
                    <em>Seleccione un cuadro...</em>
                  </MenuItem>
                  {nylonCatalogos.cuadros.map(cuadro => (
                    <MenuItem key={cuadro} value={cuadro}>
                      {cuadro}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Torsión</InputLabel>
                <Select
                  value={formData.torsion}
                  onChange={handleChange('torsion')}
                  label="Torsión"
                >
                  <MenuItem value="">
                    <em>Seleccione una torsión...</em>
                  </MenuItem>
                  {nylonCatalogos.torsiones.map(torsion => (
                    <MenuItem key={torsion} value={torsion}>
                      {torsion}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Refuerzo</InputLabel>
                <Select
                  value={formData.refuerzo}
                  onChange={handleChange('refuerzo')}
                  label="Refuerzo"
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
                <InputLabel>Color</InputLabel>
                <Select
                  value={formData.color}
                  onChange={handleChange('color')}
                  label="Color"
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
              <FormControl fullWidth>
                <InputLabel>Presentación</InputLabel>
                <Select
                  value={formData.presentacion}
                  onChange={handleChange('presentacion')}
                  label="Presentación"
                >
                  <MenuItem value="">
                    <em>Seleccione una presentación...</em>
                  </MenuItem>
                  {lonaCatalogos.presentaciones.map(presentacion => (
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
                <InputLabel>Grosor</InputLabel>
                <Select
                  value={formData.grosor}
                  onChange={handleChange('grosor')}
                  label="Grosor"
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
              <FormControl fullWidth>
                <InputLabel>Cuadro</InputLabel>
                <Select
                  value={formData.cuadro}
                  onChange={handleChange('cuadro')}
                  label="Cuadro"
                >
                  <MenuItem value="">
                    <em>Seleccione un cuadro...</em>
                  </MenuItem>
                  {polipropilenoCatalogos.cuadros.map(cuadro => (
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
                <InputLabel>Color y Tipo de Red</InputLabel>
                <Select
                  value={formData.color_tipo_red}
                  onChange={handleChange('color_tipo_red')}
                  label="Color y Tipo de Red"
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
              <FormControl fullWidth>
                <InputLabel>Presentación</InputLabel>
                <Select
                  value={formData.presentacion}
                  onChange={handleChange('presentacion')}
                  label="Presentación"
                >
                  <MenuItem value="">
                    <em>Seleccione una presentación...</em>
                  </MenuItem>
                  {mallaSombraCatalogos.presentaciones.map(presentacion => (
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
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Información Básica
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Tipo de Red</InputLabel>
              <Select
                value={formData.tipo_red}
                onChange={handleChange('tipo_red')}
                label="Tipo de Red"
              >
                {tiposValidos.map(tipo => (
                  <MenuItem key={tipo} value={tipo}>
                    {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Largo (m)"
              type="number"
              value={formData.largo_m}
              onChange={handleChange('largo_m')}
              inputProps={{ min: 0.01, step: 0.01 }}
              helperText="Largo en metros"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              required
              label="Ancho (m)"
              type="number"
              value={formData.ancho_m}
              onChange={handleChange('ancho_m')}
              inputProps={{ min: 0.01, step: 0.01 }}
              helperText="Ancho en metros"
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Área Calculada (m²)"
              type="number"
              value={areaCalculada}
              InputProps={{
                readOnly: true,
              }}
              helperText="Se calcula automáticamente (Largo × Ancho)"
              sx={{
                '& .MuiInputBase-input': {
                  backgroundColor: '#f5f5f5',
                  color: '#666'
                }
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Estado</InputLabel>
              <Select
                value={formData.estado}
                onChange={handleChange('estado')}
                label="Estado"
              >
                {estadosValidos.map(estado => (
                  <MenuItem key={estado} value={estado}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label={estado} 
                        color={getEstadoColor(estado)} 
                        size="small" 
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>Ubicación</InputLabel>
              <Select
                value={formData.ubicacion}
                onChange={handleChange('ubicacion')}
                label="Ubicación"
              >
                {ubicacionesValidas.map(ubicacion => (
                  <MenuItem key={ubicacion} value={ubicacion}>
                    {ubicacion}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Precio por Unidad ($)"
              type="number"
              value={formData.precio_x_unidad}
              onChange={handleChange('precio_x_unidad')}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Precio por metro cuadrado"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Descripción"
              multiline
              rows={2}
              value={formData.descripcion}
              onChange={handleChange('descripcion')}
              placeholder="Descripción adicional del paño..."
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Stock Mínimo (Área m²)"
              type="number"
              inputProps={{ min: 0, step: 'any' }}
              value={formData.stock_minimo}
              onChange={handleChange('stock_minimo')}
              helperText="Área mínima antes de alerta"
            />
          </Grid>

          {formData.tipo_red && (
            <>
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Especificaciones de {formData.tipo_red.charAt(0).toUpperCase() + formData.tipo_red.slice(1)}
                </Typography>
              </Grid>
              {renderSpecificFields()}
            </>
          )}
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