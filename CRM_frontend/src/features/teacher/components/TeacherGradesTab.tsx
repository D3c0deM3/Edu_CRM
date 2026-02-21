import { useState, useEffect } from 'react';
import {
  Star,
  Save,
  Plus,
  BarChart3,
  TrendingUp,
  Search,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { classAPI, studentAPI, gradeAPI, subjectAPI } from '../../../shared/api/api';

interface ClassInfo {
  class_id: number;
  class_name: string;
}

interface SubjectInfo {
  subject_id: number;
  subject_name: string;
}

interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
  enrollment_number: string;
  class_id?: number;
}

interface GradeRecord {
  grade_id?: number;
  student_id: number;
  subject_id: number;
  grade_type: string;
  grade_value: number;
  max_value: number;
  grade_date: string;
  notes?: string;
}

interface TeacherGradesTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const TeacherGradesTab = ({ teacherId, onRefresh }: TeacherGradesTabProps) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedSubject, setSelectedSubject] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState('student-grades');
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [newGrade, setNewGrade] = useState({
    grade_type: 'Assignment',
    grade_value: 0,
    max_value: 100,
    notes: '',
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadInitialData();
  }, [teacherId]);

  useEffect(() => {
    if (selectedClass) {
      loadStudentsAndGrades();
    }
  }, [selectedClass, selectedSubject]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [classRes, subjectRes] = await Promise.all([
        classAPI.getAll(),
        subjectAPI.getAll(),
      ]);
      setClasses(classRes.data || []);
      setSubjects(subjectRes.data || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsAndGrades = async () => {
    try {
      setLoading(true);
      const [studentsRes, gradesRes] = await Promise.all([
        studentAPI.getAll(),
        gradeAPI.getAll(),
      ]);

      // Filter students by class
      const filteredStudents = (studentsRes.data || []).filter(
        (s: Student) => !selectedClass || s.class_id === selectedClass
      );
      setStudents(filteredStudents);

      // Filter grades
      const filteredGrades = (gradesRes.data || []).filter((g: GradeRecord) => {
        const studentIds = filteredStudents.map((s: Student) => s.student_id);
        return (
          studentIds.includes(g.student_id) &&
          (!selectedSubject || g.subject_id === selectedSubject)
        );
      });
      setGrades(filteredGrades);
    } catch (error) {
      console.error('Error loading students/grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGradeDialog = (student: Student) => {
    setSelectedStudent(student);
    setNewGrade({
      grade_type: 'Assignment',
      grade_value: 0,
      max_value: 100,
      notes: '',
    });
    setGradeDialogOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedStudent || !selectedSubject) {
      setSnackbar({
        open: true,
        message: 'Please select a subject first',
        severity: 'error',
      });
      return;
    }

    try {
      setSaving(true);
      await gradeAPI.create({
        student_id: selectedStudent.student_id,
        subject_id: selectedSubject,
        grade_type: newGrade.grade_type,
        grade_value: newGrade.grade_value,
        max_value: newGrade.max_value,
        grade_date: new Date().toISOString().split('T')[0],
        notes: newGrade.notes,
        recorded_by: teacherId,
      });

      setSnackbar({
        open: true,
        message: 'Grade saved successfully!',
        severity: 'success',
      });
      setGradeDialogOpen(false);
      loadStudentsAndGrades();
      onRefresh?.();
    } catch (error) {
      console.error('Error saving grade:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save grade',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const calculateStudentAverage = (studentId: number) => {
    const studentGrades = grades.filter((g) => g.student_id === studentId);
    if (studentGrades.length === 0) return null;

    const totalPercentage = studentGrades.reduce((acc, g) => {
      return acc + (g.grade_value / g.max_value) * 100;
    }, 0);

    return (totalPercentage / studentGrades.length).toFixed(1);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return '#43e97b';
    if (percentage >= 80) return '#2196f3';
    if (percentage >= 70) return '#6366f1';
    if (percentage >= 60) return '#ff9800';
    return '#f5576c';
  };

  const getLetterGrade = (percentage: number) => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const filteredStudents = students.filter(
    (s) =>
      s.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.enrollment_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const gradeTypes = ['Assignment', 'Quiz', 'Test', 'Exam', 'Project', 'Homework', 'Participation'];

  if (loading && classes.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h3 className="text-lg font-semibold">Manage Grades</h3>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : '')}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring min-w-[150px]"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>
                {cls.class_name}
              </option>
            ))}
          </select>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : '')}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring min-w-[150px]"
          >
            <option value="">All Subjects</option>
            {subjects.map((subj) => (
              <option key={subj.subject_id} value={subj.subject_id}>
                {subj.subject_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="bg-indigo-500/10 text-center p-4">
          <Star className="h-8 w-8 text-indigo-500 mx-auto" />
          <p className="text-3xl font-bold text-indigo-500">{grades.length}</p>
          <p className="text-xs text-muted-foreground">Total Grades</p>
        </Card>
        <Card className="bg-emerald-500/10 text-center p-4">
          <TrendingUp className="h-8 w-8 text-emerald-500 mx-auto" />
          <p className="text-3xl font-bold text-emerald-500">
            {grades.length > 0
              ? (
                  grades.reduce((acc, g) => acc + (g.grade_value / g.max_value) * 100, 0) /
                  grades.length
                ).toFixed(0)
              : 0}
            %
          </p>
          <p className="text-xs text-muted-foreground">Class Average</p>
        </Card>
        <Card className="bg-sky-500/10 text-center p-4">
          <BarChart3 className="h-8 w-8 text-sky-500 mx-auto" />
          <p className="text-3xl font-bold text-sky-500">{students.length}</p>
          <p className="text-xs text-muted-foreground">Students</p>
        </Card>
        <Card className="bg-amber-500/10 text-center p-4">
          <SlidersHorizontal className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="text-3xl font-bold text-amber-500">
            {new Set(grades.map((g) => g.grade_type)).size}
          </p>
          <p className="text-xs text-muted-foreground">Grade Types</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tabValue} onValueChange={setTabValue} className="mb-4">
        <TabsList>
          <TabsTrigger value="student-grades">Student Grades</TabsTrigger>
          <TabsTrigger value="recent-activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="student-grades">
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Student</TableHead>
                  <TableHead>Enrollment #</TableHead>
                  <TableHead className="text-center">Grades Count</TableHead>
                  <TableHead className="text-center">Average</TableHead>
                  <TableHead className="text-center">Letter Grade</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {selectedClass ? 'No students found' : 'Select a class to view students'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => {
                    const avgStr = calculateStudentAverage(student.student_id);
                    const avg = avgStr ? parseFloat(avgStr) : null;
                    const studentGradeCount = grades.filter(
                      (g) => g.student_id === student.student_id
                    ).length;

                    return (
                      <TableRow key={student.student_id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-semibold">
                              {student.first_name?.[0]}
                              {student.last_name?.[0]}
                            </div>
                            <span className="font-semibold text-sm">
                              {student.first_name} {student.last_name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{student.enrollment_number}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={studentGradeCount > 0 ? 'default' : 'secondary'}>
                            {studentGradeCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {avg !== null ? (
                            <span
                              className="font-bold text-sm"
                              style={{ color: getGradeColor(avg) }}
                            >
                              {avg}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {avg !== null ? (
                            <span
                              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold"
                              style={{
                                backgroundColor: getGradeColor(avg) + '20',
                                color: getGradeColor(avg),
                              }}
                            >
                              {getLetterGrade(avg)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="p-1.5 rounded-md hover:bg-muted text-primary"
                                  onClick={() => handleOpenGradeDialog(student)}
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Add Grade</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="recent-activity">
          <div className="py-2">
            {grades.length === 0 ? (
              <div className="text-center py-8">
                <Star className="h-14 w-14 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">No grades recorded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {grades.slice(0, 10).map((grade, idx) => {
                  const student = students.find((s) => s.student_id === grade.student_id);
                  const subject = subjects.find((s) => s.subject_id === grade.subject_id);
                  const percentage = (grade.grade_value / grade.max_value) * 100;

                  return (
                    <Card key={grade.grade_id || idx} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: getGradeColor(percentage) }}
                          >
                            {getLetterGrade(percentage)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              {student
                                ? `${student.first_name} ${student.last_name}`
                                : `Student #${grade.student_id}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {subject?.subject_name || `Subject #${grade.subject_id}`} &bull; {grade.grade_type}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className="text-sm font-bold"
                            style={{ color: getGradeColor(percentage) }}
                          >
                            {grade.grade_value}/{grade.max_value}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {percentage.toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Grade Dialog */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add Grade for {selectedStudent?.first_name} {selectedStudent?.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!selectedSubject && (
              <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertDescription>
                  Please select a subject from the filters above before adding a grade
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label>Grade Type</Label>
              <select
                value={newGrade.grade_type}
                onChange={(e) =>
                  setNewGrade({ ...newGrade, grade_type: e.target.value })
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {gradeTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Score</Label>
                <Input
                  type="number"
                  value={newGrade.grade_value}
                  onChange={(e) =>
                    setNewGrade({
                      ...newGrade,
                      grade_value: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Max Score</Label>
                <Input
                  type="number"
                  value={newGrade.max_value}
                  onChange={(e) =>
                    setNewGrade({
                      ...newGrade,
                      max_value: parseFloat(e.target.value) || 100,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <textarea
                className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                value={newGrade.notes}
                onChange={(e) => setNewGrade({ ...newGrade, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveGrade}
              disabled={saving || !selectedSubject}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save Grade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast / Snackbar */}
      {snackbar.open && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4">
          <Alert
            className={cn(
              'w-auto min-w-[300px] shadow-lg',
              snackbar.severity === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            )}
          >
            <AlertDescription className="flex items-center justify-between gap-4">
              {snackbar.message}
              <button
                className="text-current opacity-70 hover:opacity-100"
                onClick={() => setSnackbar({ ...snackbar, open: false })}
              >
                ✕
              </button>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default TeacherGradesTab;
