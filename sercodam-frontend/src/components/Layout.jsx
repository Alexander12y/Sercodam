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
  Link,
  Chip,
  Tooltip,
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
  People as PeopleIcon,
  ContentCutOutlined as ScissorsIcon,
  Notifications as NotificationsIcon,
  Description as DescriptionIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Home as HomeIcon,
  Business as BusinessIcon,
  ShoppingCart as ShoppingCartIcon,
  Assessment as AssessmentIcon,
  Group as GroupIcon,
  Email as EmailIcon,
  Folder as FolderIcon,
  Engineering as EngineeringIcon,
  // Iconos outline para mejor control de color
  HomeOutlined as HomeOutlinedIcon,
  EmailOutlined as EmailOutlinedIcon,
  DescriptionOutlined as DescriptionOutlinedIcon,
  AssignmentOutlined as AssignmentOutlinedIcon,
  GroupOutlined as GroupOutlinedIcon,
  InventoryOutlined as InventoryOutlinedIcon,
  SettingsOutlined as SettingsOutlinedIcon,
  CategoryOutlined as CategoryOutlinedIcon,
  ShoppingCartOutlined as ShoppingCartOutlinedIcon,
  BuildOutlined as BuildOutlinedIcon,
  AddOutlined as AddOutlinedIcon,
  AssessmentOutlined as AssessmentOutlinedIcon,
  EngineeringOutlined as EngineeringOutlinedIcon,
  FolderOutlined as FolderOutlinedIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar } from '../store/slices/uiSlice';
import { logout } from '../store/slices/authSlice';
import { authApi } from '../services/api';

const drawerWidth = 240;
const collapsedDrawerWidth = 64;

const menuItems = [
  { text: 'Dashboard', icon: <HomeOutlinedIcon />, path: '/' },
  { text: 'Leads', icon: <EmailOutlinedIcon />, path: '/leads' },
  { 
    text: 'Cotizaciones', 
    icon: <DescriptionOutlinedIcon />, 
    path: '/cotizaciones',
    submenu: [
      { text: 'Lista de Cotizaciones', icon: <FolderOutlinedIcon />, path: '/cotizaciones' },
      { text: 'Nueva Cotización', icon: <AddOutlinedIcon />, path: '/cotizaciones/nueva' },
    ]
  },
  { 
    text: 'Órdenes de Producción', 
    icon: <AssignmentOutlinedIcon />, 
    path: '/ordenes',
    submenu: [
      { text: 'Lista de Órdenes', icon: <AssessmentOutlinedIcon />, path: '/ordenes' },
      { text: 'Nueva Orden', icon: <AddOutlinedIcon />, path: '/ordenes/nueva' },
      { text: 'Ejecutar un Corte', icon: <EngineeringOutlinedIcon />, path: '/ejecutar-corte', roles: ['operador', 'admin'] },
    ]
  },
  { text: 'Clientes', icon: <GroupOutlinedIcon />, path: '/clientes' },
  { 
    text: 'Inventario', 
    icon: <InventoryOutlinedIcon />, 
    path: '/inventario',
    submenu: [
      { text: 'Paños', icon: <CategoryOutlinedIcon />, path: '/inventario/panos' },
      { text: 'Materiales', icon: <ShoppingCartOutlinedIcon />, path: '/inventario/materiales' },
      { text: 'Herramientas', icon: <BuildOutlinedIcon />, path: '/inventario/herramientas' },
    ]
  },
  { text: 'Configuración', icon: <SettingsOutlinedIcon />, path: '/configuracion' },
];

