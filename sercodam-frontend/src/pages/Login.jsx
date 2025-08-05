import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Navigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { setUser, setToken, setLoading, setError, clearError } from '../store/slices/authSlice';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);

  const [form, setForm] = useState({
    username: '',
    password: '',
  });

  const [formError, setFormError] = useState('');
  const [require2FA, setRequire2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [code2FA, setCode2FA] = useState('');
  const [twofaError, setTwofaError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setFormError('');
    if (error) dispatch(clearError());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setFormError('Usuario y contraseña son requeridos');
      return;
    }
    dispatch(setLoading(true));
    setTwofaError('');
    try {
      const res = await authApi.login({ username: form.username, password: form.password });
      if (res.data && res.data.require2FA) {
        setRequire2FA(true);
        setTempToken(res.data.tempToken);
        setFormError('');
        setTwofaError('');
        return;
      }
      if (res.data && res.data.success && res.data.data && res.data.data.tokens) {
        dispatch(setToken(res.data.data.tokens.accessToken));
        dispatch(setUser(res.data.data.user || { username: form.username }));
        navigate('/');
      } else {
        dispatch(setError('Respuesta inesperada del servidor.'));
      }
    } catch (err) {
      dispatch(setError(err.response?.data?.message || 'Error de autenticación.'));
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handle2FASubmit = async (e) => {
    e.preventDefault();
    setTwofaError('');
    dispatch(setLoading(true));
    try {
      const res = await authApi.login2FA({ tempToken, token: code2FA });
      if (res.data && res.data.success && res.data.data && res.data.data.tokens) {
        dispatch(setToken(res.data.data.tokens.accessToken));
        dispatch(setUser(res.data.data.user));
        navigate('/');
      } else {
        setTwofaError(res.data.message || 'Código 2FA incorrecto');
      }
    } catch (err) {
      setTwofaError(err.response?.data?.message || 'Código 2FA incorrecto');
    } finally {
      dispatch(setLoading(false));
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
        p: 2,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 350 }}>
        {/* Logo Sercodam */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '2.5rem', sm: '3rem' },
              letterSpacing: '-0.02em',
              mb: 1,
            }}
          >
            <Box component="span" sx={{ color: 'text.primary' }}>
              SERCO
            </Box>
            <Box component="span" sx={{ color: '#d32f2f' }}>
              DAM
            </Box>
          </Typography>
        </Box>

        {!require2FA ? (
          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Usuario"
              name="username"
              value={form.username}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                },
              }}
            />
            <TextField
              fullWidth
              label="Contraseña"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={handleChange}
              variant="outlined"
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      sx={{ color: 'text.secondary' }}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                },
              }}
            />

            {(error || formError) && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 1 }}>
                {error || formError}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                py: 1.5,
                borderRadius: 1,
                fontWeight: 600,
                fontSize: '1rem',
                backgroundColor: '#d32f2f',
                '&:hover': {
                  backgroundColor: '#b71c1c',
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Iniciar Sesión'}
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handle2FASubmit}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: '#d32f2f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <SecurityIcon sx={{ color: 'white', fontSize: '1.5rem' }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
                Verificación en Dos Pasos
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Ingresa el código de tu aplicación de autenticación
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="Código 2FA"
              value={code2FA}
              onChange={(e) => setCode2FA(e.target.value)}
              variant="outlined"
              margin="normal"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SecurityIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 1,
                },
              }}
            />

            {twofaError && (
              <Alert severity="error" sx={{ mt: 2, borderRadius: 1 }}>
                {twofaError}
              </Alert>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 3,
                py: 1.5,
                borderRadius: 1,
                fontWeight: 600,
                fontSize: '1rem',
                backgroundColor: '#d32f2f',
                '&:hover': {
                  backgroundColor: '#b71c1c',
                },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Verificar'}
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={() => {
                setRequire2FA(false);
                setCode2FA('');
                setTwofaError('');
              }}
              sx={{
                mt: 1,
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              Volver al login
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Login; 