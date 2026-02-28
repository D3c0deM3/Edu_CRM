import { useState, useEffect, useMemo } from 'react';
import { useCRUD } from '../hooks/useCRUD';
import { gradeAPI, teacherAPI, classAPI, studentAPI, subjectAPI } from '../../../shared/api/api';
import { termOptions } from '../../../utils/dropdownOptions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Plus,
  BookOpen,
  Users,
  User,
  Folder,
  Filter,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  GraduationCap,
  ClipboardList,
  BarChart2,
} from 'lucide-react';

interface Grade {
  grade_id?: number;
  id?: number;
  student_id: number;
  teacher_id: number;
  subject: string;
  class_id: number;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade_letter: string;
  academic_year: number;
  term: string;
}

interface Teacher {
  teacher_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  employee_id: string;
}

interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  class_code: string;
  level: number;
  section?: string;
  teacher_id?: number;
}

interface Student {
  student_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  enrollment_number?: string;
  class_id?: number;
  teacher_id?: number;
}

interface Subject {
  subject_id?: number;
  id?: number;
  subject_name: string;
  subject_code?: string;
  total_marks?: number;
  class_id?: number;
}

type PageMode = 'enter' | 'history';
type TabType = 'students' | 'classes' | 'teachers';
type FolderType = 'teacher' | 'class' | 'student';

const calcGrade = (marks: number, total: number): { percentage: number; letter: string } => {
  const pct = total > 0 ? (marks / total) * 100 : 0;
  let letter = 'F';
  if (pct >= 90) letter = 'A';
  else if (pct >= 80) letter = 'B';
  else if (pct >= 70) letter = 'C';
  else if (pct >= 60) letter = 'D';
  return { percentage: parseFloat(pct.toFixed(2)), letter };
};

const gradeChipClasses = (letter: string) => {
  switch (letter) {
    case 'A': return 'bg-green-100 text-green-800 border-green-300';
    case 'B': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'D': return 'bg-orange-100 text-orange-800 border-orange-300';
    default: return 'bg-red-100 text-red-800 border-red-300';
  }
};

