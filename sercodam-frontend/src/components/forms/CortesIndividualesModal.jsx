import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Box,
  Typography,
  Alert,
  Divider,
  IconButton,
  Card,
  CardContent,
  Chip,
  FormControlLabel,
  Checkbox,
  CircularProgress
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
  ContentCut as ScissorsIcon
} from '@mui/icons-material';
import { panosApi } from '../../services/api';

const CortesIndividualesModal = ({ 
  open, 
  onClose, 
  panoSeleccionado, 
  onConfirm,
  umbralSobrante,
  setUmbralSobrante 
}) => {
  const [numeroCortes, setNumeroCortes] = useState(1);
  const [cortesIndividuales, setCortesIndividuales] = useState([]);
  const [todasMismasDimensiones, setTodasMismasDimensiones] = useState(false);
  const [dimensionesUnicas, setDimensionesUnicas] = useState({ largo: '', ancho: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dimensionesRecomendadas, setDimensionesRecomendadas] = useState({ largo: 0, ancho: 0 });
  const [areaTotal, setAreaTotal] = useState(0);
  const [utilizacion, setUtilizacion] = useState(0);

  // Inicializar cortes cuando se abre el modal
  useEffect(() => {
    if (open && panoSeleccionado) {
      setCortesIndividuales([{ largo: '', ancho: '', cantidad: 1 }]);
      setNumeroCortes(1);
      setTodasMismasDimensiones(false);
      setDimensionesUnicas({ largo: '', ancho: '' });
      setError('');
    }
  }, [open, panoSeleccionado]);

  // Actualizar cortes cuando cambia el número
  useEffect(() => {
    if (numeroCortes > 0) {
      const nuevosCortes = [];
      for (let i = 0; i < numeroCortes; i++) {
        if (cortesIndividuales[i]) {
          nuevosCortes.push(cortesIndividuales[i]);
        } else {
          nuevosCortes.push({ largo: '', ancho: '', cantidad: 1 });
        }
      }
      setCortesIndividuales(nuevosCortes);
    }
  }, [numeroCortes]);

  // Aplicar dimensiones únicas cuando se activa la opción
  useEffect(() => {
    if (todasMismasDimensiones && dimensionesUnicas.largo && dimensionesUnicas.ancho) {
      const nuevosCortes = cortesIndividuales.map(() => ({
        largo: dimensionesUnicas.largo,
        ancho: dimensionesUnicas.ancho,
        cantidad: 1
      }));
      setCortesIndividuales(nuevosCortes);
    }
  }, [todasMismasDimensiones, dimensionesUnicas]);

  const handleCorteChange = (index, campo, valor) => {
    const nuevosCortes = [...cortesIndividuales];
    nuevosCortes[index] = { ...nuevosCortes[index], [campo]: valor };
    setCortesIndividuales(nuevosCortes);
  };

  const calcularAreaTotal = () => {
    return cortesIndividuales.reduce((total, corte) => {
      const largo = parseFloat(corte.largo) || 0;
      const ancho = parseFloat(corte.ancho) || 0;
      const cantidad = parseInt(corte.cantidad) || 1;
      return total + (largo * ancho * cantidad);
    }, 0);
  };

  // Función para calcular dimensiones recomendadas usando la API
  const calcularDimensionesRecomendadasAPI = async () => {
    if (!panoSeleccionado || cortesIndividuales.length === 0) return;

    const areaCalculada = calcularAreaTotal();
    if (areaCalculada <= 0) return;

    setLoading(true);
    setError('');

    try {
      console.log('Enviando datos al backend:', {
        id_item: panoSeleccionado.id_item,
        cortes_individuales: cortesIndividuales
      });

      const response = await panosApi.calculateRecommendedDimensions({
        id_item: panoSeleccionado.id_item,
        cortes_individuales: cortesIndividuales
      });

      console.log('Respuesta del backend:', response.data);

      if (response.data.success) {
        const { areaTotal: areaTotalAPI, dimensionesRecomendadas: dimsAPI, utilizacion } = response.data.data;
        setAreaTotal(areaTotalAPI);
        setDimensionesRecomendadas(dimsAPI);
        setUtilizacion(utilizacion);
      } else {
        setError(response.data.message || 'Error en el cálculo');
      }
    } catch (error) {
      console.error('Error calculando dimensiones:', error);
      
      if (error.code === 'ECONNABORTED') {
        setError('La petición tardó demasiado. Verifica que el backend esté funcionando.');
      } else if (error.response?.status === 404) {
        setError('Endpoint no encontrado. Verifica que el backend esté actualizado.');
      } else if (error.response?.status === 500) {
        setError('Error interno del servidor. Revisa los logs del backend.');
      } else {
        setError(error.response?.data?.message || 'Error calculando dimensiones recomendadas');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calcular dimensiones recomendadas cuando cambian los cortes
  useEffect(() => {
    if (cortesIndividuales.length > 0 && panoSeleccionado) {
      const timeoutId = setTimeout(() => {
        calcularDimensionesRecomendadasAPI();
      }, 500); // Debounce de 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [cortesIndividuales, panoSeleccionado]);

  const validarCortes = () => {
    // Validar que todos los cortes tengan dimensiones
    for (let i = 0; i < cortesIndividuales.length; i++) {
      const corte = cortesIndividuales[i];
      if (!corte.largo || !corte.ancho || corte.largo <= 0 || corte.ancho <= 0) {
        setError(`El corte ${i + 1} debe tener dimensiones válidas`);
        return false;
      }
    }

    // Validar que el área total no exceda el área del paño
    const areaTotal = calcularAreaTotal();
    const areaPano = parseFloat(panoSeleccionado?.area_m2) || 0;
    
    if (areaTotal > areaPano) {
      setError(`El área total requerida (${areaTotal.toFixed(2)} m²) excede el área disponible del paño (${areaPano.toFixed(2)} m²)`);
      return false;
    }

    setError('');
    return true;
  };

  const handleConfirmar = () => {
    if (!validarCortes()) return;

    onConfirm({
      cortesIndividuales,
      areaTotal,
      dimensionesRecomendadas,
      numeroCortes
    });
  };

  const areaPano = parseFloat(panoSeleccionado?.area_m2) || 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6">
          Especificar Cortes Individuales
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Paño: {panoSeleccionado?.descripcion || panoSeleccionado?.id_item}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Información del paño */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Información del Paño Seleccionado
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Dimensiones:</strong> {Number(panoSeleccionado?.largo_m || 0).toFixed(2)} × {Number(panoSeleccionado?.ancho_m || 0).toFixed(2)} m
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Área Disponible:</strong> {areaPano.toFixed(2)} m²
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Tipo:</strong> {panoSeleccionado?.tipo_red}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Estado:</strong> {panoSeleccionado?.estado}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Configuración de cortes */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Configuración de Cortes
            </Typography>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Número de cortes"
                  type="number"
                  value={numeroCortes}
                  onChange={(e) => setNumeroCortes(Math.max(1, parseInt(e.target.value) || 1))}
                  inputProps={{ min: 1, max: 20 }}
                  helperText="¿Cuántas piezas necesitas?"
                />
              </Grid>
              
              <Grid item xs={12} md={8}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={todasMismasDimensiones}
                      onChange={(e) => setTodasMismasDimensiones(e.target.checked)}
                    />
                  }
                  label="Todas las piezas tienen las mismas dimensiones"
                />
              </Grid>
            </Grid>

            {/* Dimensiones únicas si está activado */}
            {todasMismasDimensiones && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Dimensiones para todas las piezas:
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Largo (m)"
                      type="number"
                      value={dimensionesUnicas.largo}
                      onChange={(e) => setDimensionesUnicas(prev => ({ ...prev, largo: e.target.value }))}
                      inputProps={{ min: 0.01, step: 0.01 }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Ancho (m)"
                      type="number"
                      value={dimensionesUnicas.ancho}
                      onChange={(e) => setDimensionesUnicas(prev => ({ ...prev, ancho: e.target.value }))}
                      inputProps={{ min: 0.01, step: 0.01 }}
                    />
                  </Grid>
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Lista de cortes individuales */}
        {!todasMismasDimensiones && (
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Especificar Dimensiones de Cada Corte
              </Typography>
              
              {cortesIndividuales.map((corte, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1 }}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="subtitle2">
                      Corte {index + 1}
                    </Typography>
                    <Chip 
                      label={`${((parseFloat(corte.largo) || 0) * (parseFloat(corte.ancho) || 0)).toFixed(2)} m²`}
                      size="small"
                      color="primary"
                    />
                  </Box>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        label="Largo (m)"
                        type="number"
                        value={corte.largo}
                        onChange={(e) => handleCorteChange(index, 'largo', e.target.value)}
                        inputProps={{ min: 0.01, step: 0.01 }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        label="Ancho (m)"
                        type="number"
                        value={corte.ancho}
                        onChange={(e) => handleCorteChange(index, 'ancho', e.target.value)}
                        inputProps={{ min: 0.01, step: 0.01 }}
                        size="small"
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <TextField
                        fullWidth
                        label="Cantidad"
                        type="number"
                        value={corte.cantidad}
                        onChange={(e) => handleCorteChange(index, 'cantidad', e.target.value)}
                        inputProps={{ min: 1, step: 1 }}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Umbral de sobrante */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Configuración de Sobrantes
            </Typography>
            <TextField
              fullWidth
              label="Umbral Remanente (m²)"
              type="number"
              value={umbralSobrante}
              onChange={(e) => setUmbralSobrante(Number(e.target.value))}
              inputProps={{ min: 0, step: 0.01 }}
              helperText="Remanentes menores a este valor serán descartados como desperdicio"
            />
          </CardContent>
        </Card>

        {/* Resumen y dimensiones recomendadas */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Resumen y Dimensiones Recomendadas
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Área Total Requerida:</strong>
                </Typography>
                <Typography variant="h6" color="primary">
                  {loading ? (
                    <CircularProgress size={20} />
                  ) : (
                    `${areaTotal.toFixed(2)} m²`
                  )}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Área Disponible:</strong>
                </Typography>
                <Typography variant="h6" color="success.main">
                  {areaPano.toFixed(2)} m²
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Utilización:</strong>
                </Typography>
                <Typography variant="h6" color={areaTotal > areaPano ? "error" : "success"}>
                  {loading ? (
                    <CircularProgress size={20} />
                  ) : (
                    `${utilizacion}%`
                  )}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>Número de Cortes:</strong>
                </Typography>
                <Typography variant="h6">
                  {numeroCortes}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" gutterBottom>
              Dimensiones Recomendadas para el Corte Objetivo:
            </Typography>
            <Box sx={{ p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={2}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    Calculando dimensiones recomendadas...
                  </Typography>
                </Box>
              ) : (
                <>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Largo (Altura):</strong> {dimensionesRecomendadas.largo.toFixed(3)} m
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">
                        <strong>Ancho:</strong> {dimensionesRecomendadas.ancho.toFixed(3)} m
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="primary" fontWeight="bold">
                        Ratio Largo/Ancho: {(Math.max(dimensionesRecomendadas.largo, dimensionesRecomendadas.ancho) / Math.min(dimensionesRecomendadas.largo, dimensionesRecomendadas.ancho)).toFixed(2)}:1
                      </Typography>
                    </Grid>
                  </Grid>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    <strong>Nota:</strong> Estas dimensiones se calcularon para optimizar el uso del paño y mantener proporciones equilibradas. 
                    El sistema realizará un corte guillotina desde la esquina inferior izquierda.
                  </Typography>
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button 
          onClick={handleConfirmar}
          variant="contained"
          disabled={areaTotal <= 0 || areaTotal > areaPano || loading}
        >
          {loading ? 'Calculando...' : 'Confirmar Cortes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CortesIndividualesModal; 