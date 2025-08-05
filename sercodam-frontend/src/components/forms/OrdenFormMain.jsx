import React, { useState, useEffect } from 'react';
import { Grid, TextField, FormControl, InputLabel, Select, MenuItem, Autocomplete, Box, Typography } from '@mui/material';
import { clientesApi } from '../../services/api';

const OrdenFormMain = ({ formData, formErrors, handleInputChange, handleClienteChange }) => {
    const [clientesOptions, setClientesOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [searchTimeout, setSearchTimeout] = useState(null);

  // Sincronizar inputValue con formData.cliente
  useEffect(() => {
    setInputValue(formData.cliente || '');
  }, [formData.cliente]);

  // Limpiar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const searchClientes = async (query) => {
    setLoading(true);
    try {
      const response = await clientesApi.searchClientes(query);
      setClientesOptions(response.data.clientes || []);
    } catch (error) {
      console.error('Error buscando clientes:', error);
      setClientesOptions([]);
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = (query) => {
    // Limpiar timeout anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Crear nuevo timeout
    const newTimeout = setTimeout(() => {
      searchClientes(query);
    }, 300); // Esperar 300ms después de que el usuario deje de escribir

    setSearchTimeout(newTimeout);
  };

  const handleClienteInputChange = (event, newInputValue, reason) => {
    
    if (reason === 'input') {
      setInputValue(newInputValue);
      
      // Actualizar solo el nombre del cliente cuando el usuario escribe manualmente
      // (el id_cliente se actualizará solo cuando se seleccione del dropdown)
      if (handleClienteChange) {
        handleClienteChange({ nombre: newInputValue, id: formData.id_cliente || '' });
      } else {
        handleInputChange('cliente')({ target: { value: newInputValue } });
      }
      
      // Si el campo se vacía, también limpiar el id_cliente
      if (!newInputValue) {
        if (handleClienteChange) {
          handleClienteChange({ nombre: '', id: '' });
        } else {
          handleInputChange('cliente')({ target: { value: '' } });
          handleInputChange('id_cliente')({ target: { value: '' } });
        }
        setClientesOptions([]);
        return;
      }
      
      // Abrir dropdown si no está abierto
      if (!open) {
        setOpen(true);
      }
      
      // Buscar clientes con debounce si hay al menos 2 caracteres
      if (newInputValue.length >= 2) {
        setLoading(true); // Mostrar loading inmediatamente
        debouncedSearch(newInputValue);
      } else if (newInputValue.length === 1) {
        // Limpiar opciones y cancelar búsquedas pendientes para 1 caracter
        if (searchTimeout) {
          clearTimeout(searchTimeout);
        }
        setClientesOptions([]);
        setLoading(false);
      }
    } else if (reason === 'clear') {
      setInputValue('');
      setSelectedCliente(null);
      
      if (handleClienteChange) {
        handleClienteChange({ nombre: '', id: '' });
      } else {
        handleInputChange('cliente')({ target: { value: '' } });
        handleInputChange('id_cliente')({ target: { value: '' } });
      }
      
      setClientesOptions([]);
      // Mostrar todos los clientes de nuevo al borrar
      setOpen(true);
      searchClientes('');
      setLoading(false);
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    }
  };

  const handleClienteSelect = (event, cliente) => {
    if (cliente && typeof cliente === 'object' && cliente.id_cliente) {
      setInputValue(cliente.nombre_cliente);
      setSelectedCliente(cliente);
      
      // Usar la nueva función específica para cliente
      if (handleClienteChange) {
        handleClienteChange({
          nombre: cliente.nombre_cliente,
          id: cliente.id_cliente
        });
      } else {
        // Fallback al método anterior si no está disponible
        handleInputChange('cliente')({ target: { value: cliente.nombre_cliente } });
        handleInputChange('id_cliente')({ target: { value: cliente.id_cliente } });
      }
      
      setClientesOptions([]);
      setOpen(false);
    } else if (cliente === null) {
      setInputValue('');
      setSelectedCliente(null);
      
      // Usar la nueva función específica para limpiar cliente
      if (handleClienteChange) {
        handleClienteChange({
          nombre: '',
          id: ''
        });
      } else {
        // Fallback al método anterior si no está disponible
        handleInputChange('cliente')({ target: { value: '' } });
        handleInputChange('id_cliente')({ target: { value: '' } });
      }
      
      setClientesOptions([]);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    // Si hay texto, buscar ese texto; si no, traer todos los clientes
    if (inputValue && inputValue.length >= 2) {
      searchClientes(inputValue);
    } else if (!inputValue) {
      searchClientes('');
    }
  };

  const handleClose = (event, reason) => {
    // No cerrar el dropdown si está cargando o si es por blur y hay texto
    if (reason === 'blur' && (loading || (inputValue && inputValue.length >= 2))) {
      return;
    }
    setOpen(false);
  };

  return (
    <Grid container spacing={3}>
      {/* Cliente */}
      <Grid item xs={12} md={6}>
        <Autocomplete
          fullWidth
          options={clientesOptions}
          value={selectedCliente}
          inputValue={inputValue}
          open={open}
          onOpen={handleOpen}
          onClose={handleClose}
          onChange={handleClienteSelect}
          onInputChange={handleClienteInputChange}
          getOptionLabel={(option) => option?.nombre_cliente || ''}
          isOptionEqualToValue={(option, value) => option?.id_cliente === value?.id_cliente}
          loading={loading}
          loadingText="Buscando clientes..."
          noOptionsText={
            loading
              ? "Buscando clientes..."
              : !inputValue || inputValue.length === 0
                ? "Haz clic aquí para ver todos los clientes"
                : inputValue.length === 1
                  ? "Escribe al menos 2 caracteres para buscar"
                  : clientesOptions.length === 0 && inputValue.length >= 2
                    ? `No se encontraron clientes para "${inputValue}"`
                    : "No se encontraron clientes"
          }
          filterOptions={(x) => x}
          disableClearable={false}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Cliente *"
              error={!!formErrors.cliente}
              helperText={formErrors.cliente}
              required
              placeholder="Haz clic para ver clientes o escribe para buscar"
            />
          )}
          renderOption={(props, option) => {
            const { key, ...restProps } = props;
            return (
              <Box component="li" key={key} {...restProps}>
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {option.nombre_cliente}
                  </Typography>
                  {(option.email_cliente || option.telefono_cliente) && (
                    <Typography variant="body2" color="text.secondary">
                      {[option.email_cliente, option.telefono_cliente].filter(Boolean).join(' • ')}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          }}
          autoHighlight
          selectOnFocus
          clearOnBlur={false}
          handleHomeEndKeys
          onBlur={() => {
            // Si no hay id_cliente seleccionado, limpiar el campo para evitar valores inválidos
            if (!formData.id_cliente) {
              setInputValue('');
              if (handleClienteChange) {
                handleClienteChange({ nombre: '', id: '' });
              } else {
                handleInputChange('cliente')({ target: { value: '' } });
              }
            }
          }}
        />
      </Grid>
    {/* Prioridad */}
    <Grid item xs={12} md={6}>
      <FormControl fullWidth>
        <InputLabel id="prioridad-label">Prioridad</InputLabel>
        <Select
          labelId="prioridad-label"
          value={formData.prioridad || 'media'}
          label="Prioridad"
          onChange={handleInputChange('prioridad')}
        >
          <MenuItem value="baja">Baja</MenuItem>
          <MenuItem value="media">Media</MenuItem>
          <MenuItem value="alta">Alta</MenuItem>
          <MenuItem value="urgente">Urgente</MenuItem>
        </Select>
      </FormControl>
    </Grid>
    {/* Observaciones */}
    <Grid item xs={12}>
      <TextField
        fullWidth
        label="Observaciones"
        value={formData.observaciones || ''}
        onChange={handleInputChange('observaciones')}
        multiline
        rows={2}
      />
    </Grid>
    {/* Fechas */}
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Fecha de Inicio"
        type="date"
        value={formData.fecha_inicio || ''}
        onChange={handleInputChange('fecha_inicio')}
        InputLabelProps={{ shrink: true }}
        sx={{
          '& .MuiInputBase-root': {
            position: 'relative'
          },
          '& .MuiInputBase-root::after': {
            content: '""',
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '20px',
            height: '20px',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23666\'%3E%3Cpath d=\'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z\'/%3E%3C/svg%3E")',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            pointerEvents: 'none',
            zIndex: 1
          }
        }}
      />
    </Grid>
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Fecha de Fin"
        type="date"
        value={formData.fecha_fin || ''}
        onChange={handleInputChange('fecha_fin')}
        InputLabelProps={{ shrink: true }}
        sx={{
          '& .MuiInputBase-root': {
            position: 'relative'
          },
          '& .MuiInputBase-root::after': {
            content: '""',
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '20px',
            height: '20px',
            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'%23666\'%3E%3Cpath d=\'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z\'/%3E%3C/svg%3E")',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            pointerEvents: 'none',
            zIndex: 1
          }
        }}
      />
    </Grid>
  </Grid>
  );
};

export default OrdenFormMain; 