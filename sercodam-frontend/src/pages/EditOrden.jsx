import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Autocomplete,
  Button,
  CircularProgress,
  Alert,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrdenById, updateOrden } from '../store/slices/ordenesSlice';
import { useSnackbar } from 'notistack';
import { clientesApi } from '../services/api';

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'en_proceso':
      return 'info';
    case 'completada':
      return 'success';
    case 'cancelada':
      return 'error';
    case 'pausada':
      return 'default';
    default:
      return 'default';
  }
};

const getEstadoText = (estado) => {
  switch (estado) {
    case 'en_proceso':
      return 'En Proceso';
    case 'completada':
      return 'Completada';
    case 'cancelada':
      return 'Cancelada';
    case 'pausada':
      return 'Pausada';
    default:
      return estado;
  }
};

const getPrioridadColor = (prioridad) => {
  switch (prioridad) {
    case 'alta':
      return 'error';
    case 'media':
      return 'warning';
    case 'baja':
      return 'success';
    default:
      return 'default';
  }
};

const getPrioridadText = (prioridad) => {
  switch (prioridad) {
    case 'alta':
      return 'Alta';
    case 'media':
      return 'Media';
    case 'baja':
      return 'Baja';
    default:
      return 'Media';
  }
};

const EditOrden = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { ordenActual, loading, error } = useSelector((state) => state.ordenes);
  
  const [formData, setFormData] = useState({
    cliente: '',
    observaciones: '',
    estado: 'en_proceso',
    prioridad: 'media',
    fecha_inicio: '',
    fecha_fin: ''
  });
  const [saving, setSaving] = useState(false);

  // Estados para Autocomplete de Cliente
  const [clientesOptions, setClientesOptions] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [inputClienteValue, setInputClienteValue] = useState('');
  const [openClienteDropdown, setOpenClienteDropdown] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    if (id) {
      dispatch(fetchOrdenById(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (ordenActual) {
      const orden = ordenActual.orden || ordenActual; // Fallback por si cambia estructura
      setFormData({
        cliente: orden.cliente || orden.nombre_cliente || '',
        observaciones: orden.observaciones || '',
        estado: orden.estado || 'en_proceso',
        prioridad: orden.prioridad || 'media',
        fecha_inicio: orden.fecha_inicio ? 
          new Date(orden.fecha_inicio).toISOString().split('T')[0] : '',
        fecha_fin: orden.fecha_fin ? 
          new Date(orden.fecha_fin).toISOString().split('T')[0] : ''
      });
      // Si tenemos datos del cliente al cargar, seleccionarlo por defecto en Autocomplete
      if (orden.id_cliente) {
        setSelectedCliente({ id_cliente: orden.id_cliente, nombre_cliente: orden.nombre_cliente || orden.cliente || '' });
      }
    }
  }, [ordenActual]);

  // Sincronizar input del Autocomplete con formData.cliente
  useEffect(() => {
    setInputClienteValue(formData.cliente || '');
  }, [formData.cliente]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (searchTimeout) clearTimeout(searchTimeout);
    };
  }, [searchTimeout]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /* ------------------------ Funciones Autocomplete Cliente ------------------------ */
  const searchClientes = async (query) => {
    setLoadingClientes(true);
    try {
      const response = await clientesApi.searchClientes(query);
      setClientesOptions(response.data.clientes || []);
    } catch (error) {
      console.error('Error buscando clientes:', error);
      setClientesOptions([]);
    } finally {
      setLoadingClientes(false);
    }
  };

  const debouncedSearchClientes = (query) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    const newTimeout = setTimeout(() => {
      searchClientes(query);
    }, 300);
    setSearchTimeout(newTimeout);
  };

  const handleClienteInputChange = (event, newInputValue, reason) => {
    if (reason === 'input') {
      setInputClienteValue(newInputValue);
      handleInputChange('cliente', newInputValue);

      if (!newInputValue) {
        setClientesOptions([]);
        return;
      }

      if (!openClienteDropdown) setOpenClienteDropdown(true);

      if (newInputValue.length >= 2) {
        setLoadingClientes(true);
        debouncedSearchClientes(newInputValue);
      }
    } else if (reason === 'clear') {
      setInputClienteValue('');
      setSelectedCliente(null);
      handleInputChange('cliente', '');
      setClientesOptions([]);
      setOpenClienteDropdown(true);
      searchClientes('');
    }
  };

  const handleClienteSelect = (event, cliente) => {
    if (cliente && typeof cliente === 'object' && cliente.id_cliente) {
      setSelectedCliente(cliente);
      setInputClienteValue(cliente.nombre_cliente);
      handleInputChange('cliente', cliente.nombre_cliente);
      setOpenClienteDropdown(false);
    } else if (cliente === null) {
      setSelectedCliente(null);
      setInputClienteValue('');
      handleInputChange('cliente', '');
    }
  };

  /* ------------------------------------------------------------------------------ */

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await dispatch(updateOrden({ id, data: formData })).unwrap();
      enqueueSnackbar('Orden actualizada exitosamente', { variant: 'success' });
      navigate(`/ordenes/${id}`);
    } catch (error) {
      enqueueSnackbar('Error al actualizar la orden', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/ordenes/${id}`);
  };

  if (loading && !ordenActual) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Alert severity="error" sx={{ mb: 2 }}>
          Error al cargar la orden: {error}
        </Alert>
      </Container>
    );
  }

  if (!ordenActual) {
    return (
      <Container maxWidth="xl">
        <Alert severity="info">
          No se encontró la orden solicitada
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(`/ordenes/${id}`)}
          sx={{ mr: 2 }}
        >
          Volver
        </Button>
        <Typography variant="h4" component="h1">
          Editar Orden: {ordenActual.orden ? ordenActual.orden.numero_op : ordenActual.numero_op}
        </Typography>
      </Box>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Información básica */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información de la Orden
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Número OP"
                      value={ordenActual.orden ? ordenActual.orden.numero_op : ordenActual.numero_op}
                      disabled
                      variant="outlined"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Autocomplete
                      fullWidth
                      options={clientesOptions}
                      value={selectedCliente}
                      inputValue={inputClienteValue}
                      open={openClienteDropdown}
                      onOpen={() => {
                        setOpenClienteDropdown(true);
                        if (!inputClienteValue) {
                          // Cargar todos los clientes al abrir sin texto
                          searchClientes('');
                        }
                      }}
                      onClose={() => setOpenClienteDropdown(false)}
                      onChange={handleClienteSelect}
                      onInputChange={handleClienteInputChange}
                      getOptionLabel={(option) => option?.nombre_cliente || ''}
                      isOptionEqualToValue={(option, value) => option?.id_cliente === value?.id_cliente}
                      loading={loadingClientes}
                      loadingText="Buscando clientes..."
                      noOptionsText={
                        loadingClientes
                          ? 'Buscando clientes...'
                          : !inputClienteValue || inputClienteValue.length === 0
                            ? 'Haz clic aquí para ver todos los clientes'
                            : inputClienteValue.length === 1
                              ? 'Escribe al menos 2 caracteres para buscar'
                              : clientesOptions.length === 0 && inputClienteValue.length >= 2
                                ? `No se encontraron clientes para "${inputClienteValue}"`
                                : 'No se encontraron clientes'
                      }
                      filterOptions={(x) => x}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Cliente *"
                          required
                          placeholder="Haz clic para ver clientes o escribe para buscar"
                        />
                      )}
                      autoHighlight
                      selectOnFocus
                      clearOnBlur={false}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Observaciones"
                      value={formData.observaciones}
                      onChange={(e) => handleInputChange('observaciones', e.target.value)}
                      multiline
                      rows={3}
                      variant="outlined"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Estado</InputLabel>
                      <Select
                        value={formData.estado}
                        label="Estado"
                        onChange={(e) => handleInputChange('estado', e.target.value)}
                      >

                        <MenuItem value="en_proceso">En Proceso</MenuItem>
                        <MenuItem value="completada">Completada</MenuItem>
                        <MenuItem value="cancelada">Cancelada</MenuItem>
                        <MenuItem value="pausada">Pausada</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Prioridad</InputLabel>
                      <Select
                        value={formData.prioridad}
                        label="Prioridad"
                        onChange={(e) => handleInputChange('prioridad', e.target.value)}
                      >
                        <MenuItem value="baja">Baja</MenuItem>
                        <MenuItem value="media">Media</MenuItem>
                        <MenuItem value="alta">Alta</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Fecha de Inicio"
                      type="date"
                      value={formData.fecha_inicio}
                      onChange={(e) => handleInputChange('fecha_inicio', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Fecha de Fin"
                      type="date"
                      value={formData.fecha_fin}
                      onChange={(e) => handleInputChange('fecha_fin', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      variant="outlined"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Información de estado actual */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Estado Actual
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Estado Seleccionado
                  </Typography>
                  <Chip
                    label={getEstadoText(formData.estado)}
                    color={getEstadoColor(formData.estado)}
                    size="medium"
                    sx={{ mb: 1 }}
                  />
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Prioridad Seleccionada
                  </Typography>
                  <Chip
                    label={getPrioridadText(formData.prioridad)}
                    color={getPrioridadColor(formData.prioridad)}
                    size="medium"
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />
                </Box>
                
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Fecha de Creación
                  </Typography>
                  <Typography variant="body1">
                    {ordenActual.orden?.fecha_creacion ? 
                      new Date(ordenActual.orden.fecha_creacion).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 
                      (ordenActual.orden?.fecha_op ? 
                        new Date(ordenActual.orden.fecha_op).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        }) : '-')
                    }
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Botones de acción */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<CancelIcon />}
            onClick={handleCancel}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </Box>
      </form>
    </Container>
  );
};

export default EditOrden; 