import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';

import App from './App';
import { store } from './store';

import './style.css';

// Crear cliente de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Función para crear tema
const createAppTheme = (mode) => {
  const isDark = mode === 'dark';
  
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#3b82f6', // Azul amable y suave
        light: '#60a5fa', // Azul claro
        dark: '#2563eb', // Azul medio
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#8b5cf6', // Violeta suave
        light: '#a78bfa',
        dark: '#7c3aed',
        contrastText: '#ffffff',
      },
      background: {
        default: isDark ? '#0f0f0f' : '#f8f9fa',
        paper: isDark ? '#1c1c1e' : '#ffffff',
      },
      text: {
        primary: isDark ? '#ffffff' : '#2c3e50',
        secondary: isDark ? '#8e8e93' : '#6c757d',
      },
      divider: isDark ? '#38383a' : '#e9ecef',
      action: {
        hover: isDark ? '#2c2c2e' : '#f8f9fa',
        selected: isDark ? '#3b82f6' : '#eff6ff',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontWeight: 600,
        fontSize: '2.5rem',
      },
      h2: {
        fontWeight: 600,
        fontSize: '2rem',
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.75rem',
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.5rem',
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.25rem',
      },
      h6: {
        fontWeight: 600,
        fontSize: '1rem',
      },
      subtitle1: {
        fontWeight: 500,
      },
      subtitle2: {
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? '#0f0f0f' : '#f8f9fa',
            color: isDark ? '#ffffff' : '#2c3e50',
          },
          html: {
            backgroundColor: isDark ? '#0f0f0f' : '#f8f9fa',
          },
          '#app': {
            backgroundColor: isDark ? '#0f0f0f' : '#f8f9fa',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
            borderBottom: `1px solid ${isDark ? '#38383a' : '#e9ecef'}`,
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: `1px solid ${isDark ? '#38383a' : '#e9ecef'}`,
            backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            borderRadius: 8,
            borderWidth: '1px',
            '&:hover': {
              borderWidth: '1px',
            },
          },
          contained: {
            backgroundColor: 'transparent',
            border: '1px solid',
            borderColor: 'primary.main',
            color: 'primary.main',
            boxShadow: 'none',
            '&:hover': {
              backgroundColor: 'primary.main',
              color: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            },
          },
          outlined: {
            borderWidth: '1px',
            '&:hover': {
              borderWidth: '1px',
              backgroundColor: 'primary.main',
              color: 'white',
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 500,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              backgroundColor: isDark ? '#2c2c2e' : '#ffffff',
            },
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              fontWeight: 600,
              backgroundColor: isDark ? '#2c2c2e' : '#f8f9fa',
              color: isDark ? '#ffffff' : '#2c3e50',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
            borderBottom: `1px solid ${isDark ? '#38383a' : '#e9ecef'}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
            borderRight: `1px solid ${isDark ? '#38383a' : '#e9ecef'}`,
          },
        },
      },
      MuiListItem: {
        styleOverrides: {
          root: {
            '&:hover': {
              backgroundColor: isDark ? '#2c2c2e' : '#f8f9fa',
            },
            '&.Mui-selected': {
              backgroundColor: isDark ? '#3b82f6' : '#eff6ff',
              color: isDark ? '#ffffff' : '#3b82f6',
              '&:hover': {
                backgroundColor: isDark ? '#2563eb' : '#dbeafe',
              },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            color: isDark ? '#8e8e93' : '#6c757d',
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            color: isDark ? '#ffffff' : '#2c3e50',
            fontWeight: 500,
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
            border: `1px solid ${isDark ? '#38383a' : '#e9ecef'}`,
          },
        },
      },
    },
  });
};

// Componente principal con tema dinámico
const AppWithTheme = () => {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    // Recuperar tema guardado en localStorage
    const savedMode = localStorage.getItem('theme-mode');
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  const theme = createAppTheme(mode);

  // Función para cambiar tema
  const toggleTheme = () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    localStorage.setItem('theme-mode', newMode);
    
    // Aplicar el atributo data-mui-color-scheme al body
    document.body.setAttribute('data-mui-color-scheme', newMode);
  };

  // Aplicar el atributo data-mui-color-scheme al body cuando se monta el componente
  useEffect(() => {
    document.body.setAttribute('data-mui-color-scheme', mode);
  }, [mode]);

  // Agregar función al window para que esté disponible globalmente
  window.toggleTheme = toggleTheme;
  window.currentTheme = mode;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <App />
      </SnackbarProvider>
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppWithTheme />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
