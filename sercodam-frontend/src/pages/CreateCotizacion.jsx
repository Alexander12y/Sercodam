import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  Alert,
  LinearProgress,
  Chip,
  Snackbar
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Save as SaveIcon,
  PictureAsPdf as PdfIcon,
  RestoreFromTrash as RestoreIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useCotizacionDraft } from '../hooks/useCotizacionDraft';
import { cotizacionesDraftsApi } from '../services/api';
import CotizacionDraftsModal from '../components/CotizacionDraftsModal';

// Importar secciones del formulario
import {
  SeccionGeneral,
  SeccionProductos,
  SeccionCondiciones,
  SeccionAdicional,
  SeccionClausula
} from '../components/forms/cotizacion/SeccionesCotizacion';

import {
  initNewCotizacion,
  fetchCotizacionById,
  createCotizacion,
  updateCotizacion,
  generatePDF,
  clearError,
  clearCurrentCotizacion,
  updateCurrentCotizacion
} from '../store/slices/cotizacionesSlice';

// Importar acciones para cargar datos
import { fetchClientes } from '../store/slices/clientesSlice';
import { fetchPanos } from '../store/slices/panosSlice';
import { fetchMateriales } from '../store/slices/materialesSlice';
import { fetchHerramientas } from '../store/slices/herramientasSlice';

const steps = [
  'Información General',
  'Productos y Servicios', 
  'Condiciones de Pago',
  'Información Adicional',
  'Cláusula Personalizada'
];

