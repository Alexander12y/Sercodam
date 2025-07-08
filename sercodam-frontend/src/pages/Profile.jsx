import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Alert,
  Avatar,
  Grid,
  Divider,
  Chip,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  QrCode2 as QrCodeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { authApi } from '../services/api';
import { setUser } from '../store/slices/authSlice';

const Profile = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  
  const [form, setForm] = useState({
    nombre: user?.nombre || '',
    email: user?.email || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [secret, setSecret] = useState('');
  const [code2FA, setCode2FA] = useState('');
  const [twofaSuccess, setTwofaSuccess] = useState('');
  const [twofaError, setTwofaError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const reloadProfile = async () => {
    try {
      const res = await authApi.getProfile();
      if (res.data && res.data.success && res.data.data) {
        dispatch(setUser(res.data.data));
      }
    } catch (err) {
      // Ignorar errores silenciosamente
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authApi.updateProfile(form);
      if (response.data.success) {
        setSuccess('Perfil actualizado correctamente');
        await reloadProfile(); // Recargar perfil actualizado
      } else {
        setError(response.data.message || 'Error al actualizar el perfil');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup2FA = async () => {
    setShow2FA(true);
    setTwofaError('');
    setTwofaSuccess('');
    try {
      const response = await authApi.setup2FA();
      if (response.data.success) {
        setQrData(response.data.data.qr);
        setSecret(response.data.data.secret);
      } else {
        setShow2FA(false);
        setTwofaError(response.data.message || 'Error generando QR');
      }
    } catch (err) {
      setShow2FA(false);
      // Si el backend responde que ya está activado, mostrar mensaje amigable
      if (err.response?.data?.message?.includes('2FA ya está activado')) {
        setTwofaError('2FA ya está activado para tu cuenta. Si necesitas reconfigurarlo, contacta a un administrador.');
      } else {
        setTwofaError(err.response?.data?.message || 'Error generando QR');
      }
    }
  };

  const handleVerify2FA = async () => {
    setVerifying(true);
    setTwofaError('');
    setTwofaSuccess('');
    try {
      const response = await authApi.verify2FA({ token: code2FA });
      if (response.data.success) {
        setTwofaSuccess('¡2FA activado correctamente!');
        setShow2FA(false);
        setQrData(null);
        setSecret('');
        setCode2FA('');
        await reloadProfile(); // Recargar perfil actualizado
      } else {
        setTwofaError(response.data.message || 'Código incorrecto');
      }
    } catch (err) {
      setTwofaError(err.response?.data?.message || 'Código incorrecto');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Container maxWidth="md">
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mr: 2 }}
        >
          Volver
        </Button>
        <Typography variant="h4" component="h1">
          Mi Perfil
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Información del perfil */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Información Personal
                </Typography>
              </Box>
              
              <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Nombre completo"
                      name="nombre"
                      value={form.nombre}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={<SaveIcon />}
                      disabled={loading}
                      sx={{ mt: 2 }}
                    >
                      {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Información de la cuenta */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight={600}>
                  Información de la Cuenta
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Usuario
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {user?.username}
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Rol
                </Typography>
                <Chip 
                  label={user?.rol || 'Usuario'} 
                  color="primary" 
                  size="small"
                  variant="outlined"
                />
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Estado
                </Typography>
                <Chip 
                  label={user?.activo ? 'Activo' : 'Inactivo'} 
                  color={user?.activo ? 'success' : 'error'} 
                  size="small"
                />
              </Box>
              
              {user?.ultima_actividad && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Última actividad
                    </Typography>
                    <Typography variant="body2">
                      {new Date(user.ultima_actividad).toLocaleString()}
                    </Typography>
                  </Box>
                </>
              )}

              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Autenticación en dos pasos (2FA)
                </Typography>
                {user?.twofa_enabled || twofaSuccess ? (
                  <Alert severity="success" icon={<QrCodeIcon />} sx={{ mb: 2 }}>
                    2FA activado para tu cuenta
                  </Alert>
                ) : show2FA ? (
                  <Box>
                    {qrData && (
                      <Box textAlign="center" mb={2}>
                        <img src={qrData} alt="QR 2FA" style={{ width: 200, height: 200 }} />
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Secreto: <b>{secret}</b>
                        </Typography>
                      </Box>
                    )}
                    <TextField
                      label="Código de 6 dígitos"
                      value={code2FA}
                      onChange={e => setCode2FA(e.target.value)}
                      fullWidth
                      sx={{ mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleVerify2FA}
                      disabled={verifying || !code2FA}
                      fullWidth
                    >
                      {verifying ? 'Verificando...' : 'Verificar y Activar 2FA'}
                    </Button>
                    {twofaError && <Alert severity="error" sx={{ mt: 2 }}>{twofaError}</Alert>}
                    {twofaSuccess && <Alert severity="success" sx={{ mt: 2 }}>{twofaSuccess}</Alert>}
                  </Box>
                ) : (
                  !user?.twofa_enabled && !twofaSuccess && (
                    <Button
                      variant="outlined"
                      startIcon={<QrCodeIcon />}
                      onClick={handleSetup2FA}
                      fullWidth
                      sx={{ mt: 1 }}
                    >
                      Configurar 2FA
                    </Button>
                  )
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile; 