import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  Collapse,
  Avatar,
  Menu,
  MenuItem,
  Button,
  Chip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Add as AddIcon,
  Inventory as InventoryIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Category as CategoryIcon,
  Build as BuildIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar } from '../store/slices/uiSlice';
import { logout } from '../store/slices/authSlice';
import { authApi } from '../services/api';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Órdenes', icon: <AssignmentIcon />, path: '/ordenes' },
  { text: 'Nueva Orden', icon: <AddIcon />, path: '/ordenes/nueva' },
  { 
    text: 'Inventario', 
    icon: <InventoryIcon />, 
    path: '/inventario',
    submenu: [
      { text: 'Paños', icon: <CategoryIcon />, path: '/inventario/panos' },
      { text: 'Materiales', icon: <CategoryIcon />, path: '/inventario/materiales' },
      { text: 'Herramientas', icon: <BuildIcon />, path: '/inventario/herramientas' },
    ]
  },
  { text: 'Configuración', icon: <SettingsIcon />, path: '/configuracion' },
];

const Layout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { sidebarOpen } = useSelector((state) => state.ui);
  const { user } = useSelector((state) => state.auth);
  const [openSubmenu, setOpenSubmenu] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    dispatch(toggleSidebar());
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      dispatch(toggleSidebar());
    }
  };

  const handleSubmenuToggle = (menuText) => {
    setOpenSubmenu(openSubmenu === menuText ? '' : menuText);
  };

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      // Llamar al endpoint de logout del backend
      await authApi.logout();
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      // Siempre hacer logout localmente
      dispatch(logout());
      navigate('/login');
    }
    handleUserMenuClose();
  };

  const handleProfile = () => {
    navigate('/perfil');
    handleUserMenuClose();
  };

  const handleChangePassword = () => {
    navigate('/cambiar-contraseña');
    handleUserMenuClose();
  };

  const isSelected = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const renderMenuItem = (item, level = 0) => {
    const selected = isSelected(item.path);
    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isSubmenuOpen = openSubmenu === item.text;

    return (
      <Box key={item.text}>
        <ListItem
          button
          onClick={() => {
            if (hasSubmenu) {
              handleSubmenuToggle(item.text);
            } else {
              handleNavigation(item.path);
            }
          }}
          selected={selected}
          sx={{
            pl: level * 2 + 2,
            pr: 2,
            py: 1,
            mx: 1,
            borderRadius: 1,
            mb: 0.5,
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '& .MuiListItemIcon-root': {
                color: 'white',
              },
            },
            '&:hover': {
              backgroundColor: selected ? 'primary.dark' : 'action.hover',
            },
          }}
        >
          <ListItemIcon sx={{ 
            color: selected ? 'white' : 'text.secondary',
            minWidth: 40,
            '& .MuiSvgIcon-root': {
              fontSize: '1.25rem',
            }
          }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText 
            primary={item.text} 
            sx={{ 
              color: selected ? 'white' : 'text.primary',
              '& .MuiTypography-root': {
                fontWeight: selected ? 600 : 500,
                fontSize: '0.875rem',
              }
            }}
          />
          {hasSubmenu && (
            <Box sx={{ 
              color: selected ? 'white' : 'text.secondary',
              transition: 'transform 0.2s',
              transform: isSubmenuOpen ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              <ExpandLess />
            </Box>
          )}
        </ListItem>
        
        {hasSubmenu && (
          <Collapse in={isSubmenuOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.submenu.map((subItem) => renderMenuItem(subItem, level + 1))}
            </List>
          </Collapse>
        )}
      </Box>
    );
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header del sidebar */}
      <Box sx={{ 
        p: 2, 
        borderBottom: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            width: 32, 
            height: 32, 
            bgcolor: 'primary.main', 
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold' }}>
              S
            </Typography>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            SERCODAM
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Sistema de Órdenes
        </Typography>
      </Box>
      
      {/* Menú de navegación */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List sx={{ pt: 1 }}>
          {menuItems.map((item) => renderMenuItem(item))}
        </List>
      </Box>
      
      {/* Footer del sidebar */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          v1.0.0
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ minHeight: 64 }}>
          <IconButton
            color="primary"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              color: 'text.primary',
              fontWeight: 600,
              fontSize: '1.125rem'
            }}
          >
            Sistema de Órdenes de Producción
          </Typography>
          
          {/* Usuario y menú de logout */}
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip
                label={user.rol || 'Usuario'}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ 
                  fontWeight: 500,
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '& .MuiChip-label': { 
                    color: 'primary.main',
                    px: 1
                  }
                }}
              />
              <Button
                color="primary"
                onClick={handleUserMenuOpen}
                startIcon={
                  <Avatar 
                    sx={{ 
                      width: 28, 
                      height: 28, 
                      bgcolor: 'primary.main',
                      fontSize: '0.875rem',
                      fontWeight: 600
                    }}
                  >
                    {user.nombre ? user.nombre.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                  </Avatar>
                }
                endIcon={<AccountCircleIcon />}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 500,
                  '&:hover': { 
                    bgcolor: 'action.hover',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }
                }}
              >
                <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {user.nombre || user.username}
                  </Typography>
                </Box>
              </Button>
              
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleUserMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 220,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    border: '1px solid',
                    borderColor: 'divider',
                  }
                }}
              >
                <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <Typography variant="body2" fontWeight={500}>
                    Mi Perfil
                  </Typography>
                </MenuItem>
                <MenuItem onClick={handleChangePassword} sx={{ py: 1.5 }}>
                  <ListItemIcon>
                    <SecurityIcon fontSize="small" color="primary" />
                  </ListItemIcon>
                  <Typography variant="body2" fontWeight={500}>
                    Cambiar Contraseña
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: 'error.main' }}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
                  </ListItemIcon>
                  <Typography variant="body2" fontWeight={500}>
                    Cerrar Sesión
                  </Typography>
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={sidebarOpen && isMobile}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              border: 'none',
              boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              border: 'none',
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px', // Height of AppBar
          bgcolor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 