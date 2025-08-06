import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  Tooltip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Badge
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Notifications as NotificationsIcon,
  PersonAdd as PersonAddIcon
} from '@mui/icons-material';
import { 
  fetchLeads, 
  fetchLeadsStats,
  deleteLead, 
  convertLeadToClient,
  updateLead,
  clearError 
} from '../store/slices/leadsSlice';
import LeadDetailsModal from '../components/LeadDetailsModal';

const LeadsList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { 
    leads, 
    stats,
    loading, 
    statsLoading,
    error, 
    pagination 
  } = useSelector(state => state.leads);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [leidoFilter, setLeidoFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [leadToConvert, setLeadToConvert] = useState(null);
  const [notasConversion, setNotasConversion] = useState('');

  // Cargar leads y estadísticas al montar el componente
  useEffect(() => {
    const params = {
      page: page + 1,
      limit: rowsPerPage
    };
    
    // Agregar filtros si están definidos
    if (searchTerm && searchTerm.trim().length > 0) {
      params.search = searchTerm.trim();
    }
    if (estadoFilter) {
      params.estado = estadoFilter;
    }
    if (leidoFilter !== '') {
      params.leido = leidoFilter;
    }
    
    dispatch(fetchLeads(params));
    dispatch(fetchLeadsStats());
  }, [dispatch, page, rowsPerPage, searchTerm, estadoFilter, leidoFilter]);

  // Limpiar errores al desmontar
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(0); // Reset a la primera página
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewLead = async (lead) => {
    setSelectedLeadId(lead.id_lead);
    setDetailsModalOpen(true);
    
    // Marcar como leído si no está leído
    if (!lead.leido) {
      try {
        await dispatch(updateLead({ id: lead.id_lead, data: { leido: true } })).unwrap();
        // Recargar leads para actualizar el estado
        dispatch(fetchLeads({ page: page + 1, limit: rowsPerPage }));
      } catch (error) {
        console.error('Error marcando lead como leído:', error);
      }
    }
  };



  const handleDeleteClick = (lead) => {
    setLeadToDelete(lead);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (leadToDelete) {
      try {
        await dispatch(deleteLead(leadToDelete.id_lead)).unwrap();
        setDeleteDialogOpen(false);
        setLeadToDelete(null);
      } catch (error) {
        console.error('Error eliminando lead:', error);
      }
    }
  };

  const handleConvertClick = (lead) => {
    setLeadToConvert(lead);
    setNotasConversion('');
    setConvertDialogOpen(true);
  };

  const handleConvertConfirm = async () => {
    try {
      await dispatch(convertLeadToClient({ 
        id: leadToConvert.id_lead, 
        notas_adicionales: notasConversion 
      })).unwrap();
      
      setConvertDialogOpen(false);
      setLeadToConvert(null);
      setNotasConversion('');
      
      // Recargar leads
      dispatch(fetchLeads({ page: page + 1, limit: rowsPerPage }));
      
      // Mostrar mensaje de éxito
      alert(leadToConvert?.id_cliente ? 
        'Nuevo proyecto creado para cliente existente exitosamente' : 
        'Lead convertido a cliente exitosamente'
      );
    } catch (error) {
      console.error('Error convirtiendo lead:', error);
      alert('Error convirtiendo lead a cliente: ' + error.message);
    }
  };

  const handleRefresh = () => {
    dispatch(fetchLeads({ page: page + 1, limit: rowsPerPage }));
    dispatch(fetchLeadsStats());
  };

  const formatFecha = (fecha) => {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'nuevo': return 'primary';
      case 'nuevo_proyecto': return 'secondary';
      case 'en_revision': return 'warning';
      case 'contactado': return 'info';
      case 'convertido': return 'success';
      case 'descartado': return 'error';
      default: return 'default';
    }
  };

  const getEstadoLabel = (estado) => {
    switch (estado) {
      case 'nuevo': return 'Nuevo';
      case 'nuevo_proyecto': return 'Nuevo Proyecto';
      case 'en_revision': return 'En Revisión';
      case 'contactado': return 'Contactado';
      case 'convertido': return 'Convertido';
      case 'descartado': return 'Descartado';
      default: return estado;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Leads de Ventas
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Gestión de leads recibidos por email y otras fuentes
        </Typography>
      </Box>

      {/* Estadísticas */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Leads
              </Typography>
              <Typography variant="h4">
                {statsLoading ? <CircularProgress size={20} /> : stats.total_leads}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Nuevos
              </Typography>
              <Typography variant="h4" color="primary">
                {statsLoading ? <CircularProgress size={20} /> : stats.leads_nuevos}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Hoy
              </Typography>
              <Typography variant="h4" color="success.main">
                {statsLoading ? <CircularProgress size={20} /> : stats.leads_hoy}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Esta Semana
              </Typography>
              <Typography variant="h4" color="info.main">
                {statsLoading ? <CircularProgress size={20} /> : stats.leads_semana}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros y búsqueda */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Buscar por email, nombre, empresa..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={estadoFilter}
                label="Estado"
                onChange={(e) => setEstadoFilter(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="nuevo">Nuevo</MenuItem>
                <MenuItem value="en_revision">En Revisión</MenuItem>
                <MenuItem value="contactado">Contactado</MenuItem>
                <MenuItem value="convertido">Convertido</MenuItem>
                <MenuItem value="descartado">Descartado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Leído</InputLabel>
              <Select
                value={leidoFilter}
                label="Leído"
                onChange={(e) => setLeidoFilter(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="false">No Leídos</MenuItem>
                <MenuItem value="true">Leídos</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={loading}
              >
                Actualizar
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabla de leads */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Remitente</TableCell>
                <TableCell>Asunto</TableCell>
                <TableCell>Empresa</TableCell>
                <TableCell>Cliente Asociado</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Leído</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No se encontraron leads
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.id_lead} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {lead.nombre_remitente || 'Sin nombre'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {lead.email_remitente}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                        {lead.asunto_email || 'Sin asunto'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {lead.empresa || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {lead.cliente_nombre ? (
                          <Box>
                            <Typography variant="body2" fontWeight="medium" color="primary">
                              {lead.cliente_nombre}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {lead.cliente_email}
                            </Typography>
                            {lead.match_por && (
                              <Chip 
                                label={`Match: ${lead.match_por}`} 
                                size="small" 
                                color="secondary" 
                                variant="outlined"
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Nuevo cliente
                          </Typography>
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getEstadoLabel(lead.estado)}
                        color={getEstadoColor(lead.estado)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatFecha(lead.fecha_recepcion)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={lead.leido ? 'Leído' : 'No leído'}
                        color={lead.leido ? 'success' : 'warning'}
                        size="small"
                        variant={lead.leido ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Ver detalles">
                          <IconButton
                            size="small"
                            onClick={() => handleViewLead(lead)}
                            color="primary"
                          >
                            <VisibilityIcon />
                          </IconButton>
                        </Tooltip>

                        {lead.estado !== 'convertido' && (
                          <Tooltip title={lead.id_cliente ? "Crear nuevo proyecto para cliente existente" : "Convertir a Cliente"}>
                            <IconButton
                              size="small"
                              onClick={() => handleConvertClick(lead)}
                              color="success"
                            >
                              <PersonAddIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="Eliminar">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(lead)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={pagination.total}
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

      {/* Dialog de confirmación de eliminación */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar el lead de{' '}
            <strong>{leadToDelete?.nombre_remitente || leadToDelete?.email_remitente}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmación de conversión */}
      <Dialog
        open={convertDialogOpen}
        onClose={() => setConvertDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {leadToConvert?.id_cliente ? 'Crear Nuevo Proyecto' : 'Convertir Lead a Cliente'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {leadToConvert?.id_cliente ? (
              <>
                ¿Estás seguro de que quieres crear un nuevo proyecto para el cliente{' '}
                <strong>{leadToConvert?.cliente_nombre || 'existente'}</strong>?
              </>
            ) : (
              <>
                ¿Estás seguro de que quieres convertir el lead de{' '}
                <strong>{leadToConvert?.nombre_remitente || leadToConvert?.email_remitente}</strong> a cliente?
              </>
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Esta acción:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {leadToConvert?.id_cliente ? (
              <>
                <li>Actualizará los datos del cliente existente si hay información nueva</li>
                <li>Agregará las notas del nuevo proyecto al cliente</li>
                <li>Actualizará el estado del lead a "convertido"</li>
                <li>Mantendrá el historial del lead para auditoría</li>
              </>
            ) : (
              <>
                <li>Creará un nuevo registro en la tabla de clientes</li>
                <li>Actualizará el estado del lead a "convertido"</li>
                <li>Mantendrá el historial del lead para auditoría</li>
              </>
            )}
          </ul>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notas adicionales (opcional)"
            value={notasConversion}
            onChange={(e) => setNotasConversion(e.target.value)}
            placeholder={leadToConvert?.id_cliente ? "Agregar notas sobre el nuevo proyecto..." : "Agregar notas sobre la conversión..."}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConvertDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConvertConfirm} color="success" variant="contained">
            {leadToConvert?.id_cliente ? 'Crear Proyecto' : 'Convertir a Cliente'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mostrar errores */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Modal de detalles del lead */}
      <LeadDetailsModal
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedLeadId(null);
        }}
        leadId={selectedLeadId}
      />
    </Box>
  );
};

export default LeadsList; 