const Layout = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const { sidebarOpen, sidebarCollapsed } = useSelector((state) => state.ui);
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
            pl: sidebarCollapsed ? 1 : level * 2 + 2,
            pr: sidebarCollapsed ? 1 : 2,
            py: 1,
            mx: sidebarCollapsed ? 0.5 : 1,
            borderRadius: 1,
            mb: 0.5,
            minHeight: 48,
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
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
            minWidth: sidebarCollapsed ? 32 : 40,
            '& .MuiSvgIcon-root': {
              fontSize: sidebarCollapsed ? '1.25rem' : '1.25rem',
            }
          }}>
            {item.icon}
          </ListItemIcon>
          {!sidebarCollapsed && (
            <>
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
            </>
          )}
        </ListItem>
        
        {hasSubmenu && !sidebarCollapsed && (
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
      {/* Botón para colapsar/expandir sidebar */}
      <Box sx={{ 
        p: 1, 
        display: 'flex', 
        justifyContent: 'flex-end',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Tooltip title={sidebarCollapsed ? "Expandir sidebar" : "Colapsar sidebar"}>
          <IconButton
            onClick={() => dispatch(toggleSidebar())}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover',
              }
            }}
          >
            {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      
      {/* Menú de navegación */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <List sx={{ pt: 1 }}>
          {menuItems.map((item) => {
            // Check if user has required role for this menu item
            if (item.roles && user && !item.roles.includes(user.rol)) {
              return null;
            }
            return renderMenuItem(item);
          })}
        </List>
      </Box>
      
      {/* Footer del sidebar */}
      <Box sx={{ 
        p: 2, 
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}>
        {!sidebarCollapsed && (
          <Typography variant="caption" color="text.secondary" align="center" display="block" sx={{ fontWeight: 500 }}>
            v1.0.0
          </Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Header que ocupa todo el ancho */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          width: '100%',
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          zIndex: 1200,
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
              fontWeight: 700,
              fontSize: '1.25rem',
              letterSpacing: '-0.02em'
            }}
          >
            <Box component="span" sx={{ color: 'text.primary' }}>
              SERCO
            </Box>
            <Box component="span" sx={{ color: 'primary.main' }}>
              DAM
            </Box>
          </Typography>
          
          {/* Usuario y menú de logout */}
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Botón de cambio de tema */}
              <Tooltip title={window.currentTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
                <IconButton
                  onClick={() => window.toggleTheme()}
                  sx={{
                    bgcolor: 'action.hover',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      bgcolor: 'action.selected',
                      transform: 'rotate(180deg)',
                    },
                    transition: 'all 0.3s ease-in-out',
                  }}
                >
                  {window.currentTheme === 'dark' ? 
                    <LightModeIcon sx={{ color: '#fbbf24' }} /> : 
                    <DarkModeIcon sx={{ color: '#6b7280' }} />
                  }
                </IconButton>
              </Tooltip>
              
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

      {/* Contenido principal con sidebar */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <Box
          component="nav"
          sx={{ 
            width: { md: sidebarCollapsed ? collapsedDrawerWidth : drawerWidth }, 
            flexShrink: { md: 0 },
            zIndex: 1100,
          }}
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
                top: '64px', // Empieza donde termina el header
                height: 'calc(100% - 64px)', // Altura restante
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
                width: sidebarCollapsed ? collapsedDrawerWidth : drawerWidth,
                border: 'none',
                borderRight: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                transition: 'width 0.2s ease-in-out',
                top: '64px', // Empieza donde termina el header
                height: 'calc(100% - 64px)', // Altura restante
              },
            }}
            open
          >
            {drawer}
          </Drawer>
        </Box>

        {/* Contenido principal */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { md: `calc(100% - ${sidebarCollapsed ? collapsedDrawerWidth : drawerWidth}px)` },
            bgcolor: 'background.default',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s ease-in-out',
          }}
        >
          <Box sx={{ flexGrow: 1, pb: 4 }}>
            {children}
          </Box>
          
          {/* Footer */}
          <Box
            component="footer"
            sx={{
              mt: 'auto',
              background: 'transparent',
              color: 'text.primary',
              py: 3,
              px: 3,
              borderRadius: '12px 12px 0 0',
              position: 'relative',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderBottom: 'none',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontSize: '0.8rem',
                fontWeight: 500,
                opacity: 0.9,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                letterSpacing: '-0.02em',
              }}
            >
              <Box
                component="span"
                sx={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '50%',
                  bgcolor: 'rgba(59, 130, 246, 0.6)',
                  display: 'inline-block',
                }}
              />
              Planeado y desarrollado por{' '}
              <Link
                href="https://wiger.ai/"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: 'primary.main',
                  textDecoration: 'none',
                  fontWeight: 600,
                  background: 'transparent',
                  px: 1.5,
                  py: 0.25,
                  borderRadius: 1.5,
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    background: 'rgba(59, 130, 246, 0.05)',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    transform: 'translateY(-1px)',
                  }
                }}
              >
                Wiger
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout; 