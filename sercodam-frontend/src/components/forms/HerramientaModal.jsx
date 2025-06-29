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

const HerramientaModal = ({ open, onClose, herramienta, onSuccess }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.herramientas);
  
  const [formData, setFormData] = useState({
    id_herramienta: '',
    categoria: '',
    descripcion: '',
    presentacion: '',
    unidad: 'unidad',
    cantidad_disponible: 0,
    marca: '',
    estado_calidad: 'Bueno',
    ubicacion: '',
    precioxunidad: '',
    uso_principal: ''
  });

  const isEditing = !!herramienta;

  useEffect(() => {
    if (herramienta) {
      setFormData({
        id_herramienta: herramienta.id_herramienta || '',
        categoria: herramienta.categoria || '',
        descripcion: herramienta.descripcion || '',
        presentacion: herramienta.presentacion || '',
        unidad: herramienta.unidad || 'unidad',
        cantidad_disponible: herramienta.cantidad_disponible || 0,
        marca: herramienta.marca || '',
        estado_calidad: herramienta.estado_calidad || 'Bueno',
        ubicacion: herramienta.ubicacion || '',
        precioxunidad: herramienta.precioxunidad || '',
        uso_principal: herramienta.uso_principal || ''
      });
    } else {
      setFormData({
        id_herramienta: '',
        categoria: '',
        descripcion: '',
        presentacion: '',
        unidad: 'unidad',
        cantidad_disponible: 0,
        marca: '',
        estado_calidad: 'Bueno',
        ubicacion: '',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (isEditing) {
        await dispatch(updateHerramienta({ 
          id: herramienta.id_item, 
          data: formData 
        })).unwrap();
      } else {
        await dispatch(createHerramienta(formData)).unwrap();
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error guardando herramienta:', error);
    }
  };

  const handleClose = () => {
    if (!loading) {
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
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
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
              <TextField
                fullWidth
                label="Categoría"
                value={formData.categoria}
                onChange={handleInputChange('categoria')}
                required
              />
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
              <TextField
                fullWidth
                label="Ubicación"
                value={formData.ubicacion}
                onChange={handleInputChange('ubicacion')}
                placeholder="Ej: Bodega CDMX, Querétaro"
              />
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