import { useState, useEffect, useCallback } from 'react';
import {
  FileQuestion,
  CalendarDays,
  Award,
  LayoutDashboard,
  CheckCircle,
  Clock,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAppSelector } from '../crm/hooks';
import type { RootState } from '../../store';
import { testAPI, gradeAPI, attendanceAPI } from '../../shared/api/api';

interface StudentStats {
  totalTests: number;
  completedTests: number;
  averageGrade: number;
  attendanceRate: number;
  pendingTests: number;
}

const StudentPortal = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const [tabValue, setTabValue] = useState('overview');
  const [stats, setStats] = useState<StudentStats>({
    totalTests: 0,
    completedTests: 0,
    averageGrade: 0,
    attendanceRate: 0,
    pendingTests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const [assignedTestsRes, gradesRes, attendanceRes] = await Promise.all([
        user.class_id ? testAPI.getAssignedTests('class', user.class_id).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        gradeAPI.getByStudent(user.id).catch(() => ({ data: [] })),
        attendanceAPI.getByStudent(user.id).catch(() => ({ data: [] })),
      ]);

      const assignedTests = assignedTestsRes.data || [];
      const gradesData = gradesRes.data || [];
      const attendanceData = attendanceRes.data || [];

      const testsWithStatus = assignedTests.map((test: any) => ({
        ...test,
        submission_status: test.submission_status || 'not_started',
      }));

      setTests(testsWithStatus);
      setGrades(gradesData);
      setAttendance(attendanceData);

      const completedTests = testsWithStatus.filter((t: any) => t.submission_status === 'graded' || t.submission_status === 'submitted').length;
      const presentDays = attendanceData.filter((a: any) => a.status === 'Present' || a.status === 'Late').length;
      const attendanceRate = attendanceData.length > 0 ? Math.round((presentDays / attendanceData.length) * 100) : 100;
      const avgGrade = gradesData.length > 0
        ? Math.round(gradesData.reduce((sum: number, g: any) => sum + (g.percentage || 0), 0) / gradesData.length)
        : 0;
      const pendingTests = testsWithStatus.filter((t: any) => t.submission_status === 'not_started').length;

      setStats({
        totalTests: testsWithStatus.length,
        completedTests,
        averageGrade: avgGrade,
        attendanceRate,
        pendingTests,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statCards = [
    {
      title: 'Tests Completed',
      value: `${stats.completedTests}/${stats.totalTests}`,
      icon: <FileQuestion className="h-5 w-5" />,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Average Grade',
      value: `${stats.averageGrade}%`,
      icon: <Award className="h-5 w-5" />,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Attendance',
      value: `${stats.attendanceRate}%`,
      icon: <CalendarDays className="h-5 w-5" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Pending Tests',
      value: `${stats.pendingTests}`,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-rose-500',
      bgColor: 'bg-rose-50',
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header Card */}
      <Card className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10" />
        <CardContent className="p-8 relative">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {user?.first_name?.[0]}{user?.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-0.5">
                Welcome, {user?.first_name}!
              </h2>
              <p className="opacity-90">Student Portal</p>
              <span className="inline-block mt-1.5 text-xs font-semibold bg-white/20 rounded-full px-3 py-1">
                Student
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className={cn('text-3xl font-bold', stat.color)}>{stat.value}</p>
                </div>
                <div className={cn('p-2.5 rounded-lg', stat.bgColor, stat.color)}>
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
            <TabsList className="bg-transparent h-14">
              <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none gap-2 font-semibold">
                <LayoutDashboard className="h-4 w-4" /> Overview
              </TabsTrigger>
              <TabsTrigger value="tests" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none gap-2 font-semibold">
                <FileQuestion className="h-4 w-4" /> My Tests
              </TabsTrigger>
              <TabsTrigger value="grades" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none gap-2 font-semibold">
                <Award className="h-4 w-4" /> My Grades
              </TabsTrigger>
              <TabsTrigger value="attendance" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none gap-2 font-semibold">
                <CalendarDays className="h-4 w-4" /> Attendance
              </TabsTrigger>
            </TabsList>
          </div>

          <CardContent className="pt-6">
            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border">
                  <CardContent className="pt-5">
                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Recent Activity
                    </h3>
                    {tests.length === 0 && grades.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No recent activity</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {tests.slice(0, 3).map((test, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <FileQuestion className="h-5 w-5 text-indigo-500" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold">
                                {test.test_title || test.title || 'Test'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Score: {test.score || 0}/{test.total_marks || 100}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                test.status === 'graded'
                                  ? 'border-green-400 text-green-600'
                                  : 'border-gray-300 text-gray-500'
                              )}
                            >
                              {test.status || 'Pending'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card className="border">
                  <CardContent className="pt-5">
                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Pending Tests
                    </h3>
                    {tests.filter(t => t.submission_status === 'not_started').length === 0 ? (
                      <Alert className="border-green-300 bg-green-50 text-green-800">
                        <AlertDescription>All tests completed!</AlertDescription>
                      </Alert>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {tests.filter(t => t.submission_status === 'not_started').slice(0, 3).map((test, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <FileQuestion className="h-5 w-5 text-amber-500" />
                            <div className="flex-1">
                              <p className="text-sm font-semibold">
                                {test.test_title || test.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Total Marks: {test.total_marks || 100}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* My Tests Tab */}
            <TabsContent value="tests">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">My Tests</h3>
                <Badge variant="outline" className="border-indigo-300 text-indigo-600">
                  {stats.completedTests} of {stats.totalTests} completed
                </Badge>
              </div>

              {/* Pending Tests Section */}
              <h4 className="text-sm font-semibold mb-2 text-rose-500 flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Pending Tests ({tests.filter(t => t.submission_status === 'not_started').length})
              </h4>
              {tests.filter(t => t.submission_status === 'not_started').length === 0 ? (
                <Alert className="mb-6 border-green-300 bg-green-50 text-green-800">
                  <AlertDescription>All tests completed!</AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-md overflow-hidden mb-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-amber-50">
                        <TableHead>Test Name</TableHead>
                        <TableHead>Total Marks</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tests.filter(t => t.submission_status === 'not_started').map((test, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell className="font-semibold">{test.test_title || test.title}</TableCell>
                          <TableCell>{test.total_marks || 100}</TableCell>
                          <TableCell>
                            <Badge className="bg-amber-100 text-amber-700 border-amber-300">Not Started</Badge>
                          </TableCell>
                          <TableCell>
                            <button
                              className="text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-full px-3 py-1 transition-colors"
                              onClick={() => window.location.href = `/tests/${test.test_id}/take`}
                            >
                              Take Test
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Completed Tests Section */}
              <h4 className="text-sm font-semibold mb-2 text-emerald-500 flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                Completed Tests ({tests.filter(t => t.submission_status === 'submitted' || t.submission_status === 'graded').length})
              </h4>
              {tests.filter(t => t.submission_status === 'submitted' || t.submission_status === 'graded').length === 0 ? (
                <Alert className="border-blue-300 bg-blue-50 text-blue-800">
                  <AlertDescription>No completed tests yet.</AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-green-50">
                        <TableHead>Test Name</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tests.filter(t => t.submission_status === 'submitted' || t.submission_status === 'graded').map((test, index) => {
                        const pct = test.total_marks ? Math.round((test.score / test.total_marks) * 100) : 0;
                        return (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="font-semibold">{test.test_title || test.title}</TableCell>
                            <TableCell>{test.score || 0}/{test.total_marks || 100}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full',
                                      pct >= 60 ? 'bg-green-500' : 'bg-amber-500'
                                    )}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-sm">{pct}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  test.submission_status === 'graded'
                                    ? 'border-green-400 text-green-600'
                                    : 'border-blue-400 text-blue-600'
                                )}
                              >
                                {test.submission_status === 'graded' ? 'Graded' : 'Submitted'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {test.submitted_at ? new Date(test.submitted_at).toLocaleDateString() : 'N/A'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* My Grades Tab */}
            <TabsContent value="grades">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">My Grades</h3>
                <Badge variant="outline" className="border-green-400 text-green-600">
                  Average: {stats.averageGrade}%
                </Badge>
              </div>
              {grades.length === 0 ? (
                <Alert className="border-blue-300 bg-blue-50 text-blue-800">
                  <AlertDescription>No grades recorded yet.</AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Subject</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Percentage</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Term</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grades.map((grade, index) => {
                        const pct = grade.percentage || 0;
                        return (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="font-semibold">{grade.subject_name || grade.subject}</TableCell>
                            <TableCell>{grade.marks_obtained}/{grade.total_marks}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full',
                                      pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-indigo-500' : 'bg-amber-500'
                                    )}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-sm">{pct}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  grade.grade_letter === 'A' ? 'border-green-400 text-green-600' :
                                  grade.grade_letter === 'B' ? 'border-indigo-400 text-indigo-600' :
                                  grade.grade_letter === 'C' ? 'border-blue-400 text-blue-600' :
                                  grade.grade_letter === 'D' ? 'border-amber-400 text-amber-600' :
                                  'border-red-400 text-red-600'
                                )}
                              >
                                {grade.grade_letter || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell>{grade.term || 'N/A'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-semibold">Attendance Record</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs gap-1',
                    stats.attendanceRate >= 80 ? 'border-green-400 text-green-600' :
                    stats.attendanceRate >= 60 ? 'border-amber-400 text-amber-600' :
                    'border-red-400 text-red-600'
                  )}
                >
                  <CheckCircle className="h-3 w-3" />
                  {stats.attendanceRate}% Attendance
                </Badge>
              </div>
              {attendance.length === 0 ? (
                <Alert className="border-blue-300 bg-blue-50 text-blue-800">
                  <AlertDescription>No attendance records yet.</AlertDescription>
                </Alert>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Date</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((record, index) => (
                        <TableRow key={index} className="hover:bg-gray-50">
                          <TableCell>
                            {record.attendance_date ? new Date(record.attendance_date).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>{record.class_name || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                record.status === 'Present' ? 'border-green-400 text-green-600 bg-green-50' :
                                record.status === 'Late' ? 'border-amber-400 text-amber-600 bg-amber-50' :
                                record.status === 'Absent' ? 'border-red-400 text-red-600 bg-red-50' :
                                ''
                              )}
                            >
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.remarks || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default StudentPortal;
