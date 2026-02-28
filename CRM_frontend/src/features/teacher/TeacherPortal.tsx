import { useState, useEffect, useCallback, useMemo } from 'react';
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
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { testAPI, studentAPI, classAPI, attendanceAPI, assignmentAPI, gradeAPI } from '../../shared/api/api';

/* ─── Mini pie chart (pure SVG) ─── */
const MiniPie = ({ value, max, color, size = 52 }: { value: number; max: number; color: string; size?: number }) => {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={5} className="text-muted/40" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        className="fill-foreground rotate-90 origin-center text-[11px] font-bold">{Math.round(pct * 100)}%</text>
    </svg>
  );
};

/* ─── Grade distribution bar ─── */
const GradeBar = ({ label, count, total, color }: { label: string; count: number; total: number; color: string }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 text-xs font-bold" style={{ color }}>{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-muted/60 overflow-hidden">
        <div className="h-full rounded-full animate-progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-medium w-6 text-right text-muted-foreground">{count}</span>
    </div>
  );
};

interface TeacherStats {
  totalStudents: number;
  totalClasses: number;
  pendingTests: number;
  completedTests: number;
  pendingGrading: number;
  todayAttendance: number;
  totalAttendanceToday: number;
  presentToday: number;
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
    totalAttendanceToday: 0,
    presentToday: 0,
    pendingAssignments: 0,
    upcomingClasses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);

      const [testsRes, studentsRes, classesRes, attendanceRes, assignmentsRes, gradesRes] = await Promise.all([
        testAPI.getAll().catch(() => ({ data: [] })),
        studentAPI.getAll().catch(() => ({ data: [] })),
        classAPI.getAll().catch(() => ({ data: [] })),
        attendanceAPI.getAll().catch(() => ({ data: [] })),
        assignmentAPI.getAll().catch(() => ({ data: [] })),
        gradeAPI.getAll().catch(() => ({ data: [] })),
      ]);

      const tests = testsRes.data || [];
      const students = studentsRes.data || [];
      const classList = classesRes.data || [];
      const attendance = attendanceRes.data || [];
      const assignments = assignmentsRes.data || [];
      const gradeList = gradesRes.data || [];

      setClasses(Array.isArray(classList) ? classList : []);
      setGrades(Array.isArray(gradeList) ? gradeList : []);

      const today = new Date().toISOString().split('T')[0];
      const todayAtt = attendance.filter((a: any) => a.attendance_date?.split('T')[0] === today);
      const presentToday = todayAtt.filter((a: any) => a.status === 'Present' || a.status === 'present').length;

      const pendingTests = tests.filter((t: any) => t.is_active).length;
      const completedTests = tests.length - pendingTests;
      const pendingGrading = tests.filter((t: any) => (t.submission_count || 0) > 0).length;
      const pendingAssignments = assignments.filter((a: any) => a.status === 'Pending' || a.status === 'Active').length;

      setStats({
        totalStudents: students.length,
        totalClasses: classList.length,
        pendingTests,
        completedTests,
        pendingGrading,
        todayAttendance: todayAtt.length,
        totalAttendanceToday: todayAtt.length,
        presentToday,
        pendingAssignments,
        upcomingClasses: classList.filter((c: any) => c.status === 'Active').length,
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

  // ─── Computed grade stats ───
  const gradeDistribution = useMemo(() => {
    const dist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    grades.forEach((g: any) => {
      const letter = (g.grade_letter || '').toUpperCase();
      if (letter in dist) dist[letter as keyof typeof dist]++;
    });
    return dist;
  }, [grades]);

  const gradeTotal = Object.values(gradeDistribution).reduce((a, b) => a + b, 0);

  const avgPercentage = useMemo(() => {
    if (!grades.length) return 0;
    return grades.reduce((sum: number, g: any) => sum + (Number(g.percentage) || 0), 0) / grades.length;
  }, [grades]);

  // ─── Class performance ranking ───
  const classPerformance = useMemo(() => {
    const map = new Map<number, { name: string; grades: number[] }>();
    classes.forEach((cls: any) => {
      map.set(cls.class_id || cls.id, { name: cls.class_name, grades: [] });
    });
    grades.forEach((g: any) => {
      if (g.class_id && map.has(g.class_id)) {
        map.get(g.class_id)!.grades.push(Number(g.percentage) || 0);
      }
    });
    return Array.from(map.entries())
      .map(([id, data]) => ({
        id, name: data.name,
        avg: data.grades.length > 0 ? data.grades.reduce((a, b) => a + b, 0) / data.grades.length : 0,
        count: data.grades.length,
      }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 4);
  }, [classes, grades]);

  const attendanceRate = stats.totalAttendanceToday > 0 ? (stats.presentToday / stats.totalAttendanceToday) * 100 : 0;

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'test': navigate('/tests/create'); break;
      case 'attendance': setTabValue('attendance'); break;
      case 'assignment': navigate('/assignments'); break;
      case 'grade': setTabValue('grades'); break;
      default: break;
    }
  };

  const statsCards = [
    { title: 'My Students', value: stats.totalStudents, icon: <Users className="h-5 w-5" />, color: '#6366f1', bg: '#6366f115', tab: 'students' },
    { title: 'My Classes', value: stats.totalClasses, icon: <BookOpen className="h-5 w-5" />, color: '#8b5cf6', bg: '#8b5cf615', tab: 'classes' },
    { title: 'Active Tests', value: stats.pendingTests, icon: <FileQuestion className="h-5 w-5" />, color: '#ef4444', bg: '#ef444415', tab: 'tests' },
    { title: 'Pending Grading', value: stats.pendingGrading, icon: <Star className="h-5 w-5" />, color: '#f59e0b', bg: '#f59e0b15', tab: 'grades', alert: stats.pendingGrading > 0 },
    { title: 'Attendance Today', value: `${stats.presentToday}/${stats.totalAttendanceToday}`, icon: <CalendarDays className="h-5 w-5" />, color: '#10b981', bg: '#10b98115', tab: 'attendance' },
    { title: 'Assignments', value: stats.pendingAssignments, icon: <ClipboardList className="h-5 w-5" />, color: '#06b6d4', bg: '#06b6d415', tab: 'assignments', alert: stats.pendingAssignments > 0 },
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
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading your portal...</p>
      </div>
    );
  }

  return (
    <div className="p-5 space-y-5 relative">

      {/* ──── Header Banner ──── */}
      <div className="animate-fade-in-down rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-500 animate-gradient text-white relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-[220px] h-[220px] rounded-full bg-white/10 animate-float" />
        <div className="absolute right-28 -bottom-20 w-[150px] h-[150px] rounded-full bg-white/5" />
        <div className="absolute left-1/2 top-0 w-[300px] h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        <div className="relative z-10 py-6 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold bg-white/20 border border-white/30 backdrop-blur-sm">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div>
                <p className="text-white/70 text-sm">Welcome back,</p>
                <h2 className="text-2xl sm:text-3xl font-bold">{user?.first_name} {user?.last_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-white/20 text-white border-none text-xs">Teacher</Badge>
                  {user?.roles && Array.isArray(user.roles) && user.roles.map((role: string) => (
                    <Badge key={role} className="bg-white/15 text-white border-none text-xs">{role}</Badge>
                  ))}
                  <span className="text-white/50 text-xs">•</span>
                  <span className="text-white/60 text-xs">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-2.5 rounded-xl hover:bg-white/20 text-white transition-colors" onClick={() => setTabValue('grades')}>
                      <GraduationCap className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Enter Grades</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-2.5 rounded-xl hover:bg-white/20 text-white transition-colors">
                      <Bell className="h-5 w-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="p-2.5 rounded-xl hover:bg-white/20 text-white transition-colors">
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

      {/* ──── Stat Cards Row ──── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {statsCards.map((stat, index) => (
          <Card
            key={index}
            className={`dashboard-card cursor-pointer animate-fade-in-up stagger-${index + 1} border-l-4`}
            style={{ borderLeftColor: stat.color }}
            onClick={() => setTabValue(stat.tab)}
          >
            <CardContent className="p-3.5">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide truncate">{stat.title}</p>
                  <p className="text-xl font-bold mt-0.5">{stat.value}</p>
                  {stat.alert && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="h-3 w-3 text-amber-500" />
                      <span className="text-[10px] text-amber-600 font-medium">Needs attention</span>
                    </div>
                  )}
                </div>
                <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: stat.bg, color: stat.color }}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ──── Dashboard Insights (Grade + Attendance + Performance) ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Grade Distribution */}
        <Card className="animate-fade-in-up stagger-3 dashboard-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" /> Grade Overview
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">{gradeTotal} total</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex items-center justify-center gap-4 py-1">
              <MiniPie value={gradeDistribution.A + gradeDistribution.B} max={gradeTotal || 1} color="#10b981" />
              <div>
                <p className="text-xl font-bold">{avgPercentage.toFixed(1)}%</p>
                <p className="text-[11px] text-muted-foreground">Avg Score</p>
              </div>
            </div>
            <GradeBar label="A" count={gradeDistribution.A} total={gradeTotal} color="#10b981" />
            <GradeBar label="B" count={gradeDistribution.B} total={gradeTotal} color="#3b82f6" />
            <GradeBar label="C" count={gradeDistribution.C} total={gradeTotal} color="#f59e0b" />
            <GradeBar label="D" count={gradeDistribution.D} total={gradeTotal} color="#f97316" />
            <GradeBar label="F" count={gradeDistribution.F} total={gradeTotal} color="#ef4444" />
            <Button variant="ghost" size="sm" className="w-full text-xs mt-1" onClick={() => setTabValue('grades')}>
              View All Grades <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* Today's Attendance + Pending Tasks */}
        <Card className="animate-fade-in-up stagger-4 dashboard-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" /> Today&apos;s Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Attendance ring */}
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">Attendance Rate</span>
                </div>
                <span className="text-lg font-bold text-emerald-600">{attendanceRate.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-emerald-200/50 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 animate-progress-fill" style={{ width: `${attendanceRate}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{stats.presentToday} present of {stats.totalAttendanceToday} recorded</p>
            </div>

            {/* Pending items */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Tasks</p>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setTabValue('grades')}>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Star className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Pending Grading</p>
                </div>
                <Badge className="bg-amber-500/10 text-amber-600 border-none text-xs">{stats.pendingGrading}</Badge>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setTabValue('assignments')}>
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <ClipboardList className="h-3.5 w-3.5 text-cyan-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Pending Assignments</p>
                </div>
                <Badge className="bg-cyan-500/10 text-cyan-600 border-none text-xs">{stats.pendingAssignments}</Badge>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setTabValue('tests')}>
                <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <FileQuestion className="h-3.5 w-3.5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Active Tests</p>
                </div>
                <Badge className="bg-red-500/10 text-red-600 border-none text-xs">{stats.pendingTests}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Class Performance + Quick Actions */}
        <Card className="animate-fade-in-up stagger-5 dashboard-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-500" /> Class Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {classPerformance.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p>No grade data yet</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {classPerformance.map((cls, i) => (
                  <div key={cls.id} className="flex items-center gap-2.5">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-50 text-orange-600'
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cls.name}</p>
                      <p className="text-[10px] text-muted-foreground">{cls.count} grades</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{cls.avg.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Quick nav */}
            <div className="pt-2 border-t">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Quick Actions</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleQuickAction('grade')}
                  className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-xs font-medium text-muted-foreground hover:text-foreground group">
                  <GraduationCap className="h-3.5 w-3.5 text-amber-500 group-hover:scale-110 transition-transform" /> Enter Grades
                </button>
                <button onClick={() => handleQuickAction('attendance')}
                  className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-xs font-medium text-muted-foreground hover:text-foreground group">
                  <CalendarDays className="h-3.5 w-3.5 text-emerald-500 group-hover:scale-110 transition-transform" /> Attendance
                </button>
                <button onClick={() => handleQuickAction('test')}
                  className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-xs font-medium text-muted-foreground hover:text-foreground group">
                  <FileQuestion className="h-3.5 w-3.5 text-red-500 group-hover:scale-110 transition-transform" /> Create Test
                </button>
                <button onClick={() => handleQuickAction('assignment')}
                  className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all text-xs font-medium text-muted-foreground hover:text-foreground group">
                  <ClipboardList className="h-3.5 w-3.5 text-cyan-500 group-hover:scale-110 transition-transform" /> Assignment
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ──── Tabs Section ──── */}
      <Card className="animate-fade-in-up stagger-6">
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

      {/* ──── Quick Add FAB ──── */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all duration-300 hover:scale-105"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleQuickAction('test')}>
            <FileQuestion className="h-4 w-4 mr-2" /> Create Test
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickAction('attendance')}>
            <CalendarDays className="h-4 w-4 mr-2" /> Take Attendance
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickAction('assignment')}>
            <ClipboardList className="h-4 w-4 mr-2" /> Create Assignment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleQuickAction('grade')}>
            <Star className="h-4 w-4 mr-2" /> Enter Grades
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default TeacherPortal;
