import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
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
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { createCliente, updateCliente } from '../../store/slices/clientesSlice';

const ClienteModal = ({ open, onClose, cliente = null }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    email: '',
    telefono: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const isEditing = Boolean(cliente);

  // Cargar datos del cliente en modo edición
  useEffect(() => {
    if (isEditing && cliente) {
      setFormData({
        nombre_cliente: cliente.nombre_cliente || '',
        email: cliente.email || '',
        telefono: cliente.telefono || ''
      });
    } else {
      setFormData({
        nombre_cliente: '',
        email: '',
        telefono: ''
      });
    }
    setFormErrors({});
    setError('');
  }, [cliente, isEditing, open]);

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};

    // Validar nombre del cliente
    if (!formData.nombre_cliente.trim()) {
      errors.nombre_cliente = 'El nombre del cliente es requerido';
    } else if (formData.nombre_cliente.trim().length < 2) {
      errors.nombre_cliente = 'El nombre debe tener al menos 2 caracteres';
    } else if (formData.nombre_cliente.trim().length > 255) {
      errors.nombre_cliente = 'El nombre no puede exceder 255 caracteres';
    }

    // Validar email (opcional)
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'El email no tiene un formato válido';
      } else if (formData.email.trim().length > 255) {
        errors.email = 'El email no puede exceder 255 caracteres';
      }
    }

    // Validar teléfono (opcional)
    if (formData.telefono.trim()) {
      if (formData.telefono.trim().length > 50) {
        errors.telefono = 'El teléfono no puede exceder 50 caracteres';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const clienteData = {
        nombre_cliente: formData.nombre_cliente.trim(),
        email: formData.email.trim() || null,
        telefono: formData.telefono.trim() || null
      };

      if (isEditing) {
        await dispatch(updateCliente({
          id: cliente.id_cliente,
          data: clienteData
        })).unwrap();
      } else {
        await dispatch(createCliente(clienteData)).unwrap();
      }

      onClose();
    } catch (err) {
      console.error('Error al guardar cliente:', err);
      setError(err.message || 'Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <PersonIcon color="primary" />
            <Typography variant="h6" component="span">
              {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} disabled={loading}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Nombre del Cliente */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Nombre del Cliente *"
              value={formData.nombre_cliente}
              onChange={handleInputChange('nombre_cliente')}
              error={!!formErrors.nombre_cliente}
              helperText={formErrors.nombre_cliente}
              disabled={loading}
              placeholder="Ingresa el nombre completo del cliente"
            />
          </Grid>

          {/* Email */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={handleInputChange('email')}
              error={!!formErrors.email}
              helperText={formErrors.email || 'Email de contacto (opcional)'}
              disabled={loading}
              placeholder="ejemplo@empresa.com"
            />
          </Grid>

          {/* Teléfono */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Teléfono"
              value={formData.telefono}
              onChange={handleInputChange('telefono')}
              error={!!formErrors.telefono}
              helperText={formErrors.telefono || 'Número de teléfono (opcional)'}
              disabled={loading}
              placeholder="+52 55 1234-5678"
            />
          </Grid>
        </Grid>

        {/* Información adicional */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Nota:</strong> El cliente se registrará automáticamente en el sistema 
            y podrá ser asociado a órdenes de producción.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleClose}
          disabled={loading}
          color="inherit"
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
          sx={{ borderRadius: 2 }}
        >
          {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Cliente')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClienteModal; 