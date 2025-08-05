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

const ClienteModal = ({ open, onClose, cliente = null, onClienteCreated = null }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    nombre_cliente: '',
    email: '',
    telefono: '',
    empresa_cliente: '',
    email_cliente: '',
    telefono_cliente: '',
    requerimientos: '',
    presupuesto_estimado: '',
    fuente: 'manual',
    notas: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const isEditing = Boolean(cliente);

  // Cargar datos del cliente en modo edición
  useEffect(() => {
    if (isEditing && cliente) {
      setFormData({
        nombre_cliente: cliente.nombre_cliente || '',
        empresa_cliente: cliente.empresa_cliente || '',
        email_cliente: cliente.email_cliente || '',
        telefono_cliente: cliente.telefono_cliente || '',
        requerimientos: cliente.requerimientos || '',
        presupuesto_estimado: cliente.presupuesto_estimado || '',
        fuente: cliente.fuente || 'manual',
        notas: cliente.notas || ''
      });
    } else {
      setFormData({
        nombre_cliente: '',
        empresa_cliente: '',
        email_cliente: '',
        telefono_cliente: '',
        requerimientos: '',
        presupuesto_estimado: '',
        fuente: 'manual',
        notas: ''
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

    // Validar email_cliente (opcional)
    if (formData.email_cliente.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email_cliente.trim())) {
        errors.email_cliente = 'El email del cliente no tiene un formato válido';
      } else if (formData.email_cliente.trim().length > 255) {
        errors.email_cliente = 'El email del cliente no puede exceder 255 caracteres';
      }
    }

    // Validar telefono_cliente (opcional)
    if (formData.telefono_cliente.trim()) {
      if (formData.telefono_cliente.trim().length > 50) {
        errors.telefono_cliente = 'El teléfono del cliente no puede exceder 50 caracteres';
      }
    }

    // Validar empresa_cliente (opcional)
    if (formData.empresa_cliente.trim() && formData.empresa_cliente.trim().length > 255) {
      errors.empresa_cliente = 'El nombre de la empresa no puede exceder 255 caracteres';
    }

    // Validar presupuesto_estimado (opcional)
    if (formData.presupuesto_estimado && isNaN(parseFloat(formData.presupuesto_estimado))) {
      errors.presupuesto_estimado = 'El presupuesto debe ser un número válido';
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
        empresa_cliente: formData.empresa_cliente.trim() || null,
        email_cliente: formData.email_cliente.trim() || null,
        telefono_cliente: formData.telefono_cliente.trim() || null,
        requerimientos: formData.requerimientos.trim() || null,
        presupuesto_estimado: formData.presupuesto_estimado ? parseFloat(formData.presupuesto_estimado) : null,
        fuente: formData.fuente,
        notas: formData.notas.trim() || null
      };

      let result;
      if (isEditing) {
        result = await dispatch(updateCliente({
          id: cliente.id_cliente,
          data: clienteData
        })).unwrap();
      } else {
        result = await dispatch(createCliente(clienteData)).unwrap();
      }

      // Si hay callback para cliente creado y no estamos editando, llamarlo
      if (onClienteCreated && !isEditing && result && result.data) {
        onClienteCreated(result.data);
      } else {
        onClose();
      }
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
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: '90vh' }
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

          {/* Empresa del Cliente */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Empresa"
              value={formData.empresa_cliente}
              onChange={handleInputChange('empresa_cliente')}
              error={!!formErrors.empresa_cliente}
              helperText={formErrors.empresa_cliente || 'Nombre de la empresa (opcional)'}
              disabled={loading}
              placeholder="Nombre de la empresa"
            />
          </Grid>

          {/* Email del Cliente */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Email del Cliente"
              type="email"
              value={formData.email_cliente}
              onChange={handleInputChange('email_cliente')}
              error={!!formErrors.email_cliente}
              helperText={formErrors.email_cliente || 'Email del cliente (opcional)'}
              disabled={loading}
              placeholder="cliente@empresa.com"
            />
          </Grid>

          {/* Teléfono del Cliente */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Teléfono del Cliente"
              value={formData.telefono_cliente}
              onChange={handleInputChange('telefono_cliente')}
              error={!!formErrors.telefono_cliente}
              helperText={formErrors.telefono_cliente || 'Teléfono del cliente (opcional)'}
              disabled={loading}
              placeholder="+52 55 1234-5678"
            />
          </Grid>





          {/* Presupuesto Estimado */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Presupuesto Estimado"
              type="number"
              value={formData.presupuesto_estimado}
              onChange={handleInputChange('presupuesto_estimado')}
              error={!!formErrors.presupuesto_estimado}
              helperText={formErrors.presupuesto_estimado || 'Presupuesto estimado en MXN (opcional)'}
              disabled={loading}
              placeholder="50000"
              InputProps={{
                startAdornment: <span>$</span>
              }}
            />
          </Grid>

          {/* Fuente */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Fuente"
              value={formData.fuente}
              onChange={handleInputChange('fuente')}
              disabled={loading}
              placeholder="manual, email, landing, etc."
              helperText="Fuente del cliente (opcional)"
            />
          </Grid>

          {/* Requerimientos */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Requerimientos"
              multiline
              rows={3}
              value={formData.requerimientos}
              onChange={handleInputChange('requerimientos')}
              disabled={loading}
              placeholder="Descripción de los requerimientos del cliente..."
              helperText="Requerimientos específicos del cliente (opcional)"
            />
          </Grid>

          {/* Notas */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Notas"
              multiline
              rows={3}
              value={formData.notas}
              onChange={handleInputChange('notas')}
              disabled={loading}
              placeholder="Notas adicionales sobre el cliente..."
              helperText="Notas adicionales (opcional)"
            />
          </Grid>
        </Grid>

        {/* Información adicional */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Nota:</strong> El cliente se registrará automáticamente en el sistema 
            y podrá ser asociado a órdenes de producción y cotizaciones. Los campos marcados 
            como "del Cliente" son específicos para la información del cliente, mientras que 
            los campos de "Contacto" son para información adicional de contacto.
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