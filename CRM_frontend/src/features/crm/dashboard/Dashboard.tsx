import { memo } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardHeader,
  useTheme,
  Chip,
  Stack,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Dashboard as DashboardActivityIcon,
  BarChart as ChartIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useAppSelector } from '../hooks';

const Dashboard = memo(() => {
  const theme = useTheme();
  const { user } = useAppSelector((state: any) => state.auth);

  const dashboardCards = [
    {
      title: 'Quick Stats',
      description: 'Overview of your CRM system',
      icon: TrendingUpIcon,
      color: theme.palette.primary.main,
    },
    {
      title: 'Recent Activities',
      description: 'Your recent actions and updates',
      icon: DashboardActivityIcon,
      color: theme.palette.info.main,
    },
    {
      title: 'System Health',
      description: 'Overall system status',
      icon: ChartIcon,
      color: theme.palette.success.main,
    },
    {
      title: 'Notifications',
      description: 'Important updates and alerts',
      icon: NotificationsIcon,
      color: theme.palette.warning.main,
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ marginBottom: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, marginBottom: 1 }}>
          Welcome, {user?.first_name} {user?.last_name}!
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            Role:
          </Typography>
          <Chip
            label={user?.userType.toUpperCase()}
            color="primary"
            variant="outlined"
          />
        </Stack>
      </Box>

      {/* Dashboard Cards Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 3,
        }}
      >
        {dashboardCards.map((cardItem, index) => {
          const IconComponent = cardItem.icon;
          return (
            <Card
              key={index}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: theme.shadows[8],
                },
                borderTop: `4px solid ${cardItem.color}`,
              }}
            >
              <CardHeader
                avatar={
                  <Box
                    sx={{
                      backgroundColor: cardItem.color,
                      borderRadius: 1,
                      padding: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <IconComponent sx={{ color: 'white', fontSize: 24 }} />
                  </Box>
                }
                title={
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {cardItem.title}
                  </Typography>
                }
              />
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {cardItem.description}
                </Typography>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Container>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
