import React from 'react';
import {
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  IconButton,
  Typography,
  Box,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

// ===== COMPONENTE: CONCEPTOS EXTRA DINÁMICOS =====
const ConceptosExtraSection = ({ conceptos = [], onChange }) => {
  const agregarConcepto = () => {
    const nuevosConceptos = [...conceptos, { concepto: '', precio: 0, id: Date.now() }];
    onChange(nuevosConceptos);
  };

  const eliminarConcepto = (index) => {
    const nuevosConceptos = conceptos.filter((_, i) => i !== index);
    onChange(nuevosConceptos);
  };

  const actualizarConcepto = (index, campo, valor) => {
    const nuevosConceptos = [...conceptos];
    nuevosConceptos[index] = { ...nuevosConceptos[index], [campo]: valor };
    onChange(nuevosConceptos);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Conceptos Extra / Opcionales
          </Typography>
          <Button
            variant="outlined"
            size="small"
            onClick={agregarConcepto}
            startIcon={<AddIcon />}
          >
            Agregar Concepto
          </Button>
        </Box>

        {conceptos.length === 0 ? (
          <Alert severity="info">
            No hay conceptos extra agregados. Usa el botón "Agregar Concepto" para añadir conceptos opcionales con sus respectivos precios.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {conceptos.map((concepto, index) => (
              <Grid item xs={12} key={concepto.id || index}>
                <Card variant="outlined">
                  <CardContent sx={{ pb: '16px !important' }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={7}>
                        <TextField
                          fullWidth
                          label={`Concepto ${index + 1}`}
                          value={concepto.concepto || ''}
                          onChange={(e) => actualizarConcepto(index, 'concepto', e.target.value)}
                          placeholder="Ej: Desmantelado de sistema – Incluye mano de obra, material y herramienta"
                          multiline
                          rows={2}
                        />
                      </Grid>
                      <Grid item xs={8} md={3}>
                        <TextField
                          fullWidth
                          type="number"
                          step="0.01"
                          label="Precio (sin IVA)"
                          value={concepto.precio || ''}
                          onChange={(e) => actualizarConcepto(index, 'precio', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          InputProps={{
                            startAdornment: <span style={{ marginRight: '8px', color: '#666' }}>$</span>
                          }}
                        />
                      </Grid>
                      <Grid item xs={4} md={2}>
                        <IconButton
                          color="error"
                          onClick={() => eliminarConcepto(index)}
                          disabled={conceptos.length === 1}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {conceptos.length > 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Cada concepto se mostrará en el PDF como: "[Concepto]. Precio servicio c/u: $XX,XXX.XX + IVA (Opcional)."
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ConceptosExtraSection;