import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  Pagination,
  Button,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Stack,
  Avatar,
  LinearProgress,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Pause as PauseIcon,
  CheckCircle as CheckCircleIcon,
  Build as BuildIcon,
  Notifications as NotificationsIcon,
  TrendingUp as TrendingUpIcon,
  Inventory as InventoryIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  People as PeopleIcon,
  Description as DescriptionIcon,
  Business as BusinessIcon,
  Timeline as TimelineIcon,
  Home as HomeIcon,
  Email as EmailIcon,
  Group as GroupIcon,
  ShoppingCart as ShoppingCartIcon,
  Engineering as EngineeringIcon,
  Folder as FolderIcon,
  Assessment as AssessmentIcon,
  Star as StarIcon,
  Favorite as FavoriteIcon,
  EmojiEvents as EmojiEventsIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchOrdenes } from '../store/slices/ordenesSlice';
import { fetchUnreadLeadsCount } from '../store/slices/leadsSlice';
import api from '../services/api';

const WelcomeMessage = ({ user }) => (
  <Box sx={{ mb: 4 }}>
    <Typography 
      variant="h4" 
      sx={{ 
        fontWeight: 600, 
        color: 'text.primary',
        fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
        textAlign: { xs: 'center', sm: 'left' },
        letterSpacing: '-0.02em',
        lineHeight: 1.2,
      }}
    >
      Bienvenido de vuelta, {user?.nombre || user?.username}
    </Typography>
  </Box>
);

