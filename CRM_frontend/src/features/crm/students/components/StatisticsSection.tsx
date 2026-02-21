import { Card, CardContent } from '@/components/ui/card';
import { Calendar, DollarSign, CheckCircle, Star } from 'lucide-react';

interface StatisticsSectionProps {
  attendanceStats: {
    total: number;
    present: number;
    absent: number;
    late: number;
  };
  paymentStats: {
    total: number;
    completed: number;
    pending: number;
    totalAmount: number;
  };
  assignmentStats: {
    total: number;
    submitted: number;
    pending: number;
  };
  gradeAverage: string;
}

const statCards = [
  {
    key: 'attendance',
    icon: Calendar,
    color: 'text-blue-600 bg-blue-100',
  },
  {
    key: 'payments',
    icon: DollarSign,
    color: 'text-green-600 bg-green-100',
  },
  {
    key: 'assignments',
    icon: CheckCircle,
    color: 'text-purple-600 bg-purple-100',
  },
  {
    key: 'grades',
    icon: Star,
    color: 'text-yellow-600 bg-yellow-100',
  },
] as const;

export const StatisticsSection = ({
  attendanceStats,
  paymentStats,
  assignmentStats,
  gradeAverage,
}: StatisticsSectionProps) => {
  const data = [
    {
      label: 'Attendance',
      value: `${attendanceStats.present}/${attendanceStats.total}`,
      sub: 'Present out of Total',
    },
    {
      label: 'Payments',
      value: `$${(Number(paymentStats.totalAmount) || 0).toFixed(2)}`,
      sub: `${paymentStats.completed} completed`,
    },
    {
      label: 'Assignments',
      value: `${assignmentStats.submitted}/${assignmentStats.total}`,
      sub: 'Submitted',
    },
    {
      label: 'Average Grade',
      value: `${gradeAverage}%`,
      sub: 'Overall',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {data.map((item, index) => {
        const config = statCards[index];
        const Icon = config.icon;
        return (
          <Card key={config.key}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`flex items-center justify-center h-12 w-12 rounded-lg ${config.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
