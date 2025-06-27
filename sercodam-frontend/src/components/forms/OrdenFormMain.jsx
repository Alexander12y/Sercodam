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
        <InputLabel>Prioridad</InputLabel>
        <Select
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
      />
    </Grid>
  </Grid>
);

export default OrdenFormMain; 