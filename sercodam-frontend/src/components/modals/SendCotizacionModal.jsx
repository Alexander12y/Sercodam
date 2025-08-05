import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  PictureAsPdf as PdfIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api, { cotizacionesApi } from '../../services/api';

const SendCotizacionModal = ({ open, onClose, cotizacion }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [whatsAppSent, setWhatsAppSent] = useState(false);

  useEffect(() => {
    if (open && cotizacion) {
      generatePdfPreview();
    }
  }, [open, cotizacion]);

  const generatePdfPreview = async () => {
    if (!cotizacion) return;
    
    setLoading(true);
    try {
      const response = await cotizacionesApi.generatePDFPreview(cotizacion.id_cotizacion);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfPreview(url);
    } catch (error) {
      console.error('Error generando preview PDF:', error);
      enqueueSnackbar('Error generando preview del PDF', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!cotizacion?.email_cliente) {
      enqueueSnackbar('La cotización no tiene un email de cliente asociado', { variant: 'error' });
      return;
    }

    setSendingEmail(true);
    try {
      await api.post(`/cotizaciones/${cotizacion.id_cotizacion}/send-email`);
      setEmailSent(true);
      enqueueSnackbar('Cotización enviada por email exitosamente', { variant: 'success' });
    } catch (error) {
      console.error('Error enviando email:', error);
      const errorMessage = error.response?.data?.error || 'Error enviando email';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!cotizacion?.telefono_cliente) {
      enqueueSnackbar('La cotización no tiene un teléfono de cliente asociado', { variant: 'error' });
      return;
    }

    setSendingWhatsApp(true);
    try {
      // TODO: Implementar envío por WhatsApp
      // Por ahora solo simulamos el envío
      await new Promise(resolve => setTimeout(resolve, 2000));
      setWhatsAppSent(true);
      enqueueSnackbar('Función de WhatsApp en desarrollo', { variant: 'info' });
    } catch (error) {
      console.error('Error enviando WhatsApp:', error);
      enqueueSnackbar('Error enviando por WhatsApp', { variant: 'error' });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleClose = () => {
    setEmailSent(false);
    setWhatsAppSent(false);
    if (pdfPreview) {
      URL.revokeObjectURL(pdfPreview);
      setPdfPreview(null);
    }
    onClose();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-MX');
  };

  if (!cotizacion) return null;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Box>
          <Typography variant="h6" component="div">
            Enviar Cotización
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {cotizacion.numero_cotizacion} - {cotizacion.titulo_proyecto}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* Información de la cotización */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ height: 'fit-content' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Información del Cliente
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Cliente
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {cotizacion.nombre_cliente}
                  </Typography>
                  {cotizacion.empresa_cliente && (
                    <Typography variant="body2" color="text.secondary">
                      {cotizacion.empresa_cliente}
                    </Typography>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Email
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {cotizacion.email_cliente || 'No especificado'}
                  </Typography>
                  {!cotizacion.email_cliente && (
                    <Alert severity="warning" sx={{ mt: 1, fontSize: '0.75rem' }}>
                      No se puede enviar por email
                    </Alert>
                  )}
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Teléfono
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {cotizacion.telefono_cliente || 'No especificado'}
                  </Typography>
                  {!cotizacion.telefono_cliente && (
                    <Alert severity="warning" sx={{ mt: 1, fontSize: '0.75rem' }}>
                      No se puede enviar por WhatsApp
                    </Alert>
                  )}
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Proyecto
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {cotizacion.titulo_proyecto}
                  </Typography>
                  <Chip 
                    label={cotizacion.tipo_proyecto} 
                    size="small" 
                    color="primary" 
                    sx={{ mt: 1 }}
                  />
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Total
                  </Typography>
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    {formatCurrency(cotizacion.total)}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Fecha de creación
                  </Typography>
                  <Typography variant="body1">
                    {formatDate(cotizacion.fecha_creacion)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* Botones de envío */}
            <Card variant="outlined" sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Enviar por
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={emailSent ? <CheckIcon /> : <EmailIcon />}
                    onClick={handleSendEmail}
                    disabled={!cotizacion.email_cliente || sendingEmail || emailSent}
                    sx={{ 
                      backgroundColor: emailSent ? 'success.main' : '#CE0A0A',
                      '&:hover': {
                        backgroundColor: emailSent ? 'success.dark' : '#a00808'
                      }
                    }}
                    fullWidth
                  >
                    {sendingEmail ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : emailSent ? (
                      'Email Enviado'
                    ) : (
                      'Enviar por Email'
                    )}
                  </Button>

                  <Button
                    variant="outlined"
                    startIcon={whatsAppSent ? <CheckIcon /> : <WhatsAppIcon />}
                    onClick={handleSendWhatsApp}
                    disabled={!cotizacion.telefono_cliente || sendingWhatsApp || whatsAppSent}
                    color="success"
                    fullWidth
                  >
                    {sendingWhatsApp ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : whatsAppSent ? (
                      'WhatsApp Enviado'
                    ) : (
                      'Enviar por WhatsApp'
                    )}
                  </Button>
                </Box>

                {(emailSent || whatsAppSent) && (
                  <Alert 
                    severity="success" 
                    sx={{ mt: 2 }}
                    icon={<CheckIcon />}
                  >
                    {emailSent && whatsAppSent 
                      ? 'Cotización enviada por ambos medios'
                      : emailSent 
                        ? 'Cotización enviada por email'
                        : 'Cotización enviada por WhatsApp'
                    }
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Preview del PDF */}
          <Grid item xs={12} md={8}>
            <Card variant="outlined" sx={{ height: '60vh' }}>
              <CardContent sx={{ p: 0, height: '100%' }}>
                <Box sx={{ 
                  p: 2, 
                  borderBottom: '1px solid #e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <PdfIcon color="error" />
                  <Typography variant="h6">
                    Preview del PDF
                  </Typography>
                </Box>
                
                <Box sx={{ height: 'calc(100% - 60px)', p: 1 }}>
                  {loading ? (
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      height: '100%' 
                    }}>
                      <CircularProgress />
                    </Box>
                  ) : pdfPreview ? (
                    <iframe
                      src={pdfPreview}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        borderRadius: '4px'
                      }}
                      title="PDF Preview"
                    />
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      height: '100%',
                      flexDirection: 'column',
                      gap: 2
                    }}>
                      <ErrorIcon color="error" sx={{ fontSize: 48 }} />
                      <Typography color="text.secondary">
                        Error cargando el preview del PDF
                      </Typography>
                      <Button 
                        variant="outlined" 
                        onClick={generatePdfPreview}
                        size="small"
                      >
                        Reintentar
                      </Button>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
        <Button onClick={handleClose} color="inherit">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SendCotizacionModal; 