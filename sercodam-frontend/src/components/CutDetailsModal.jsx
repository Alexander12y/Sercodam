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
    Chip,
    CircularProgress,
    Alert,
    Divider,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from '@mui/material';
import { Close, CheckCircle, Schedule } from '@mui/icons-material';
import api from '../services/api';
import CutDiagram from './CutDiagram';

const CutDetailsModal = ({ open, onClose, orderId, isCompleted = false }) => {
    const [orderData, setOrderData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (open && orderId) {
            fetchOrderDetails();
        }
    }, [open, orderId]);

    const fetchOrderDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/ordenes/cut-jobs/order/${orderId}`);
            setOrderData(response.data.data);
        } catch (err) {
            console.error('Error fetching order details:', err);
            setError('Error al cargar los detalles de la orden');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setOrderData(null);
        setError(null);
        onClose();
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPriorityColor = (prioridad) => {
        switch (prioridad) {
            case 'urgente': return 'error';
            case 'alta': return 'warning';
            case 'media': return 'info';
            case 'baja': return 'default';
            default: return 'default';
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

    if (!open) return null;

    return (
        <Dialog 
            open={open} 
            onClose={handleClose}
            maxWidth="lg"
            fullWidth
        >
            <DialogTitle>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6">
                        Detalles de Corte - {orderData?.order?.numero_op || 'Cargando...'}
                    </Typography>
                    <Button onClick={handleClose} startIcon={<Close />}>
                        Cerrar
                    </Button>
                </Box>
            </DialogTitle>
            
            <DialogContent>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : orderData ? (
                    <Box>
                        {/* Order Header */}
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="h6" gutterBottom>
                                            Información de la Orden
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Orden:</strong> {orderData.order.numero_op}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Cliente:</strong> {orderData.order.nombre_cliente || orderData.order.cliente}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Fecha:</strong> {formatDate(orderData.order.fecha_op)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Prioridad:</strong> 
                                            <Chip 
                                                label={orderData.order.prioridad} 
                                                color={getPriorityColor(orderData.order.prioridad)}
                                                size="small"
                                                sx={{ ml: 1 }}
                                            />
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="h6" gutterBottom>
                                            Resumen de Trabajos
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Total de trabajos:</strong> {orderData.cut_jobs.length}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Estado:</strong> 
                                            <Chip 
                                                icon={isCompleted ? <CheckCircle /> : <Schedule />}
                                                label={isCompleted ? "Completado" : "En Proceso"}
                                                color={isCompleted ? "success" : "warning"}
                                                size="small"
                                                sx={{ ml: 1 }}
                                            />
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>

                        {/* Cut Jobs Details */}
                        <Typography variant="h6" gutterBottom>
                            Trabajos de Corte
                        </Typography>
                        
                        {orderData.cut_jobs.map((job, index) => (
                            <Card key={job.job_id} sx={{ mb: 3 }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                        <Typography variant="h6">
                                            Corte {index + 1} - Paño #{job.id_item}
                                        </Typography>
                                        <Chip 
                                            label={job.estado} 
                                            color={job.estado === 'Confirmado' ? 'success' : 'warning'}
                                            size="small"
                                        />
                                    </Box>

                                    <Grid container spacing={3}>
                                        {/* Cut Diagram */}
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="subtitle1" gutterBottom>
                                                Diagrama de Corte
                                            </Typography>
                                            <Box 
                                                sx={{ 
                                                    border: '1px solid #ddd', 
                                                    borderRadius: 1, 
                                                    p: 2,
                                                    minHeight: '200px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                <CutDiagram
                                                    cut={{
                                                        pano_original: {
                                                            largo: job.pano_largo,
                                                            ancho: job.pano_ancho
                                                        },
                                                        altura_req: job.altura_req,
                                                        ancho_req: job.ancho_req,
                                                        plans: job.plans || []
                                                    }}
                                                    width={400}
                                                    height={300}
                                                />
                                            </Box>
                                        </Grid>

                                        {/* Job Details */}
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="subtitle1" gutterBottom>
                                                Especificaciones
                                            </Typography>
                                            
                                            <Box mb={2}>
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Paño Original:</strong>
                                                </Typography>
                                                <Typography variant="body2">
                                                    {job.pano_largo}m × {job.pano_ancho}m = {job.pano_area}m²
                                                </Typography>
                                            </Box>

                                            <Box mb={2}>
                                                <Typography variant="body2" color="text.secondary">
                                                    <strong>Corte Solicitado:</strong>
                                                </Typography>
                                                <Typography variant="body2">
                                                    {job.altura_req}m × {job.ancho_req}m = {job.area_req}m²
                                                </Typography>
                                            </Box>

                                            {/* Technical Specifications */}
                                            {getTechnicalSpecs(job).length > 0 && (
                                                <Box mb={2}>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                                        <strong>Especificaciones Técnicas:</strong>
                                                    </Typography>
                                                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                                                        {getTechnicalSpecs(job).map((spec, idx) => (
                                                            <Chip 
                                                                key={idx} 
                                                                label={spec} 
                                                                size="small" 
                                                                variant="outlined"
                                                            />
                                                        ))}
                                                    </Box>
                                                </Box>
                                            )}

                                            {/* Cut Plans */}
                                            {job.plans && job.plans.length > 0 && (
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                                        <strong>Plan de Corte:</strong>
                                                    </Typography>
                                                    <TableContainer component={Paper} variant="outlined">
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Pieza</TableCell>
                                                                    <TableCell>Largo</TableCell>
                                                                    <TableCell>Ancho</TableCell>
                                                                    <TableCell>Área</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {job.plans.map((plan, planIdx) => (
                                                                    <TableRow key={planIdx}>
                                                                        <TableCell>{plan.rol_pieza}</TableCell>
                                                                        <TableCell>{plan.altura_plan}m</TableCell>
                                                                        <TableCell>{plan.ancho_plan}m</TableCell>
                                                                        <TableCell>
                                                                            {(plan.altura_plan * plan.ancho_plan).toFixed(2)}m²
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
                                                </Box>
                                            )}

                                            {/* Real Cuts (if completed) */}
                                            {isCompleted && job.real_cuts && job.real_cuts.length > 0 && (
                                                <Box mt={2}>
                                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                                        <strong>Cortes Reales:</strong>
                                                    </Typography>
                                                    <TableContainer component={Paper} variant="outlined">
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>Pieza</TableCell>
                                                                    <TableCell>Largo Real</TableCell>
                                                                    <TableCell>Ancho Real</TableCell>
                                                                    <TableCell>Área Real</TableCell>
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {job.real_cuts.map((real, realIdx) => (
                                                                    <TableRow key={realIdx}>
                                                                        <TableCell>{real.seq + 1}</TableCell>
                                                                        <TableCell>{real.altura_real}m</TableCell>
                                                                        <TableCell>{real.ancho_real}m</TableCell>
                                                                        <TableCell>
                                                                            {(real.altura_real * real.ancho_real).toFixed(2)}m²
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
                                                </Box>
                                            )}
                                        </Grid>
                                    </Grid>

                                    {/* Completion Info */}
                                    {isCompleted && job.completed_at && (
                                        <Box mt={2} pt={2} borderTop="1px solid #eee">
                                            <Typography variant="body2" color="text.secondary">
                                                <strong>Completado:</strong> {formatDate(job.completed_at)}
                                            </Typography>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                ) : null}
            </DialogContent>
            
            <DialogActions>
                <Button onClick={handleClose}>
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CutDetailsModal; 