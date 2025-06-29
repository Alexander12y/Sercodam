import React from 'react';
import { Grid, TextField, FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const OrdenFormMain = ({ formData, formErrors, handleInputChange }) => (
  <Grid container spacing={3}>
    {/* Cliente */}
    <Grid item xs={12} md={6}>
      <TextField
        fullWidth
        label="Cliente *"
        value={formData.cliente || ''}
        onChange={handleInputChange('cliente')}
        error={!!formErrors.cliente}
        helperText={formErrors.cliente}
        required
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

export default OrdenFormMain; 