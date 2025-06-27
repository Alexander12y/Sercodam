import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Card, CardContent, Button, Alert, CircularProgress, Stepper, Step, StepLabel } from '@mui/material';
import { ArrowBack as ArrowBackIcon, Save as SaveIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { createOrden } from '../store/slices/ordenesSlice';
import OrdenFormMain from '../components/forms/OrdenFormMain';
import OrdenFormPanos from '../components/forms/OrdenFormPanos';
import OrdenFormMateriales from '../components/forms/OrdenFormMateriales';
import OrdenFormHerramientas from '../components/forms/OrdenFormHerramientas';

const steps = ['Datos Generales', 'Paños', 'Materiales', 'Herramientas', 'Resumen'];

const CreateOrden = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.ordenes);

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    cliente: '',
    observaciones: '',
    prioridad: 'media',
    fecha_inicio: '',
    fecha_fin: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [panosSeleccionados, setPanosSeleccionados] = useState([]);
  const [materialesSeleccionados, setMaterialesSeleccionados] = useState([]);
  const [herramientasSeleccionadas, setHerramientasSeleccionadas] = useState([]);

  const handleInputChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
    if (formErrors[field]) {
      setFormErrors({ ...formErrors, [field]: '' });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.cliente.trim()) errors.cliente = 'El cliente es requerido';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (activeStep === 0 && !validateForm()) return;
    setActiveStep((prev) => prev + 1);
  };
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handleSubmit = async (event) => {
    event.preventDefault();
    // Validar que haya al menos un paño
    if (panosSeleccionados.length === 0) {
      setActiveStep(1);
      return;
    }
    // Preparar payload
    const materialesPayload = [
      ...panosSeleccionados.map(p => ({
        id_item: p.id_item,
        cantidad: p.cantidad,
        tipo_item: 'PANO',
        notas: p.notas || ''
      })),
      ...materialesSeleccionados.map(m => ({
        id_item: m.id_item,
        cantidad: m.cantidad,
        tipo_item: 'EXTRA',
        notas: m.notas || ''
      }))
    ];
    const payload = {
      ...formData,
      materiales: materialesPayload,
      herramientas: herramientasSeleccionadas.map(h => ({
        id_item: h.id_item,
        cantidad: h.cantidad,
        notas: h.notas || ''
      })),
    };
    try {
      const result = await dispatch(createOrden(payload)).unwrap();
      if (result.success) {
        navigate('/ordenes');
      }
    } catch (error) {
      // Error ya manejado por redux
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/ordenes')} sx={{ mr: 2 }}>
          Volver
        </Button>
        <Typography variant="h4" component="h1">Nueva Orden de Producción</Typography>
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit}>
            {activeStep === 0 && (
              <OrdenFormMain formData={formData} formErrors={formErrors} handleInputChange={handleInputChange} />
            )}
            {activeStep === 1 && (
              <OrdenFormPanos panosSeleccionados={panosSeleccionados} setPanosSeleccionados={setPanosSeleccionados} />
            )}
            {activeStep === 2 && (
              <OrdenFormMateriales materialesSeleccionados={materialesSeleccionados} setMaterialesSeleccionados={setMaterialesSeleccionados} />
            )}
            {activeStep === 3 && (
              <OrdenFormHerramientas herramientasSeleccionadas={herramientasSeleccionadas} setHerramientasSeleccionadas={setHerramientasSeleccionadas} />
            )}
            {activeStep === 4 && (
              <Box>
                <Typography variant="h6">Resumen</Typography>
                <Typography variant="subtitle1">Cliente: {formData.cliente}</Typography>
                <Typography variant="subtitle1">Prioridad: {formData.prioridad}</Typography>
                <Typography variant="subtitle1">Observaciones: {formData.observaciones}</Typography>
                <Typography variant="subtitle2">Paños:</Typography>
                <ul>{panosSeleccionados.map((p, i) => <li key={i}>{(p.nombre || p.codigo || p.id_item)} - Cantidad: {p.cantidad}</li>)}</ul>
                <Typography variant="subtitle2">Materiales:</Typography>
                <ul>{materialesSeleccionados.map((m, i) => <li key={i}>{(m.nombre || m.codigo || m.id_item)} - Cantidad: {m.cantidad}</li>)}</ul>
                <Typography variant="subtitle2">Herramientas:</Typography>
                <ul>{herramientasSeleccionadas.map((h, i) => <li key={i}>{(h.nombre || h.codigo || h.id_item)} - Cantidad: {h.cantidad}</li>)}</ul>
              </Box>
            )}
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
              {activeStep > 0 && (
                <Button variant="outlined" onClick={handleBack} disabled={loading}>Atrás</Button>
              )}
              {activeStep < steps.length - 1 && (
                <Button variant="contained" onClick={handleNext} disabled={loading}>Siguiente</Button>
              )}
              {activeStep === steps.length - 1 && (
                <Button type="submit" variant="contained" startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />} disabled={loading}>
                    {loading ? 'Creando...' : 'Crear Orden'}
                  </Button>
              )}
                </Box>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CreateOrden; 