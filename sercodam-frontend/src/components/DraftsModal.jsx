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
  CircularProgress
} from '@mui/material';
import {
  Delete as DeleteIcon,
  RestoreFromTrash as RestoreIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { draftsApi } from '../services/api';

const DraftsModal = ({ open, onClose, onSelectDraft, currentUserId }) => {
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
      const response = await draftsApi.getAllDrafts();
      setDrafts(response.data?.data || []);
    } catch (error) {
      console.error('Error cargando drafts:', error);
      setError('Error al cargar los drafts disponibles');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (idDraft) => {
    try {
      await draftsApi.deleteDraft(idDraft);
      setDrafts(drafts.filter(draft => draft.id_draft !== idDraft));
    } catch (error) {
      console.error('Error eliminando draft:', error);
      setError('Error al eliminar el draft');
    }
  };

  const handleSelectDraft = (draft) => {
    onSelectDraft(draft);
    onClose();
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

  const getPasoText = (paso) => {
    const pasos = {
      1: 'Formulario Principal',
      2: 'Selección de Paños',
      3: 'Selección de Materiales',
      4: 'Selección de Herramientas'
    };
    return pasos[paso] || 'Paso Desconocido';
  };

  const getProgressPercentage = (paso) => {
    return (paso / 4) * 100;
  };

  if (loading) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Drafts Disponibles</DialogTitle>
        <DialogContent>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            Drafts Disponibles ({drafts.length})
          </Typography>
          <Chip 
            icon={<ScheduleIcon />} 
            label="15 días de duración" 
            size="small" 
            color="info" 
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {drafts.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="body1" color="textSecondary">
              No hay drafts disponibles
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Los drafts se crean automáticamente mientras trabajas en una orden
            </Typography>
          </Box>
        ) : (
          <List>
            {drafts.map((draft, index) => (
              <React.Fragment key={draft.id_draft}>
                <ListItem 
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' },
                    borderRadius: 1,
                    mb: 1
                  }}
                  onClick={() => handleSelectDraft(draft)}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {draft.datos_formulario?.cliente || 'Sin cliente'}
                        </Typography>
                        {draft.id_usuario === currentUserId && (
                          <Chip label="Tuyo" size="small" color="primary" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Box display="flex" alignItems="center" gap={2} mb={1}>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <PersonIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="textSecondary" component="span">
                              {draft.nombre_usuario || `Usuario ${draft.id_usuario}`}
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="textSecondary" component="span">
                            {formatDate(draft.fecha_actualizacion)}
                          </Typography>
                        </Box>
                        
                        {/* Barra de progreso */}
                        <Box mb={1}>
                          <Typography variant="body2" color="textSecondary" gutterBottom component="div">
                            {getPasoText(draft.paso_actual)} ({draft.paso_actual}/4)
                          </Typography>
                          <Box 
                            sx={{ 
                              width: '100%', 
                              height: 4, 
                              backgroundColor: 'grey.200', 
                              borderRadius: 2,
                              overflow: 'hidden'
                            }}
                          >
                            <Box 
                              sx={{ 
                                width: `${getProgressPercentage(draft.paso_actual)}%`, 
                                height: '100%', 
                                backgroundColor: 'primary.main',
                                transition: 'width 0.3s ease'
                              }} 
                            />
                          </Box>
                        </Box>

                        {/* Resumen de elementos */}
                        <Box display="flex" gap={1}>
                          {draft.panos_seleccionados?.length > 0 && (
                            <Chip 
                              label={`${draft.panos_seleccionados.length} paños`} 
                              size="small" 
                              variant="outlined" 
                            />
                          )}
                          {draft.materiales_seleccionados?.length > 0 && (
                            <Chip 
                              label={`${draft.materiales_seleccionados.length} materiales`} 
                              size="small" 
                              variant="outlined" 
                            />
                          )}
                          {draft.herramientas_seleccionadas?.length > 0 && (
                            <Chip 
                              label={`${draft.herramientas_seleccionadas.length} herramientas`} 
                              size="small" 
                              variant="outlined" 
                            />
                          )}
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

export default DraftsModal; 