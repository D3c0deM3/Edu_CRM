import { memo } from 'react';
import { TrendingUp, LayoutDashboard, BarChart3, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppSelector } from '../hooks';
import type { RootState } from '../../../store';

const Dashboard = memo(() => {
  const { user } = useAppSelector((state: RootState) => state.auth);

  const dashboardCards = [
    {
      title: 'Quick Stats',
      description: 'Overview of your CRM system',
      icon: TrendingUp,
      color: 'text-indigo-500',
      borderColor: 'border-t-indigo-500',
      bgColor: 'bg-indigo-500',
    },
    {
      title: 'Recent Activities',
      description: 'Your recent actions and updates',
      icon: LayoutDashboard,
      color: 'text-sky-500',
      borderColor: 'border-t-sky-500',
      bgColor: 'bg-sky-500',
    },
    {
      title: 'System Health',
      description: 'Overall system status',
      icon: BarChart3,
      color: 'text-emerald-500',
      borderColor: 'border-t-emerald-500',
      bgColor: 'bg-emerald-500',
    },
    {
      title: 'Notifications',
      description: 'Important updates and alerts',
      icon: Bell,
      color: 'text-amber-500',
      borderColor: 'border-t-amber-500',
      bgColor: 'bg-amber-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto py-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome, {user?.first_name} {user?.last_name}!
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Role:</span>
          <Badge variant="outline">{user?.userType?.toUpperCase()}</Badge>
        </div>
      </div>

      {/* Dashboard Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardCards.map((cardItem, index) => {
          const Icon = cardItem.icon;
          return (
            <Card
              key={index}
              className={`border-t-4 ${cardItem.borderColor} hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}
            >
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className={`${cardItem.bgColor} rounded-lg p-2.5 flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <CardTitle className="text-base">{cardItem.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{cardItem.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