const StatCard = ({ title, value, icon, color, onClick, subtitle, trend }) => (
  <Card 
    onClick={onClick}
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.2s ease-in-out',
      border: '1px solid rgba(0, 0, 0, 0.12)',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(0, 0, 0, 0.2)',
      },
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: `${color}15`,
            color: color,
            boxShadow: `${color}20`,
          }}
        >
          {icon}
        </Box>
        {trend && (
          <Chip
            label={trend}
            size="small"
            color={trend.includes('+') ? 'success' : 'error'}
            variant="outlined"
            sx={{ fontSize: '0.75rem' }}
          />
        )}
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
        {value}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const QuickActionCard = ({ title, description, icon, onClick, color }) => (
  <Card 
    onClick={onClick}
    sx={{
      cursor: 'pointer',
      transition: 'all 0.2s ease-in-out',
      border: '1px solid rgba(0, 0, 0, 0.12)',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(0, 0, 0, 0.2)',
      },
    }}
  >
    <CardContent sx={{ p: 3, textAlign: 'center' }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: `${color}15`,
          color: color,
          mx: 'auto',
          mb: 2,
          boxShadow: `${color}20`,
        }}
      >
        {icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {description}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { ordenes, loading } = useSelector((state) => state.ordenes);
  const { unreadCount } = useSelector((state) => state.leads);
  const [stockAlertas, setStockAlertas] = useState({ resumen: null, materiales: [], herramientas: [], panos: [], loading: true });
  const [pageMat, setPageMat] = useState(1);
  const [pageHer, setPageHer] = useState(1);
  const [pagePan, setPagePan] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    dispatch(fetchOrdenes());
    dispatch(fetchUnreadLeadsCount());
    loadAlertas();
  }, [dispatch]);

  const loadAlertas = async () => {
    try {
      const response = await api.get('/inventario/alertas');
      setStockAlertas({
        resumen: response.data.data.resumen,
        materiales: response.data.data.materialesBajos,
        herramientas: response.data.data.herramientasBajas,
        panos: response.data.data.panosBajos,
        loading: false
      });
      setPageMat(1);
      setPageHer(1);
      setPagePan(1);
    } catch (err) {
      console.error('Error cargando alertas de stock:', err);
      setStockAlertas({ resumen: null, loading: false });
    }
  };

  // Calcular estadísticas
  const totalOrdenes = ordenes.length;
  const ordenesPendientes = ordenes.filter(orden => orden.estado === 'pendiente').length;
  const ordenesEnProceso = ordenes.filter(orden => orden.estado === 'en_proceso').length;
  const ordenesCompletadas = ordenes.filter(orden => orden.estado === 'completada').length;

  const handleQuickAction = (action) => {
    switch (action) {
      case 'nueva-orden':
        navigate('/ordenes/nueva');
        break;
      case 'nuevo-lead':
        navigate('/leads/nuevo');
        break;
      case 'nueva-cotizacion':
        navigate('/cotizaciones/nueva');
        break;
      case 'nuevo-cliente':
        navigate('/clientes/nuevo');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 0 }}>
      {/* Mensaje de bienvenida simplificado */}
      <WelcomeMessage user={user} />

      {/* Tarjetas de estadísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Órdenes"
            value={totalOrdenes}
            icon={<AssignmentIcon />}
            color="#6b7280"
            subtitle="Órdenes registradas"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Por Aprobar"
            value={ordenesPendientes}
            icon={<PauseIcon />}
            color="#f59e0b"
            subtitle="Pendientes de aprobación"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="En Proceso"
            value={ordenesEnProceso}
            icon={<BuildIcon />}
            color="#0891b2"
            subtitle="En producción"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completadas"
            value={ordenesCompletadas}
            icon={<CheckCircleIcon />}
            color="#059669"
            subtitle="Finalizadas exitosamente"
          />
        </Grid>
      </Grid>

      {/* Acciones rápidas */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <EmojiEventsIcon sx={{ color: 'primary.main', fontSize: '1.5rem' }} />
          <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary' }}>
            Acciones Rápidas
          </Typography>
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title="Nueva Orden"
              description="Crear nueva orden de producción"
              icon={<AddIcon />}
              color="#6b7280"
              onClick={() => handleQuickAction('nueva-orden')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title="Nuevo Lead"
              description="Agregar nuevo lead"
              icon={<EmailIcon />}
              color="#3b82f6"
              onClick={() => handleQuickAction('nuevo-lead')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title="Nueva Cotización"
              description="Crear nueva cotización"
              icon={<DescriptionIcon />}
              color="#8b5cf6"
              onClick={() => handleQuickAction('nueva-cotizacion')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <QuickActionCard
              title="Nuevo Cliente"
              description="Registrar nuevo cliente"
              icon={<GroupIcon />}
              color="#059669"
              onClick={() => handleQuickAction('nuevo-cliente')}
            />
          </Grid>
        </Grid>
      </Box>

      {/* Información del sistema */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <TrendingUpIcon sx={{ color: 'primary.main', fontSize: '1.5rem' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Métricas de Producción
                </Typography>
              </Box>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Eficiencia promedio
                  </Typography>
                  <Chip label="85%" color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Tiempo promedio de entrega
                  </Typography>
                  <Chip label="3.2 días" color="info" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Tasa de retrabajo
                  </Typography>
                  <Chip label="2.1%" color="warning" size="small" />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <BusinessIcon sx={{ color: 'primary.main', fontSize: '1.5rem' }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  Indicadores Financieros
                </Typography>
              </Box>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Ingresos del mes
                  </Typography>
                  <Chip label="$125,450" color="success" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Órdenes pendientes
                  </Typography>
                  <Chip label={ordenesPendientes} color="primary" size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Valor en producción
                  </Typography>
                  <Chip label="$45,200" color="info" size="small" />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alertas de Stock */}
      {stockAlertas.resumen && (
        <Grid container spacing={3} sx={{ mb: 4, mt: 4 }}>
          <Grid item xs={12}>
            <Card sx={{ border: '1px solid rgba(0, 0, 0, 0.12)' }}>
              <CardContent sx={{ p: 0 }}>
                <Box sx={{ 
                  p: 3, 
                  pb: 2,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="h5" sx={{ 
                    fontWeight: 600, 
                    color: 'text.primary',
                    letterSpacing: '-0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <WarningIcon sx={{ color: '#f59e0b' }} />
                    Alertas de Stock Bajo
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<InventoryIcon />}
                    onClick={() => navigate('/inventario/panos')}
                    sx={{
                      fontWeight: 600,
                      borderColor: 'primary.main',
                      color: 'primary.main',
                      '&:hover': {
                        borderColor: 'primary.main',
                        backgroundColor: 'primary.main',
                        color: 'white',
                      }
                    }}
                  >
                    Ver Inventario
                  </Button>
                </Box>
                <Box sx={{ p: 3, pt: 2 }}>
                  <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={4} md={3}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: 'background.paper', 
                        borderRadius: 2, 
                        border: '1px solid',
                        borderColor: 'divider',
                        textAlign: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <WarningIcon sx={{ color: '#dc2626', fontSize: '2rem', mb: 1 }} />
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#dc2626', mb: 0.5 }}>
                          {stockAlertas.resumen.materialesStock}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Materiales
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4} md={3}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: 'background.paper', 
                        borderRadius: 2, 
                        border: '1px solid',
                        borderColor: 'divider',
                        textAlign: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <WarningIcon sx={{ color: '#dc2626', fontSize: '2rem', mb: 1 }} />
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#dc2626', mb: 0.5 }}>
                          {stockAlertas.resumen.herramientasStock}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Herramientas
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4} md={3}>
                      <Box sx={{ 
                        p: 2, 
                        bgcolor: 'background.paper', 
                        borderRadius: 2, 
                        border: '1px solid',
                        borderColor: 'divider',
                        textAlign: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }}>
                        <WarningIcon sx={{ color: '#dc2626', fontSize: '2rem', mb: 1 }} />
                        <Typography variant="h4" sx={{ fontWeight: 700, color: '#dc2626', mb: 0.5 }}>
                          {stockAlertas.resumen.panosStock}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                          Paños
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Listados detallados */}
                  {stockAlertas.materiales.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                        Materiales con Stock Bajo
                      </Typography>
                      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>Código</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Descripción</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>Disponible / Mínimo</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {stockAlertas.materiales.slice((pageMat-1)*pageSize,pageMat*pageSize).map((m)=>(
                              <TableRow key={m.id_item} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                <TableCell sx={{ fontWeight: 500 }}>{m.id_material_extra}</TableCell>
                                <TableCell>{m.descripcion}</TableCell>
                                <TableCell align="right">
                                  <Chip 
                                    label={`${m.cantidad_disponible ?? 0} / ${m.stock_minimo ?? 0}`}
                                    color="error"
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {stockAlertas.materiales.length>pageSize && (
                        <Box sx={{display:'flex',justifyContent:'center',mt:2}}>
                          <Pagination count={Math.ceil(stockAlertas.materiales.length/pageSize)} page={pageMat} onChange={(e,v)=>setPageMat(v)} size="small" />
                        </Box>
                      )}
                    </Box>
                  )}

                  {stockAlertas.herramientas.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                        Herramientas con Stock Bajo
                      </Typography>
                      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>Código</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Descripción</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>Disponible / Mínimo</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {stockAlertas.herramientas.slice((pageHer-1)*pageSize,pageHer*pageSize).map((h)=>(
                              <TableRow key={h.id_item} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                <TableCell sx={{ fontWeight: 500 }}>{h.id_herramienta}</TableCell>
                                <TableCell>{h.descripcion}</TableCell>
                                <TableCell align="right">
                                  <Chip 
                                    label={`${h.cantidad_disponible ?? 0} / ${h.stock_minimo ?? 0}`}
                                    color="error"
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {stockAlertas.herramientas.length>pageSize && (
                        <Box sx={{display:'flex',justifyContent:'center',mt:2}}>
                          <Pagination count={Math.ceil(stockAlertas.herramientas.length/pageSize)} page={pageHer} onChange={(e,v)=>setPageHer(v)} size="small" />
                        </Box>
                      )}
                    </Box>
                  )}

                  {stockAlertas.panos.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}>
                        Paños con Stock Bajo
                      </Typography>
                      <TableContainer component={Paper} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600 }}>ID</TableCell>
                              <TableCell sx={{ fontWeight: 600 }}>Tipo</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600 }}>Área / Mínimo</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {stockAlertas.panos.slice((pagePan-1)*pageSize,pagePan*pageSize).map((p)=>(
                              <TableRow key={p.id_item} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                                <TableCell sx={{ fontWeight: 500 }}>{p.id_item}</TableCell>
                                <TableCell>{p.tipo_red}</TableCell>
                                <TableCell align="right">
                                  <Chip 
                                    label={`${p.area_m2 ?? 0} / ${p.stock_minimo ?? 0}`}
                                    color="error"
                                    size="small"
                                    variant="outlined"
                                  />
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {stockAlertas.panos.length>pageSize && (
                        <Box sx={{display:'flex',justifyContent:'center',mt:2}}>
                          <Pagination count={Math.ceil(stockAlertas.panos.length/pageSize)} page={pagePan} onChange={(e,v)=>setPagePan(v)} size="small" />
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Estado vacío */}
      {totalOrdenes === 0 && (
        <Card sx={{ mt: 4, textAlign: 'center', py: 6, border: '1px solid rgba(0, 0, 0, 0.12)' }}>
          <CardContent>
            <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
              ¡Comienza tu primera orden!
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
              No hay órdenes de producción registradas. Crea tu primera orden para comenzar.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => navigate('/ordenes/nueva')}
              sx={{ 
                fontWeight: 600,
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.main',
                  backgroundColor: 'primary.main',
                  color: 'white',
                }
              }}
            >
              Crear Primera Orden
            </Button>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Dashboard; 