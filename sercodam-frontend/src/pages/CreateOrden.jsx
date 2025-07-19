import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Alert, 
  CircularProgress, 
  Stepper, 
  Step, 
  StepLabel,
  Chip,
  Snackbar
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Save as SaveIcon,
  RestoreFromTrash as RestoreIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { createOrden } from '../store/slices/ordenesSlice';
import OrdenFormMain from '../components/forms/OrdenFormMain';
import OrdenFormPanos from '../components/forms/OrdenFormPanos';
import OrdenFormMateriales from '../components/forms/OrdenFormMateriales';
import OrdenFormHerramientas from '../components/forms/OrdenFormHerramientas';
import DraftsModal from '../components/DraftsModal';
import { useDraft } from '../hooks/useDraft';
import { draftsApi } from '../services/api';

const steps = ['Datos Generales', 'Paños', 'Materiales', 'Herramientas', 'Resumen'];

const CreateOrden = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.ordenes);
  const { user } = useSelector((state) => state.auth);

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    cliente: '',
    id_cliente: '',
    observaciones: '',
    prioridad: 'media',
    fecha_inicio: '',
    fecha_fin: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [panosSeleccionados, setPanosSeleccionados] = useState([]);
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState([]);
  const [herramientasSeleccionadas, setHerramientasSeleccionadas] = useState([]);
  
  // Estados para drafts
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [showDraftRestored, setShowDraftRestored] = useState(false);
  const [draftAvailable, setDraftAvailable] = useState(false);
  const [hasStartedEditing, setHasStartedEditing] = useState(false);
  const [isRestoringDraft, setIsRestoringDraft] = useState(false);

  // Hook de drafts
  const {
    draft,
    loading: draftLoading,
    saving: draftSaving,
    lastSaved,
    saveDraft,
    saveDraftImmediately,
    deleteDraft,
    loadDraft
  } = useDraft(user?.id, activeStep + 1);

  // Verificar si hay un draft disponible al cargar el componente
  useEffect(() => {
    if (user?.id) {
      checkForDraft();
    }
  }, [user?.id]);

  const checkForDraft = async () => {
    if (!user?.id) return;
    
    try {
      const response = await draftsApi.getDraftByUser(user.id);
      if (response.data?.data && response.data.data !== null) {
        setDraftAvailable(true);
        loadDraft();
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
    console.log('🔄 Restaurando datos del draft:', draftData);
    if (draftData.datos_formulario) {
      setFormData(draftData.datos_formulario);
    }
    if (draftData.panos_seleccionados) {
      // Verificar si es un array válido o un objeto vacío
      let panosArray = [];
      if (Array.isArray(draftData.panos_seleccionados)) {
        panosArray = draftData.panos_seleccionados;
      } else if (typeof draftData.panos_seleccionados === 'object' && draftData.panos_seleccionados !== null) {
        // Si es un objeto, verificar si tiene propiedades (no es vacío)
        const keys = Object.keys(draftData.panos_seleccionados);
        if (keys.length > 0) {
          // Si tiene propiedades, intentar convertirlo a array
          panosArray = Object.values(draftData.panos_seleccionados);
        }
      }
      console.log('📋 Restaurando paños:', panosArray);
      setPanosSeleccionados(panosArray);
    }
    if (draftData.materiales_seleccionados) {
      // Verificar si es un array válido o un objeto vacío
      let materialesArray = [];
      if (Array.isArray(draftData.materiales_seleccionados)) {
        materialesArray = draftData.materiales_seleccionados;
      } else if (typeof draftData.materiales_seleccionados === 'object' && draftData.materiales_seleccionados !== null) {
        // Si es un objeto, verificar si tiene propiedades (no es vacío)
        const keys = Object.keys(draftData.materiales_seleccionados);
        if (keys.length > 0) {
          // Si tiene propiedades, intentar convertirlo a array
          materialesArray = Object.values(draftData.materiales_seleccionados);
        }
      }
      console.log('📋 Restaurando materiales:', materialesArray);
      setMaterialesSeleccionados(materialesArray);
    }
    if (draftData.herramientas_seleccionadas) {
      // Verificar si es un array válido o un objeto vacío
      let herramientasArray = [];
      if (Array.isArray(draftData.herramientas_seleccionadas)) {
        herramientasArray = draftData.herramientas_seleccionadas;
      } else if (typeof draftData.herramientas_seleccionadas === 'object' && draftData.herramientas_seleccionadas !== null) {
        // Si es un objeto, verificar si tiene propiedades (no es vacío)
        const keys = Object.keys(draftData.herramientas_seleccionadas);
        if (keys.length > 0) {
          // Si tiene propiedades, intentar convertirlo a array
          herramientasArray = Object.values(draftData.herramientas_seleccionadas);
        }
      }
      console.log('📋 Restaurando herramientas:', herramientasArray);
      setHerramientasSeleccionadas(herramientasArray);
    }
    if (draftData.paso_actual) {
      setActiveStep(draftData.paso_actual - 1);
    }
  };

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    const newFormData = { ...formData, [field]: value };
    
    setFormData(newFormData);
    setHasStartedEditing(true);
    
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' });
    }

    // Solo guardar draft si ya hemos empezado a editar y no estamos restaurando
    if (hasStartedEditing && !isRestoringDraft) {
      saveDraft(newFormData, panosSeleccionados, materialesSeleccionados, herramientasSeleccionadas);
    }
  };

  // Función específica para manejar la selección de cliente
  const handleClienteChange = (clienteData) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      cliente: clienteData.nombre || '',
      id_cliente: clienteData.id || ''
    }));
    
    setHasStartedEditing(true);
    
    // Limpiar errores de cliente si los hay
    if (formErrors.cliente) {
      setFormErrors({ ...formErrors, cliente: '' });
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.cliente || !formData.cliente.trim()) {
      errors.cliente = 'Debe seleccionar un cliente del listado';
    } else if (!formData.id_cliente) {
      errors.cliente = 'Debe seleccionar un cliente válido del listado desplegable';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateForm()) return;
    
    const newStep = activeStep + 1;
    setActiveStep(newStep);
    
    // Solo guardar draft si ya hemos empezado a editar y no estamos restaurando
    if (hasStartedEditing && !isRestoringDraft) {
      saveDraftImmediately(formData, panosSeleccionados, materialesSeleccionados, herramientasSeleccionadas);
    }
  };

  const handleBack = () => {
    const newStep = activeStep - 1;
    setActiveStep(newStep);
    
    // Solo guardar draft si ya hemos empezado a editar y no estamos restaurando
    if (hasStartedEditing && !isRestoringDraft) {
      saveDraftImmediately(formData, panosSeleccionados, materialesSeleccionados, herramientasSeleccionadas);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Validar que haya al menos un paño
    if (panosSeleccionados.length === 0) {
      setActiveStep(1);
      return;
    }
    
    // Preparar panos payload
    const panosPayload = panosSeleccionados.map(p => ({
      id_item: p.id_item,  // Esto podría no ser necesario si el backend selecciona el pano
      altura_req: p.largo_tomar || p.largo_m,
      ancho_req: p.ancho_tomar || p.ancho_m,
      tipo_red: p.tipo_red || 'nylon',  // Asumir default si no hay
      umbral_sobrante_m2: p.umbral_sobrante_m2 || 5.0,
      cantidad: p.cantidad || 1,
        notas: p.notas || ''
    }));
    
    // Preparar materiales payload (solo extras)
    const materialesPayload = materialesSeleccionados.map(m => ({
        id_item: m.id_item,
        cantidad: m.cantidad,
        tipo_item: 'EXTRA',
        notas: m.notas || ''
    }));
    
    // Preparar herramientas payload
    const herramientasPayload = herramientasSeleccionadas.map(h => ({
      id_item: h.id_item,
      cantidad: h.cantidad,
      notas: h.notas || ''
    }));
    
    const payload = {
      ...formData,
      panos: panosPayload,
      materiales: materialesPayload,
      herramientas: herramientasPayload
    };
    
    try {
      const result = await dispatch(createOrden(payload)).unwrap();
      if (result.success) {
        // Eliminar draft al completar la orden
        await deleteDraft();
        navigate('/ordenes');
      }
    } catch (error) {
      // Error ya manejado por redux
    }
  };

  const handleSelectDraft = (selectedDraft) => {
    setIsRestoringDraft(true);
    
    // Cargar el draft usando el hook
    loadDraft();
    
    // Restaurar datos del draft seleccionado
    restoreDraftData(selectedDraft);
    
    setHasStartedEditing(true);
    setShowDraftRestored(true);
    
    // Permitir guardado después de un breve delay
    setTimeout(() => {
      setIsRestoringDraft(false);
    }, 1000);
  };

  const handleClearDraft = async () => {
    await deleteDraft();
    setDraftAvailable(false);
    setHasStartedEditing(false);
    setIsRestoringDraft(false);
    setFormData({
      cliente: '',
      id_cliente: '',
      observaciones: '',
      prioridad: 'media',
      fecha_inicio: '',
      fecha_fin: '',
    });
    setPanosSeleccionados([]);
    setMaterialesSeleccionados([]);
    setHerramientasSeleccionadas([]);
    setActiveStep(0);
    setFormErrors({});
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/ordenes')} sx={{ mr: 2 }}>
          Volver
        </Button>
        <Typography variant="h4" component="h1">Nueva Orden de Producción</Typography>
        
        {/* Indicador de draft */}
        {draft && (
          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip 
              icon={<RestoreIcon />} 
              label="Draft activo" 
              color="info" 
              variant="outlined"
              size="small"
            />
            {draftSaving && (
              <CircularProgress size={16} />
            )}
            {lastSaved && (
              <Typography variant="caption" color="textSecondary">
                Guardado: {lastSaved.toLocaleTimeString()}
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Botones de draft */}
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message || error}
          {error.details && Array.isArray(error.details) && (
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              {error.details.map((detail, idx) => (
                <li key={idx}>{detail}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>
      
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            {activeStep === 0 && (
              <OrdenFormMain 
                formData={formData} 
                formErrors={formErrors} 
                handleInputChange={handleInputChange}
                handleClienteChange={handleClienteChange}
              />
            )}
            {activeStep === 1 && (
              <OrdenFormPanos 
                panosSeleccionados={panosSeleccionados} 
                setPanosSeleccionados={setPanosSeleccionados}
                onDraftSave={(newPanos) => {
                  console.log('💾 Guardando paños en draft:', newPanos);
                  saveDraftImmediately(formData, newPanos, materialesSeleccionados, herramientasSeleccionadas);
                }}
              />
            )}
            {activeStep === 2 && (
              <OrdenFormMateriales 
                materialesSeleccionados={materialesSeleccionados} 
                setMaterialesSeleccionados={setMaterialesSeleccionados}
                onDraftSave={(newMateriales) => {
                  console.log('💾 Guardando materiales en draft:', newMateriales);
                  saveDraftImmediately(formData, panosSeleccionados, newMateriales, herramientasSeleccionadas);
                }}
              />
            )}
            {activeStep === 3 && (
              <OrdenFormHerramientas 
                herramientasSeleccionadas={herramientasSeleccionadas} 
                setHerramientasSeleccionadas={setHerramientasSeleccionadas}
                onDraftSave={(newHerramientas) => {
                  console.log('💾 Guardando herramientas en draft:', newHerramientas);
                  saveDraftImmediately(formData, panosSeleccionados, materialesSeleccionados, newHerramientas);
                }}
              />
            )}
            {activeStep === 4 && (
              <Box>
                <Typography variant="h6">Resumen</Typography>
                <Typography variant="subtitle1">Cliente: {formData.cliente}</Typography>
                <Typography variant="subtitle1">Prioridad: {formData.prioridad}</Typography>
                <Typography variant="subtitle1">Observaciones: {formData.observaciones}</Typography>
                <Typography variant="subtitle2">Paños:</Typography>
                <ul>
                  {panosSeleccionados.map((p, i) => (
                    <li key={i}>
                      {p.tipo_red ? `${p.tipo_red.toUpperCase()} - ` : ''}
                      {p.descripcion ? `${p.descripcion} - ` : ''}
                      {p.largo_tomar && p.ancho_tomar 
                        ? `${p.largo_tomar}m x ${p.ancho_tomar}m` 
                        : (p.largo_m && p.ancho_m ? `${p.largo_m}m x ${p.ancho_m}m` : '')}
                      {p.cantidad ? ` - Cantidad: ${p.cantidad}` : ''}
                      {p.especificaciones ? (
                        <>
                          {' - Especificaciones: '}
                          {p.especificaciones.replace(/\n/g, ', ')}
                        </>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <Typography variant="subtitle2">Materiales:</Typography>
                <ul>
                  {materialesSeleccionados.map((m, i) => (
                    <li key={i}>
                      {m.descripcion ? `${m.descripcion} - ` : ''}
                      {m.cantidad ? `Cantidad: ${m.cantidad}` : ''}
                      {m.unidad ? ` ${m.unidad}` : ''}
                      {m.precioxunidad ? ` - Precio unitario: $${m.precioxunidad}` : ''}
                    </li>
                  ))}
                </ul>
                <Typography variant="subtitle2">Herramientas:</Typography>
                <ul>
                  {herramientasSeleccionadas.map((h, i) => (
                    <li key={i}>
                      {h.descripcion ? `${h.descripcion} - ` : ''}
                      {h.cantidad ? `Cantidad: ${h.cantidad}` : ''}
                      {h.estado ? ` - Estado: ${h.estado}` : ''}
                    </li>
                  ))}
                </ul>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              {activeStep > 0 && (
                <Button variant="outlined" onClick={handleBack} disabled={loading || draftSaving}>
                  Atrás
                </Button>
              )}
              {activeStep < steps.length - 1 && (
                <Button variant="contained" onClick={handleNext} disabled={loading || draftSaving}>
                  Siguiente
                </Button>
              )}
              {activeStep === steps.length - 1 && (
                <Button 
                  type="submit" 
                  variant="contained" 
                  startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />} 
                  disabled={loading || draftSaving}
                >
                  {loading ? 'Creando...' : 'Crear Orden'}
                </Button>
              )}
            </Box>
          </form>
        </CardContent>
      </Card>

      {/* Modal de drafts */}
      <DraftsModal
        open={showDraftsModal}
        onClose={() => setShowDraftsModal(false)}
        onSelectDraft={handleSelectDraft}
        currentUserId={user?.id}
      />

      {/* Snackbar para notificar restauración de draft */}
      <Snackbar
        open={showDraftRestored}
        autoHideDuration={4000}
        onClose={() => setShowDraftRestored(false)}
        message="Draft restaurado correctamente"
      />
    </Box>
  );
};

export default CreateOrden; 