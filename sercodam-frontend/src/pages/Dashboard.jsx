import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Pagination,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Pause as PauseIcon,
  CheckCircle as CheckCircleIcon,
  Build as BuildIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { fetchOrdenes } from '../store/slices/ordenesSlice';
import api from '../services/api';

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            backgroundColor: color,
            borderRadius: '50%',
            p: 1,
            mr: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const dispatch = useDispatch();
  const { ordenes, loading, error } = useSelector((state) => state.ordenes);

  const [stockAlertas, setStockAlertas] = useState({ resumen: null, materiales: [], herramientas: [], panos: [], loading: true });
  const [pageMat,setPageMat]=useState(1);
  const [pageHer,setPageHer]=useState(1);
  const [pagePan,setPagePan]=useState(1);
  const pageSize=10;

  useEffect(() => {
    // Cargar todas las órdenes sin límite para obtener conteos correctos
    dispatch(fetchOrdenes({ limit: 1000 }));
    // Obtener alertas de stock
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
        setPageMat(1);setPageHer(1);setPagePan(1);
      } catch (err) {
        console.error('Error cargando alertas de stock:', err);
        setStockAlertas({ resumen: null, loading: false });
      }
    };
    loadAlertas();
  }, [dispatch]);

  // Calcular estadísticas
  const totalOrdenes = ordenes.length;
  const ordenesPorAprobar = ordenes.filter(orden => orden.estado === 'por aprobar').length;
  const ordenesEnProceso = ordenes.filter(orden => orden.estado === 'en_proceso').length;
  const ordenesCompletadas = ordenes.filter(orden => orden.estado === 'completada').length;
  const ordenesCanceladas = ordenes.filter(orden => orden.estado === 'cancelada').length;

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
        Error al cargar los datos: {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Órdenes"
            value={totalOrdenes}
            icon={<AssignmentIcon sx={{ color: 'white' }} />}
            color="#607d8b"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Por Aprobar"
            value={ordenesPorAprobar}
            icon={<AssignmentIcon sx={{ color: 'white' }} />}
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="En Proceso"
            value={ordenesEnProceso}
            icon={<BuildIcon sx={{ color: 'white' }} />}
            color="#2196f3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completadas"
            value={ordenesCompletadas}
            icon={<CheckCircleIcon sx={{ color: 'white' }} />}
            color="#4caf50"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Canceladas"
            value={ordenesCanceladas}
            icon={<PauseIcon sx={{ color: 'white' }} />}
            color="#e53935"
          />
        </Grid>
      </Grid>

      {/* Widget de Stock Bajo */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Stock Bajo
        </Typography>
        {stockAlertas.loading ? (
          <CircularProgress />
        ) : stockAlertas.resumen ? (
          <>
            <Grid container spacing={2} sx={{ mb:2 }}>
              <Grid item xs={12} sm={4} md={3}>
                <StatCard
                  title="Materiales"
                  value={stockAlertas.resumen.materialesStock}
                  icon={<BuildIcon sx={{ color: 'white' }} />}
                  color="#e53935"
                />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <StatCard
                  title="Herramientas"
                  value={stockAlertas.resumen.herramientasStock}
                  icon={<BuildIcon sx={{ color: 'white' }} />}
                  color="#e53935"
                />
              </Grid>
              <Grid item xs={12} sm={4} md={3}>
                <StatCard
                  title="Paños"
                  value={stockAlertas.resumen.panosStock}
                  icon={<BuildIcon sx={{ color: 'white' }} />}
                  color="#e53935"
                />
              </Grid>
            </Grid>

            {/* Listados */}
            {stockAlertas.materiales.length > 0 && (
              <Box sx={{ mb:3 }}>
                <Typography variant="subtitle1" gutterBottom>Materiales</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Código</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell align="right">Disponible / Mínimo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stockAlertas.materiales.slice((pageMat-1)*pageSize,pageMat*pageSize).map((m)=>(
                        <TableRow key={m.id_item}>
                          <TableCell>{m.id_material_extra}</TableCell>
                          <TableCell>{m.descripcion}</TableCell>
                          <TableCell align="right">{m.cantidad_disponible ?? 0} / {m.stock_minimo ?? 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {stockAlertas.materiales.length>pageSize && (
                  <Box sx={{display:'flex',justifyContent:'center',mt:1}}>
                    <Pagination count={Math.ceil(stockAlertas.materiales.length/pageSize)} page={pageMat} onChange={(e,v)=>setPageMat(v)} size="small" />
                  </Box>
                )}
              </Box>
            )}

            {stockAlertas.herramientas.length > 0 && (
              <Box sx={{ mb:3 }}>
                <Typography variant="subtitle1" gutterBottom>Herramientas</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Código</TableCell>
                        <TableCell>Descripción</TableCell>
                        <TableCell align="right">Disponible / Mínimo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stockAlertas.herramientas.slice((pageHer-1)*pageSize,pageHer*pageSize).map((h)=>(
                        <TableRow key={h.id_item}>
                          <TableCell>{h.id_herramienta}</TableCell>
                          <TableCell>{h.descripcion}</TableCell>
                          <TableCell align="right">{h.cantidad_disponible ?? 0} / {h.stock_minimo ?? 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {stockAlertas.herramientas.length>pageSize && (
                  <Box sx={{display:'flex',justifyContent:'center',mt:1}}>
                    <Pagination count={Math.ceil(stockAlertas.herramientas.length/pageSize)} page={pageHer} onChange={(e,v)=>setPageHer(v)} size="small" />
                  </Box>
                )}
              </Box>
            )}

            {stockAlertas.panos.length > 0 && (
              <Box sx={{ mb:3 }}>
                <Typography variant="subtitle1" gutterBottom>Paños</Typography>
                <TableContainer component={Paper}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell align="right">Área / Mínimo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {stockAlertas.panos.slice((pagePan-1)*pageSize,pagePan*pageSize).map((p)=>(
                        <TableRow key={p.id_item}>
                          <TableCell>{p.id_item}</TableCell>
                          <TableCell>{p.tipo_red}</TableCell>
                          <TableCell align="right">{p.area_m2 ?? 0} / {p.stock_minimo ?? 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                {stockAlertas.panos.length>pageSize && (
                  <Box sx={{display:'flex',justifyContent:'center',mt:1}}>
                    <Pagination count={Math.ceil(stockAlertas.panos.length/pageSize)} page={pagePan} onChange={(e,v)=>setPagePan(v)} size="small" />
                  </Box>
                )}
              </Box>
            )}
          </>
        ) : (
          <Typography>No hay alertas de stock bajo</Typography>
        )}
      </Box>

      {totalOrdenes === 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" color="text.secondary" align="center">
              No hay órdenes de producción registradas
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Crea tu primera orden de producción para comenzar
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Dashboard; 