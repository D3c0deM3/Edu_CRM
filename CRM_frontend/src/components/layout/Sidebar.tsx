import { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Drawer,
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Button,
  useMediaQuery,
  useTheme,
  Avatar,
  Stack,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Logout as LogoutIcon,
  People as PeopleIcon,
  Book as BookIcon,
  Payment as PaymentIcon,
  BarChart as BarChartIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon,
  Warning as WarningIcon,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector, useRBAC } from '../../features/crm/hooks';
import { logout } from '../../slices/authSlice';

// Icon map for menu items
const iconMap: { [key: string]: any } = {
  MdPeople: PeopleIcon,
  MdBook: BookIcon,
  MdPayment: PaymentIcon,
  MdBarChart: BarChartIcon,
  MdAssignment: AssignmentIcon,
  MdChecklist: CheckCircleIcon,
  MdBusiness: BusinessIcon,
  MdWarning: WarningIcon,
};

const DRAWER_WIDTH = 280;

const Sidebar = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAppSelector((state) => state.auth);
  const { canAccess } = useRBAC();

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', iconName: 'Dashboard', permission: 'VIEW_DASHBOARD', roles: ['superuser', 'teacher', 'student'] },
    { label: 'Students', path: '/students', iconName: 'MdPeople', permission: 'CRUD_STUDENT', roles: ['superuser', 'teacher', 'student'] },
    { label: 'Teachers', path: '/teachers', iconName: 'MdBook', permission: 'CRUD_TEACHER', roles: ['superuser'] },
    { label: 'Classes', path: '/classes', iconName: 'MdBook', permission: 'CRUD_CLASS', roles: ['superuser', 'teacher'] },
    { label: 'Payments', path: '/payments', iconName: 'MdPayment', permission: 'CRUD_PAYMENT', roles: ['superuser', 'teacher'] },
    { label: 'Grades', path: '/grades', iconName: 'MdBarChart', permission: 'CRUD_GRADE', roles: ['superuser', 'teacher', 'student'] },
    { label: 'Attendance', path: '/attendance', iconName: 'MdAssignment', permission: 'CRUD_ATTENDANCE', roles: ['superuser', 'teacher'] },
    { label: 'Assignments', path: '/assignments', iconName: 'MdChecklist', permission: 'CRUD_ASSIGNMENT', roles: ['superuser', 'teacher', 'student'] },
    { label: 'Subjects', path: '/subjects', iconName: 'MdBook', permission: 'CRUD_SUBJECT', roles: ['superuser', 'teacher'] },
    { label: 'Debts', path: '/debts', iconName: 'MdWarning', permission: 'CRUD_DEBT', roles: ['superuser', 'teacher'] },
    { label: 'Centers', path: '/centers', iconName: 'MdBusiness', permission: 'CRUD_CENTER', roles: ['superuser'] },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if (user?.userType === 'student') {
      return item.roles?.includes('student');
    }
    if (user?.userType === 'teacher') {
      return item.roles?.includes('teacher') && canAccess(item.permission);
    }
    if (user?.userType === 'superuser') {
      return item.roles?.includes('superuser');
    }
    return false;
  });

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login/superuser');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const drawerContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: theme.palette.primary.main,
        color: 'white',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          padding: 2,
          borderBottom: `1px solid ${theme.palette.primary.dark}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          CRM System
        </Typography>
        {isMobile && (
          <IconButton
            onClick={() => setIsOpen(false)}
            sx={{ color: 'white' }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* User Info */}
      {user && (
        <Box
          sx={{
            padding: 2,
            backgroundColor: theme.palette.primary.dark,
            margin: 1,
            borderRadius: 1,
            textAlign: 'center',
          }}
        >
          <Badge
            overlap="circular"
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            variant="dot"
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: '#44b700',
                color: '#44b700',
                boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                '&::after': {
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  animation: 'ripple 1.2s infinite ease-in-out',
                  border: '1px solid currentColor',
                },
              },
            }}
          >
            <Avatar sx={{ backgroundColor: theme.palette.secondary.main, margin: '0 auto' }}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </Avatar>
          </Badge>
          <Typography variant="subtitle2" sx={{ marginTop: 1, fontWeight: 600 }}>
            {user.first_name} {user.last_name}
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            {user.userType?.toUpperCase()}
          </Typography>
        </Box>
      )}

      {/* Navigation Menu */}
      <Box sx={{ flex: 1, overflow: 'auto', paddingTop: 1 }}>
        <List sx={{ padding: 0 }}>
          {filteredMenuItems.map((item) => {
            const IconComponent =
              item.iconName === 'Dashboard' ? DashboardIcon : (iconMap[item.iconName] || PeopleIcon);
            return (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    color: 'white',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                      paddingLeft: 3,
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: 'white',
                      minWidth: 40,
                    }}
                  >
                    <IconComponent />
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Divider sx={{ backgroundColor: theme.palette.primary.dark }} />

      {/* Footer - Logout Button */}
      <Box sx={{ padding: 2 }}>
        <Button
          fullWidth
          variant="contained"
          color="secondary"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            backgroundColor: theme.palette.secondary.main,
            '&:hover': {
              backgroundColor: theme.palette.secondary.dark,
            },
          }}
        >
          Logout
        </Button>
      </Box>
    </Box>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      {isMobile && (
        <IconButton
          onClick={() => setIsOpen(true)}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 999,
            backgroundColor: theme.palette.primary.main,
            color: 'white',
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Permanent Drawer for Desktop */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        anchor="left"
        open={isMobile ? isOpen : true}
        onClose={() => setIsOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            backgroundColor: theme.palette.primary.main,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;


