import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import RequireRole from '../components/RequireRole';
import CutExecutionForm from '../components/CutExecutionForm';
import CutDetailsModal from '../components/CutDetailsModal';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Card,
  CardContent,
  Alert,
    CircularProgress,
    Chip,
    Grid,
    IconButton,
    Tooltip,
    Tabs,
    Tab,
    Pagination
} from '@mui/material';
import { PlayArrow, Visibility, History, CheckCircle } from '@mui/icons-material';

const EjecutarCorte = () => {
    const { enqueueSnackbar } = useSnackbar();
    const [orders, setOrders] = useState([]);
    const [completedOrders, setCompletedOrders] = useState([]);
    const [selectedOrderId, setSelectedOrderId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingCompleted, setLoadingCompleted] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [completedPage, setCompletedPage] = useState(1);
    const [completedPagination, setCompletedPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0
    });
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);
    const [selectedOrderIsCompleted, setSelectedOrderIsCompleted] = useState(false);

    useEffect(() => {
        fetchOrders();
        fetchCompletedOrders();
    }, []);

    useEffect(() => {
        if (activeTab === 1) {
            fetchCompletedOrders();
        }
    }, [activeTab, completedPage]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const response = await api.get('/ordenes/cut-jobs');
            console.log('API Response:', response.data);
            const ordersData = response.data?.data || [];
            console.log('Orders data:', ordersData);
            setOrders(ordersData);
            setError(null);
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError('Error al cargar órdenes de corte');
            enqueueSnackbar('Error al cargar órdenes de corte', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchCompletedOrders = async () => {
        setLoadingCompleted(true);
        try {
            const response = await api.get(`/ordenes/completed-cut-jobs?page=${completedPage}&limit=10`);
            console.log('Completed Orders API Response:', response.data);
            const completedData = response.data?.data || [];
            setCompletedOrders(completedData);
            setCompletedPagination(response.data?.pagination || {
                page: 1,
                limit: 10,
                total: 0,
                totalPages: 0
            });
        } catch (err) {
            console.error('Error fetching completed orders:', err);
            enqueueSnackbar('Error al cargar órdenes completadas', { variant: 'error' });
        } finally {
            setLoadingCompleted(false);
        }
    };

    const handleExecuteOrder = (orderId) => {
        setSelectedOrderId(orderId);
    };

    const handleBackToList = () => {
        setSelectedOrderId(null);
        fetchOrders(); // Refresh the pending list
        if (activeTab === 1) {
            fetchCompletedOrders(); // Refresh completed list if on that tab
        }
    };

    const handleComplete = () => {
        enqueueSnackbar('Cortes confirmados exitosamente', { variant: 'success' });
        handleBackToList();
    };

    const handleTabChange = (event, newValue) => {
        setActiveTab(newValue);
    };

    const handleCompletedPageChange = (event, page) => {
        setCompletedPage(page);
    };

    const handleViewDetails = (orderId, isCompleted = false) => {
        setSelectedOrderForDetails(orderId);
        setSelectedOrderIsCompleted(isCompleted);
        setDetailsModalOpen(true);
    };

    const handleCloseDetailsModal = () => {
        setDetailsModalOpen(false);
        setSelectedOrderForDetails(null);
        setSelectedOrderIsCompleted(false);
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

    const formatCompletionDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading && orders.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    // If an order is selected, show the cut execution form
    if (selectedOrderId) {
        return (
            <RequireRole roles={['operador', 'admin']}>
                <CutExecutionForm 
                    orderId={selectedOrderId}
                    onComplete={handleComplete}
                    onBack={handleBackToList}
                />
            </RequireRole>
        );
    }

    return (
        <RequireRole roles={['operador', 'admin']}>
            <Box>
                <Typography variant="h4" gutterBottom>
                    Ejecutar un Corte
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                    Gestiona tus trabajos de corte pendientes y revisa tu historial de trabajos completados
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Tabs for pending and completed jobs */}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                    <Tabs value={activeTab} onChange={handleTabChange} aria-label="cut jobs tabs">
                        <Tab 
                            icon={<PlayArrow />} 
                            label={`Pendientes (${orders.length})`} 
                            iconPosition="start"
                        />
                        <Tab 
                            icon={<History />} 
                            label="Completados" 
                            iconPosition="start"
                        />
                    </Tabs>
                </Box>

                {/* Pending Jobs Tab */}
                {activeTab === 0 && (
                    <>
                        {orders.length === 0 ? (
                            <Card>
                                <CardContent>
                                    <Box textAlign="center" py={4}>
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            No hay órdenes de corte pendientes
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Todas las órdenes han sido completadas o no hay cortes asignados
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        ) : (
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                        Órdenes con Cortes Pendientes
                                </Typography>
                            
                                <TableContainer component={Paper}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Orden</TableCell>
                                            <TableCell>Cliente</TableCell>
                                            <TableCell>Fecha</TableCell>
                                            <TableCell>Prioridad</TableCell>
                                            <TableCell>Cortes</TableCell>
                                            <TableCell>Estado</TableCell>
                                            <TableCell align="center">Acciones</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                        {orders.map((order) => (
                                            <TableRow key={order.id_op} hover>
                                                <TableCell>
                                                    <Typography variant="body1" fontWeight="bold">
                                                        {order.numero_op}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {order.nombre_cliente || order.cliente}
                                                        </Typography>
                                                        {order.cliente_email && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                {order.cliente_email}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {formatDate(order.fecha_op)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip 
                                                        label={order.prioridad} 
                                                        color={getPriorityColor(order.prioridad)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Box>
                                                        <Typography variant="body2">
                                                            {parseInt(order.pending_cuts) || 0} de {parseInt(order.total_cuts) || 0} pendientes
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {order.cut_jobs?.length || 0} trabajos asignados
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                    <TableCell>
                                                    <Chip 
                                                        label="En Proceso" 
                                                        color="warning" 
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box display="flex" gap={1} justifyContent="center">
                                                        <Tooltip title="Ejecutar Cortes">
                                                            <IconButton
                                                                color="primary"
                                                                onClick={() => handleExecuteOrder(order.id_op)}
                                                                size="small"
                                                            >
                                                                <PlayArrow />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Ver Detalles">
                                                            <IconButton
                                                                color="info"
                                                            size="small"
                                                                onClick={() => handleViewDetails(order.id_op, false)}
                                                        >
                                                                <Visibility />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                        </CardContent>
                    </Card>
                )}

                {/* Summary cards */}
                {orders.length > 0 && (
                    <Grid container spacing={2} sx={{ mt: 3 }}>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" color="primary">
                                        {orders.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Órdenes Pendientes
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" color="warning.main">
                                        {orders.reduce((sum, order) => sum + (parseInt(order.pending_cuts) || 0), 0)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Cortes Pendientes
                                    </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" color="info.main">
                                        {orders.filter(order => order.prioridad === 'urgente').length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Órdenes Urgentes
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )}
                    </>
                )}

                {/* Completed Jobs Tab */}
                {activeTab === 1 && (
                    <>
                        {loadingCompleted ? (
                            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                                <CircularProgress />
                            </Box>
                        ) : completedOrders.length === 0 ? (
                            <Card>
                                <CardContent>
                                    <Box textAlign="center" py={4}>
                                        <Typography variant="h6" color="text.secondary" gutterBottom>
                                            No hay trabajos de corte completados
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Los trabajos completados aparecerán aquí
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Trabajos de Corte Completados
                                    </Typography>

                                    <TableContainer component={Paper}>
                                        <Table>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Orden</TableCell>
                                                    <TableCell>Cliente</TableCell>
                                                    <TableCell>Fecha Orden</TableCell>
                                                    <TableCell>Cortes Completados</TableCell>
                                                    <TableCell>Última Completación</TableCell>
                                                    <TableCell>Estado</TableCell>
                                                    <TableCell align="center">Acciones</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {completedOrders.map((order) => (
                                                    <TableRow key={order.id_op} hover>
                                                        <TableCell>
                                                            <Typography variant="body1" fontWeight="bold">
                                                                {order.numero_op}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box>
                                                                <Typography variant="body2" fontWeight="medium">
                                                                    {order.nombre_cliente || order.cliente}
                                                                </Typography>
                                                                {order.cliente_email && (
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {order.cliente_email}
                                                                    </Typography>
                                                                )}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">
                                                                {formatDate(order.fecha_op)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box>
                                                                <Typography variant="body2">
                                                                    {parseInt(order.completed_cuts) || 0} de {parseInt(order.total_cuts) || 0} completados
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {order.cut_jobs?.length || 0} trabajos realizados
                                                                </Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Typography variant="body2">
                                                                {order.last_completed_date ? formatCompletionDate(order.last_completed_date) : 'N/A'}
                                            </Typography>
                                                        </TableCell>
                                                        <TableCell>
                                                            {/* Mostrar estado basado en los cut_jobs */}
                                                            {order.cut_jobs && order.cut_jobs.length > 0 ? (
                                                                <Box display="flex" flexWrap="wrap" gap={0.5}>
                                                                    {[...new Set(order.cut_jobs.map(job => job.estado))].map(estado => (
                                                                        <Chip 
                                                                            key={estado}
                                                                            icon={estado === 'Confirmado' ? <CheckCircle /> : undefined}
                                                                            label={estado === 'Confirmado' ? 'Confirmado' : 'Desviado'} 
                                                                            color={estado === 'Confirmado' ? 'success' : 'warning'} 
                                                                            size="small"
                                                                        />
                                                                    ))}
                                                                </Box>
                                                            ) : (
                                                                <Chip 
                                                                    icon={<CheckCircle />}
                                                                    label="Completado" 
                                                                    color="success" 
                                                                    size="small"
                                                                />
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Tooltip title="Ver Detalles">
                                                                <IconButton
                                                                    color="info"
                                                        size="small"
                                                                    onClick={() => handleViewDetails(order.id_op, true)}
                                                                >
                                                                    <Visibility />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>

                                    {/* Pagination for completed jobs */}
                                    {completedPagination.totalPages > 1 && (
                                        <Box display="flex" justifyContent="center" mt={3}>
                                            <Pagination
                                                count={completedPagination.totalPages}
                                                page={completedPagination.page}
                                                onChange={handleCompletedPageChange}
                                                color="primary"
                                            />
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Summary cards for completed jobs */}
                        {completedOrders.length > 0 && (
                            <Grid container spacing={2} sx={{ mt: 3 }}>
                                <Grid item xs={12} md={4}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" color="success.main">
                                                {completedPagination.total}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Total Completados
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" color="info.main">
                                                {completedOrders.reduce((sum, order) => sum + (parseInt(order.completed_cuts) || 0), 0)}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Cortes Completados
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" color="primary">
                                                {completedOrders.length}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                Órdenes Completadas
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                        </Grid>
                    )}
                    </>
                )}

                {/* Cut Details Modal */}
                <CutDetailsModal
                    open={detailsModalOpen}
                    onClose={handleCloseDetailsModal}
                    orderId={selectedOrderForDetails}
                    isCompleted={selectedOrderIsCompleted}
                />
            </Box>
        </RequireRole>
    );
};

export default EjecutarCorte; 