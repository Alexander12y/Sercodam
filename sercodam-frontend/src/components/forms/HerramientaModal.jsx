import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { createHerramienta, updateHerramienta, clearError } from '../../store/slices/herramientasSlice';
import { SUBGRUPOS_CATEGORIAS_HERRAMIENTAS } from '../../constants/herramientasConstants';

// Función para encontrar el subgrupo de una categoría dada
const findSubgrupo = (categoria) => {
  for (const subgrupo in SUBGRUPOS_CATEGORIAS_HERRAMIENTAS) {
    if (SUBGRUPOS_CATEGORIAS_HERRAMIENTAS[subgrupo].includes(categoria)) {
      return subgrupo;
    }
  }
  return '';
};

const HerramientaModal = ({ open, onClose, herramienta, onSuccess }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.herramientas);
  const [formError, setFormError] = useState('');
  
  const [formData, setFormData] = useState({
    id_herramienta: '',
    descripcion: '',
    categoria: '',
    presentacion: '',
    unidad: '',
    cantidad_disponible: '',
    stock_minimo: '',
    marca: '',
    estado_calidad: 'Bueno',
    ubicacion: 'Bodega CDMX',
    precioxunidad: '',
    uso_principal: ''
  });
  const [selectedSubgrupo, setSelectedSubgrupo] = useState('');
  const [availableCategorias, setAvailableCategorias] = useState([]);

  const estadosValidos = ['Bueno', 'Regular', 'Usado 50%', 'Malo'];
  const ubicacionesValidas = ['Bodega CDMX', 'Querétaro', 'Oficina', 'Instalación'];

  const isEditing = !!herramienta;

  useEffect(() => {
    if (herramienta) {
      const initialSubgrupo = findSubgrupo(herramienta.categoria);
      setSelectedSubgrupo(initialSubgrupo);
      if (initialSubgrupo) {
        setAvailableCategorias(SUBGRUPOS_CATEGORIAS_HERRAMIENTAS[initialSubgrupo]);
      } else {
        setAvailableCategorias([]);
      }
      setFormData({
        id_herramienta: herramienta.id_herramienta || '',
        categoria: herramienta.categoria || '',
        descripcion: herramienta.descripcion || '',
        presentacion: herramienta.presentacion || '',
        unidad: herramienta.unidad || '',
        cantidad_disponible: herramienta.cantidad_disponible || '',
        stock_minimo: herramienta.stock_minimo || '',
        marca: herramienta.marca || '',
        estado_calidad: herramienta.estado_calidad || 'Bueno',
        ubicacion: herramienta.ubicacion || 'Bodega CDMX',
        precioxunidad: herramienta.precioxunidad || '',
        uso_principal: herramienta.uso_principal || ''
      });
    } else {
      // Resetear para un formulario nuevo
      setSelectedSubgrupo('');
      setAvailableCategorias([]);
      setFormData({
        id_herramienta: '',
        categoria: '',
        descripcion: '',
        presentacion: '',
        unidad: '',
        cantidad_disponible: '',
        stock_minimo: '',
        marca: '',
        estado_calidad: 'Bueno',
        ubicacion: 'Bodega CDMX',
        precioxunidad: '',
        uso_principal: ''
      });
    }
  }, [herramienta]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubgrupoChange = (event) => {
    const subgrupo = event.target.value;
    setSelectedSubgrupo(subgrupo);
    if (subgrupo) {
      setAvailableCategorias(SUBGRUPOS_CATEGORIAS_HERRAMIENTAS[subgrupo]);
      // Resetear la categoría al cambiar de subgrupo
      setFormData(prev => ({ ...prev, categoria: '' }));
    } else {
      setAvailableCategorias([]);
      setFormData(prev => ({ ...prev, categoria: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (formData.precioxunidad === '' || formData.precioxunidad === null) {
        setFormError('Debes ingresar un precio por unidad');
        return;
      }

      const dataToSend = { ...formData };
      if (dataToSend.stock_minimo === '' || dataToSend.stock_minimo === null) {
        delete dataToSend.stock_minimo;
      }
      if (dataToSend.precioxunidad === '' || dataToSend.precioxunidad === null) {
        delete dataToSend.precioxunidad; // ya validamos antes, pero por seguridad
      }
      if (isEditing) {
        await dispatch(updateHerramienta({ 
          id: herramienta.id_item, 
          data: dataToSend 
        })).unwrap();
      } else {
        await dispatch(createHerramienta(dataToSend)).unwrap();
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error guardando herramienta:', error);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {isEditing ? 'Editar Herramienta' : 'Nueva Herramienta'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {(error || formError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError || error}
            </Alert>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Código de Herramienta"
                value={formData.id_herramienta}
                onChange={handleInputChange('id_herramienta')}
                required
                disabled={isEditing}
                helperText={isEditing ? 'No se puede cambiar el código' : ''}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Subgrupo</InputLabel>
                <Select
                  value={selectedSubgrupo}
                  label="Subgrupo"
                  onChange={handleSubgrupoChange}
                  required
                >
                  {Object.keys(SUBGRUPOS_CATEGORIAS_HERRAMIENTAS).map(subgrupo => (
                    <MenuItem key={subgrupo} value={subgrupo}>{subgrupo}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth disabled={!selectedSubgrupo}>
                <InputLabel>Categoría</InputLabel>
                <Select
                  value={formData.categoria}
                  label="Categoría"
                  onChange={handleInputChange('categoria')}
                  required
                >
                  {availableCategorias.map(categoria => (
                    <MenuItem key={categoria} value={categoria}>{categoria}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                value={formData.descripcion}
                onChange={handleInputChange('descripcion')}
                required
                multiline
                rows={2}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Presentación"
                value={formData.presentacion}
                onChange={handleInputChange('presentacion')}
                placeholder="Ej: Caja de 10 unidades"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Unidad"
                value={formData.unidad}
                onChange={handleInputChange('unidad')}
                placeholder="Ej: unidad, pieza, juego"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cantidad Disponible"
                type="number"
                value={formData.cantidad_disponible}
                onChange={handleInputChange('cantidad_disponible')}
                inputProps={{ min: 0 }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Stock Mínimo"
                type="number"
                inputProps={{ min: 0, step: 1 }}
                value={formData.stock_minimo}
                onChange={handleInputChange('stock_minimo')}
                helperText="Cantidad mínima antes de alerta"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Marca"
                value={formData.marca}
                onChange={handleInputChange('marca')}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Estado de Calidad</InputLabel>
                <Select
                  value={formData.estado_calidad}
                  label="Estado de Calidad"
                  onChange={handleInputChange('estado_calidad')}
                >
                  <MenuItem value="Bueno">Bueno</MenuItem>
                  <MenuItem value="Regular">Regular</MenuItem>
                  <MenuItem value="Malo">Malo</MenuItem>
                  <MenuItem value="Usado 50%">Usado 50%</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Ubicación</InputLabel>
                <Select
                  value={formData.ubicacion}
                  label="Ubicación"
                  onChange={handleInputChange('ubicacion')}
                  required
                >
                  {ubicacionesValidas.map(ubicacion => (
                    <MenuItem key={ubicacion} value={ubicacion}>{ubicacion}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Precio por Unidad"
                type="number"
                value={formData.precioxunidad}
                onChange={handleInputChange('precioxunidad')}
                inputProps={{ min: 0, step: 0.01 }}
                placeholder="0.00"
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Uso Principal"
                value={formData.uso_principal}
                onChange={handleInputChange('uso_principal')}
                multiline
                rows={2}
                placeholder="Descripción del uso principal de la herramienta"
              />
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default HerramientaModal; 