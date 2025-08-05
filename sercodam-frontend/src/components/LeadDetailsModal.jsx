import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Grid,
  Divider,
  IconButton,
  Alert,
  CircularProgress,
  Paper
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  ContactPhone as ContactIcon,
  Description as DescriptionIcon
} from '@mui/icons-material';
import { fetchLeadById } from '../store/slices/leadsSlice';

const LeadDetailsModal = ({ open, onClose, leadId }) => {
  const dispatch = useDispatch();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && leadId) {
      loadLeadDetails();
    }
  }, [open, leadId]);

  const loadLeadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await dispatch(fetchLeadById(leadId)).unwrap();
      setLead(result.data);
    } catch (err) {
      setError(err.message || 'Error al cargar los detalles del lead');
    } finally {
      setLoading(false);
    }
  };

  const handleContactar = () => {
    // TODO: Implementar funcionalidad de contacto
    console.log('Contactar al cliente:', lead?.email_remitente);
    alert(`Funcionalidad de contacto en desarrollo. Email: ${lead?.email_remitente}`);
  };

  const handleCotizacion = () => {
    // TODO: Implementar funcionalidad de cotización
    console.log('Generar cotización para:', lead?.nombre_remitente);
    alert('Funcionalidad de cotización en desarrollo');
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'nuevo': return 'primary';
      case 'en_revision': return 'warning';
      case 'contactado': return 'info';
      case 'convertido': return 'success';
      case 'descartado': return 'error';
      default: return 'default';
    }
  };

  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'nuevo': return 'Nuevo';
      case 'en_revision': return 'En Revisión';
      case 'contactado': return 'Contactado';
      case 'convertido': return 'Convertido';
      case 'descartado': return 'Descartado';
      default: return estado;
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'No especificado';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Detalles del Lead
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : lead ? (
          <Box>
            {/* Header con información principal */}
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'grey.50' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                  <Typography variant="h5" gutterBottom>
                    {lead.nombre_remitente || 'Sin nombre'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EmailIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body1">
                      {lead.email_remitente}
                    </Typography>
                  </Box>
                  {lead.empresa && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <BusinessIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body1">
                        {lead.empresa}
                      </Typography>
                    </Box>
                  )}
                  {lead.telefono && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body1">
                        {lead.telefono}
                      </Typography>
                    </Box>
                  )}
                </Grid>
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Chip
                      label={getEstadoLabel(lead.estado)}
                      color={getEstadoColor(lead.estado)}
                      size="medium"
                    />
                    <Chip
                      label={lead.leido ? 'Leído' : 'No leído'}
                      color={lead.leido ? 'success' : 'warning'}
                      variant={lead.leido ? 'filled' : 'outlined'}
                      size="small"
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Información del email */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <EmailIcon sx={{ mr: 1 }} />
                Información del Email
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Asunto:
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {lead.asunto_email || 'Sin asunto'}
                  </Typography>
                </Grid>
                
                                 <Grid item xs={12}>
                   <Typography variant="subtitle2" color="text.secondary">
                     Contenido del Email:
                   </Typography>
                   <Paper 
                     variant="outlined" 
                     sx={{ 
                       p: 3, 
                       backgroundColor: '#fafafa',
                       maxHeight: 300,
                       overflow: 'auto',
                       border: '1px solid #e0e0e0',
                       borderRadius: 2
                     }}
                   >
                     <Box sx={{ 
                       fontFamily: 'Roboto, Arial, sans-serif',
                       fontSize: '0.9rem',
                       lineHeight: 1.6,
                       color: '#333',
                       whiteSpace: 'pre-wrap',
                       wordBreak: 'break-word'
                     }}>
                       {lead.contenido_email ? (
                         <>
                           <Typography variant="body2" sx={{ mb: 2, fontWeight: 500, color: '#666' }}>
                             📧 Email Original de Gmail:
                           </Typography>
                           <Box sx={{ 
                             backgroundColor: 'white', 
                             p: 2, 
                             borderRadius: 1,
                             border: '1px solid #e8e8e8'
                           }}>
                             {lead.contenido_email}
                           </Box>
                         </>
                       ) : (
                         <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                           No hay contenido del email disponible. Verifica la configuración de Make.com.
                         </Typography>
                       )}
                     </Box>
                   </Paper>
                 </Grid>

                {lead.contenido_interpretado && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Interpretación:
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                      {lead.contenido_interpretado}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

            {/* Información adicional */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Información Adicional
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                {lead.requerimientos && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Requerimientos:
                    </Typography>
                    <Typography variant="body2">
                      {lead.requerimientos}
                    </Typography>
                  </Grid>
                )}
                
                {lead.presupuesto_estimado && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Presupuesto Estimado:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {formatCurrency(lead.presupuesto_estimado)}
                    </Typography>
                  </Grid>
                )}

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Fuente:
                  </Typography>
                  <Typography variant="body2">
                    {lead.fuente || 'Email'}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Fecha de Recepción:
                  </Typography>
                  <Typography variant="body2">
                    {formatFecha(lead.fecha_recepcion)}
                  </Typography>
                </Grid>

                {lead.fecha_contacto && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Fecha de Contacto:
                    </Typography>
                    <Typography variant="body2">
                      {formatFecha(lead.fecha_contacto)}
                    </Typography>
                  </Grid>
                )}

                {lead.fecha_conversion && (
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Fecha de Conversión:
                    </Typography>
                    <Typography variant="body2">
                      {formatFecha(lead.fecha_conversion)}
                    </Typography>
                  </Grid>
                )}

                {lead.notas && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Notas:
                    </Typography>
                    <Typography variant="body2">
                      {lead.notas}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Paper>

                         {/* Datos estructurados si existen */}
             {lead.datos_estructurados && (
               <Paper sx={{ p: 3, mb: 3 }}>
                 <Typography variant="h6" gutterBottom>
                   Datos Estructurados
                 </Typography>
                 <Divider sx={{ mb: 2 }} />
                 <Paper 
                   variant="outlined" 
                   sx={{ 
                     p: 2, 
                     backgroundColor: 'grey.50',
                     maxHeight: 150,
                     overflow: 'auto'
                   }}
                 >
                   <pre style={{ margin: 0, fontSize: '0.75rem' }}>
                     {JSON.stringify(
                       typeof lead.datos_estructurados === 'string' 
                         ? JSON.parse(lead.datos_estructurados) 
                         : lead.datos_estructurados, 
                       null, 
                       2
                     )}
                   </pre>
                 </Paper>
               </Paper>
             )}
          </Box>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Cerrar
        </Button>
        <Button 
          onClick={handleContactar} 
          variant="contained" 
          color="primary"
          startIcon={<ContactIcon />}
        >
          Contactar Cliente
        </Button>
        <Button 
          onClick={handleCotizacion} 
          variant="contained" 
          color="success"
          startIcon={<DescriptionIcon />}
        >
          Generar Cotización
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeadDetailsModal; 