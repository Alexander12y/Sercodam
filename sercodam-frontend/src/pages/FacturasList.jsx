import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Payment as PaymentIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { facturaApi } from '../services/api';

const FacturasList = () => {
  const navigate = useNavigate();
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filters, setFilters] = useState({
    estado: '',
    cliente: '',
    fecha_desde: '',
    fecha_hasta: '',
    numero_factura: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState(null);

  // Estados para el modal de pago
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState(null);
  const [paymentData, setPaymentData] = useState({
    monto: '',
    metodo_pago: '',
    referencia_pago: '',
    notas: ''
  });

  useEffect(() => {
    fetchFacturas();
    fetchStats();
  }, [page, rowsPerPage, filters]);

  const fetchFacturas = async () => {
    try {
      setLoading(true);
      const params = {
        page: page + 1,
        limit: rowsPerPage,
        ...filters
      };

      const response = await facturaApi.getFacturas(params);
      setFacturas(response.data.facturas);
      setTotalRecords(response.data.pagination.totalRecords);
    } catch (error) {
      console.error('Error fetching facturas:', error);
      setError('Error al cargar las facturas');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await facturaApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({
      estado: '',
      cliente: '',
      fecha_desde: '',
      fecha_hasta: '',
      numero_factura: ''
    });
    setPage(0);
  };

  const handlePayment = (factura) => {
    setSelectedFactura(factura);
    setPaymentData({
      monto: '',
      metodo_pago: '',
      referencia_pago: '',
      notas: ''
    });
    setPaymentDialog(true);
  };

  const submitPayment = async () => {
    try {
      await facturaApi.registerPayment(selectedFactura.id_factura, paymentData);
      setPaymentDialog(false);
      fetchFacturas();
      fetchStats();
    } catch (error) {
      console.error('Error registering payment:', error);
      setError('Error al registrar el pago');
    }
  };

  const getEstadoColor = (estado) => {
    const colors = {
      'borrador': 'default',
      'emitida': 'primary',
      'pagada': 'success',
      'cancelada': 'error',
      'vencida': 'warning',
      'parcialmente_pagada': 'info'
    };
    return colors[estado] || 'default';
  };

  const getEstadoLabel = (estado) => {
    const labels = {
      'borrador': 'Borrador',
      'emitida': 'Emitida',
      'pagada': 'Pagada',
      'cancelada': 'Cancelada',
      'vencida': 'Vencida',
      'parcialmente_pagada': 'Parcialmente Pagada'
    };
    return labels[estado] || estado;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-MX');
  };

  if (loading && facturas.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Facturación
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/facturas/nueva')}
        >
          Nueva Factura
        </Button>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ReceiptIcon color="primary" sx={{ mr: 1 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Facturas
                    </Typography>
                    <Typography variant="h5">
                      {stats.estadisticas.total_facturas}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <MoneyIcon color="success" sx={{ mr: 1 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Facturado
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(stats.estadisticas.total_facturado || 0)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUpIcon color="success" sx={{ mr: 1 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Pagado
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(stats.estadisticas.total_pagado || 0)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ScheduleIcon color="warning" sx={{ mr: 1 }} />
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Pendiente
                    </Typography>
                    <Typography variant="h5">
                      {formatCurrency(stats.estadisticas.total_pendiente || 0)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <FilterIcon sx={{ mr: 1 }} />
          <Typography variant="h6">Filtros</Typography>
          <Button
            size="small"
            onClick={() => setShowFilters(!showFilters)}
            sx={{ ml: 'auto' }}
          >
            {showFilters ? 'Ocultar' : 'Mostrar'}
          </Button>
        </Box>

        {showFilters && (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Número de Factura"
                value={filters.numero_factura}
                onChange={(e) => handleFilterChange('numero_factura', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Cliente"
                value={filters.cliente}
                onChange={(e) => handleFilterChange('cliente', e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filters.estado}
                  onChange={(e) => handleFilterChange('estado', e.target.value)}
                  label="Estado"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="borrador">Borrador</MenuItem>
                  <MenuItem value="emitida">Emitida</MenuItem>
                  <MenuItem value="pagada">Pagada</MenuItem>
                  <MenuItem value="cancelada">Cancelada</MenuItem>
                  <MenuItem value="vencida">Vencida</MenuItem>
                  <MenuItem value="parcialmente_pagada">Parcialmente Pagada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Fecha Desde"
                type="date"
                value={filters.fecha_desde}
                onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                label="Fecha Hasta"
                type="date"
                value={filters.fecha_hasta}
                onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={clearFilters}
                size="small"
              >
                Limpiar
              </Button>
            </Grid>
          </Grid>
        )}
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Número</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Fecha Emisión</TableCell>
                <TableCell>Vencimiento</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Pagado</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {facturas.map((factura) => (
                <TableRow key={factura.id_factura} hover>
                  <TableCell>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {factura.numero_factura}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {factura.nombre_cliente}
                      </Typography>
                      {factura.empresa_cliente && (
                        <Typography variant="caption" color="textSecondary">
                          {factura.empresa_cliente}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{formatDate(factura.fecha_emision)}</TableCell>
                  <TableCell>{formatDate(factura.fecha_vencimiento)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(factura.total)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {formatCurrency(factura.total_pagado || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getEstadoLabel(factura.estado)}
                      color={getEstadoColor(factura.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={1} justifyContent="center">
                      <Tooltip title="Ver detalles">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/facturas/${factura.id_factura}`)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                      </Tooltip>
                      {factura.estado !== 'pagada' && factura.estado !== 'cancelada' && (
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/facturas/${factura.id_factura}/editar`)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {factura.estado !== 'pagada' && (
                        <Tooltip title="Registrar pago">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handlePayment(factura)}
                          >
                            <PaymentIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {factura.estado === 'borrador' && (
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              // Implementar eliminación
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalRecords}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </Paper>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onClose={() => setPaymentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Pago</DialogTitle>
        <DialogContent>
          {selectedFactura && (
            <Box mb={2}>
              <Typography variant="subtitle2" color="textSecondary">
                Factura: {selectedFactura.numero_factura}
              </Typography>
              <Typography variant="body2">
                Cliente: {selectedFactura.nombre_cliente}
              </Typography>
              <Typography variant="body2">
                Total: {formatCurrency(selectedFactura.total)}
              </Typography>
              <Typography variant="body2">
                Saldo pendiente: {formatCurrency(selectedFactura.saldo_pendiente || selectedFactura.total)}
              </Typography>
            </Box>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Monto"
                type="number"
                value={paymentData.monto}
                onChange={(e) => setPaymentData(prev => ({ ...prev, monto: e.target.value }))}
                inputProps={{ step: "0.01", min: "0" }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Método de Pago</InputLabel>
                <Select
                  value={paymentData.metodo_pago}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, metodo_pago: e.target.value }))}
                  label="Método de Pago"
                >
                  <MenuItem value="efectivo">Efectivo</MenuItem>
                  <MenuItem value="transferencia">Transferencia</MenuItem>
                  <MenuItem value="cheque">Cheque</MenuItem>
                  <MenuItem value="tarjeta">Tarjeta</MenuItem>
                  <MenuItem value="otro">Otro</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Referencia"
                value={paymentData.referencia_pago}
                onChange={(e) => setPaymentData(prev => ({ ...prev, referencia_pago: e.target.value }))}
                placeholder="Número de transferencia, cheque, etc."
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notas"
                multiline
                rows={3}
                value={paymentData.notas}
                onChange={(e) => setPaymentData(prev => ({ ...prev, notas: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialog(false)}>Cancelar</Button>
          <Button 
            onClick={submitPayment} 
            variant="contained" 
            disabled={!paymentData.monto || !paymentData.metodo_pago}
          >
            Registrar Pago
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FacturasList;