const CreateCotizacion = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const {
    currentCotizacion,
    loading,
    error,
    pdfUrl,
    pdfGenerating
  } = useSelector((state) => state.cotizaciones);

  const { user } = useSelector((state) => state.auth);

  // Estados locales
  const [activeStep, setActiveStep] = useState(0);
  const [validationErrors, setValidationErrors] = useState({});

  // Estados para drafts
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showDraftRestored, setShowDraftRestored] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [hasStartedEditing, setHasStartedEditing] = useState(false);
  const [isRestoringDraft, setIsRestoringDraft] = useState(false);

  // Hook de drafts (solo para nuevas cotizaciones, no para edición)
  const {
    draft,
    loading: draftLoading,
    saving: draftSaving,
    lastSaved,
    saveDraft,
    saveDraftImmediately,
    deleteDraft,
    loadDraft
  } = useCotizacionDraft(user?.id && !isEdit ? user.id : null, activeStep + 1);

  // Verificar si hay un draft disponible al cargar el componente
  useEffect(() => {
    if (user?.id && !isEdit) {
      checkForDraft();
    }
  }, [user?.id, isEdit]);

  // Inicializar formulario y cargar datos necesarios
  useEffect(() => {
    // Cargar datos necesarios para el formulario
    dispatch(fetchClientes());
    dispatch(fetchPanos());
    dispatch(fetchMateriales());
    dispatch(fetchHerramientas());

    if (isEdit) {
      dispatch(fetchCotizacionById(id));
    } else {
      dispatch(initNewCotizacion());
    }

    return () => {
      dispatch(clearCurrentCotizacion());
    };
  }, [dispatch, id, isEdit]);

  // Verificar draft disponible (sin mostrar modal automáticamente)
  const checkForDraft = async () => {
    if (!user?.id) return;
    
    try {
      const response = await cotizacionesDraftsApi.getDraftByUser(user.id);
      if (response.data?.data && response.data.data !== null) {
        setDraftAvailable(true);
        await loadDraft(); // Cargar datos del draft en el hook
      } else {
        setDraftAvailable(false);
      }
    } catch (error) {
      // No hay draft disponible
      setDraftAvailable(false);
    }
  };

  // Función para restaurar datos del draft
  const restoreDraftData = (draftData) => {
    console.log('🔄 Restaurando datos del draft de cotización:', draftData);
    if (draftData.datos_formulario) {
      dispatch(updateCurrentCotizacion(draftData.datos_formulario));
    }
    if (draftData.seccion_actual) {
      setActiveStep(draftData.seccion_actual - 1); // -1 porque seccion_actual es 1-indexed
    }
  };

  // Manejar selección de draft para restaurar
  const handleSelectDraft = (selectedDraft) => {
    setIsRestoringDraft(true);
    
    // Restaurar datos del draft seleccionado
    restoreDraftData(selectedDraft);
    
    setHasStartedEditing(true);
    setShowDraftRestored(true);
    setShowDraftsModal(false); // Cerrar modal
    
    // Permitir guardado después de un breve delay
    setTimeout(() => {
      setIsRestoringDraft(false);
    }, 1000);
  };

  // Limpiar draft
  const handleClearDraft = async () => {
    await deleteDraft();
    setDraftAvailable(false);
    setHasStartedEditing(false);
    setIsRestoringDraft(false);
    
    // Reinicializar formulario
    dispatch(initNewCotizacion());
    setActiveStep(0);
    setValidationErrors({});
  };

  // Guardar draft automáticamente cuando hay cambios
  useEffect(() => {
    if (currentCotizacion && hasStartedEditing && !isEdit && user?.id) {
      const detalleProductos = currentCotizacion.detalle || [];
      const conceptosExtraList = currentCotizacion.conceptos_extra_list || [];
      
      saveDraft(currentCotizacion, detalleProductos, conceptosExtraList);
    }
  }, [currentCotizacion, hasStartedEditing, isEdit, user?.id, saveDraft]);

  // Limpiar errores
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearError());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  // Validaciones por sección
  const validateSection = (section) => {
    const errors = {};

    switch (section) {
      case 0: // Información General
        if (!currentCotizacion?.id_cliente) {
          errors.id_cliente = 'Cliente es obligatorio';
        }
        if (!currentCotizacion?.titulo_proyecto?.trim()) {
          errors.titulo_proyecto = 'Título del proyecto es obligatorio';
        }
        if (!currentCotizacion?.tipo_proyecto) {
          errors.tipo_proyecto = 'Tipo de proyecto es obligatorio';
        }
        if (!currentCotizacion?.tiempo_entrega?.trim()) {
          errors.tiempo_entrega = 'Tiempo de entrega es obligatorio';
        }
        break;

      case 1: // Productos y Servicios
        if (!currentCotizacion?.detalle || currentCotizacion.detalle.length === 0) {
          errors.detalle = 'Debe agregar al menos un producto';
        } else {
          currentCotizacion.detalle.forEach((item, index) => {
            // Validar que el item tenga un identificador válido (id_item para panos, id_material_extra para materiales, o notas para productos personalizados)
            if (!item.id_item && !item.id_material_extra && !item.notas) {
              errors[`item_${index}_id_item`] = 'Producto es obligatorio';
            }
            if (!item.cantidad || item.cantidad <= 0) {
              errors[`item_${index}_cantidad`] = 'Cantidad debe ser mayor a 0';
            }
            if (!item.precio_unitario || item.precio_unitario <= 0) {
              errors[`item_${index}_precio_unitario`] = 'Precio debe ser mayor a 0';
            }
          });
        }
        break;

      case 2: // Condiciones de Pago
        if (!currentCotizacion?.condiciones_pago?.trim()) {
          errors.condiciones_pago = 'Condiciones de pago son obligatorias';
        }
        break;

      case 3: // Información Adicional
        // Esta sección es completamente opcional
        break;

      case 4: // Cláusula Personalizada
        if (currentCotizacion?.titulo_clausula_personalizada && 
            !currentCotizacion?.descripcion_clausula_personalizada?.trim()) {
          errors.descripcion_clausula_personalizada = 'Si agrega título, debe agregar descripción';
        }
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Navegación entre pasos
  const handleNext = () => {
    if (validateSection(activeStep)) {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleStepClick = (step) => {
    // Permitir navegar a pasos anteriores o al paso actual + 1 si es válido
    if (step <= activeStep || (step === activeStep + 1 && validateSection(activeStep))) {
      setActiveStep(step);
    }
  };

  // Guardar cotización
  const handleSave = async () => {
    // Validar todas las secciones obligatorias
    const isValid = [0, 1, 2].every(section => validateSection(section));
    
    if (!isValid) {
      return;
    }

    try {
      if (isEdit) {
        await dispatch(updateCotizacion({ 
          id: currentCotizacion.id_cotizacion, 
          data: currentCotizacion 
        })).unwrap();
      } else {
        await dispatch(createCotizacion(currentCotizacion)).unwrap();
      }
      
      navigate('/cotizaciones');
    } catch (error) {
      console.error('Error guardando cotización:', error);
    }
  };

  // Generar PDF
  const handleGeneratePDF = async () => {
    if (currentCotizacion?.id_cotizacion) {
      await dispatch(generatePDF(currentCotizacion.id_cotizacion));
    }
  };

  // Renderizar contenido de la sección actual
  const renderStepContent = (step) => {
    const handleUpdate = (field, value) => {
      if (!hasStartedEditing && !isEdit) {
        setHasStartedEditing(true);
      }
      dispatch(updateCurrentCotizacion({ [field]: value }));
    };

    switch (step) {
      case 0:
        return <SeccionGeneral cotizacion={currentCotizacion} onUpdate={handleUpdate} />;
      case 1:
        return <SeccionProductos cotizacion={currentCotizacion} onUpdate={handleUpdate} />;
      case 2:
        return <SeccionCondiciones cotizacion={currentCotizacion} onUpdate={handleUpdate} />;
      case 3:
        return <SeccionAdicional cotizacion={currentCotizacion} onUpdate={handleUpdate} />;
      case 4:
        return <SeccionClausula cotizacion={currentCotizacion} onUpdate={handleUpdate} />;
      default:
        return null;
    }
  };

  if (loading && !currentCotizacion) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  // Si no hay cotización actual, mostrar loading
  if (!currentCotizacion) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/cotizaciones')}
          >
            Volver
          </Button>
          <Typography variant="h4">
            {isEdit ? 'Editar Cotización' : 'Nueva Cotización'}
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          {/* Indicador de draft */}
          {!isEdit && (
            <Box display="flex" alignItems="center" gap={1}>
              {draftSaving && (
                <Chip
                  icon={<SaveIcon />}
                  label="Guardando borrador..."
                  color="info"
                  size="small"
                />
              )}
              {lastSaved && !draftSaving && (
                <Chip
                  icon={<HistoryIcon />}
                  label={`Guardado: ${lastSaved.toLocaleTimeString()}`}
                  color="success"
                  size="small"
                />
              )}
            </Box>
          )}

          {isEdit && currentCotizacion?.id_cotizacion && (
            <Button
              variant="outlined"
              startIcon={<PdfIcon />}
              onClick={handleGeneratePDF}
              disabled={pdfGenerating}
            >
              {pdfGenerating ? 'Generando...' : 'Generar PDF'}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </Box>
      </Box>

      {/* Botones de draft */}
      {!isEdit && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          {draftAvailable && (
            <Button
              startIcon={<HistoryIcon />}
              onClick={() => setShowDraftsModal(true)}
              variant="outlined"
              size="small"
            >
              Continuar Draft
            </Button>
          )}
          {draft && (
            <Button
              onClick={handleClearDraft}
              variant="outlined"
              size="small"
              color="error"
            >
              Limpiar Draft
            </Button>
          )}
        </Box>
      )}

      {/* Mostrar errores */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Mostrar errores de validación */}
      {Object.keys(validationErrors).length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Por favor, corrija los errores en el formulario:
          <ul>
            {Object.values(validationErrors).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Stepper */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label, index) => (
            <Step 
              key={label}
              sx={{ cursor: 'pointer' }}
              onClick={() => handleStepClick(index)}
            >
              <StepLabel
                error={Object.keys(validationErrors).some(key => 
                  key.startsWith(`section_${index}`)
                )}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {/* Contenido de la sección */}
      <Paper sx={{ p: 3, mb: 3 }}>
        {renderStepContent(activeStep)}
      </Paper>

      {/* Botones de navegación */}
      <Box display="flex" justifyContent="space-between">
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
        >
          Anterior
        </Button>
        
        <Box display="flex" gap={2}>
          {activeStep === steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading}
              startIcon={<SaveIcon />}
            >
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Cotización'}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleNext}
            >
              Siguiente
            </Button>
          )}
        </Box>
      </Box>

      {/* Preview de PDF */}
      {pdfUrl && (
        <Box mt={3}>
          <Typography variant="h6" mb={2}>Vista Previa del PDF</Typography>
          <iframe
            src={pdfUrl}
            width="100%"
            height="600px"
            style={{ border: '1px solid #ccc' }}
            title="Vista previa de cotización"
          />
        </Box>
      )}

      {/* Modal de drafts */}
      <CotizacionDraftsModal
        open={showDraftsModal}
        onClose={() => setShowDraftsModal(false)}
        onSelectDraft={handleSelectDraft}
        currentUserId={user?.id}
      />

      {/* Snackbar de draft restaurado */}
      <Snackbar
        open={showDraftRestored}
        autoHideDuration={4000}
        onClose={() => setShowDraftRestored(false)}
        message="Borrador restaurado exitosamente"
      />
    </Box>
  );
};

export default CreateCotizacion; 