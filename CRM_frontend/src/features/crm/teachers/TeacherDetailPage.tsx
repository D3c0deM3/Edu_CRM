import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teacherAPI, classAPI, studentAPI, gradeAPI, subjectAPI, assignmentAPI } from '../../../shared/api/api';
import { AssignmentSectionTeacher } from './components/AssignmentSectionTeacher';
import { showToast } from '../../../utils/toast';
import {
  ArrowLeft,
  X,
  Plus,
  Mail,
  Phone,
  GraduationCap,
  BadgeCheck,
  Calendar,
  ChevronDown,
  User,
  BookOpen,
  ClipboardList,
  FileQuestion,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface Subject {
  subject_id?: number;
  id?: number;
  subject_name: string;
}

interface Teacher {
  teacher_id?: number;
  id?: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  qualification: string;
  specialization: string;
  status: string;
}

interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  teacher_id?: number;
  level: string;
  section?: string;
}

interface Student {
  student_id?: number;
  id?: number;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  class_id: number;
  email: string;
  phone: string;
  status: string;
}

interface Assignment {
  assignment_id?: number;
  id?: number;
  class_id?: number;
  assignment_title: string;
  due_date: string;
  status: string;
  grade?: number;
}

interface GradeEntry {
  student_id: number;
  percentage: number;
  grade_letter: string;
}

