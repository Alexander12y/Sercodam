import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Button,
    Grid,
    Card,
    CardContent,
    Alert,
    CircularProgress,
    Divider,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';
import CutDiagram from './CutDiagram';
import api from '../services/api';

const CutExecutionForm = ({ orderId, onComplete, onBack }) => {
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState({});
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [actualPieces, setActualPieces] = useState({});

    useEffect(() => {
        fetchOrderDetails();
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/ordenes/cut-jobs/order/${orderId}`);
            setOrderData(response.data.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching order details:', err);
            setError('Error al cargar detalles de la orden');
        } finally {
            setLoading(false);
        }
    };

    const handlePieceChange = (jobId, seq, field, value) => {
        setActualPieces(prev => ({
            ...prev,
            [`${jobId}_${seq}`]: {
                ...prev[`${jobId}_${seq}`],
                [field]: value
            }
        }));
    };

    const handleSubmitIndividualJob = async (jobId) => {
        if (!orderData) return;

        // Get all pieces for this specific job
        const jobPieces = [];
        Object.keys(actualPieces).forEach(key => {
            const [pieceJobId, seq] = key.split('_');
            if (parseInt(pieceJobId) === jobId) {
                jobPieces.push({
                    seq: parseInt(seq),
                    altura_real: parseFloat(actualPieces[key].altura || 0),
                    ancho_real: parseFloat(actualPieces[key].ancho || 0)
                });
            }
        });

        if (jobPieces.length === 0) {
            setError('Debe ingresar al menos una pieza para este corte');
            return;
        }

        setSubmitting(prev => ({ ...prev, [jobId]: true }));
        setError(null);
        setSuccessMessage(null);
        
        try {
            const response = await api.post('/ordenes/submit-individual-cut', {
                job_id: jobId,
                actual_pieces: jobPieces
            });
            
            console.log('Submit response:', response.data);
            
            // Show success message with details
            if (response.data.job_completed) {
                if (response.data.within_tolerance) {
                    setSuccessMessage('✅ Corte confirmado exitosamente. El trabajo está dentro de tolerancia.');
                } else {
                    setSuccessMessage('⚠️ Corte registrado pero fuera de tolerancia. Requiere aprobación de administrador.');
                }
            } else {
                setSuccessMessage('✅ Piezas registradas. Complete todas las piezas para finalizar el corte.');
            }
            
            // Remove submitted pieces from state only after successful submission
            const newActualPieces = { ...actualPieces };
            Object.keys(newActualPieces).forEach(key => {
                const [pieceJobId] = key.split('_');
                if (parseInt(pieceJobId) === jobId) {
                    delete newActualPieces[key];
                }
            });
            setActualPieces(newActualPieces);
            
            // Refresh order data to get updated status
            await fetchOrderDetails();
            
        } catch (err) {
            console.error('Error submitting individual cut:', err);
            setError(err.response?.data?.message || 'Error al confirmar corte individual');
        } finally {
            setSubmitting(prev => ({ ...prev, [jobId]: false }));
        }
    };

    const handleSubmitAll = async () => {
        if (!orderData) return;

        // Group actual pieces by job_id
        const actualPiecesByJob = {};
        Object.keys(actualPieces).forEach(key => {
            const [jobId, seq] = key.split('_');
            if (!actualPiecesByJob[jobId]) {
                actualPiecesByJob[jobId] = [];
            }
            actualPiecesByJob[jobId].push({
                seq: parseInt(seq),
                altura_real: parseFloat(actualPieces[key].altura || 0),
                ancho_real: parseFloat(actualPieces[key].ancho || 0)
            });
        });

        // Submit each job
        setSubmitting({ all: true });
        setError(null);
        setSuccessMessage(null);
        
        try {
            let allWithinTolerance = true;
            let completedJobs = 0;
            
            for (const [jobId, pieces] of Object.entries(actualPiecesByJob)) {
                if (pieces.length > 0) {
                    const response = await api.post('/ordenes/submit-actual-cuts', {
                        job_id: parseInt(jobId),
                        actual_pieces: pieces
                    });
                    
                    if (response.data.job_completed) {
                        completedJobs++;
                        if (!response.data.within_tolerance) {
                            allWithinTolerance = false;
                        }
                    }
                }
            }
            
            // Show appropriate success message
            if (completedJobs > 0) {
                if (allWithinTolerance) {
                    setSuccessMessage(`✅ ${completedJobs} corte(s) confirmado(s) exitosamente. Todos están dentro de tolerancia.`);
                } else {
                    setSuccessMessage(`⚠️ ${completedJobs} corte(s) registrado(s). Algunos están fuera de tolerancia y requieren aprobación de administrador.`);
                }
            }
            
            // Clear pieces and refresh
            setActualPieces({});
            await fetchOrderDetails();
            
            if (onComplete) {
                onComplete();
            }
        } catch (err) {
            console.error('Error submitting cuts:', err);
            setError(err.response?.data?.message || 'Error al confirmar cortes');
        } finally {
            setSubmitting({ all: false });
        }
    };

    const getTechnicalSpecs = (job) => {
        const specs = [];
        if (job.tipo_red) specs.push(`Tipo: ${job.tipo_red}`);
        if (job.nylon_calibre) specs.push(`Calibre: ${job.nylon_calibre}`);
        if (job.nylon_cuadro) specs.push(`Cuadro: ${job.nylon_cuadro}`);
        if (job.nylon_torsion) specs.push(`Torsión: ${job.nylon_torsion}`);
        if (job.nylon_refuerzo) specs.push(`Refuerzo: ${job.nylon_refuerzo ? 'Sí' : 'No'}`);
        if (job.lona_color) specs.push(`Color: ${job.lona_color}`);
        if (job.polipropileno_grosor) specs.push(`Grosor: ${job.polipropileno_grosor}`);
        if (job.malla_color_tipo_red) specs.push(`Color/Tipo: ${job.malla_color_tipo_red}`);
        return specs;
    };

    const isJobCompleted = (job) => {
        return job.estado === 'Confirmado';
    };

    const isJobDeviated = (job) => {
        return job.estado === 'Desviado';
    };

    const hasJobPieces = (jobId) => {
        return Object.keys(actualPieces).some(key => {
            const [pieceJobId] = key.split('_');
            return parseInt(pieceJobId) === jobId;
        });
    };

    const getJobStatusChip = (job) => {
        if (isJobCompleted(job)) {
            return <Chip label="Confirmado" color="success" />;
        } else if (isJobDeviated(job)) {
            return <Chip label="Fuera de Tolerancia - Requiere Aprobación" color="warning" />;
        } else {
            return <Chip label="Pendiente" color="info" />;
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (!orderData) {
        return (
            <Alert severity="error">
                No se pudieron cargar los detalles de la orden
            </Alert>
        );
    }

    const { order, cut_jobs } = orderData;
    const completedJobs = cut_jobs.filter(job => isJobCompleted(job)).length;
    const deviatedJobs = cut_jobs.filter(job => isJobDeviated(job)).length;
    const totalJobs = cut_jobs.length;

    return (
        <Box>
            {/* Header with order info */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} md={6}>
                            <Typography variant="h5" gutterBottom>
                                Orden: {order.numero_op}
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Cliente: {order.nombre_cliente || order.cliente}
                            </Typography>
                            {order.cliente_email && (
                                <Typography variant="body2" color="text.secondary">
                                    Email: {order.cliente_email}
                                </Typography>
                            )}
                            {order.cliente_telefono && (
                                <Typography variant="body2" color="text.secondary">
                                    Teléfono: {order.cliente_telefono}
                                </Typography>
                            )}
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box display="flex" justifyContent="flex-end" gap={1} alignItems="center" flexWrap="wrap">
                                <Chip 
                                    label={`Confirmados: ${completedJobs}/${totalJobs}`} 
                                    color={completedJobs === totalJobs ? 'success' : 'default'}
                                />
                                {deviatedJobs > 0 && (
                                    <Chip 
                                        label={`Fuera de Tolerancia: ${deviatedJobs}`} 
                                        color="warning"
                                    />
                                )}
                                <Chip 
                                    label={`Prioridad: ${order.prioridad}`} 
                                    color={order.prioridad === 'urgente' ? 'error' : 
                                           order.prioridad === 'alta' ? 'warning' : 'default'}
                                />
                                <Button variant="outlined" onClick={onBack}>
                                    Volver
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {successMessage && (
                <Alert severity={successMessage.includes('⚠️') ? 'warning' : 'success'} sx={{ mb: 2 }}>
                    {successMessage}
                </Alert>
            )}

            {/* Show info about deviated jobs */}
            {deviatedJobs > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                        💡 <strong>Trabajos fuera de tolerancia:</strong> Estos cortes han sido registrados pero exceden la tolerancia del 5%. 
                        Un administrador puede aprobarlos manualmente si son aceptables.
                    </Typography>
                </Alert>
            )}

            {/* Cut jobs */}
            {cut_jobs.map((job, jobIndex) => (
                <Card key={job.job_id} sx={{ mb: 3 }}>
                    <CardContent>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" gutterBottom>
                                Corte {jobIndex + 1} - Paño #{job.id_item}
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                                {getJobStatusChip(job)}
                                {hasJobPieces(job.job_id) && !isJobCompleted(job) && !isJobDeviated(job) && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        onClick={() => handleSubmitIndividualJob(job.job_id)}
                                        disabled={submitting[job.job_id]}
                                    >
                                        {submitting[job.job_id] ? (
                                            <CircularProgress size={16} />
                                        ) : (
                                            'Confirmar Corte'
                                        )}
                                    </Button>
                                )}
                            </Box>
                        </Box>
                        
                        {/* Technical specifications */}
                        <Box sx={{ mb: 2 }}>
                            {getTechnicalSpecs(job).map((spec, idx) => (
                                <Chip 
                                    key={idx} 
                                    label={spec} 
                                    size="small" 
                                    sx={{ mr: 1, mb: 1 }} 
                                />
                            ))}
                        </Box>

                        <Grid container spacing={4}>
                            {/* Cut Diagram */}
                            <Grid item xs={12} lg={6}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Diagrama de Corte
                                </Typography>
                                <Box display="flex" justifyContent="center">
                                    <CutDiagram 
                                        cut={{
                                            altura_req: job.altura_req,
                                            ancho_req: job.ancho_req,
                                            pano_original: {
                                                largo: job.pano_largo,
                                                ancho: job.pano_ancho
                                            },
                                            plans: job.plans
                                        }}
                                        width={500}
                                        height={400}
                                    />
                                </Box>
                            </Grid>

                            {/* Measurements Form */}
                            <Grid item xs={12} lg={6}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Medidas Reales vs Planificadas
                                </Typography>
                                
                                <TableContainer component={Paper} sx={{ mb: 2 }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Pieza</TableCell>
                                                <TableCell>Altura Plan (m)</TableCell>
                                                <TableCell>Ancho Plan (m)</TableCell>
                                                <TableCell>Altura Real (m)</TableCell>
                                                <TableCell>Ancho Real (m)</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {job.plans.map((plan) => {
                                                const pieceKey = `${job.job_id}_${plan.seq}`;
                                                const actualPiece = actualPieces[pieceKey] || {};
                                                
                                                return (
                                                    <TableRow key={plan.seq}>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight="bold">
                                                                {plan.rol_pieza === 'Objetivo' ? 'Pieza Principal' : `Remanente ${plan.seq}`}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {parseFloat(plan.altura_plan).toFixed(3)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2" color="text.secondary">
                                                                {parseFloat(plan.ancho_plan).toFixed(3)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={actualPiece.altura || ''}
                                                                onChange={(e) => handlePieceChange(job.job_id, plan.seq, 'altura', e.target.value)}
                                                                inputProps={{ 
                                                                    step: 0.001, 
                                                                    min: 0,
                                                                    placeholder: '0.000'
                                                                }}
                                                                sx={{ width: 80 }}
                                                                disabled={isJobCompleted(job) || isJobDeviated(job)}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                value={actualPiece.ancho || ''}
                                                                onChange={(e) => handlePieceChange(job.job_id, plan.seq, 'ancho', e.target.value)}
                                                                inputProps={{ 
                                                                    step: 0.001, 
                                                                    min: 0,
                                                                    placeholder: '0.000'
                                                                }}
                                                                sx={{ width: 80 }}
                                                                disabled={isJobCompleted(job) || isJobDeviated(job)}
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {/* Job summary */}
                                <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                                    <Typography variant="body2" gutterBottom>
                                        <strong>Resumen del Corte:</strong>
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        • Paño original: {parseFloat(job.pano_largo).toFixed(2)}m x {parseFloat(job.pano_ancho).toFixed(2)}m
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        • Área requerida: {parseFloat(job.area_req).toFixed(2)}m²
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        • Piezas planificadas: {job.plans.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        • Tolerancia máxima: 5%
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            ))}

            {/* Submit all button - only show if there are uncompleted jobs */}
            {(completedJobs + deviatedJobs) < totalJobs && (
                <Box display="flex" justifyContent="center" sx={{ mt: 3 }}>
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSubmitAll}
                        disabled={submitting.all}
                        sx={{ minWidth: 200 }}
                    >
                        {submitting.all ? (
                            <>
                                <CircularProgress size={20} sx={{ mr: 1 }} />
                                Confirmando Todos los Cortes...
                            </>
                        ) : (
                            'Confirmar Todos los Cortes Restantes'
                        )}
                    </Button>
                </Box>
            )}

            {/* Show completion message if all jobs are done */}
            {(completedJobs + deviatedJobs) === totalJobs && (
                <Alert severity={deviatedJobs > 0 ? 'warning' : 'success'} sx={{ mt: 3 }}>
                    {deviatedJobs > 0 ? (
                        <>¡Todos los cortes han sido procesados! {deviatedJobs} trabajo(s) requieren aprobación administrativa por estar fuera de tolerancia.</>
                    ) : (
                        <>¡Todos los cortes han sido confirmados exitosamente!</>
                    )}
                </Alert>
            )}
        </Box>
    );
};

export default CutExecutionForm; 