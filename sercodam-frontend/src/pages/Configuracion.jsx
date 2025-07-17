import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Switch,
  FormControlLabel,
  Tooltip,
  Grid,
  Avatar,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  VisibilityOff as ViewOffIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon,
  LockReset as LockResetIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { authApi } from '../services/api';
import { setUser } from '../store/slices/authSlice';

const Configuracion = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  // Estados
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]); // Usuarios sin filtrar para estadísticas
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para modales
  const [userModal, setUserModal] = useState({ open: false, mode: 'create', user: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
  
  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Estados para formulario
  const [form, setForm] = useState({
    username: '',
    password: '',
    nombre: '',
    email: '',
    rol: 'usuario',
    activo: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Cargar usuarios
  const loadUsers = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Cargar todos los usuarios sin filtros
      const response = await authApi.getUsers();
      if (response.data.success) {
        const allUsersData = response.data.data.users;
        setAllUsers(allUsersData);
        setUsers(allUsersData); // Inicialmente mostrar todos
      } else {
        setError('Error al cargar usuarios');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []); // Solo cargar al montar el componente

  // Aplicar filtros localmente cuando cambien
  useEffect(() => {
    let filtered = allUsers;

    // Aplicar filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Aplicar filtro de rol
    if (roleFilter) {
      filtered = filtered.filter(user => user.rol === roleFilter);
    }

    // Aplicar filtro de estado
    if (statusFilter) {
      filtered = filtered.filter(user => 
        (statusFilter === 'activo' && user.activo) ||
        (statusFilter === 'inactivo' && !user.activo)
      );
    }

    setUsers(filtered);
  }, [allUsers, searchTerm, roleFilter, statusFilter]);

  // Manejar cambios en el formulario
  const handleFormChange = (e) => {
    const { name, value, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'activo' ? checked : value
    }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Validar formulario
  const validateForm = () => {
    const errors = {};
    
    // Validar nombre de usuario
    if (!form.username.trim()) {
      errors.username = 'El nombre de usuario es requerido';
    } else {
      if (form.username.length < 3) {
        errors.username = 'El nombre de usuario debe tener al menos 3 caracteres';
      } else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) {
        errors.username = 'El nombre de usuario solo puede contener letras, números y guiones bajos';
      }
    }

    // Validar contraseña (obligatoria al crear y opcional al editar)
    if (userModal.mode === 'create' || form.password.trim()) {
      if (!form.password.trim()) {
        errors.password = 'La contraseña es requerida';
      } else {
        if (form.password.length < 8) {
          errors.password = 'La contraseña debe tener al menos 8 caracteres';
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(form.password)) {
          errors.password = 'La contraseña debe contener al menos una letra minúscula, una mayúscula y un número';
        }
      }
    }

    // Validar nombre
    if (!form.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    } else if (form.nombre.length < 2) {
      errors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }

    // Validar email
    if (!form.email.trim()) {
      errors.email = 'El email es requerido';
    } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(form.email)) {
      errors.email = 'El email debe tener un formato válido';
    }

    // Validar rol
    const validRoles = ['admin', 'supervisor', 'usuario', 'operador'];
    if (form.rol && !validRoles.includes(form.rol)) {
      errors.rol = 'El rol seleccionado no es válido';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Abrir modal de usuario
  const openUserModal = (mode, user = null) => {
    if (mode === 'create') {
      setForm({
        username: '',
        password: '',
        nombre: '',
        email: '',
        rol: 'usuario',
        activo: true
      });
    } else {
      setForm({
        username: user.username,
        password: '',
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        activo: user.activo
      });
    }
    
    setUserModal({ open: true, mode, user });
    setFormErrors({});
    setShowPassword(false);
  };

  // Guardar usuario
  const saveUser = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      let response;
      if (userModal.mode === 'create') {
        response = await authApi.createUser(form);
      } else {
        const updateData = { ...form };
        // Solo eliminar password si está vacío o solo contiene espacios
        if (!updateData.password || !updateData.password.trim()) {
          delete updateData.password;
        }
        response = await authApi.updateUser(userModal.user.id, updateData);
      }
      
      if (response.data.success) {
        setSuccess(`Usuario ${userModal.mode === 'create' ? 'creado' : 'actualizado'} correctamente`);
        setUserModal({ open: false, mode: 'create', user: null });
        loadUsers(); // Recargar todos los usuarios
      } else {
        setError(response.data.message || 'Error al guardar usuario');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar usuario');
    } finally {
      setLoading(false);
    }
  };

  // Cambiar estado de usuario
  const toggleUserStatus = async (targetUser) => {
    try {
      const response = await authApi.updateUser(targetUser.id, { activo: !targetUser.activo });
      if (response.data.success) {
        setSuccess(`Usuario ${targetUser.activo ? 'desactivado' : 'activado'} correctamente`);
        loadUsers(); // Recargar todos los usuarios
        // Si el usuario autenticado es el que cambia de estado, recargar perfil
        if (user && user.id === targetUser.id) {
          try {
            const res = await authApi.getProfile();
            if (res.data && res.data.success && res.data.data) {
              dispatch(setUser(res.data.data));
            }
          } catch (err) { /* Ignorar errores */ }
        }
      } else {
        setError(response.data.message || 'Error al cambiar estado');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar estado');
    }
  };

  // Eliminar usuario
  const deleteUser = async () => {
    try {
      const response = await authApi.deactivateUser(deleteModal.user.id);
      if (response.data.success) {
        setSuccess('Usuario eliminado correctamente');
        setDeleteModal({ open: false, user: null });
        loadUsers(); // Recargar todos los usuarios
      } else {
        setError(response.data.message || 'Error al eliminar usuario');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al eliminar usuario');
    }
  };

  // Exportar usuarios a CSV
  const exportUsersToCSV = () => {
    const headers = ['ID', 'Usuario', 'Nombre', 'Email', 'Rol', 'Estado', 'Última Actividad'];
    const csvContent = [
      headers.join(','),
      ...users.map(user => [
        user.id,
        user.username,
        user.nombre,
        user.email,
        user.rol,
        user.activo ? 'Activo' : 'Inactivo',
        user.ultima_actividad ? new Date(user.ultima_actividad).toLocaleString() : 'Nunca'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Obtener color del rol
  const getRoleColor = (rol) => {
    switch (rol) {
      case 'admin': return 'error';
      case 'supervisor': return 'warning';
      case 'operador': return 'info';
      default: return 'default';
    }
  };

  // Resetear 2FA de un usuario (solo admin)
  const handleReset2FA = async (targetUser) => {
    if (!window.confirm(`¿Seguro que deseas resetear el 2FA de ${targetUser.username}? Esto desactivará la autenticación en dos pasos para ese usuario.`)) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await authApi.resetUser2FA(targetUser.id);
      if (response.data.success) {
        setSuccess('2FA reseteado correctamente para el usuario.');
        loadUsers();
      } else {
        setError(response.data.message || 'Error al resetear 2FA');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al resetear 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xl">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mr: 2 }}
        >
          Volver
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SettingsIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h4" component="h1">
            Configuración del Sistema
          </Typography>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Panel de estadísticas del sistema */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Estadísticas del Sistema
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 2, color: 'white' }}>
                    <Typography variant="h4" fontWeight="bold">
                      {allUsers.length}
                    </Typography>
                    <Typography variant="body2">
                      Usuarios Totales
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 2, color: 'white' }}>
                    <Typography variant="h4" fontWeight="bold">
                      {allUsers.filter(u => u.activo).length}
                    </Typography>
                    <Typography variant="body2">
                      Usuarios Activos
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', borderRadius: 2, color: 'white' }}>
                    <Typography variant="h4" fontWeight="bold">
                      {allUsers.filter(u => u.rol === 'admin').length}
                    </Typography>
                    <Typography variant="body2">
                      Administradores
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', borderRadius: 2, color: 'white' }}>
                    <Typography variant="h4" fontWeight="bold">
                      {allUsers.filter(u => u.rol === 'supervisor').length}
                    </Typography>
                    <Typography variant="body2">
                      Supervisores
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Panel de gestión de usuarios */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PeopleIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Gestión de Usuarios
                </Typography>
              </Box>

              {/* Filtros */}
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      placeholder="Buscar usuarios..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
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
                      <InputLabel>Rol</InputLabel>
                      <Select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        label="Rol"
                      >
                        <MenuItem value="">Todos</MenuItem>
                        <MenuItem value="admin">Administrador</MenuItem>
                        <MenuItem value="supervisor">Supervisor</MenuItem>
                        <MenuItem value="operador">Operador</MenuItem>
                        <MenuItem value="usuario">Usuario</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <FormControl fullWidth>
                      <InputLabel>Estado</InputLabel>
                      <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        label="Estado"
                      >
                        <MenuItem value="">Todos</MenuItem>
                        <MenuItem value="activo">Activo</MenuItem>
                        <MenuItem value="inactivo">Inactivo</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<RefreshIcon />}
                      onClick={loadUsers}
                      disabled={loading}
                    >
                      Actualizar
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={1.5}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => openUserModal('create')}
                    >
                      Nuevo
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6} md={1.5}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={exportUsersToCSV}
                      disabled={users.length === 0}
                    >
                      CSV
                    </Button>
                  </Grid>
                </Grid>
              </Box>

              {/* Tabla de usuarios */}
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Usuario</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Rol</TableCell>
                      <TableCell>Estado</TableCell>
                      <TableCell>Última Actividad</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <CircularProgress size={24} />
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            Cargando usuarios...
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                {user.nombre ? user.nombre.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="body2" fontWeight={500}>
                                  {user.username}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  ID: {user.id}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {user.nombre}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {user.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.rol}
                              color={getRoleColor(user.rol)}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.activo ? 'Activo' : 'Inactivo'}
                              color={user.activo ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {user.ultima_actividad 
                                ? new Date(user.ultima_actividad).toLocaleString()
                                : 'Nunca'
                              }
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                              <Tooltip title="Editar usuario">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => openUserModal('edit', user)}
                                    color="primary"
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title={user.activo ? 'Desactivar' : 'Activar'}>
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => toggleUserStatus(user)}
                                    color={user.activo ? 'warning' : 'success'}
                                  >
                                    {user.activo ? <ViewOffIcon /> : <ViewIcon />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                              {/* Botón Reset 2FA solo si el usuario tiene 2FA activado y el admin no se resetea a sí mismo */}
                              {user.twofa_enabled && user.id !== (user?.id) && (
                                <Tooltip title="Resetear 2FA">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleReset2FA(user)}
                                      color="secondary"
                                    >
                                      <LockResetIcon />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                              {user.id !== user?.id && (
                                <Tooltip title="Eliminar usuario">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => setDeleteModal({ open: true, user })}
                                      color="error"
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {users.length === 0 && !loading && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {searchTerm || roleFilter || statusFilter ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchTerm || roleFilter || statusFilter 
                      ? 'Intenta ajustar los filtros de búsqueda'
                      : 'Comienza creando el primer usuario del sistema'
                    }
                  </Typography>
                  {!searchTerm && !roleFilter && !statusFilter && (
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => openUserModal('create')}
                      sx={{ mt: 2 }}
                    >
                      Crear Primer Usuario
                    </Button>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Panel de configuración de seguridad */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Configuración de Seguridad
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Política de Contraseñas
                    </Typography>
                    <Chip 
                      label="8+ caracteres, mayús/min/núm" 
                      size="small" 
                      color="success" 
                      variant="outlined"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Autenticación 2FA
                    </Typography>
                    <Chip 
                      label="Disponible" 
                      size="small" 
                      color="info" 
                      variant="outlined"
                    />
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Sesiones Activas
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {allUsers.filter(u => u.activo && u.ultima_actividad).length} usuarios
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Último Acceso
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {user?.ultima_actividad 
                        ? new Date(user.ultima_actividad).toLocaleString()
                        : 'Primera sesión'
                      }
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Recomendaciones de Seguridad
                    </Typography>
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        • Cambiar contraseñas periódicamente
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        • Activar 2FA para administradores
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        • Revisar usuarios inactivos regularmente
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Panel de roles y permisos */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Roles y Permisos
                </Typography>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Administrador
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Acceso completo al sistema, gestión de usuarios, configuración
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Supervisor
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Gestión de órdenes, inventario, reportes
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Operador
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Creación y edición de órdenes, consulta de inventario
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12}>
                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Usuario
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Consulta de órdenes, acceso básico al sistema
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Modal de usuario */}
      <Dialog 
        open={userModal.open} 
        onClose={() => setUserModal({ open: false, mode: 'create', user: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {userModal.mode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre de usuario"
                  name="username"
                  value={form.username}
                  onChange={handleFormChange}
                  error={!!formErrors.username}
                  helperText={formErrors.username}
                  disabled={userModal.mode === 'edit'}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Nombre completo"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleFormChange}
                  error={!!formErrors.nombre}
                  helperText={formErrors.nombre}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Rol</InputLabel>
                  <Select
                    name="rol"
                    value={form.rol}
                    onChange={handleFormChange}
                    label="Rol"
                  >
                    <MenuItem value="admin">Administrador</MenuItem>
                    <MenuItem value="supervisor">Supervisor</MenuItem>
                    <MenuItem value="operador">Operador</MenuItem>
                    <MenuItem value="usuario">Usuario</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {userModal.mode === 'create' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Contraseña"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleFormChange}
                    error={!!formErrors.password}
                    helperText={formErrors.password}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <ViewOffIcon /> : <ViewIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              )}
              {userModal.mode === 'edit' && (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nueva contraseña (opcional)"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleFormChange}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <ViewOffIcon /> : <ViewIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="activo"
                      checked={form.activo}
                      onChange={handleFormChange}
                    />
                  }
                  label="Usuario activo"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setUserModal({ open: false, mode: 'create', user: null })}
          >
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            onClick={saveUser}
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      <Dialog
        open={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, user: null })}
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que quieres eliminar al usuario "{deleteModal.user?.username}"?
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteModal({ open: false, user: null })}>
            Cancelar
          </Button>
          <Button variant="contained" color="error" onClick={deleteUser}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Configuracion; 