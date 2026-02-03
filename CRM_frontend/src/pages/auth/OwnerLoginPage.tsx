import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Stack,
  Link,
  CircularProgress,
  useTheme,
} from '@mui/material';
import { AdminPanelSettings as AdminIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../features/crm/hooks';
import { setLoading, loginSuccess, loginFailure } from '../../slices/authSlice';
import { showToast } from '../../utils/toast';

export const OwnerLoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const { loading, error } = useAppSelector((state) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setLoading(true));

    try {
      // Simple authentication for owner/manager
      if (username === 'Muzaffar' && password === '123456789') {
        dispatch(
          loginSuccess({
            user: {
              id: 0,
              username: 'Muzaffar',
              email: 'owner@crm.com',
              first_name: 'Muzaffar',
              last_name: 'Owner',
              role: 'Owner',
              userType: 'superuser',
              center_id: 0,
            },
            token: 'owner-token-' + Date.now(),
          })
        );

        showToast.success('Owner login successful! Accessing manager panel...');
        navigate('/owner/manage');
      } else {
        const errorMsg = 'Invalid credentials. Please check username and password.';
        dispatch(loginFailure(errorMsg));
        showToast.error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = 'Login failed. Please try again.';
      dispatch(loginFailure(errorMsg));
      showToast.error(errorMsg);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${theme.palette.secondary.main} 0%, ${theme.palette.secondary.dark} 100%)`,
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          }}
        >
          <CardContent sx={{ padding: 4 }}>
            {/* Header */}
            <Stack spacing={2} sx={{ marginBottom: 3, textAlign: 'center' }}>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: theme.palette.secondary.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                <AdminIcon sx={{ color: 'white', fontSize: 32 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.secondary.main }}>
                CRM System
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                Owner/Manager Access
              </Typography>
            </Stack>

            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ marginBottom: 2 }}>
                {error}
              </Alert>
            )}

            {/* Login Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Username"
                variant="outlined"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={loading}
                autoComplete="username"
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                variant="outlined"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={loading}
                autoComplete="current-password"
              />

              <Button
                fullWidth
                variant="contained"
                size="large"
                type="submit"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <AdminIcon />}
                sx={{
                  marginTop: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                  backgroundColor: theme.palette.secondary.main,
                  '&:hover': {
                    backgroundColor: theme.palette.secondary.dark,
                  },
                }}
              >
                {loading ? 'Logging in...' : 'Access Manager Panel'}
              </Button>
            </Box>

            {/* Login Link */}
            <Stack spacing={1} sx={{ marginTop: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Regular User?{' '}
                <Link
                  href="/login/superuser"
                  sx={{
                    cursor: 'pointer',
                    color: theme.palette.secondary.main,
                    fontWeight: 600,
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Login here
                </Link>
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
