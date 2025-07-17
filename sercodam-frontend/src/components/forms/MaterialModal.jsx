import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  FormControlLabel,
  Switch,
  Alert,
  Box,
  Typography
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { 
  createMaterial, 
  updateMaterial, 
  clearError,
  clearSuccessMessage 
} from '../../store/slices/materialesSlice';
import { SUBGRUPOS_CATEGORIAS_MATERIALES } from '../../constants/materialesConstants';

// Función para encontrar el subgrupo de una categoría de material
const findSubgrupo = (categoria) => {
  for (const subgrupo in SUBGRUPOS_CATEGORIAS_MATERIALES) {
    if (SUBGRUPOS_CATEGORIAS_MATERIALES[subgrupo].includes(categoria)) {
      return subgrupo;
    }
  }
  return '';
};

const MaterialModal = ({ open, onClose, material, onSuccess }) => {
  const dispatch = useDispatch();
  const { loading, error, successMessage } = useSelector((state) => state.materiales);
  const [formError, setFormError] = useState('');
  
  const [formData, setFormData] = useState({
    id_material_extra: '',
    descripcion: '',
    categoria: '',
    presentacion: '',
    unidad: '',
    permite_decimales: false,
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

  useEffect(() => {
    if (open) {
      if (material) {
        const initialSubgrupo = findSubgrupo(material.categoria);
        setSelectedSubgrupo(initialSubgrupo);
        setAvailableCategorias(initialSubgrupo ? SUBGRUPOS_CATEGORIAS_MATERIALES[initialSubgrupo] : []);
        setFormData({
          id_material_extra: material.id_material_extra || '',
          descripcion: material.descripcion || '',
          categoria: material.categoria || '',
          presentacion: material.presentacion || '',
          unidad: material.unidad || '',
          permite_decimales: material.permite_decimales || false,
          cantidad_disponible: material.cantidad_disponible || '',
          stock_minimo: material.stock_minimo || '',
          marca: material.marca || '',
          estado_calidad: material.estado_calidad || 'Bueno',
          ubicacion: material.ubicacion || 'Bodega CDMX',
          precioxunidad: material.precioxunidad || '',
          uso_principal: material.uso_principal || ''
        });
      } else {
        // Resetear para formulario nuevo
        setSelectedSubgrupo('');
        setAvailableCategorias([]);
        setFormData({
          id_material_extra: '',
          descripcion: '',
          categoria: '',
          presentacion: '',
          unidad: '',
          permite_decimales: false,
          cantidad_disponible: '',
          stock_minimo: '',
          marca: '',
          estado_calidad: 'Bueno',
          ubicacion: 'Bodega CDMX',
          precioxunidad: '',
          uso_principal: ''
        });
      }
    }
  }, [open, material]);

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
    const value = field === 'permite_decimales' ? event.target.checked : event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubgrupoChange = (event) => {
    const subgrupo = event.target.value;
    setSelectedSubgrupo(subgrupo);
    setAvailableCategorias(subgrupo ? SUBGRUPOS_CATEGORIAS_MATERIALES[subgrupo] : []);
    setFormData(prev => ({ ...prev, categoria: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSend = { ...formData };
    if (formData.precioxunidad === '' || formData.precioxunidad === null) {
      setFormError('Debes ingresar un precio por unidad');
      return;
    }

    if (dataToSend.precioxunidad === '' || dataToSend.precioxunidad === null) {
      delete dataToSend.precioxunidad;
    }
    // Si cantidad_disponible es vacío, bórralo del objeto
    if (dataToSend.cantidad_disponible === '' || dataToSend.cantidad_disponible === null) {
      delete dataToSend.cantidad_disponible;
    }
    // Si stock_minimo es vacío, bórralo del objeto
    if (dataToSend.stock_minimo === '' || dataToSend.stock_minimo === null) {
      delete dataToSend.stock_minimo;
    }
    // Si permite_decimales es null, bórralo
    if (dataToSend.permite_decimales === null) {
      delete dataToSend.permite_decimales;
    }
    if (material) {
      await dispatch(updateMaterial({ id: material.id_item, materialData: dataToSend }));
    } else {
      await dispatch(createMaterial(dataToSend));
    }
    setFormError('');
  };

  const handleClose = () => {
    dispatch(clearError());
    setFormError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {material ? 'Editar Material' : 'Nuevo Material'}
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
                label="ID del Material"
                value={formData.id_material_extra}
                onChange={handleInputChange('id_material_extra')}
                required
                disabled={!!material}
                helperText="Código único del material"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Descripción"
                value={formData.descripcion}
                onChange={handleInputChange('descripcion')}
                required
                helperText="Nombre o descripción del material"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Subgrupo</InputLabel>
                <Select value={selectedSubgrupo} label="Subgrupo" onChange={handleSubgrupoChange}>
                  {Object.keys(SUBGRUPOS_CATEGORIAS_MATERIALES).map(sub => <MenuItem key={sub} value={sub}>{sub}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required disabled={!selectedSubgrupo}>
                <InputLabel>Categoría</InputLabel>
                <Select value={formData.categoria} label="Categoría" onChange={handleInputChange('categoria')}>
                  {availableCategorias.map(cat => <MenuItem key={cat} value={cat}>{cat}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Presentación"
                value={formData.presentacion}
                onChange={handleInputChange('presentacion')}
                helperText="Forma de presentación (ej: rollo, caja, etc.)"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Unidad"
                value={formData.unidad}
                onChange={handleInputChange('unidad')}
                required
                helperText="Unidad de medida (ej: piezas, metros, etc.)"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Marca"
                value={formData.marca}
                onChange={handleInputChange('marca')}
                helperText="Marca del fabricante"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Cantidad Disponible"
                type="number"
                value={formData.cantidad_disponible}
                onChange={handleInputChange('cantidad_disponible')}
                inputProps={{ min: 0, step: formData.permite_decimales ? 0.01 : 1 }}
                helperText="Cantidad inicial en inventario"
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
                helperText="Precio unitario (opcional)"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Estado de Calidad</InputLabel>
                <Select
                  value={formData.estado_calidad}
                  onChange={handleInputChange('estado_calidad')}
                  label="Estado de Calidad"
                >
                  {estadosValidos.map((estado) => (
                    <MenuItem key={estado} value={estado}>
                      {estado}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Ubicación</InputLabel>
                <Select
                  value={formData.ubicacion}
                  onChange={handleInputChange('ubicacion')}
                  label="Ubicación"
                >
                  {ubicacionesValidas.map((ubicacion) => (
                    <MenuItem key={ubicacion} value={ubicacion}>
                      {ubicacion}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Uso Principal"
                value={formData.uso_principal}
                onChange={handleInputChange('uso_principal')}
                multiline
                rows={2}
                helperText="Descripción del uso principal del material"
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.permite_decimales}
                    onChange={handleInputChange('permite_decimales')}
                  />
                }
                label="Permite decimales en cantidades"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Stock Mínimo"
                type="number"
                inputProps={{ min: 0, step: 'any' }}
                value={formData.stock_minimo}
                onChange={handleInputChange('stock_minimo')}
                helperText="Cantidad mínima antes de generar alerta"
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
          >
            {loading ? 'Guardando...' : (material ? 'Actualizar' : 'Crear')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default MaterialModal; 