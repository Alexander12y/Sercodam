import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrdenes } from '../store/slices/ordenesSlice';

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'pendiente':
      return 'warning';
    case 'en_proceso':
      return 'info';
    case 'completada':
      return 'success';
    case 'cancelada':
      return 'error';
    default:
      return 'default';
  }
};

const getEstadoText = (estado) => {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente';
    case 'en_proceso':
      return 'En Proceso';
    case 'completada':
      return 'Completada';
    case 'cancelada':
      return 'Cancelada';
    default:
      return estado;
  }
};

const OrdenesList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { ordenes, loading, error } = useSelector((state) => state.ordenes);
  
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');

  useEffect(() => {
    dispatch(fetchOrdenes());
  }, [dispatch]);

  const ordenesFiltradas = ordenes.filter(orden => {
    const cumpleEstado = !filtroEstado || orden.estado === filtroEstado;
    const cumpleBusqueda = !filtroBusqueda || 
      orden.numero_op?.toLowerCase().includes(filtroBusqueda.toLowerCase()) ||
      orden.descripcion?.toLowerCase().includes(filtroBusqueda.toLowerCase());
    
    return cumpleEstado && cumpleBusqueda;
  });

  const handleVerOrden = (id) => {
    navigate(`/ordenes/${id}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Error al cargar las órdenes: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Órdenes de Producción
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/ordenes/nueva')}
        >
          Nueva Orden
        </Button>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Buscar por número o descripción"
                value={filtroBusqueda}
                onChange={(e) => setFiltroBusqueda(e.target.value)}
                size="small"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Estado</InputLabel>
                <Select
                  value={filtroEstado}
                  label="Estado"
                  onChange={(e) => setFiltroEstado(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="pendiente">Pendiente</MenuItem>
                  <MenuItem value="en_proceso">En Proceso</MenuItem>
                  <MenuItem value="completada">Completada</MenuItem>
                  <MenuItem value="cancelada">Cancelada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabla de órdenes */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Número OP</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Fecha Creación</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Prioridad</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ordenesFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No se encontraron órdenes
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              ordenesFiltradas.map((orden) => (
                <TableRow key={orden.id_op} hover>
                  <TableCell>{orden.numero_op}</TableCell>
                  <TableCell>{orden.descripcion}</TableCell>
                  <TableCell>
                    {orden.fecha_creacion ? new Date(orden.fecha_creacion).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getEstadoText(orden.estado)}
                      color={getEstadoColor(orden.estado)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={orden.prioridad === 'media' ? 'Media' : orden.prioridad || 'Media'}
                      color={orden.prioridad === 'alta' ? 'error' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleVerOrden(orden.id_op)}
                      title="Ver detalles"
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/ordenes/${orden.id_op}/editar`)}
                      title="Editar"
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Mostrando {ordenesFiltradas.length} de {ordenes.length} órdenes
        </Typography>
      </Box>
    </Box>
  );
};

export default OrdenesList; 