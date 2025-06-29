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
  Grid,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

const ChangePassword = () => {
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
    setSuccess('');
  };

  const handleTogglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (form.newPassword !== form.confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (form.newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      
      if (response.data.success) {
        setSuccess('Contraseña actualizada correctamente');
        setForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        setError(response.data.message || 'Error al cambiar la contraseña');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
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
          Cambiar Contraseña
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <SecurityIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight={600}>
              Cambiar Contraseña
            </Typography>
          </Box>
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Contraseña actual"
                  name="currentPassword"
                  type={showPasswords.current ? 'text' : 'password'}
                  value={form.currentPassword}
                  onChange={handleChange}
                  required
                  InputProps={{
                    endAdornment: (
                      <Button
                        onClick={() => handleTogglePasswordVisibility('current')}
                        sx={{ minWidth: 'auto', p: 1 }}
                      >
                        {showPasswords.current ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </Button>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nueva contraseña"
                  name="newPassword"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={form.newPassword}
                  onChange={handleChange}
                  required
                  helperText="Mínimo 6 caracteres"
                  InputProps={{
                    endAdornment: (
                      <Button
                        onClick={() => handleTogglePasswordVisibility('new')}
                        sx={{ minWidth: 'auto', p: 1 }}
                      >
                        {showPasswords.new ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </Button>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Confirmar nueva contraseña"
                  name="confirmPassword"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  error={form.newPassword !== form.confirmPassword && form.confirmPassword !== ''}
                  helperText={
                    form.newPassword !== form.confirmPassword && form.confirmPassword !== ''
                      ? 'Las contraseñas no coinciden'
                      : ''
                  }
                  InputProps={{
                    endAdornment: (
                      <Button
                        onClick={() => handleTogglePasswordVisibility('confirm')}
                        sx={{ minWidth: 'auto', p: 1 }}
                      >
                        {showPasswords.confirm ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </Button>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  disabled={loading}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  {loading ? 'Cambiando contraseña...' : 'Cambiar Contraseña'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ChangePassword; 