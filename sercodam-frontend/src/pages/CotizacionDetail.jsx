import React, { useEffect, useState } from 'react';
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
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  Send as SendIcon,
  Transform as ConvertIcon,
  Note as NoteIcon,
  History as HistoryIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Description as DescriptionIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { 
  fetchCotizacionById, 
  changeEstadoCotizacion, 
  generatePDF, 
  convertirAOrden 
} from '../store/slices/cotizacionesSlice';
import { useSnackbar } from 'notistack';

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'por aprobar':
      return 'warning';
    case 'aprobada':
      return 'success';
    case 'no aprobada':
      return 'error';
    case 'enviada':
      return 'info';
    case 'convertida':
      return 'primary';
    case 'rechazada':
      return 'error';
    default:
      return 'default';
  }
};

const getEstadoText = (estado) => {
  switch (estado) {
    case 'por aprobar':
      return 'Por Aprobar';
    case 'aprobada':
      return 'Aprobada';
    case 'no aprobar':
      return 'No Aprobada';
    case 'enviada':
      return 'Enviada';
    case 'convertida':
      return 'Convertida';
    case 'rechazada':
      return 'Rechazada';
    default:
      return estado;
  }
};

const getTipoProyectoText = (tipo) => {
  // Los nuevos valores del enum ya vienen con el formato correcto
  switch (tipo) {
    case 'Redes Industriales':
    case 'Redes de Construcción':
    case 'Redes Deportivas':
    case 'Artículos Deportivos':
      return tipo;
    // Mantener compatibilidad con valores antiguos
    case 'red_deportiva':
      return 'Redes Deportivas';
    case 'red_proteccion':
    case 'red_industrial':
      return 'Redes Industriales';
    case 'sistema_proteccion':
      return 'Redes de Construcción';
    default:
      return tipo;
  }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const CotizacionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  
  const { currentCotizacion: cotizacion, loading, error, pdfGenerating } = useSelector((state) => state.cotizaciones);
  
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    action: null,
    title: '',
    message: '',
    notas: ''
  });

  useEffect(() => {
    if (id) {
      dispatch(fetchCotizacionById(id));
    }
  }, [id, dispatch]);

  const handleCambiarEstado = (nuevoEstado) => {
    const acciones = {
      'aprobada': { 
        title: 'Aprobar Cotización', 
        message: '¿Estás seguro de que quieres aprobar esta cotización? Esto permitirá enviarla al cliente.' 
      },
      'enviada': { 
        title: 'Enviar Cotización', 
        message: '¿Estás seguro de que quieres enviar esta cotización al cliente?' 
      },
      'convertida': { 
        title: 'Convertir a Orden', 
        message: '¿Estás seguro de que quieres convertir esta cotización en una orden de producción?' 
      },
      'rechazada': { 
        title: 'Rechazar Cotización', 
        message: '¿Estás seguro de que quieres rechazar esta cotización?' 
      }
    };

    setConfirmDialog({
      open: true,
      action: nuevoEstado,
      title: acciones[nuevoEstado]?.title || 'Cambiar Estado',
      message: acciones[nuevoEstado]?.message || '¿Estás seguro de que quieres cambiar el estado de esta cotización?',
      notas: ''
    });
  };

  const confirmarAccion = async () => {
    try {
      if (confirmDialog.action === 'convertida') {
        // Convertir a orden
        await dispatch(convertirAOrden(id)).unwrap();
        enqueueSnackbar('Cotización convertida a orden exitosamente', { variant: 'success' });
        navigate('/ordenes'); // Redirigir a órdenes
      } else {
        // Cambiar estado
        await dispatch(changeEstadoCotizacion({ 
          id, 
          estado: confirmDialog.action,
          notas: confirmDialog.notas
        })).unwrap();
        
        enqueueSnackbar(`Estado cambiado exitosamente a ${getEstadoText(confirmDialog.action)}`, { 
          variant: 'success' 
        });
        
        // Recargar la cotización
        dispatch(fetchCotizacionById(id));
      }
    } catch (error) {
      const errorMessage = error.message || 'Error al cambiar el estado de la cotización';
      enqueueSnackbar(errorMessage, { 
        variant: 'error',
        autoHideDuration: 6000
      });
    } finally {
      setConfirmDialog({ open: false, action: null, title: '', message: '', notas: '' });
    }
  };

  const handleGenerarPDF = async () => {
    try {
      await dispatch(generatePDF(id)).unwrap();
      enqueueSnackbar('PDF generado exitosamente', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Error generando PDF', { variant: 'error' });
    }
  };

  const canApprove = (estado) => estado === 'por aprobar';
  const canSend = (estado) => estado === 'aprobada';
  const canConvert = (estado) => estado === 'enviada';
  const canReject = (estado) => estado === 'por aprobar' || estado === 'aprobada';

  if (loading) {
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
        <Alert severity="error" sx={{ mt: 2 }}>
          Error al cargar la cotización: {error}
        </Alert>
      </Container>
    );
  }

  if (!cotizacion) {
    return (
      <Container maxWidth="xl">
        <Alert severity="warning" sx={{ mt: 2 }}>
          Cotización no encontrada
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
             {/* Header */}
       <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
         <IconButton onClick={() => navigate('/cotizaciones')}>
           <ArrowBackIcon />
         </IconButton>
         <Box>
           <Typography variant="h4" component="h1">
             Cotización {cotizacion.numero_cotizacion}
           </Typography>
           <Typography variant="subtitle1" color="text.secondary">
             {cotizacion.titulo_proyecto}
           </Typography>
         </Box>
       </Box>

             {/* Estado y Acciones */}
       <Card sx={{ mb: 3 }}>
         <CardContent>
           <Grid container spacing={2} alignItems="center">
             <Grid item xs={12} md={4}>
               <Typography variant="h6" gutterBottom>
                 Estado Actual
               </Typography>
               <Chip
                 label={getEstadoText(cotizacion.estado)}
                 color={getEstadoColor(cotizacion.estado)}
                 size="large"
               />
             </Grid>
             <Grid item xs={12} md={8}>
               <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                 {/* Acciones de Estado (Flujo de Trabajo) */}
                 {canApprove(cotizacion.estado) && (
                   <Button
                     variant="contained"
                     color="success"
                     startIcon={<CheckCircleIcon />}
                     onClick={() => handleCambiarEstado('aprobada')}
                   >
                     Aprobar
                   </Button>
                 )}
                 
                 {canSend(cotizacion.estado) && (
                   <Button
                     variant="contained"
                     color="info"
                     startIcon={<SendIcon />}
                     onClick={() => handleCambiarEstado('enviada')}
                   >
                     Enviar al Cliente
                   </Button>
                 )}
                 
                 {canConvert(cotizacion.estado) && (
                   <Button
                     variant="contained"
                     color="primary"
                     startIcon={<ConvertIcon />}
                     onClick={() => handleCambiarEstado('convertida')}
                   >
                     Convertir a Orden
                   </Button>
                 )}
                 
                 {canReject(cotizacion.estado) && (
                   <Button
                     variant="outlined"
                     color="error"
                     startIcon={<CancelIcon />}
                     onClick={() => handleCambiarEstado('rechazada')}
                   >
                     Rechazar
                   </Button>
                 )}

                 {/* Separador visual */}
                 {(canApprove(cotizacion.estado) || canSend(cotizacion.estado) || canConvert(cotizacion.estado) || canReject(cotizacion.estado)) && (
                   <Box sx={{ width: 1, height: 32, mx: 1, borderLeft: '1px solid #e0e0e0' }} />
                 )}

                                   {/* Acciones Generales */}
                  <Tooltip title="Generar PDF">
                    <Button
                      variant="outlined"
                      onClick={handleGenerarPDF}
                      color="info"
                      disabled={pdfGenerating}
                      startIcon={<PdfIcon />}
                      sx={{ minWidth: 'auto', px: 2 }}
                    >
                      Descargar PDF
                    </Button>
                  </Tooltip>
                  
                  <Tooltip title="Editar Cotización">
                    <Button
                      variant="outlined"
                      onClick={() => navigate(`/cotizaciones/editar/${id}`)}
                      color="warning"
                      startIcon={<EditIcon />}
                      sx={{ minWidth: 'auto', px: 2 }}
                    >
                      Editar
                    </Button>
                  </Tooltip>
                  
                  <Tooltip title="Actualizar Datos">
                    <Button
                      variant="outlined"
                      onClick={() => dispatch(fetchCotizacionById(id))}
                      color="primary"
                      startIcon={<RefreshIcon />}
                      sx={{ minWidth: 'auto', px: 2 }}
                    >
                      Actualizar
                    </Button>
                  </Tooltip>
               </Box>
             </Grid>
           </Grid>
         </CardContent>
       </Card>

      <Grid container spacing={3}>
        {/* Información del Cliente */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon />
                Información del Cliente
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Nombre"
                    secondary={cotizacion.nombre_cliente}
                  />
                </ListItem>
                
                {cotizacion.empresa_cliente && (
                  <ListItem>
                    <ListItemText
                      primary="Empresa"
                      secondary={cotizacion.empresa_cliente}
                    />
                  </ListItem>
                )}
                
                {cotizacion.email_cliente && (
                  <ListItem>
                    <ListItemText
                      primary="Email"
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon fontSize="small" />
                          {cotizacion.email_cliente}
                        </Box>
                      }
                    />
                  </ListItem>
                )}
                
                {cotizacion.telefono_cliente && (
                  <ListItem>
                    <ListItemText
                      primary="Teléfono"
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon fontSize="small" />
                          {cotizacion.telefono_cliente}
                        </Box>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Información del Proyecto */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BusinessIcon />
                Información del Proyecto
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Título del Proyecto"
                    secondary={cotizacion.titulo_proyecto}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Tipo de Proyecto"
                    secondary={getTipoProyectoText(cotizacion.tipo_proyecto)}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Incluye Instalación"
                    secondary={cotizacion.incluye_instalacion ? 'Sí' : 'No'}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Fecha de Creación"
                    secondary={formatDate(cotizacion.fecha_creacion)}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Información Financiera */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MoneyIcon />
                Información Financiera
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Subtotal"
                    secondary={formatCurrency(cotizacion.subtotal)}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="IVA (16%)"
                    secondary={formatCurrency(cotizacion.iva)}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemText
                    primary="Total"
                    secondary={
                      <Typography variant="h6" color="primary" fontWeight="bold">
                        {formatCurrency(cotizacion.total)}
                      </Typography>
                    }
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Condiciones y Términos */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DescriptionIcon />
                Condiciones y Términos
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Condiciones de Pago</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    {cotizacion.condiciones_pago || 'No especificadas'}
                  </Typography>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Condiciones de Envío</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    {cotizacion.condiciones_envio || 'No especificadas'}
                  </Typography>
                </AccordionDetails>
              </Accordion>
              
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Tiempo de Entrega</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2">
                    {cotizacion.tiempo_entrega || 'No especificado'}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>
        </Grid>

        {/* Detalle de la Cotización */}
        {cotizacion.detalle && cotizacion.detalle.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Detalle de la Cotización
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <TableContainer component={Paper} variant="outlined">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell><strong>Descripción</strong></TableCell>
                        <TableCell><strong>Cantidad</strong></TableCell>
                        <TableCell><strong>Precio Unitario</strong></TableCell>
                        <TableCell><strong>Subtotal</strong></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cotizacion.detalle.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.descripcion}</TableCell>
                          <TableCell>{item.cantidad}</TableCell>
                          <TableCell>{formatCurrency(item.precio_unitario)}</TableCell>
                          <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Observaciones */}
        {cotizacion.observaciones && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <NoteIcon />
                  Observaciones
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body1">
                  {cotizacion.observaciones}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Dialog de confirmación */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, action: null, title: '', message: '', notas: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {confirmDialog.message}
          </DialogContentText>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notas adicionales (opcional)"
            value={confirmDialog.notas}
            onChange={(e) => setConfirmDialog(prev => ({ ...prev, notas: e.target.value }))}
            placeholder="Agregar notas sobre el cambio de estado..."
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setConfirmDialog({ open: false, action: null, title: '', message: '', notas: '' })}
          >
            Cancelar
          </Button>
          <Button 
            onClick={confirmarAccion} 
            variant="contained" 
            color="primary"
            autoFocus
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CotizacionDetail; 