const GradesPage = () => {
  const [state, actions] = useCRUD<Grade>(gradeAPI, 'Grade');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);

  // Page mode
  const [pageMode, setPageMode] = useState<PageMode>('enter');

  // --- ENTER GRADES STATE ---
  const [enterClassId, setEnterClassId] = useState<number | null>(null);
  const [enterSubject, setEnterSubject] = useState('');
  const [enterTerm, setEnterTerm] = useState('First');
  const [enterYear, setEnterYear] = useState(new Date().getFullYear());
  const [enterTeacherId, setEnterTeacherId] = useState<number | null>(null);
  const [enterTotalMarks, setEnterTotalMarks] = useState(100);
  // Per-student: { studentId: { marks: string (empty = not graded) } }
  const [studentMarks, setStudentMarks] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // --- HISTORY STATE ---
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [selectedFolder, setSelectedFolder] = useState<{ type: FolderType; id: number; name: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Grade>>({ total_marks: 100, academic_year: new Date().getFullYear(), term: 'First' });
  const [classOptions, setClassOptions] = useState<Array<{ id: number; label: string; value: number }>>([]);
  const [teacherOptions, setTeacherOptions] = useState<Array<{ id: number; label: string; value: number }>>([]);
  const [studentOptions, setStudentOptions] = useState<Array<{ id: number; label: string; value: number }>>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadAllData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async () => {
    setLoadingData(true);
    setIsLoadingOptions(true);
    try {
      const [teachersRes, classesRes, studentsRes, subjectsRes] = await Promise.all([
        teacherAPI.getAll(),
        classAPI.getAll(),
        studentAPI.getAll(),
        subjectAPI.getAll(),
      ]);
      const teacherList = Array.isArray(teachersRes.data || teachersRes) ? (teachersRes.data || teachersRes) : [];
      const classList = Array.isArray(classesRes.data || classesRes) ? (classesRes.data || classesRes) : [];
      const studentList = Array.isArray(studentsRes.data || studentsRes) ? (studentsRes.data || studentsRes) : [];
      const subjectList = Array.isArray(subjectsRes.data || subjectsRes) ? (subjectsRes.data || subjectsRes) : [];
      setTeachers(teacherList);
      setClasses(classList);
      setStudents(studentList);
      setAllSubjects(subjectList);
      setTeacherOptions(teacherList.map((t: any) => ({
        id: t.teacher_id || t.id,
        label: `${t.first_name} ${t.last_name}`,
        value: t.teacher_id || t.id,
      })));
      setClassOptions(classList.map((c: any) => ({
        id: c.class_id || c.id,
        label: `${c.class_name}${c.section ? ' - ' + c.section : ''} (Level ${c.level})`,
        value: c.class_id || c.id,
      })));
      setStudentOptions(studentList.map((s: any) => ({
        id: s.student_id || s.id,
        label: `${s.first_name} ${s.last_name}${s.enrollment_number ? ' (' + s.enrollment_number + ')' : ''}`,
        value: s.student_id || s.id,
      })));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
      setIsLoadingOptions(false);
    }
  };

  // Subjects for the selected class
  const classSubjects = useMemo(() => {
    if (!enterClassId) return [];
    return allSubjects.filter((s) => s.class_id === enterClassId);
  }, [enterClassId, allSubjects]);

  // Students for the selected class
  const classStudents = useMemo(() => {
    if (!enterClassId) return [];
    return students.filter((s) => s.class_id === enterClassId);
  }, [enterClassId, students]);

  // Track whether teacher was auto-detected from the class
  const [teacherAutoDetected, setTeacherAutoDetected] = useState(false);

  const handleClassChange = (classId: number) => {
    setEnterClassId(classId);
    setEnterSubject('');
    setStudentMarks({});
    // Always auto-fill the teacher attached to this class
    const cls = classes.find((c) => (c.class_id || c.id) === classId);
    if (cls?.teacher_id) {
      setEnterTeacherId(cls.teacher_id);
      setTeacherAutoDetected(true);
    } else {
      setEnterTeacherId(null);
      setTeacherAutoDetected(false);
    }
  };

  const setMark = (studentId: number, marks: string) => {
    setStudentMarks((prev) => ({ ...prev, [studentId]: marks }));
  };

  // Derived stats for Enter Grades
  const enterStats = useMemo(() => {
    const total = classStudents.length;
    const graded = Object.values(studentMarks).filter((m) => m !== '' && m !== undefined).length;
    const gradedData = Object.entries(studentMarks)
      .filter(([, m]) => m !== '' && m !== undefined && !isNaN(Number(m)))
      .map(([, m]) => calcGrade(Number(m), enterTotalMarks));
    const avgPct = gradedData.length > 0 ? gradedData.reduce((acc, g) => acc + g.percentage, 0) / gradedData.length : 0;
    return { total, graded, avgPct };
  }, [studentMarks, classStudents, enterTotalMarks]);

  const handleSubmitGrades = async () => {
    if (!enterClassId || !enterTeacherId || !enterSubject) return;
    const toSubmit = classStudents
      .filter((s) => {
        const sid = s.student_id || s.id || 0;
        const m = studentMarks[sid];
        return m !== '' && m !== undefined && !isNaN(Number(m));
      })
      .map((s) => {
        const sid = s.student_id || s.id || 0;
        const marks = Number(studentMarks[sid]);
        const { percentage, letter } = calcGrade(marks, enterTotalMarks);
        return {
          student_id: sid,
          teacher_id: enterTeacherId,
          subject: enterSubject,
          class_id: enterClassId,
          marks_obtained: marks,
          total_marks: enterTotalMarks,
          percentage,
          grade_letter: letter,
          academic_year: enterYear,
          term: enterTerm,
        };
      });
    if (toSubmit.length === 0) return;
    setIsSubmitting(true);
    try {
      await gradeAPI.bulkCreate(toSubmit);
      await actions.fetchAll();
      setStudentMarks({});
      setEnterClassId(null);
      setEnterTeacherId(null);
      setEnterSubject('');
    } catch (error) {
      console.error('Error submitting grades:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- HISTORY HELPERS ---
  const getStudentIdsForTeacher = (teacherId: number) =>
    students.filter((s) => s.teacher_id === teacherId).map((s) => s.student_id || s.id || 0);
  const getStudentIdsForClass = (classId: number) =>
    students.filter((s) => s.class_id === classId).map((s) => s.student_id || s.id || 0);
  const getGradeCountForTeacher = (teacherId: number) => {
    const ids = getStudentIdsForTeacher(teacherId);
    return state.items.filter((g) => ids.includes(g.student_id)).length;
  };
  const getGradeCountForClass = (classId: number) => {
    const ids = getStudentIdsForClass(classId);
    return state.items.filter((g) => ids.includes(g.student_id)).length;
  };
  const getAvgForClass = (classId: number) => {
    const ids = getStudentIdsForClass(classId);
    const grades = state.items.filter((g) => ids.includes(g.student_id));
    if (!grades.length) return 0;
    return grades.reduce((a, g) => a + (g.percentage || 0), 0) / grades.length;
  };
  const getGradeCountForStudent = (studentId: number) =>
    state.items.filter((g) => g.student_id === studentId).length;
  const getAvgForStudent = (studentId: number) => {
    const grades = state.items.filter((g) => g.student_id === studentId);
    if (!grades.length) return 0;
    return grades.reduce((a, g) => a + (g.percentage || 0), 0) / grades.length;
  };

  const getFilteredGrades = (): Grade[] => {
    if (!selectedFolder) return state.items;
    let ids: number[] = [];
    if (selectedFolder.type === 'teacher') ids = getStudentIdsForTeacher(selectedFolder.id);
    else if (selectedFolder.type === 'class') ids = getStudentIdsForClass(selectedFolder.id);
    else ids = [selectedFolder.id];
    return state.items.filter((g) => ids.includes(g.student_id));
  };

  const displayedGrades = useMemo(() => {
    let grades = getFilteredGrades();
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      grades = grades.filter((g) => {
        const student = students.find((s) => (s.student_id || s.id) === g.student_id);
        const name = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
        return name.includes(search) || (g.subject && g.subject.toLowerCase().includes(search));
      });
    }
    if (filterTerm) grades = grades.filter((g) => g.term === filterTerm);
    if (filterGrade) grades = grades.filter((g) => g.grade_letter === filterGrade);
    return grades;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterTerm, filterGrade, selectedFolder, state.items, students]);

  const hasActiveFilters = filterTerm || filterGrade || searchTerm;
  const clearFilters = () => { setSearchTerm(''); setFilterTerm(''); setFilterGrade(''); };

  const handleFolderClick = (type: FolderType, id: number, name: string) => { setSelectedFolder({ type, id, name }); clearFilters(); };
  const handleBackToFolders = () => { setSelectedFolder(null); clearFilters(); };

  const getStudentName = (studentId: number) => {
    const s = students.find((s) => (s.student_id || s.id) === studentId);
    return s ? `${s.first_name} ${s.last_name}` : 'Unknown Student';
  };

  const handleOpenModal = (grade?: Grade) => {
    if (grade) { setEditingId(grade.grade_id || grade.id || null); setFormData(grade); }
    else { setEditingId(null); setFormData({ total_marks: 100, academic_year: new Date().getFullYear(), term: 'First' }); }
    setIsModalOpen(true);
  };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingId(null); setFormData({ total_marks: 100, academic_year: new Date().getFullYear(), term: 'First' }); };
  const handleMarksChange = (marks: number) => {
    const { percentage, letter } = calcGrade(marks, formData.total_marks || 100);
    setFormData({ ...formData, marks_obtained: marks, percentage, grade_letter: letter });
  };
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) await actions.update(editingId, formData);
    else await actions.create(formData);
    handleCloseModal();
  };
  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this grade?')) await actions.delete(id);
  };

  const gradedCount = Object.values(studentMarks).filter((m) => m !== '' && !isNaN(Number(m))).length;

  return (
    <div className="container mx-auto p-6">
      {/* Header & Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Grades</h1>
        <div className="flex gap-2">
          <Button
            variant={pageMode === 'enter' ? 'default' : 'outline'}
            onClick={() => { setPageMode('enter'); setSelectedFolder(null); }}
            className="flex items-center gap-2"
          >
            <GraduationCap className="h-4 w-4" />
            Enter Grades
          </Button>
          <Button
            variant={pageMode === 'history' ? 'default' : 'outline'}
            onClick={() => setPageMode('history')}
            className="flex items-center gap-2"
          >
            <ClipboardList className="h-4 w-4" />
            View History
          </Button>
        </div>
      </div>

      {/* ===== ENTER GRADES ===== */}
      {pageMode === 'enter' && (
        <div className="space-y-6">
          {/* Session Selector */}
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Session Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Class */}
                <div className="space-y-1">
                  <Label>Class *</Label>
                  <Select value={enterClassId ? String(enterClassId) : ''} onValueChange={(v) => handleClassChange(Number(v))}>
                    <SelectTrigger><SelectValue placeholder={loadingData ? 'Loading...' : 'Select a class'} /></SelectTrigger>
                    <SelectContent>
                      {classOptions.map((o) => {
                        const cls = classes.find(c => (c.class_id || c.id) === o.value);
                        const teacher = cls?.teacher_id ? teachers.find(t => (t.teacher_id || t.id) === cls.teacher_id) : null;
                        return (
                          <SelectItem key={o.id} value={String(o.value)}>
                            {o.label}{teacher ? ` — ${teacher.first_name} ${teacher.last_name}` : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {/* Subject */}
                <div className="space-y-1">
                  <Label>Subject *</Label>
                  {classSubjects.length > 0 ? (
                    <Select value={enterSubject} onValueChange={setEnterSubject} disabled={!enterClassId}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {classSubjects.map((s) => (
                          <SelectItem key={s.subject_id || s.id} value={s.subject_name}>{s.subject_name}{s.subject_code ? ` (${s.subject_code})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder={enterClassId ? 'Type subject name' : 'Select a class first'}
                      value={enterSubject}
                      onChange={(e) => setEnterSubject(e.target.value)}
                      disabled={!enterClassId}
                    />
                  )}
                </div>
                {/* Teacher - auto-filled from class, shown as read-only info */}
                <div className="space-y-1">
                  <Label>Teacher {teacherAutoDetected && <span className="text-xs text-green-600 ml-1">(auto-detected from class)</span>}</Label>
                  {teacherAutoDetected && enterTeacherId ? (
                    <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      {teachers.find(t => (t.teacher_id || t.id) === enterTeacherId)
                        ? `${teachers.find(t => (t.teacher_id || t.id) === enterTeacherId)!.first_name} ${teachers.find(t => (t.teacher_id || t.id) === enterTeacherId)!.last_name}`
                        : 'Teacher'}
                    </div>
                  ) : (
                    <Select value={enterTeacherId ? String(enterTeacherId) : ''} onValueChange={(v) => setEnterTeacherId(Number(v))}>
                      <SelectTrigger><SelectValue placeholder={loadingData ? 'Loading...' : !enterClassId ? 'Select a class first' : 'No teacher assigned — select manually'} /></SelectTrigger>
                      <SelectContent>{teacherOptions.map((o) => <SelectItem key={o.id} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>
                {/* Term */}
                <div className="space-y-1">
                  <Label>Term *</Label>
                  <Select value={enterTerm} onValueChange={setEnterTerm}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{termOptions.map((o) => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {/* Academic Year */}
                <div className="space-y-1">
                  <Label>Academic Year *</Label>
                  <Input type="number" value={enterYear} onChange={(e) => setEnterYear(Number(e.target.value))} />
                </div>
                {/* Total Marks */}
                <div className="space-y-1">
                  <Label>Total Marks</Label>
                  <Input
                    type="number"
                    value={enterTotalMarks}
                    onChange={(e) => setEnterTotalMarks(Number(e.target.value))}
                    min={1}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          {enterClassId && classStudents.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4 flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div><p className="text-2xl font-bold">{enterStats.total}</p><p className="text-xs text-muted-foreground">Total Students</p></div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4 flex items-center gap-3">
                  <GraduationCap className="h-8 w-8 text-green-500" />
                  <div><p className="text-2xl font-bold">{enterStats.graded}</p><p className="text-xs text-muted-foreground">Graded</p></div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-purple-500">
                <CardContent className="p-4 flex items-center gap-3">
                  <BarChart2 className="h-8 w-8 text-purple-500" />
                  <div><p className="text-2xl font-bold">{enterStats.avgPct.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Class Average</p></div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Student Grades Table */}
          {!enterClassId ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <GraduationCap className="h-14 w-14 opacity-30" />
              <p className="text-lg font-medium">Select a class to enter grades</p>
              <p className="text-sm">All students in the class will be listed automatically</p>
            </div>
          ) : loadingData ? (
            <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" /><span>Loading students...</span>
            </div>
          ) : classStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Users className="h-12 w-12 opacity-30" />
              <p className="text-base font-medium">No students found in this class</p>
            </div>
          ) : (
            <>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead className="w-12 text-center">#</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="w-20 text-center text-xs">ID</TableHead>
                        <TableHead className="w-36">Marks / {enterTotalMarks}</TableHead>
                        <TableHead className="w-24 text-center">Percentage</TableHead>
                        <TableHead className="w-20 text-center">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classStudents.map((student, idx) => {
                        const sid = student.student_id || student.id || 0;
                        const marksRaw = studentMarks[sid] ?? '';
                        const marks = marksRaw !== '' && !isNaN(Number(marksRaw)) ? Number(marksRaw) : null;
                        const { percentage, letter } = marks !== null ? calcGrade(marks, enterTotalMarks) : { percentage: 0, letter: '' };
                        return (
                          <TableRow key={sid} className="hover:bg-muted/20">
                            <TableCell className="text-center text-muted-foreground text-sm">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium">{student.first_name} {student.last_name}</div>
                              {student.enrollment_number && <div className="text-xs text-muted-foreground">{student.enrollment_number}</div>}
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">{sid}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={enterTotalMarks}
                                step={0.5}
                                placeholder=""
                                value={marksRaw}
                                onChange={(e) => setMark(sid, e.target.value)}
                                className="h-8 text-sm w-28"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              {marks !== null ? (
                                <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                              ) : <span className="text-muted-foreground text-sm"></span>}
                            </TableCell>
                            <TableCell className="text-center">
                              {marks !== null ? (
                                <Badge variant="outline" className={`text-xs font-bold border min-w-[2rem] justify-center ${gradeChipClasses(letter)}`}>{letter}</Badge>
                              ) : <span className="text-muted-foreground text-sm"></span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="flex justify-between items-center pt-2">
                <p className="text-sm text-muted-foreground">
                  {gradedCount} of {classStudents.length} students graded
                  {!enterSubject && <span className="text-red-500 ml-2"> Select a subject to submit</span>}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setEnterClassId(null); setEnterTeacherId(null); setTeacherAutoDetected(false); setStudentMarks({}); setEnterSubject(''); }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitGrades}
                    disabled={isSubmitting || !enterTeacherId || !enterSubject || gradedCount === 0}
                    className="px-8"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                    ) : (
                      <><GraduationCap className="h-4 w-4 mr-2" />Save Grades ({gradedCount} students)</>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== HISTORY ===== */}
      {pageMode === 'history' && (
        <>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              {selectedFolder && (
                <Button variant="outline" size="sm" onClick={handleBackToFolders}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              )}
              <h2 className="text-lg font-semibold text-muted-foreground">
                {selectedFolder ? `Grades  ${selectedFolder.name}` : 'Browse by Student / Class / Teacher'}
              </h2>
            </div>
            <Button onClick={() => handleOpenModal()}><Plus className="h-4 w-4 mr-2" /> Add Grade</Button>
          </div>

          {!selectedFolder ? (
            <>
              <div className="border-b border-border mb-6">
                <div className="flex space-x-1">
                  <Button variant={activeTab === 'students' ? 'default' : 'ghost'} onClick={() => setActiveTab('students')} className="rounded-b-none"><Users className="h-4 w-4 mr-2" />By Students</Button>
                  <Button variant={activeTab === 'classes' ? 'default' : 'ghost'} onClick={() => setActiveTab('classes')} className="rounded-b-none"><BookOpen className="h-4 w-4 mr-2" />By Classes</Button>
                  <Button variant={activeTab === 'teachers' ? 'default' : 'ghost'} onClick={() => setActiveTab('teachers')} className="rounded-b-none"><User className="h-4 w-4 mr-2" />By Teachers</Button>
                </div>
              </div>
              {activeTab === 'students' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loadingData ? <div className="col-span-full text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
                    : students.length === 0 ? <div className="col-span-full text-center py-8 text-muted-foreground">No students found</div>
                    : students.map((student) => {
                      const sid = student.student_id || student.id || 0;
                      const count = getGradeCountForStudent(sid);
                      const avg = getAvgForStudent(sid);
                      return (
                        <Card key={sid} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleFolderClick('student', sid, `${student.first_name} ${student.last_name}`)}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3"><Folder className="h-9 w-9 text-primary" /></div>
                            <div className="space-y-1">
                              <h3 className="font-semibold">{student.first_name} {student.last_name}</h3>
                              <p className="text-sm text-muted-foreground">ID: {sid}</p>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground"><BookOpen className="h-3.5 w-3.5" /><span>{count} grades</span></div>
                              <span className="text-sm font-semibold text-blue-600">{avg.toFixed(1)}%</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
              {activeTab === 'classes' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loadingData ? <div className="col-span-full text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
                    : classes.length === 0 ? <div className="col-span-full text-center py-8 text-muted-foreground">No classes found</div>
                    : classes.map((cls) => {
                      const cid = cls.class_id || cls.id || 0;
                      const count = getGradeCountForClass(cid);
                      const avg = getAvgForClass(cid);
                      return (
                        <Card key={cid} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleFolderClick('class', cid, cls.class_name)}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3"><Folder className="h-9 w-9 text-primary" /></div>
                            <div className="space-y-1">
                              <h3 className="font-semibold">{cls.class_name}</h3>
                              <p className="text-sm text-muted-foreground">{cls.class_code}  Level {cls.level}</p>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground"><BookOpen className="h-3.5 w-3.5" /><span>{count} grades</span></div>
                              <span className="text-sm font-semibold text-blue-600">{avg.toFixed(1)}%</span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
              {activeTab === 'teachers' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loadingData ? <div className="col-span-full text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
                    : teachers.length === 0 ? <div className="col-span-full text-center py-8 text-muted-foreground">No teachers found</div>
                    : teachers.map((teacher) => {
                      const tid = teacher.teacher_id || teacher.id || 0;
                      const count = getGradeCountForTeacher(tid);
                      return (
                        <Card key={tid} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleFolderClick('teacher', tid, `${teacher.first_name} ${teacher.last_name}`)}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3"><Folder className="h-9 w-9 text-primary" /></div>
                            <div className="space-y-1">
                              <h3 className="font-semibold">{teacher.first_name} {teacher.last_name}</h3>
                              <p className="text-sm text-muted-foreground">{teacher.employee_id}</p>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-3.5 w-3.5" /><span>{getStudentIdsForTeacher(tid).length} students</span></div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground"><BookOpen className="h-3.5 w-3.5" /><span>{count} grades</span></div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="text" placeholder="Search by student or subject..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                  {searchTerm && <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setSearchTerm('')}><X className="h-4 w-4" /></Button>}
                </div>
                <Button variant={showFilters ? 'default' : 'outline'} onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4 mr-2" />Filters
                  {hasActiveFilters && <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">{(filterTerm ? 1 : 0) + (filterGrade ? 1 : 0)}</span>}
                </Button>
                {hasActiveFilters && <Button variant="outline" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-2" />Clear</Button>}
                <div className="text-sm text-muted-foreground flex items-center">{displayedGrades.length} grades</div>
              </div>
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg mb-6">
                  <div className="space-y-2">
                    <Label>Term</Label>
                    <Select value={filterTerm} onValueChange={setFilterTerm}>
                      <SelectTrigger><SelectValue placeholder="All Terms" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Terms</SelectItem>
                        {termOptions.map((o) => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Grade Letter</Label>
                    <Select value={filterGrade} onValueChange={setFilterGrade}>
                      <SelectTrigger><SelectValue placeholder="All Grades" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Grades</SelectItem>
                        {['A','B','C','D','F'].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead><TableHead>Subject</TableHead><TableHead>Marks</TableHead><TableHead>Percentage</TableHead><TableHead>Grade</TableHead><TableHead>Term</TableHead><TableHead>Year</TableHead><TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.loading ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-6">Loading...</TableCell></TableRow>
                    ) : displayedGrades.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">{hasActiveFilters ? 'No grades match criteria' : 'No grades found'}</TableCell></TableRow>
                    ) : displayedGrades.map((grade) => (
                      <TableRow key={grade.grade_id || grade.id}>
                        <TableCell>{getStudentName(grade.student_id)}</TableCell>
                        <TableCell>{grade.subject}</TableCell>
                        <TableCell>{grade.marks_obtained}/{grade.total_marks}</TableCell>
                        <TableCell>{(Number(grade.percentage) || 0).toFixed(1)}%</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs font-bold border min-w-[2.5rem] justify-center ${gradeChipClasses(grade.grade_letter)}`}>{grade.grade_letter}</Badge>
                        </TableCell>
                        <TableCell>{grade.term}</TableCell>
                        <TableCell>{grade.academic_year}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(grade)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(grade.grade_id || grade.id || 0)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      )}

      {/* Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Edit Grade' : 'Add Grade'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Student *</Label>
                <Select value={formData.student_id ? String(formData.student_id) : ''} onValueChange={(v) => {
                  const studentId = Number(v);
                  const student = students.find(s => (s.student_id || s.id) === studentId);
                  const newFormData: Partial<Grade> = { ...formData, student_id: studentId };
                  // Auto-fill class from student
                  if (student?.class_id) {
                    newFormData.class_id = student.class_id;
                    // Auto-fill teacher from class
                    const cls = classes.find(c => (c.class_id || c.id) === student.class_id);
                    if (cls?.teacher_id) {
                      newFormData.teacher_id = cls.teacher_id;
                    }
                  }
                  setFormData(newFormData);
                }}>
                  <SelectTrigger><SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select student'} /></SelectTrigger>
                  <SelectContent>{studentOptions.map((o) => <SelectItem key={o.id} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Class {formData.student_id && formData.class_id && <span className="text-xs text-green-600 ml-1">(from student)</span>}</Label>
                {(() => {
                  const cls = formData.class_id ? classes.find(c => (c.class_id || c.id) === formData.class_id) : null;
                  return cls ? (
                    <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                      <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                      {cls.class_name}{cls.section ? ` - ${cls.section}` : ''} (Level {cls.level})
                    </div>
                  ) : (
                    <Select value={formData.class_id ? String(formData.class_id) : ''} onValueChange={(v) => {
                      const classId = Number(v);
                      const selectedCls = classes.find(c => (c.class_id || c.id) === classId);
                      const newFormData: Partial<Grade> = { ...formData, class_id: classId };
                      if (selectedCls?.teacher_id) newFormData.teacher_id = selectedCls.teacher_id;
                      setFormData(newFormData);
                    }}>
                      <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                      <SelectContent>{classOptions.map((o) => <SelectItem key={o.id} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  );
                })()}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject *</Label>
                {(() => {
                  const modalSubjects = formData.class_id ? allSubjects.filter(s => s.class_id === formData.class_id) : [];
                  return modalSubjects.length > 0 ? (
                    <Select value={formData.subject || ''} onValueChange={(v) => setFormData({ ...formData, subject: v })}>
                      <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                      <SelectContent>
                        {modalSubjects.map((s) => (
                          <SelectItem key={s.subject_id || s.id} value={s.subject_name}>{s.subject_name}{s.subject_code ? ` (${s.subject_code})` : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input placeholder="Subject name" value={formData.subject || ''} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required />
                  );
                })()}
              </div>
              <div className="space-y-2">
                <Label>Teacher {formData.teacher_id && formData.class_id && <span className="text-xs text-green-600 ml-1">(from class)</span>}</Label>
                {(() => {
                  const teacher = formData.teacher_id ? teachers.find(t => (t.teacher_id || t.id) === formData.teacher_id) : null;
                  return teacher && formData.class_id ? (
                    <div className="flex items-center h-9 px-3 rounded-md border bg-muted text-sm">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      {teacher.first_name} {teacher.last_name}
                    </div>
                  ) : (
                    <Select value={formData.teacher_id ? String(formData.teacher_id) : ''} onValueChange={(v) => setFormData({ ...formData, teacher_id: Number(v) })}>
                      <SelectTrigger><SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select teacher'} /></SelectTrigger>
                      <SelectContent>{teacherOptions.map((o) => <SelectItem key={o.id} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  );
                })()}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marks Obtained *</Label>
                <Input type="number" step={0.1} required value={formData.marks_obtained || ''} onChange={(e) => handleMarksChange(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>Total Marks</Label>
                <Input type="number" value={formData.total_marks || 100} onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Percentage</Label>
                <Input type="number" step={0.1} value={formData.percentage || 0} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Grade Letter</Label>
                <Input type="text" value={formData.grade_letter || 'F'} disabled className="bg-muted" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Academic Year *</Label>
                <Input type="number" required value={formData.academic_year || new Date().getFullYear()} onChange={(e) => setFormData({ ...formData, academic_year: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Term *</Label>
                <Select value={formData.term || 'First'} onValueChange={(v) => setFormData({ ...formData, term: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{termOptions.map((o) => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" disabled={state.loading} onClick={handleSubmitEdit}>{state.loading ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GradesPage;
