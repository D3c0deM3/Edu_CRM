import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  DollarSign,
  ClipboardList,
  FileQuestion,
  TrendingUp,
  ArrowRight,
  Loader2,
  Star,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  UserCheck,
  Activity,
  Building2,
  Wallet,
  PieChart,
  Shield,
  ArrowUpRight,
  Landmark,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '../hooks';
import type { RootState } from '../../../store';
import {
  studentAPI,
  teacherAPI,
  classAPI,
  gradeAPI,
  attendanceAPI,
  paymentAPI,
  assignmentAPI,
  testAPI,
  debtAPI,
  centerAPI,
} from '../../../shared/api/api';

/* ═══════════════════════════════════════════════
   Shared tiny components (no chart library needed)
   ═══════════════════════════════════════════════ */

const MiniPie = ({ value, max, color, size = 56 }: { value: number; max: number; color: string; size?: number }) => {
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
        className="fill-foreground rotate-90 origin-center text-[12px] font-bold">{Math.round(pct * 100)}%</text>
    </svg>
  );
};

const ProgressBar = ({ value, color, label, sublabel }: { value: number; color: string; label: string; sublabel?: string }) => (
  <div>
    <div className="flex justify-between items-center mb-1">
      <span className="text-xs font-medium">{label}</span>
      <span className="text-xs font-bold" style={{ color }}>{value.toFixed(0)}%</span>
    </div>
    <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
      <div className="h-full rounded-full animate-progress-fill" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
    {sublabel && <p className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</p>}
  </div>
);

const GradeBar = ({ label, count, total, color }: { label: string; count: number; total: number; color: string }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-5 text-xs font-bold" style={{ color }}>{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-muted/60 overflow-hidden">
        <div className="h-full rounded-full animate-progress-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-semibold w-7 text-right text-muted-foreground">{count}</span>
    </div>
  );
};

/* ═══════════════════════════════════════
   Admin Dashboard
   ═══════════════════════════════════════ */

