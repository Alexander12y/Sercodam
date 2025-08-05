import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Typography,
  Box,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  Delete as DeleteIcon,
  RestoreFromTrash as RestoreIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { cotizacionesDraftsApi } from '../services/api';

const CotizacionDraftsModal = ({ open, onClose, onSelectDraft, currentUserId }) => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      loadDrafts();
    }
  }, [open]);

  const loadDrafts = async () => {
    setLoading(true);
    setError(null);
    try {
      // Cargar solo el draft del usuario actual
      if (currentUserId) {
        const response = await cotizacionesDraftsApi.getDraftByUser(currentUserId);
        if (response.data?.data) {
          setDrafts([response.data.data]);
        } else {
          setDrafts([]);
        }
      }
    } catch (error) {
      console.error('Error cargando drafts de cotizaciones:', error);
      setError('Error al cargar el draft disponible');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDraft = (draft) => {
    if (onSelectDraft) {
      onSelectDraft(draft);
    }
    onClose();
  };

  const handleDeleteDraft = async (draftId) => {
    try {
      await cotizacionesDraftsApi.deleteDraft(draftId);
      loadDrafts(); // Recargar la lista
    } catch (error) {
      console.error('Error eliminando draft:', error);
      setError('Error al eliminar el draft');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDraftStatusColor = (draft) => {
    const now = new Date();
    const expiration = new Date(draft.fecha_expiracion);
    const daysDiff = Math.ceil((expiration - now) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 1) return 'error';
    if (daysDiff <= 3) return 'warning';
    return 'success';
  };

  const getDraftStatusText = (draft) => {
    const now = new Date();
    const expiration = new Date(draft.fecha_expiracion);
    const daysDiff = Math.ceil((expiration - now) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 0) return 'Expirado';
    if (daysDiff === 1) return 'Expira hoy';
    if (daysDiff <= 3) return `Expira en ${daysDiff} días`;
    return `${daysDiff} días restantes`;
  };

  // Calcular progreso del draft (5 fases totales)
  const getDraftProgress = (draft) => {
    const seccionActual = draft.seccion_actual || 1;
    return (seccionActual / 5) * 100; // 5 fases totales
  };

  // Obtener texto de progreso
  const getProgressText = (draft) => {
    const seccionActual = draft.seccion_actual || 1;
    const fases = [
      'Información General',
      'Productos y Servicios',
      'Condiciones de Pago',
      'Información Adicional',
      'Cláusula Personalizada'
    ];
    return `Fase ${seccionActual}: ${fases[seccionActual - 1]}`;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <RestoreIcon />
          <Typography variant="h6">
            Restaurar Draft de Cotización
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Cargando drafts...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : drafts.length === 0 ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No hay drafts disponibles
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No se encontraron drafts de cotizaciones para restaurar
            </Typography>
          </Box>
        ) : (
          <List>
            {drafts.map((draft, index) => (
              <React.Fragment key={draft.id_draft}>
                <ListItem 
                  button 
                  onClick={() => handleSelectDraft(draft)}
                  sx={{ 
                    border: '1px solid #e0e0e0', 
                    borderRadius: 1, 
                    mb: 1,
                    '&:hover': {
                      backgroundColor: '#f5f5f5'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">
                          Cotización - Sección {draft.seccion_actual}
                        </Typography>
                        <Chip 
                          label={getDraftStatusText(draft)} 
                          size="small" 
                          color={getDraftStatusColor(draft)}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          <ScheduleIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                          Última actualización: {formatDate(draft.fecha_actualizacion)}
                        </Typography>
                        
                        {/* Información del cliente si está disponible */}
                        {draft.datos_formulario?.nombre_cliente && (
                          <Typography variant="body2" color="text.secondary">
                            <PersonIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                            Cliente: {draft.datos_formulario.nombre_cliente}
                          </Typography>
                        )}
                        
                        {/* Información del proyecto si está disponible */}
                        {draft.datos_formulario?.titulo_proyecto && (
                          <Typography variant="body2" color="text.secondary">
                            Proyecto: {draft.datos_formulario.titulo_proyecto}
                          </Typography>
                        )}
                        
                        {/* Resumen de elementos */}
                        <Box display="flex" gap={1} mt={1}>
                          {draft.detalle_productos?.length > 0 && (
                            <Chip 
                              label={`${draft.detalle_productos.length} productos`} 
                              size="small" 
                              variant="outlined" 
                            />
                          )}
                          {draft.conceptos_extra_list?.length > 0 && (
                            <Chip 
                              label={`${draft.conceptos_extra_list.length} conceptos extra`} 
                              size="small" 
                              variant="outlined" 
                            />
                          )}
                        </Box>
                        
                        {/* Barra de progreso */}
                        <Box mt={2}>
                          <LinearProgress
                             variant="determinate" 
                             value={getDraftProgress(draft)} 
                             sx={{ 
                               height: 8, 
                               borderRadius: 4,
                               backgroundColor: '#e0e0e0',
                               '& .MuiLinearProgress-bar': {
                                 backgroundColor: '#2196f3', // Azul
                                 borderRadius: 4
                               }
                             }} 
                           />
                         </Box>
                      </Box>
                    }
                  />
                  
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDraft(draft.id_draft);
                      }}
                      color="error"
                      title="Eliminar draft"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                
                {index < drafts.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CotizacionDraftsModal;