import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
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
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <Card sx={{ minWidth: 350, maxWidth: 400 }}>
        <CardContent>
          <Typography variant="h5" align="center" gutterBottom>
            Iniciar Sesión
          </Typography>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {require2FA ? (
            <form onSubmit={handle2FASubmit}>
              <TextField
                label="Código 2FA"
                value={code2FA}
                onChange={e => setCode2FA(e.target.value)}
                fullWidth
                margin="normal"
                autoFocus
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Verificando...' : 'Verificar 2FA'}
              </Button>
              {twofaError && <Alert severity="error" sx={{ mt: 2 }}>{twofaError}</Alert>}
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              <TextField
                label="Usuario"
                name="username"
                value={form.username}
                onChange={handleChange}
                fullWidth
                margin="normal"
                autoFocus
                autoComplete="username"
              />
              <TextField
                label="Contraseña"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                fullWidth
                margin="normal"
                autoComplete="current-password"
              />
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: 2 }}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login; 