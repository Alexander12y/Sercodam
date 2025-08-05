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
  DialogActions
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Assignment as AssignmentIcon,
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
  Phone as PhoneIcon
} from '@mui/icons-material';
import { 
  fetchClientes, 
  deleteCliente, 
  clearError 
} from '../store/slices/clientesSlice';
import ClienteModal from '../components/forms/ClienteModal';

const ClientesList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { 
    clientes, 
    loading, 
    error, 
    pagination 
  } = useSelector(state => state.clientes);

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState(null);

  // Cargar clientes al montar el componente
  useEffect(() => {
    const params = {
      page: page + 1,
      limit: rowsPerPage
    };
    
    // Solo agregar search si no está vacío
    if (searchTerm && searchTerm.trim().length > 0) {
      params.search = searchTerm.trim();
    }
    
    dispatch(fetchClientes(params));
  }, [dispatch, page, rowsPerPage, searchTerm]);

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

  const handleAddCliente = () => {
    setSelectedCliente(null);
    setModalOpen(true);
  };

  const handleEditCliente = (cliente) => {
    setSelectedCliente(cliente);
    setModalOpen(true);
  };

  const handleDeleteClick = (cliente) => {
    setClienteToDelete(cliente);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (clienteToDelete) {
      try {
        await dispatch(deleteCliente(clienteToDelete.id_cliente)).unwrap();
        setDeleteDialogOpen(false);
        setClienteToDelete(null);
        // Recargar la lista
        const params = {
          page: page + 1,
          limit: rowsPerPage
        };
        
        if (searchTerm && searchTerm.trim().length > 0) {
          params.search = searchTerm.trim();
        }
        
        dispatch(fetchClientes(params));
      } catch (error) {
        console.error('Error eliminando cliente:', error);
      }
    }
  };

  const handleViewOrdenes = (cliente) => {
    navigate(`/clientes/${cliente.id_cliente}/ordenes`);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedCliente(null);
    // Recargar la lista después de crear/editar
    dispatch(fetchClientes({
      page: page + 1,
      limit: rowsPerPage,
      search: searchTerm
    }));
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && clientes.length === 0) {
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
          Gestión de Clientes
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={handleAddCliente}
          sx={{ borderRadius: 2 }}
        >
          Nuevo Cliente
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch(clearError())}>
          {error}
        </Alert>
      )}

      {/* Search Bar */}
      <Box mb={3}>
        <TextField
          fullWidth
          placeholder="Buscar por nombre, email o teléfono..."
          value={searchTerm}
          onChange={handleSearch}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 500 }}
        />
      </Box>

      {/* Table */}
      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Contacto</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Órdenes</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Fecha Registro</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clientes.map((cliente) => (
                <TableRow key={cliente.id_cliente} hover>
                  <TableCell>{cliente.id_cliente}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {cliente.nombre_cliente}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box>
                      {cliente.email_cliente && (
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {cliente.email_cliente}
                          </Typography>
                        </Box>
                      )}
                      {cliente.telefono_cliente && (
                        <Box display="flex" alignItems="center" gap={1}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {cliente.telefono_cliente}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        Total: {cliente.ordenes_totales || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Activas: {cliente.ordenes_activas || 0}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={cliente.tiene_ordenes ? 'Con Órdenes' : 'Sin Órdenes'}
                      color={cliente.tiene_ordenes ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatFecha(cliente.fecha_registro)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Editar cliente">
                        <IconButton
                          size="small"
                          onClick={() => handleEditCliente(cliente)}
                          color="primary"
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {cliente.tiene_ordenes && (
                        <Tooltip title="Ver órdenes">
                          <IconButton
                            size="small"
                            onClick={() => handleViewOrdenes(cliente)}
                            color="info"
                          >
                            <AssignmentIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      <Tooltip title="Eliminar cliente">
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteClick(cliente)}
                          color="error"
                          disabled={cliente.tiene_ordenes}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              
              {clientes.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm ? 'No se encontraron clientes con los criterios de búsqueda' : 'No hay clientes registrados'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 25, 50]}
          component="div"
          count={pagination.total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      {/* Modal para crear/editar cliente */}
      <ClienteModal
        open={modalOpen}
        onClose={handleModalClose}
        cliente={selectedCliente}
      />

      {/* Dialog de confirmación para eliminar */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas eliminar el cliente "{clienteToDelete?.nombre_cliente}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientesList; 