const TeacherDetailPage = () => {
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedTerm, setSelectedTerm] = useState('Q1');
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([]);
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [tabValue, setTabValue] = useState('info');
  const [expandedClassIds, setExpandedClassIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadTeacherDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  const loadTeacherDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch teacher details
      const teacherResponse = await teacherAPI.getById(Number(teacherId));
      const teacherData = teacherResponse.data || teacherResponse;
      setTeacher(teacherData);

      // Fetch all classes, students, subjects and assignments
      const [classesRes, studentsRes, subjectsRes, assignmentRes] = await Promise.all([
        classAPI.getAll(),
        studentAPI.getAll(),
        subjectAPI.getAll(),
        assignmentAPI.getAll(),
      ]);

      const classesData = classesRes.data || classesRes;
      const studentsData = studentsRes.data || studentsRes;
      const subjectsData = subjectsRes.data || subjectsRes;
      const assignmentData = assignmentRes.data || assignmentRes;

      // Filter classes taught by this teacher
      const teacherIdNum = Number(teacherId);
      const teacherClasses = Array.isArray(classesData)
        ? classesData.filter((c: Record<string, unknown>) => (c.teacher_id || c.class_id === teacherIdNum))
        : [];
      setClasses(teacherClasses);

      // Get all students
      const allStudents = Array.isArray(studentsData) ? studentsData : [];
      setStudents(allStudents);

      // Get all subjects
      const allSubjects = Array.isArray(subjectsData) ? subjectsData : [];
      setSubjects(allSubjects);

      // Get assignments where class_id equals teacher_id
      const teacherAssignments = Array.isArray(assignmentData)
        ? assignmentData.filter((a: Record<string, unknown>) => Number(a.class_id) === teacherIdNum)
        : [];
      setAssignments(teacherAssignments);
    } catch (err) {
      console.error('Error loading teacher details:', err);
      setError('Failed to load teacher details');
    } finally {
      setLoading(false);
    }
  };

  const getStudentsByClass = (classId: number | undefined) => {
    if (!classId) return [];
    return students.filter((s) => s.class_id === classId);
  };

  const calculateGradeLetter = (percentage: number): string => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const handleOpenGradeModal = () => {
    setSelectedClassId(null);
    setSelectedSubjectId(null);
    setSelectedTerm('Q1');
    setGradeEntries([]);
    setIsGradeModalOpen(true);
  };

  const handleCloseGradeModal = () => {
    setIsGradeModalOpen(false);
    setSelectedClassId(null);
    setSelectedSubjectId(null);
    setGradeEntries([]);
  };

  const handleClassSelect = (classId: number) => {
    setSelectedClassId(classId);
    const classStudents = getStudentsByClass(classId);
    setGradeEntries(
      classStudents.map((s) => ({
        student_id: s.student_id || s.id || 0,
        percentage: 0,
        grade_letter: 'F',
      }))
    );
  };

  const handlePercentageChange = (index: number, percentage: number) => {
    const newEntries = [...gradeEntries];
    newEntries[index].percentage = percentage;
    newEntries[index].grade_letter = calculateGradeLetter(percentage);
    setGradeEntries(newEntries);
  };

  const handleSaveGrades = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      showToast.error('Please select class and subject');
      return;
    }

    setIsSavingGrades(true);
    try {
      const teacherIdNum = Number(teacherId);
      const subjectIdNum = Number(selectedSubjectId);
      // Save grades for all students
      const gradePromises = gradeEntries.map((entry) =>
        gradeAPI.create({
          student_id: entry.student_id,
          teacher_id: teacherIdNum,
          subject: subjectIdNum,
          percentage: entry.percentage,
          grade_letter: entry.grade_letter,
          term: selectedTerm,
        })
      );

      await Promise.all(gradePromises);
      showToast.success('Grades saved successfully');
      handleCloseGradeModal();
      loadTeacherDetails();
    } catch (error: unknown) {
      const err = error as { message?: string };
      showToast.error(err.message || 'Failed to save grades');
    } finally {
      setIsSavingGrades(false);
    }
  };

  const toggleClassExpanded = (classId: number) => {
    setExpandedClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="p-6 text-center">
        <Alert variant="destructive">
          <AlertDescription>Teacher not found</AlertDescription>
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/teachers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Teachers
        </Button>
      </div>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getStatusClasses = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-300';
      case 'on leave': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getGradeBadgeClasses = (letter: string) => {
    switch (letter) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-sky-100 text-sky-800';
      case 'D': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          className="rounded-lg"
          onClick={() => navigate('/teachers')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold flex-grow">Teacher Details</h1>
        <Button
          className="bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg"
          onClick={handleOpenGradeModal}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Grades
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Teacher Profile Card */}
      <Card className="mb-6 rounded-2xl overflow-hidden shadow-lg border-0">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 p-8 flex items-center gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold text-white bg-white/20 border-4 border-white/40 shrink-0">
            {getInitials(teacher.first_name, teacher.last_name)}
          </div>
          <div className="flex-grow">
            <h2 className="text-3xl font-bold text-white">
              {teacher.first_name} {teacher.last_name}
            </h2>
            <p className="text-white/80 mt-1">{teacher.specialization}</p>
            <div className="flex gap-2 mt-3">
              <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border', getStatusClasses(teacher.status))}>
                {teacher.status}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border border-white/50 text-white bg-white/10">
                {teacher.employee_id}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold text-white bg-white/20">
              <BookOpen className="h-4 w-4" />
              {classes.length} Classes
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold text-white bg-white/20">
              <User className="h-4 w-4" />
              {students.filter(s => classes.some(c => (c.class_id || c.id) === s.class_id)).length} Students
            </span>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <Card className="rounded-2xl overflow-hidden">
        <Tabs value={tabValue} onValueChange={setTabValue}>
          <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-14 px-2">
            <TabsTrigger value="info" className="gap-2 text-base font-semibold data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none">
              <User className="h-4 w-4" />
              Information
            </TabsTrigger>
            <TabsTrigger value="classes" className="gap-2 text-base font-semibold data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none">
              <BookOpen className="h-4 w-4" />
              Classes & Students
            </TabsTrigger>
            <TabsTrigger value="assignments" className="gap-2 text-base font-semibold data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none">
              <ClipboardList className="h-4 w-4" />
              Assignments
            </TabsTrigger>
            <TabsTrigger value="tests" className="gap-2 text-base font-semibold data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 rounded-none">
              <FileQuestion className="h-4 w-4" />
              Tests
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            {/* Tab: Information */}
            <TabsContent value="info">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border rounded-lg h-full">
                  <CardHeader>
                    <CardTitle className="text-indigo-600">Contact Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="text-sm">{teacher.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="text-sm">{teacher.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date of Birth</p>
                        <p className="text-sm">
                          {teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border rounded-lg h-full">
                  <CardHeader>
                    <CardTitle className="text-indigo-600">Professional Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <BadgeCheck className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Employee ID</p>
                        <p className="text-sm">{teacher.employee_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Qualification</p>
                        <p className="text-sm">{teacher.qualification}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <GraduationCap className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Specialization</p>
                        <p className="text-sm">{teacher.specialization}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Tab: Classes & Students */}
            <TabsContent value="classes">
              {classes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-16 w-16 mx-auto opacity-30 mb-4" />
                  <h3 className="text-lg font-semibold">No classes assigned to this teacher</h3>
                </div>
              ) : (
                <div className="space-y-3">
                  {classes.map((classItem) => {
                    const classId = classItem.class_id || classItem.id || 0;
                    const classStudents = getStudentsByClass(classId);
                    const isExpanded = expandedClassIds.has(classId);
                    return (
                      <div
                        key={classId}
                        className="rounded-xl border shadow-sm overflow-hidden"
                      >
                        {/* Accordion Header */}
                        <button
                          type="button"
                          onClick={() => toggleClassExpanded(classId)}
                          className="w-full flex items-center gap-4 p-4 bg-indigo-50/60 hover:bg-indigo-50 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <div className="flex-grow">
                            <h3 className="text-lg font-semibold">{classItem.class_name}</h3>
                            <p className="text-sm text-muted-foreground">Level: {classItem.level || 'N/A'}</p>
                          </div>
                          <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100 font-semibold">
                            {classStudents.length} Students
                          </Badge>
                          <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
                        </button>
                        {/* Accordion Content */}
                        {isExpanded && (
                          <div>
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-indigo-50/50">
                                  <TableHead className="font-semibold">Enrollment #</TableHead>
                                  <TableHead className="font-semibold">Name</TableHead>
                                  <TableHead className="font-semibold">Email</TableHead>
                                  <TableHead className="font-semibold">Phone</TableHead>
                                  <TableHead className="font-semibold">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {classStudents.length === 0 ? (
                                  <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6">
                                      No students in this class
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  classStudents.map((student) => (
                                    <TableRow key={student.student_id || student.id} className="hover:bg-muted/50">
                                      <TableCell>{student.enrollment_number}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-2">
                                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">
                                            {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                          </div>
                                          {student.first_name} {student.last_name}
                                        </div>
                                      </TableCell>
                                      <TableCell>{student.email}</TableCell>
                                      <TableCell>{student.phone}</TableCell>
                                      <TableCell>
                                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border', getStatusClasses(student.status))}>
                                          {student.status}
                                        </span>
                                      </TableCell>
                                    </TableRow>
                                  ))
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Tab: Assignments */}
            <TabsContent value="assignments">
              <AssignmentSectionTeacher
                assignments={assignments}
                teacherId={teacher?.teacher_id || teacher?.id}
                onRefresh={loadTeacherDetails}
              />
            </TabsContent>

            {/* Tab: Tests */}
            <TabsContent value="tests">
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Tests Management</h3>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="rounded-lg"
                      onClick={() => navigate('/tests')}
                    >
                      <FileQuestion className="mr-2 h-4 w-4" />
                      View All Tests
                    </Button>
                    <Button
                      className="bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg"
                      onClick={() => navigate('/tests/create')}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create New Test
                    </Button>
                  </div>
                </div>
                <Alert className="rounded-lg border-blue-200 bg-blue-50 text-blue-800">
                  <AlertDescription>
                    Navigate to the Tests section to create, assign, and manage tests for your classes and students.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      {/* Grade Modal */}
      <Dialog open={isGradeModalOpen} onOpenChange={(open) => { if (!open) handleCloseGradeModal(); }}>
        <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-br from-indigo-500 to-purple-500 p-6">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white text-lg font-semibold">
                Add Grades to Students
              </DialogTitle>
              <button onClick={handleCloseGradeModal} className="text-white hover:text-white/80">
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Select Class</Label>
                <Select value={String(selectedClassId || '')} onValueChange={(value) => handleClassSelect(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.class_id || cls.id} value={String(cls.class_id || cls.id)}>
                        {cls.class_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Subject</Label>
                <Select value={String(selectedSubjectId || '')} onValueChange={(value) => setSelectedSubjectId(Number(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.subject_id || subject.id} value={String(subject.subject_id || subject.id)}>
                        {subject.subject_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Select Term</Label>
                <Select value={selectedTerm} onValueChange={(value) => setSelectedTerm(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Q1">Q1</SelectItem>
                    <SelectItem value="Q2">Q2</SelectItem>
                    <SelectItem value="Q3">Q3</SelectItem>
                    <SelectItem value="Q4">Q4</SelectItem>
                    <SelectItem value="Semester 1">Semester 1</SelectItem>
                    <SelectItem value="Semester 2">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedClassId && gradeEntries.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3">Enter Grades for Students</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-indigo-50/50">
                        <TableHead className="font-semibold">Enrollment #</TableHead>
                        <TableHead className="font-semibold">Student Name</TableHead>
                        <TableHead className="font-semibold">Percentage</TableHead>
                        <TableHead className="font-semibold">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeEntries.map((entry, index) => {
                        const student = students.find((s) => (s.student_id || s.id) === entry.student_id);
                        return (
                          <TableRow key={entry.student_id} className="hover:bg-muted/50">
                            <TableCell>{student?.enrollment_number}</TableCell>
                            <TableCell>{student?.first_name} {student?.last_name}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={entry.percentage}
                                onChange={(e) => handlePercentageChange(index, Number(e.target.value))}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <span className={cn('inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold min-w-[2.5rem]', getGradeBadgeClasses(entry.grade_letter))}>
                                {entry.grade_letter}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 pt-0">
            <Button variant="outline" className="rounded-lg" onClick={handleCloseGradeModal}>
              Cancel
            </Button>
            <Button
              className="bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white rounded-lg px-8"
              onClick={handleSaveGrades}
              disabled={isSavingGrades || !selectedClassId || !selectedSubjectId || gradeEntries.length === 0}
            >
              {isSavingGrades ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Grades'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDetailPage;
