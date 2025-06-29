import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Chip
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { entradaHerramienta, salidaHerramienta, clearError } from '../../store/slices/herramientasSlice';

const MovimientoModal = ({ open, onClose, item, tipo, onSuccess, tipoItem = 'herramienta' }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.herramientas);
  
  const [formData, setFormData] = useState({
    cantidad: '',
    notas: ''
  });

  const isEntrada = tipo === 'entrada';

  useEffect(() => {
    if (open) {
      setFormData({
        cantidad: '',
        notas: ''
      });
    }
  }, [open]);

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
    
    if (!formData.cantidad || parseFloat(formData.cantidad) <= 0) {
      return;
    }

    try {
      const movimientoData = {
        id: item.id_item,
        cantidad: parseFloat(formData.cantidad),
        notas: formData.notas || `${isEntrada ? 'Entrada' : 'Salida'} de ${tipoItem}`
      };

      if (isEntrada) {
        await dispatch(entradaHerramienta(movimientoData)).unwrap();
      } else {
        await dispatch(salidaHerramienta(movimientoData)).unwrap();
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error registrando movimiento:', error);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEntrada ? 'Registrar Entrada' : 'Registrar Salida'} - {item.descripcion}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {/* Información del item */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Información del {tipoItem}
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Código:
                </Typography>
                <Typography variant="body1" fontFamily="monospace">
                  {item.id_herramienta || item.id_material || item.id_pano}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Stock Actual:
                </Typography>
                <Typography variant="body1" fontWeight="bold">
                  {item.cantidad_disponible || 0} {item.unidad || 'unidad'}
                </Typography>
              </Grid>
              {item.categoria && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Categoría:
                  </Typography>
                  <Chip label={item.categoria} size="small" />
                </Grid>
              )}
              {item.estado_calidad && (
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Estado:
                  </Typography>
                  <Chip 
                    label={item.estado_calidad} 
                    size="small" 
                    color={
                      item.estado_calidad === 'Bueno' ? 'success' : 
                      item.estado_calidad === 'Regular' ? 'warning' : 'error'
                    }
                  />
                </Grid>
              )}
            </Grid>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cantidad"
                type="number"
                value={formData.cantidad}
                onChange={handleInputChange('cantidad')}
                required
                inputProps={{ 
                  min: 0.01, 
                  step: 0.01,
                  max: !isEntrada ? (item.cantidad_disponible || 0) : undefined
                }}
                helperText={
                  !isEntrada && item.cantidad_disponible 
                    ? `Máximo disponible: ${item.cantidad_disponible} ${item.unidad || 'unidad'}`
                    : ''
                }
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas"
                value={formData.notas}
                onChange={handleInputChange('notas')}
                multiline
                rows={3}
                placeholder={`Descripción de la ${isEntrada ? 'entrada' : 'salida'}...`}
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
            disabled={loading || !formData.cantidad || parseFloat(formData.cantidad) <= 0}
            color={isEntrada ? 'success' : 'warning'}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Registrando...' : (isEntrada ? 'Registrar Entrada' : 'Registrar Salida')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MovimientoModal; 