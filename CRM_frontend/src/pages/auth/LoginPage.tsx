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
import { Login as LoginIcon } from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '../../features/crm/hooks';
import { setLoading, loginSuccess, loginFailure } from '../../slices/authSlice';
import { authAPI } from '../../shared/api/api';
import { showToast, handleApiError } from '../../utils/toast';

interface LoginPageProps {
  userType: 'superuser' | 'teacher' | 'student';
}

export const LoginPage = ({ userType }: LoginPageProps) => {
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
      let response;
      let userData;
      let token;

      // Call appropriate login endpoint based on user type
      if (userType === 'superuser') {
        response = await authAPI.loginSuperuser({ username, password });
        const { superuser } = response.data;
        userData = {
          id: superuser.superuser_id,
          username: superuser.username,
          email: superuser.email,
          first_name: superuser.first_name,
          last_name: superuser.last_name,
          role: superuser.role,
          userType: 'superuser' as const,
          center_id: superuser.center_id || 1,
        };
        token = response.data.token || `superuser-token-${Date.now()}`;
      } else if (userType === 'teacher') {
        response = await authAPI.loginTeacher({ username, password });
        const { teacher } = response.data;
        userData = {
          id: teacher.teacher_id,
          username: username,
          email: teacher.email,
          first_name: teacher.first_name,
          last_name: teacher.last_name,
          role: 'teacher',
          roles: teacher.roles || ['teacher'],
          userType: 'teacher' as const,
          center_id: teacher.center_id || 1,
        };
        token = response.data.token || `teacher-token-${Date.now()}`;
      } else if (userType === 'student') {
        response = await authAPI.loginStudent({ username, password });
        const { student } = response.data;
        userData = {
          id: student.student_id,
          username: username,
          email: student.email,
          first_name: student.first_name,
          last_name: student.last_name,
          role: 'student',
          userType: 'student' as const,
          center_id: student.center_id || 1,
        };
        token = response.data.token || `student-token-${Date.now()}`;
      }

      dispatch(
        loginSuccess({
          user: userData!,
          token,
        })
      );

      showToast.success('Login successful! Redirecting to dashboard...');
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = handleApiError(err);
      dispatch(loginFailure(errorMessage));
      showToast.error(errorMessage);
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
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
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
                  backgroundColor: theme.palette.primary.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                <LoginIcon sx={{ color: 'white', fontSize: 32 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                CRM System
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>
                {userType.charAt(0).toUpperCase() + userType.slice(1)} Login
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
                startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                sx={{
                  marginTop: 2,
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 600,
                }}
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </Box>

            {/* Login Links */}
            <Stack spacing={1} sx={{ marginTop: 3, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Other login options:
              </Typography>
              <Stack spacing={1}>
                <Link
                  href="/login/owner"
                  variant="body2"
                  sx={{
                    cursor: 'pointer',
                    color: theme.palette.primary.main,
                    fontWeight: 500,
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  Owner/Manager Login
                </Link>
                {userType !== 'superuser' && (
                  <Link
                    href="/login/superuser"
                    variant="body2"
                    sx={{
                      cursor: 'pointer',
                      color: theme.palette.primary.main,
                      fontWeight: 500,
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Superuser Login
                  </Link>
                )}
                {userType !== 'teacher' && (
                  <Link
                    href="/login/teacher"
                    variant="body2"
                    sx={{
                      cursor: 'pointer',
                      color: theme.palette.primary.main,
                      fontWeight: 500,
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Teacher Login
                  </Link>
                )}
                {userType !== 'student' && (
                  <Link
                    href="/login/student"
                    variant="body2"
                    sx={{
                      cursor: 'pointer',
                      color: theme.palette.primary.main,
                      fontWeight: 500,
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    }}
                  >
                    Student Login
                  </Link>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
