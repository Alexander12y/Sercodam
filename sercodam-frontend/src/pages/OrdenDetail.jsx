import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Tooltip,
  IconButton,
  TextField
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  Receipt as ReceiptIcon,
  Build as BuildIcon,
  Note as NoteIcon,
  History as HistoryIcon,
  SquareFoot as SquareFootIcon,
  ContentCut as ContentCutIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrdenById, cambiarEstadoOrden, approveOrden } from '../store/slices/ordenesSlice';
import { useSnackbar } from 'notistack';
import api from '../services/api';

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'por aprobar':
      return 'warning';
    case 'en_proceso':
      return 'info';
    case 'completada':
      return 'success';
    case 'cancelada':
      return 'error';
    default:
      return 'default';
  }
};

const getEstadoText = (estado) => {
  switch (estado) {
    case 'por aprobar':
      return 'Por Aprobar';
    case 'en_proceso':
      return 'En Proceso';
    case 'completada':
      return 'Completada';
    case 'cancelada':
      return 'Cancelada';
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

const getEstadoTrabajoColor = (estado) => {
  switch (estado) {
    case 'Pendiente':
      return 'warning';
    case 'En progreso':
      return 'info';
    case 'Confirmado':
      return 'success';
    case 'Desviado':
      return 'error';
    default:
      return 'default';
  }
};

const getEstadoTrabajoText = (estado) => {
  switch (estado) {
    case 'Pendiente':
      return 'Pendiente';
    case 'En progreso':
      return 'En Proceso';
    case 'Confirmado':
      return 'Confirmado';
    case 'Desviado':
      return 'Desviado';
    default:
      return estado;
  }
};

const OrdenDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { ordenActual, loading, error } = useSelector((state) => state.ordenes);
  
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: null,
    title: '',
    message: ''
  });
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchOrdenById(id));
    }
  }, [dispatch, id]);

  const handleCambiarEstado = (estado) => {
    setNuevoEstado(estado);
    setDialogOpen(true);
  };

  const confirmarAccion = async () => {
    try {
      if (nuevoEstado === 'en_proceso' && ordenActual?.orden?.estado === 'por aprobar') {
        // Usar approveOrden para órdenes en 'por aprobar'
        await dispatch(approveOrden(id)).unwrap();
        enqueueSnackbar('Orden aprobada exitosamente', { variant: 'success' });
      } else {
        // Usar cambiarEstadoOrden para otros cambios de estado
        await dispatch(cambiarEstadoOrden({ id, estado: nuevoEstado, notas })).unwrap();
        enqueueSnackbar('Estado actualizado exitosamente', { variant: 'success' });
      }
      setDialogOpen(false);
      setNotas('');
      // Recargar la orden
      dispatch(fetchOrdenById(id));
    } catch (error) {
      enqueueSnackbar('Error al actualizar el estado', { variant: 'error' });
    }
  };

  const handleGenerarPDF = async () => {
    try {
      setLoadingPdf(true);
      
      // Siempre generar el PDF (ya no hay campo pdf_generado en la base de datos)
      await api.get(`/ordenes/${id}/pdf`);
      
      // Ahora descargar el PDF
      const response = await api.get(`/ordenes/${id}/pdf/download`, {
        responseType: 'blob'
      });

      // Crear un blob con el PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      
      // Crear URL del blob
      const url = window.URL.createObjectURL(blob);
      
      // Crear elemento de descarga
      const link = document.createElement('a');
      link.href = url;
      link.download = `orden_produccion_${ordenActual.orden.numero_op}.pdf`;
      
      // Simular clic para descargar
      document.body.appendChild(link);
      link.click();
      
      // Limpiar
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      enqueueSnackbar('PDF descargado exitosamente', { variant: 'success' });
    } catch (error) {
      console.error('Error descargando PDF:', error);
      enqueueSnackbar('Error al descargar el PDF', { variant: 'error' });
    } finally {
      setLoadingPdf(false);
    }
  };

  const estadoOrden = ordenActual?.orden?.estado;
  const canApprove = estadoOrden === 'por aprobar';
  const canComplete = estadoOrden === 'en_proceso';
  const canCancel = ['por aprobar', 'en_proceso'].includes(estadoOrden);

  // Procesar paños eliminando duplicados y agrupando por id_item
  const panosProcesados = useMemo(() => {
    if (!ordenActual?.panos) return [];
    
    // Crear un Map para agrupar por id_item y eliminar duplicados
    const panosMap = new Map();
    
    ordenActual.panos.forEach(pano => {
      const key = pano.id_item;
      
      if (!panosMap.has(key)) {
        // Extraer dimensiones de las notas si están disponibles
        let largo_sel = null;
        let ancho_sel = null;
        
        if (pano.notas) {
          const notas = pano.notas.toLowerCase();
          const cantidadNumero = parseFloat(pano.cantidad) || 0;
          
          if (notas.includes('largo')) {
            largo_sel = cantidadNumero;
          } else if (notas.includes('ancho')) {
            ancho_sel = cantidadNumero;
          }
        }
        
        // Usar las dimensiones disponibles del paño
        const largoFinal = largo_sel || pano.largo_m || pano.largo_tomar || 0;
        const anchoFinal = ancho_sel || pano.ancho_m || pano.ancho_tomar || 0;
        
        panosMap.set(key, {
          ...pano,
          largo_sel: largoFinal,
          ancho_sel: anchoFinal,
          cantidad_sel: pano.cantidad || 1,
        });
      }
    });
    
    return Array.from(panosMap.values());
  }, [ordenActual?.panos]);

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

  if (!ordenActual?.orden) {
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
          onClick={() => navigate('/ordenes')}
          sx={{ mr: 2 }}
        >
          Volver
        </Button>
        <Typography variant="h4" component="h1">
          Orden de Producción: {ordenActual.orden.numero_op}
        </Typography>
        <Box sx={{ ml: 'auto' }}>
          <Tooltip title="Actualizar">
            <IconButton
              onClick={() => dispatch(fetchOrdenById(id))}
              disabled={loading}
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Resumen y Cliente */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Detalles de la Orden */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ '& .MuiTypography-body2': { mb: 1 } }}>
              <Typography variant="h6" gutterBottom>
                Detalles de la Orden
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2"><strong>Número OP:</strong> {ordenActual.orden.numero_op}</Typography>
              <Typography variant="body2"><strong>Fecha de Creación:</strong> {new Date(ordenActual.orden.fecha_op).toLocaleDateString()}</Typography>
              <Typography variant="body2">
                <strong>Estado:</strong>
                <Chip
                  label={getEstadoText(ordenActual.orden.estado)}
                  color={getEstadoColor(ordenActual.orden.estado)}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body2">
                <strong>Prioridad:</strong>
                <Chip
                  label={getPrioridadText(ordenActual.orden.prioridad)}
                  color={getPrioridadColor(ordenActual.orden.prioridad)}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="body2"><strong>Observaciones:</strong> {ordenActual.orden.observaciones || 'Ninguna'}</Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Detalles del Cliente */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ '& .MuiTypography-body2': { mb: 1 } }}>
              <Typography variant="h6" gutterBottom>
                Detalles del Cliente
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2"><strong>Nombre:</strong> {ordenActual.orden.nombre_cliente}</Typography>
              <Typography variant="body2"><strong>Email:</strong> {ordenActual.orden.cliente_email || 'No disponible'}</Typography>
              <Typography variant="body2"><strong>Teléfono:</strong> {ordenActual.orden.cliente_telefono || 'No disponible'}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Acciones */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/ordenes/${id}/editar`)}
            >
              Editar
            </Button>
            
            {canApprove && (
              <Button
                variant="contained"
                color="success"
                startIcon={<PlayArrowIcon />}
                onClick={() => handleCambiarEstado('en_proceso')}
              >
                Aprobar Orden
              </Button>
            )}
            
            {canComplete && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircleIcon />}
                onClick={() => handleCambiarEstado('completada')}
              >
                Completar
              </Button>
            )}
            
            {canCancel && (
              <Button
                variant="contained"
                color="error"
                startIcon={<CancelIcon />}
                onClick={() => handleCambiarEstado('cancelada')}
              >
                Cancelar
              </Button>
            )}

            <Button
              variant="contained"
              color="primary"
              startIcon={loadingPdf ? <CircularProgress size={20} color="inherit" /> : <PdfIcon />}
              onClick={handleGenerarPDF}
              disabled={loadingPdf}
            >
              {loadingPdf ? 'Descargando...' : 'Descargar PDF'}
            </Button>

            {estadoOrden === 'en_proceso' && (
              <Button
                variant="contained"
                color="secondary"
                startIcon={<ContentCutIcon />}
                onClick={() => navigate('/ejecutar-corte')}
              >
                Ejecutar Corte
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Paños */}
      {panosProcesados && panosProcesados.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <SquareFootIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Paños ({panosProcesados.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              {panosProcesados.map((pano, index) => {
                const largo = pano.largo_sel || pano.largo_m || pano.largo_tomar || 0;
                const ancho = pano.ancho_sel || pano.ancho_m || pano.ancho_tomar || 0;
                const cantidad = pano.cantidad_sel || pano.cantidad || 1;
                
                return (
                  <ListItem key={`${pano.id_item}-${index}`} divider>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body1">
                            ({cantidad}) Tramo de {Number(largo).toFixed(2)} m de largo x {Number(ancho).toFixed(2)} m de alto
                          </Typography>
                          {pano.estado_trabajo && (
                            <Chip
                              label={getEstadoTrabajoText(pano.estado_trabajo)}
                              color={getEstadoTrabajoColor(pano.estado_trabajo)}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography component="span" variant="body2" color="text.primary">
                            {pano.tipo_red ? `Tipo: ${pano.tipo_red}` : ''} {pano.marca ? `- Marca: ${pano.marca}`: ''}
                          </Typography>
                          <br />
                          <Typography component="span" variant="body2">
                            { generateDynamicSpecs(pano) }
                          </Typography>
                          {pano.notas && (
                            <>
                              <br />
                              <Typography component="span" variant="body2" color="text.secondary">
                                Notas: {pano.notas}
                              </Typography>
                            </>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Materiales Extras */}
      {ordenActual.materiales && ordenActual.materiales.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <ReceiptIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Materiales Extras
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              {ordenActual.materiales.map((material) => (
                <ListItem key={material.id_detalle} divider>
                  <ListItemText
                    primary={`${material.descripcion} (${material.id_material_extra})`}
                    secondary={`Cantidad: ${material.cantidad} ${material.unidad}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Herramientas Asignadas */}
      {ordenActual.herramientas && ordenActual.herramientas.length > 0 && (
        <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
              <BuildIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
              Herramientas Asignadas
              </Typography>
            <Divider sx={{ mb: 2 }} />
            <List>
              {ordenActual.herramientas.map((herramienta) => (
                <ListItem key={herramienta.id_item} divider>
                  <ListItemText
                    primary={`${herramienta.descripcion} (${herramienta.id_herramienta})`}
                    secondary={`Cantidad: ${herramienta.cantidad} ${herramienta.unidad}`}
                />
                </ListItem>
              ))}
            </List>
            </CardContent>
          </Card>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>Confirmar Cambio de Estado</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            ¿Estás seguro de que quieres cambiar el estado de la orden a "{getEstadoText(nuevoEstado)}"?
          </Typography>
          <TextField
            fullWidth
            label="Notas (opcional)"
            multiline
            rows={3}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Agregar notas sobre el cambio de estado..."
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDialogOpen(false)}
          >
            Cancelar
          </Button>
          <Button 
            onClick={confirmarAccion}
            variant="contained"
            color="primary"
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Función auxiliar para calcular el progreso
const getProgresoOrden = (estado) => {
  switch (estado) {
    case 'por aprobar':
      return 25;
    case 'en_proceso':
      return 50;
    case 'completada':
      return 100;
    case 'cancelada':
      return 0;
    default:
      return 0;
  }
};

// Util para generar especificaciones dinámicas (mismo criterio que PDF)
const generateDynamicSpecs = (pano) => {
  const specs = [];
  switch ((pano.tipo_red || '').toLowerCase()) {
    case 'nylon':
      if (pano.nylon_calibre) specs.push(`Calibre: ${pano.nylon_calibre}`);
      if (pano.nylon_cuadro) specs.push(`Cuadro: ${pano.nylon_cuadro}`);
      if (pano.nylon_torsion) specs.push(`Torsión: ${pano.nylon_torsion}`);
      if (pano.nylon_refuerzo !== undefined && pano.nylon_refuerzo !== null) {
        specs.push(`Refuerzo: ${pano.nylon_refuerzo === true || pano.nylon_refuerzo === 't' || pano.nylon_refuerzo === 'Sí' ? 'Sí' : 'No'}`);
      }
      break;
    case 'lona':
      if (pano.lona_color) specs.push(`Color: ${pano.lona_color}`);
      if (pano.lona_presentacion) specs.push(`Presentación: ${pano.lona_presentacion}`);
      break;
    case 'polipropileno':
      if (pano.polipropileno_grosor) specs.push(`Grosor: ${pano.polipropileno_grosor}`);
      if (pano.polipropileno_cuadro) specs.push(`Cuadro: ${pano.polipropileno_cuadro}`);
      break;
    case 'malla sombra':
      if (pano.malla_color) specs.push(`Color/Tipo: ${pano.malla_color}`);
      if (pano.malla_presentacion) specs.push(`Presentación: ${pano.malla_presentacion}`);
      break;
    default:
      break;
  }
  return specs.join(', ');
};

export default OrdenDetail; 