const Dashboard = memo(() => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [debts, setDebts] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, tRes, cRes, gRes, aRes, pRes, asRes, teRes, dRes, cenRes] = await Promise.all([
        studentAPI.getAll().catch(() => ({ data: [] })),
        teacherAPI.getAll().catch(() => ({ data: [] })),
        classAPI.getAll().catch(() => ({ data: [] })),
        gradeAPI.getAll().catch(() => ({ data: [] })),
        attendanceAPI.getAll().catch(() => ({ data: [] })),
        paymentAPI.getAll().catch(() => ({ data: [] })),
        assignmentAPI.getAll().catch(() => ({ data: [] })),
        testAPI.getAll().catch(() => ({ data: [] })),
        debtAPI.getAll().catch(() => ({ data: [] })),
        centerAPI.getAll().catch(() => ({ data: [] })),
      ]);
      const arr = (d: any) => (Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []);
      setStudents(arr(sRes)); setTeachers(arr(tRes)); setClasses(arr(cRes));
      setGrades(arr(gRes)); setAttendance(arr(aRes)); setPayments(arr(pRes));
      setAssignments(arr(asRes)); setTests(arr(teRes)); setDebts(arr(dRes));
      setCenters(arr(cenRes));
    } catch (e) {
      console.error('Dashboard data error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ─── Computed KPIs ─── */
  const today = new Date().toISOString().split('T')[0];

  // Student / teacher ratio
  const studentTeacherRatio = teachers.length > 0 ? (students.length / teachers.length).toFixed(1) : '—';

  // Class capacity utilization
  const capacityStats = useMemo(() => {
    const totalCapacity = classes.reduce((s: number, c: any) => s + (Number(c.capacity) || 0), 0);
    const totalEnrolled = classes.reduce((s: number, c: any) => s + (Number(c.total_students) || 0), 0);
    const utilization = totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0;
    return { totalCapacity, totalEnrolled, utilization };
  }, [classes]);

  // Teacher status
  const activeTeachers = useMemo(() => teachers.filter((t: any) => t.status === 'Active').length, [teachers]);
  const activeStudents = useMemo(() => students.filter((s: any) => s.status === 'Active' || !s.status).length, [students]);

  // Grade KPIs
  const gradeDistribution = useMemo(() => {
    const dist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    grades.forEach((g: any) => { const l = (g.grade_letter || '').toUpperCase(); if (l in dist) dist[l as keyof typeof dist]++; });
    return dist;
  }, [grades]);
  const gradeTotal = Object.values(gradeDistribution).reduce((a, b) => a + b, 0);
  const avgPercentage = useMemo(() => {
    if (!grades.length) return 0;
    return grades.reduce((s: number, g: any) => s + (Number(g.percentage) || 0), 0) / grades.length;
  }, [grades]);
  const passRate = gradeTotal > 0 ? ((gradeDistribution.A + gradeDistribution.B + gradeDistribution.C) / gradeTotal) * 100 : 0;

  // Attendance (today)
  const todayAttendance = useMemo(() => attendance.filter((a: any) => a.attendance_date?.split('T')[0] === today), [attendance, today]);
  const presentToday = todayAttendance.filter((a: any) => a.status === 'Present' || a.status === 'present').length;
  const attendanceRate = todayAttendance.length > 0 ? (presentToday / todayAttendance.length) * 100 : 0;

  // Finance
  const totalRevenue = useMemo(() => payments.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0), [payments]);
  const outstandingDebts = useMemo(() => debts.filter((d: any) => d.status !== 'Paid' && d.status !== 'paid'), [debts]);
  const totalDebtAmount = useMemo(() => outstandingDebts.reduce((s: number, d: any) => s + (Number(d.amount) || 0), 0), [outstandingDebts]);
  const collectionRate = totalRevenue + totalDebtAmount > 0 ? (totalRevenue / (totalRevenue + totalDebtAmount)) * 100 : 100;

  // Assignments / Tests
  const pendingAssignments = useMemo(() => assignments.filter((a: any) => a.status === 'Pending' || a.status === 'Active').length, [assignments]);
  const activeTests = useMemo(() => tests.filter((t: any) => t.is_active).length, [tests]);

  // Top classes
  const classPerformance = useMemo(() => {
    const map = new Map<number, { name: string; grades: number[]; enrolled: number; capacity: number; teacherId?: number }>();
    classes.forEach((cls: any) => {
      map.set(cls.class_id || cls.id, { name: cls.class_name, grades: [], enrolled: cls.total_students || 0, capacity: cls.capacity || 0, teacherId: cls.teacher_id });
    });
    grades.forEach((g: any) => { if (g.class_id && map.has(g.class_id)) map.get(g.class_id)!.grades.push(Number(g.percentage) || 0); });
    return Array.from(map.entries())
      .map(([id, d]) => ({
        id, name: d.name,
        avg: d.grades.length > 0 ? d.grades.reduce((a, b) => a + b, 0) / d.grades.length : 0,
        gradeCount: d.grades.length, enrolled: d.enrolled, capacity: d.capacity,
        teacherName: d.teacherId ? (() => { const t = teachers.find((t: any) => (t.teacher_id || t.id) === d.teacherId); return t ? `${t.first_name} ${t.last_name}` : null; })() : null,
      }))
      .sort((a, b) => b.gradeCount - a.gradeCount)
      .slice(0, 5);
  }, [classes, grades, teachers]);

  // Teachers with class counts
  const teacherOverview = useMemo(() => {
    return teachers.slice(0, 5).map((t: any) => {
      const tid = t.teacher_id || t.id;
      const classCount = classes.filter((c: any) => c.teacher_id === tid).length;
      return { ...t, classCount };
    });
  }, [teachers, classes]);

  /* ─── Admin quick actions ─── */
  const quickActions = [
    { label: 'Manage Students', icon: <Users className="h-4 w-4" />, path: '/students', color: '#6366f1' },
    { label: 'Manage Teachers', icon: <UserCheck className="h-4 w-4" />, path: '/teachers', color: '#8b5cf6' },
    { label: 'Manage Classes', icon: <BookOpen className="h-4 w-4" />, path: '/classes', color: '#06b6d4' },
    { label: 'Manage Payments', icon: <DollarSign className="h-4 w-4" />, path: '/payments', color: '#10b981' },
    { label: 'View Debts', icon: <AlertTriangle className="h-4 w-4" />, path: '/debts', color: '#ef4444' },
    { label: 'Grade Reports', icon: <GraduationCap className="h-4 w-4" />, path: '/grades', color: '#f59e0b' },
    { label: 'Attendance', icon: <CalendarDays className="h-4 w-4" />, path: '/attendance', color: '#14b8a6' },
    { label: 'Tests', icon: <FileQuestion className="h-4 w-4" />, path: '/tests', color: '#e11d48' },
  ];

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 py-5 space-y-5">

      {/* ═══ Admin Header ═══ */}
      <div className="animate-fade-in-down rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 animate-gradient text-white relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-[280px] h-[280px] rounded-full bg-indigo-500/10 animate-float" />
        <div className="absolute right-32 -bottom-24 w-[180px] h-[180px] rounded-full bg-purple-500/5" />
        <div className="absolute left-0 bottom-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold bg-indigo-500/20 border border-indigo-400/30 backdrop-blur-sm">
                <Shield className="h-7 w-7 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-white/50 text-xs uppercase tracking-widest font-semibold">Admin Control Panel</p>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold mt-0.5">Welcome, {user?.first_name}</h1>
                <div className="flex items-center gap-2 mt-1.5">
                  <Badge className="bg-indigo-500/30 text-indigo-200 border-none text-[10px]">ADMINISTRATOR</Badge>
                  <span className="text-white/30 text-xs">•</span>
                  <span className="text-white/50 text-xs">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/20 hover:bg-indigo-500/30 h-8 text-xs" onClick={() => navigate('/students')}>
                <Users className="h-3.5 w-3.5 mr-1.5" /> Students
              </Button>
              <Button size="sm" className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/20 hover:bg-indigo-500/30 h-8 text-xs" onClick={() => navigate('/teachers')}>
                <UserCheck className="h-3.5 w-3.5 mr-1.5" /> Teachers
              </Button>
              <Button size="sm" className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/20 hover:bg-indigo-500/30 h-8 text-xs" onClick={() => navigate('/payments')}>
                <Wallet className="h-3.5 w-3.5 mr-1.5" /> Finance
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KPI Strip ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { title: 'Total Students', value: students.length, sub: `${activeStudents} active`, icon: <Users className="h-5 w-5" />, color: '#6366f1', path: '/students' },
          { title: 'Total Teachers', value: teachers.length, sub: `${activeTeachers} active`, icon: <UserCheck className="h-5 w-5" />, color: '#8b5cf6', path: '/teachers' },
          { title: 'Total Classes', value: classes.length, sub: `${studentTeacherRatio} stu/teacher`, icon: <BookOpen className="h-5 w-5" />, color: '#06b6d4', path: '/classes' },
          { title: 'Revenue', value: `$${totalRevenue.toLocaleString()}`, sub: `${payments.length} payments`, icon: <DollarSign className="h-5 w-5" />, color: '#10b981', path: '/payments' },
          { title: 'Outstanding', value: outstandingDebts.length, sub: totalDebtAmount > 0 ? `$${totalDebtAmount.toLocaleString()}` : 'All clear', icon: <AlertTriangle className="h-5 w-5" />, color: outstandingDebts.length > 0 ? '#ef4444' : '#10b981', path: '/debts' },
          { title: 'Pass Rate', value: `${passRate.toFixed(0)}%`, sub: `${gradeTotal} grades`, icon: <GraduationCap className="h-5 w-5" />, color: '#f59e0b', path: '/grades' },
        ].map((kpi, i) => (
          <Card key={kpi.title} className={`dashboard-card cursor-pointer animate-fade-in-up stagger-${i + 1} border-l-4`}
            style={{ borderLeftColor: kpi.color }} onClick={() => navigate(kpi.path)}>
            <CardContent className="p-3.5">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate">{kpi.title}</p>
                  <p className="text-xl font-bold mt-0.5">{kpi.value}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{kpi.sub}</p>
                </div>
                <div className="p-2 rounded-xl shrink-0" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                  {kpi.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ═══ Main Grid: Admin-specific panels ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* ── Financial Overview (admin-exclusive) ── */}
        <Card className="lg:col-span-4 animate-fade-in-up stagger-3 dashboard-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Landmark className="h-4 w-4 text-emerald-500" /> Financial Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10">
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-600">${totalRevenue.toLocaleString()}</p>
              </div>
              <MiniPie value={collectionRate} max={100} color="#10b981" size={52} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Paid</p>
                <p className="text-lg font-bold text-emerald-600">{payments.length}</p>
                <p className="text-[10px] text-muted-foreground">payments</p>
              </div>
              <div className="p-2.5 rounded-lg border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Unpaid</p>
                <p className="text-lg font-bold text-red-500">{outstandingDebts.length}</p>
                <p className="text-[10px] text-muted-foreground">${totalDebtAmount.toLocaleString()}</p>
              </div>
            </div>

            <ProgressBar value={collectionRate} color="#10b981" label="Collection Rate" sublabel={`${collectionRate.toFixed(0)}% of expected revenue collected`} />

            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('/payments')}>
              View Financial Details <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* ── Institutional Performance ── */}
        <Card className="lg:col-span-4 animate-fade-in-up stagger-4 dashboard-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieChart className="h-4 w-4 text-amber-500" /> Academic Performance
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">Center-wide</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4 py-1">
              <MiniPie value={gradeDistribution.A + gradeDistribution.B + gradeDistribution.C} max={gradeTotal || 1} color={passRate >= 70 ? '#10b981' : '#f59e0b'} size={64} />
              <div>
                <p className="text-2xl font-bold">{avgPercentage.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Center Average</p>
                <Badge variant="outline" className={`mt-1 text-[10px] ${passRate >= 80 ? 'border-emerald-300 text-emerald-600' : passRate >= 60 ? 'border-amber-300 text-amber-600' : 'border-red-300 text-red-600'}`}>
                  {passRate.toFixed(0)}% pass rate
                </Badge>
              </div>
            </div>
            <GradeBar label="A" count={gradeDistribution.A} total={gradeTotal} color="#10b981" />
            <GradeBar label="B" count={gradeDistribution.B} total={gradeTotal} color="#3b82f6" />
            <GradeBar label="C" count={gradeDistribution.C} total={gradeTotal} color="#f59e0b" />
            <GradeBar label="D" count={gradeDistribution.D} total={gradeTotal} color="#f97316" />
            <GradeBar label="F" count={gradeDistribution.F} total={gradeTotal} color="#ef4444" />
            <Button variant="ghost" size="sm" className="w-full text-xs mt-1" onClick={() => navigate('/grades')}>
              Grade Reports <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* ── Operations & Today ── */}
        <Card className="lg:col-span-4 animate-fade-in-up stagger-5 dashboard-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" /> Operations Today
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Attendance */}
            <div className="p-3 rounded-xl bg-blue-500/10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Attendance Rate</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{attendanceRate.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-blue-200/50 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 animate-progress-fill" style={{ width: `${attendanceRate}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{presentToday}/{todayAttendance.length} students present</p>
            </div>

            {/* Capacity */}
            <ProgressBar value={capacityStats.utilization} color="#8b5cf6"
              label="Class Utilization"
              sublabel={`${capacityStats.totalEnrolled}/${capacityStats.totalCapacity} seats filled`} />

            {/* Pending items */}
            <div className="space-y-1.5 pt-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Requires Action</p>
              {[
                { label: 'Outstanding Debts', count: outstandingDebts.length, icon: <AlertTriangle className="h-3.5 w-3.5" />, color: '#ef4444', path: '/debts' },
                { label: 'Pending Assignments', count: pendingAssignments, icon: <ClipboardList className="h-3.5 w-3.5" />, color: '#06b6d4', path: '/assignments' },
                { label: 'Active Tests', count: activeTests, icon: <FileQuestion className="h-3.5 w-3.5" />, color: '#e11d48', path: '/tests' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => navigate(item.path)}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                    {item.icon}
                  </div>
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  <Badge className="border-none text-xs" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                    {item.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Bottom Row: Classes & Teachers ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Class Overview ── */}
        <Card className="animate-fade-in-up stagger-6 dashboard-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-500" /> Class Overview
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">{classes.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {classPerformance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-30" /> No classes with grade data
              </div>
            ) : (
              <div className="space-y-2.5">
                {classPerformance.map((cls, i) => (
                  <div key={cls.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => navigate('/classes')}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      i === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-muted text-muted-foreground'
                    }`}>{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{cls.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {cls.teacherName || 'No teacher'} · {cls.enrolled}/{cls.capacity || '—'} students · {cls.gradeCount} grades
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{cls.avg > 0 ? `${cls.avg.toFixed(0)}%` : '—'}</p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" size="sm" className="w-full text-xs mt-2" onClick={() => navigate('/classes')}>
              Manage All Classes <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>

        {/* ── Staff Overview ── */}
        <Card className="animate-fade-in-up stagger-7 dashboard-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-purple-500" /> Staff Overview
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">{activeTeachers}/{teachers.length} active</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {teacherOverview.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-30" /> No teachers found
              </div>
            ) : (
              <div className="space-y-2.5">
                {teacherOverview.map((t: any) => (
                  <div key={t.teacher_id || t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group" onClick={() => navigate(`/teacher/${t.teacher_id || t.id}`)}>
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-xs font-bold text-purple-600">
                      {t.first_name?.[0]}{t.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{t.first_name} {t.last_name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.specialization || t.employee_id} · {t.classCount} classes</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${t.status === 'Active' ? 'border-emerald-300 text-emerald-600' : 'border-gray-300 text-gray-500'}`}>
                      {t.status || 'Active'}
                    </Badge>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
            <Button variant="ghost" size="sm" className="w-full text-xs mt-2" onClick={() => navigate('/teachers')}>
              Manage All Teachers <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ═══ Quick Navigation ═══ */}
      <Card className="animate-fade-in-up stagger-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Admin Quick Navigation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
            {quickActions.map((action) => (
              <button key={action.label} onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ backgroundColor: `${action.color}15`, color: action.color }}>{action.icon}</div>
                <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ═══ Footer strip ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up stagger-8">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <p className="text-[10px] text-muted-foreground">System</p>
            <p className="text-xs font-semibold text-emerald-600">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <Building2 className="h-3.5 w-3.5 text-indigo-500" />
          <div>
            <p className="text-[10px] text-muted-foreground">Centers</p>
            <p className="text-xs font-semibold">{centers.length || 1}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <TrendingUp className="h-3.5 w-3.5 text-cyan-500" />
          <div>
            <p className="text-[10px] text-muted-foreground">Total Records</p>
            <p className="text-xs font-semibold">{(students.length + teachers.length + grades.length + payments.length).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
          <Star className="h-3.5 w-3.5 text-amber-500" />
          <div>
            <p className="text-[10px] text-muted-foreground">Avg Grade</p>
            <p className="text-xs font-semibold">{avgPercentage > 0 ? `${avgPercentage.toFixed(1)}%` : 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
