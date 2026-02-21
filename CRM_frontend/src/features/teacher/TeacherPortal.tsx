import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  CalendarDays,
  Star,
  Plus,
  Bell,
  Clock,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppSelector } from '../crm/hooks';
import { useNavigate } from 'react-router-dom';
import TeacherStudentsTab from './components/TeacherStudentsTab';
import TeacherTestsTab from './components/TeacherTestsTab';
import TeacherClassesTab from './components/TeacherClassesTab';
import TeacherAttendanceTab from './components/TeacherAttendanceTab';
import TeacherGradesTab from './components/TeacherGradesTab';
import TeacherAssignmentsTab from './components/TeacherAssignmentsTab';
import type { RootState } from '../../store';
import { testAPI, studentAPI, classAPI, attendanceAPI, assignmentAPI } from '../../shared/api/api';

interface TeacherStats {
  totalStudents: number;
  totalClasses: number;
  pendingTests: number;
  completedTests: number;
  pendingGrading: number;
  todayAttendance: number;
  pendingAssignments: number;
  upcomingClasses: number;
}

const TeacherPortal = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState('students');
  const [stats, setStats] = useState<TeacherStats>({
    totalStudents: 0,
    totalClasses: 0,
    pendingTests: 0,
    completedTests: 0,
    pendingGrading: 0,
    todayAttendance: 0,
    pendingAssignments: 0,
    upcomingClasses: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);

      // Load all data in parallel
      const [testsRes, studentsRes, classesRes, attendanceRes, assignmentsRes] = await Promise.all([
        testAPI.getAll().catch(() => ({ data: [] })),
        studentAPI.getAll().catch(() => ({ data: [] })),
        classAPI.getAll().catch(() => ({ data: [] })),
        attendanceAPI.getAll().catch(() => ({ data: [] })),
        assignmentAPI.getAll().catch(() => ({ data: [] })),
      ]);

      const tests = testsRes.data || [];
      const students = studentsRes.data || [];
      const classes = classesRes.data || [];
      const attendance = attendanceRes.data || [];
      const assignments = assignmentsRes.data || [];

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayAttendance = attendance.filter(
        (a: any) => a.attendance_date?.split('T')[0] === today
      ).length;

      const pendingTests = tests.filter((t: any) => t.is_active).length;
      const completedTests = tests.length - pendingTests;
      const pendingGrading = tests.filter((t: any) => (t.submission_count || 0) > 0).length;
      const pendingAssignments = assignments.filter((a: any) => a.status === 'Pending').length;

      setStats({
        totalStudents: students.length,
        totalClasses: classes.length,
        pendingTests,
        completedTests,
        pendingGrading,
        todayAttendance,
        pendingAssignments,
        upcomingClasses: classes.filter((c: any) => c.status === 'Active').length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'test':
        navigate('/tests/create');
        break;
      case 'attendance':
        setTabValue('attendance');
        break;
      case 'assignment':
        navigate('/assignments');
        break;
      case 'grade':
        setTabValue('grades');
        break;
      default:
        break;
    }
  };

  const statsCards = [
    {
      title: 'My Students',
      value: stats.totalStudents,
      icon: <Users className="h-10 w-10" />,
      color: '#6366f1',
      trend: '+5%',
      tab: 'students',
    },
    {
      title: 'My Classes',
      value: stats.totalClasses,
      icon: <GraduationCap className="h-10 w-10" />,
      color: '#8b5cf6',
      trend: null,
      tab: 'classes',
    },
    {
      title: 'Active Tests',
      value: stats.pendingTests,
      icon: <FileQuestion className="h-10 w-10" />,
      color: '#f5576c',
      trend: null,
      tab: 'tests',
    },
    {
      title: 'Pending Grading',
      value: stats.pendingGrading,
      icon: <Star className="h-10 w-10" />,
      color: '#4facfe',
      trend: stats.pendingGrading > 0 ? 'Needs attention' : null,
      tab: 'grades',
    },
    {
      title: "Today's Attendance",
      value: stats.todayAttendance,
      icon: <CalendarDays className="h-10 w-10" />,
      color: '#43e97b',
      trend: null,
      tab: 'attendance',
    },
    {
      title: 'Pending Assignments',
      value: stats.pendingAssignments,
      icon: <ClipboardList className="h-10 w-10" />,
      color: '#fa709a',
      trend: stats.pendingAssignments > 0 ? `${stats.pendingAssignments} to review` : null,
      tab: 'assignments',
    },
  ];

  const tabs = [
    { value: 'students', label: 'My Students', icon: <Users className="h-4 w-4" /> },
    { value: 'tests', label: 'My Tests', icon: <FileQuestion className="h-4 w-4" /> },
    { value: 'classes', label: 'My Classes', icon: <GraduationCap className="h-4 w-4" /> },
    { value: 'attendance', label: 'Attendance', icon: <CalendarDays className="h-4 w-4" /> },
    { value: 'grades', label: 'Grades', icon: <Star className="h-4 w-4" /> },
    { value: 'assignments', label: 'Assignments', icon: <ClipboardList className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 relative">
      {/* Header with teacher info */}
      <div className="mb-6 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-[200px] h-[200px] rounded-full bg-white/10" />
        <div className="absolute right-24 -bottom-20 w-[150px] h-[150px] rounded-full bg-white/5" />
        <div className="py-6 px-6 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold bg-white/20 border-[3px] border-white/30">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div>
                <h2 className="text-3xl font-bold">
                  Welcome back, {user?.first_name}!
                </h2>
                <p className="text-white/90 mt-1">
                  Teacher Portal - Manage your classes, students, and tests
                </p>
                <div className="flex gap-2 mt-2">
                  <Badge className="bg-white/20 text-white border-none hover:bg-white/30">
                    Teacher
                  </Badge>
                  {user?.roles && user.roles.length > 0 && user.roles.map((role: string) => (
                    <Badge key={role} className="bg-white/15 text-white border-none hover:bg-white/25">
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors">
                      <Bell className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors">
                      <Clock className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Schedule</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {statsCards.map((stat, index) => (
          <Card
            key={index}
            className="h-full transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-lg"
            onClick={() => setTabValue(stat.tab)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  {stat.trend && (
                    <div className="flex items-center mt-1">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500 mr-1" />
                      <span className="text-xs text-emerald-500">{stat.trend}</span>
                    </div>
                  )}
                </div>
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
                >
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs Section */}
      <Card>
        <Tabs value={tabValue} onValueChange={setTabValue}>
          <div className="border-b px-4">
            <TabsList className="bg-transparent h-auto p-0 gap-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-4 py-3 gap-2 text-sm font-semibold"
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <CardContent className="pt-4">
            <TabsContent value="students">
              <TeacherStudentsTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="tests">
              <TeacherTestsTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="classes">
              <TeacherClassesTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="attendance">
              <TeacherAttendanceTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="grades">
              <TeacherGradesTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
            <TabsContent value="assignments">
              <TeacherAssignmentsTab teacherId={user?.id} onRefresh={loadStats} />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Quick Add FAB */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleQuickAction('test')}>
            <FileQuestion className="h-4 w-4 mr-2" />
            Create Test
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickAction('attendance')}>
            <CalendarDays className="h-4 w-4 mr-2" />
            Take Attendance
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickAction('assignment')}>
            <ClipboardList className="h-4 w-4 mr-2" />
            Create Assignment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickAction('grade')}>
            <Star className="h-4 w-4 mr-2" />
            Enter Grades
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TeacherPortal;
