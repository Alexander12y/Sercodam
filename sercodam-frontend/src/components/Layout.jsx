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
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar } from '../store/slices/uiSlice';

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
  const [openSubmenu, setOpenSubmenu] = useState('');

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
            '&.Mui-selected': {
              backgroundColor: theme.palette.primary.light,
              '&:hover': {
                backgroundColor: theme.palette.primary.light,
              },
            },
          }}
        >
          <ListItemIcon sx={{ color: selected ? 'white' : 'inherit' }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText 
            primary={item.text} 
            sx={{ color: selected ? 'white' : 'inherit' }}
          />
          {hasSubmenu && (isSubmenuOpen ? <ExpandLess /> : <ExpandMore />)}
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
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          SERCODAM
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => renderMenuItem(item))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Sistema de Órdenes de Producción
          </Typography>
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
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
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 