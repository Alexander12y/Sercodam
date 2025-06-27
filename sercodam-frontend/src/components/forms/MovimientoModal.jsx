import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  Box,
  Alert,
  Chip
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { 
  entradaMaterial, 
  salidaMaterial,
  clearError,
  clearSuccessMessage 
} from '../../store/slices/materialesSlice';

const MovimientoModal = ({ open, onClose, item, tipo, onSuccess, apiEndpoint }) => {
  const dispatch = useDispatch();
  const { loading, error, successMessage } = useSelector((state) => state.materiales);
  
  const [formData, setFormData] = useState({
    cantidad: '',
    descripcion: ''
  });

  useEffect(() => {
    if (open) {
      setFormData({
        cantidad: '',
        descripcion: ''
      });
    }
  }, [open]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        dispatch(clearSuccessMessage());
        onSuccess();
        onClose();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, dispatch, onSuccess, onClose]);

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!item || !formData.cantidad || parseFloat(formData.cantidad) <= 0) {
      return;
    }

    const movimientoData = {
      id: item.id_item,
      cantidad: parseFloat(formData.cantidad),
      descripcion: formData.descripcion
    };

    if (tipo === 'entrada') {
      await dispatch(entradaMaterial(movimientoData));
    } else {
      await dispatch(salidaMaterial(movimientoData));
    }
  };

  const handleClose = () => {
    dispatch(clearError());
    onClose();
  };

  const getTipoColor = () => {
    return tipo === 'entrada' ? 'success' : 'warning';
  };

  const getTipoText = () => {
    return tipo === 'entrada' ? 'Entrada' : 'Salida';
  };

  if (!item) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip 
            label={getTipoText()} 
            color={getTipoColor()} 
            size="small"
          />
          <Typography variant="h6">
            {getTipoText()} de Material
          </Typography>
        </Box>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          {/* Información del material */}
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Material seleccionado:
            </Typography>
            <Typography variant="h6" gutterBottom>
              {item.descripcion}
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  ID: {item.id_material_extra}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Categoría: {item.categoria}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Stock actual: {item.cantidad_disponible || 0} {item.unidad || 'unidad'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Ubicación: {item.ubicacion}
                </Typography>
              </Grid>
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
                  min: 0, 
                  step: item.permite_decimales ? 0.01 : 1,
                  max: tipo === 'salida' ? item.cantidad_disponible : undefined
                }}
                helperText={`Cantidad a ${tipo === 'entrada' ? 'agregar' : 'retirar'} (${item.unidad || 'unidad'})`}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descripción"
                value={formData.descripcion}
                onChange={handleInputChange('descripcion')}
                multiline
                rows={3}
                helperText={`Motivo de la ${tipo === 'entrada' ? 'entrada' : 'salida'} (opcional)`}
              />
            </Grid>
          </Grid>

          {tipo === 'salida' && item.cantidad_disponible <= 10 && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Stock bajo: Solo quedan {item.cantidad_disponible} {item.unidad || 'unidad'}
            </Alert>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color={getTipoColor()}
            disabled={loading || !formData.cantidad || parseFloat(formData.cantidad) <= 0}
          >
            {loading ? 'Registrando...' : `Registrar ${getTipoText()}`}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MovimientoModal; 