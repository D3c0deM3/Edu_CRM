import { useState, useEffect, useMemo } from 'react';
import { useCRUD } from '../hooks/useCRUD';
import { useAppSelector } from '../hooks';
import { attendanceAPI, teacherAPI, classAPI, studentAPI } from '../../../shared/api/api';
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
import { Textarea } from '@/components/ui/textarea';
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
  CheckCircle,
  Filter,
  Search,
  Pencil,
  Trash2,
  X,
  Loader2,
  CalendarCheck,
  ClipboardList,
  UserCheck,
  UserX,
  Clock,
} from 'lucide-react';
import TeacherAttendanceTab from '../../teacher/components/TeacherAttendanceTab';
import type { RootState } from '../../../store';

interface Attendance {
  attendance_id?: number;
  id?: number;
  student_id: number;
  teacher_id: number;
  class_id: number;
  attendance_date: string;
  status: string;
  remarks?: string;
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

type PageMode = 'take' | 'history';
type TabType = 'students' | 'classes' | 'teachers';
type FolderType = 'teacher' | 'class' | 'student';

const STATUS_OPTIONS = [
  { value: 'Present', label: 'Present', color: 'bg-green-500 hover:bg-green-600 text-white', activeColor: 'ring-2 ring-green-600 ring-offset-1' },
  { value: 'Absent', label: 'Absent', color: 'bg-red-500 hover:bg-red-600 text-white', activeColor: 'ring-2 ring-red-600 ring-offset-1' },
  { value: 'Late', label: 'Late', color: 'bg-yellow-500 hover:bg-yellow-600 text-white', activeColor: 'ring-2 ring-yellow-600 ring-offset-1' },
  { value: 'Half Day', label: 'Half Day', color: 'bg-orange-400 hover:bg-orange-500 text-white', activeColor: 'ring-2 ring-orange-500 ring-offset-1' },
];

const todayISO = () => new Date().toISOString().split('T')[0];

const AttendancePage = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const [state, actions] = useCRUD<Attendance>(attendanceAPI, 'Attendance');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Page mode
  const [pageMode, setPageMode] = useState<PageMode>('take');

  // --- TAKE ATTENDANCE STATE ---
  const [takeClassId, setTakeClassId] = useState<number | null>(null);
  const [takeDate, setTakeDate] = useState(todayISO());
  const [takeTeacherId, setTakeTeacherId] = useState<number | null>(null);
  const [studentStatuses, setStudentStatuses] = useState<Record<number, { status: string; remarks: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // --- HISTORY STATE ---
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [selectedFolder, setSelectedFolder] = useState<{ type: FolderType; id: number; name: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Attendance>>({ status: 'Present' });
  const [classOptions, setClassOptions] = useState<Array<{ id: number; label: string; value: number }>>([]);
  const [teacherOptions, setTeacherOptions] = useState<Array<{ id: number; label: string; value: number }>>([]);
  const [studentOptions, setStudentOptions] = useState<Array<{ id: number; label: string; value: number }>>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
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
      const [teachersRes, classesRes, studentsRes] = await Promise.all([
        teacherAPI.getAll(),
        classAPI.getAll(),
        studentAPI.getAll(),
      ]);
      const teacherList = Array.isArray(teachersRes.data || teachersRes) ? (teachersRes.data || teachersRes) : [];
      const classList = Array.isArray(classesRes.data || classesRes) ? (classesRes.data || classesRes) : [];
      const studentList = Array.isArray(studentsRes.data || studentsRes) ? (studentsRes.data || studentsRes) : [];
      setTeachers(teacherList);
      setClasses(classList);
      setStudents(studentList);
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

  const classStudents = useMemo(() => {
    if (!takeClassId) return [];
    return students.filter((s) => s.class_id === takeClassId);
  }, [takeClassId, students]);

  const handleClassChange = (classId: number) => {
    setTakeClassId(classId);
    const cls = classes.find((c) => (c.class_id || c.id) === classId);
    if (cls?.teacher_id && !takeTeacherId) {
      setTakeTeacherId(cls.teacher_id);
    }
    const newStatuses: Record<number, { status: string; remarks: string }> = {};
    const clsStudents = students.filter((s) => s.class_id === classId);
    clsStudents.forEach((s) => {
      const sid = s.student_id || s.id || 0;
      newStatuses[sid] = { status: 'Present', remarks: '' };
    });
    setStudentStatuses(newStatuses);
  };

  const setStatus = (studentId: number, status: string) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
  };

  const setRemarks = (studentId: number, remarks: string) => {
    setStudentStatuses((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], remarks },
    }));
  };

  const takeStats = useMemo(() => {
    const total = classStudents.length;
    const present = Object.values(studentStatuses).filter((s) => s.status === 'Present').length;
    const absent = Object.values(studentStatuses).filter((s) => s.status === 'Absent').length;
    const late = Object.values(studentStatuses).filter((s) => s.status === 'Late').length;
    const halfDay = Object.values(studentStatuses).filter((s) => s.status === 'Half Day').length;
    return { total, present, absent, late, halfDay };
  }, [studentStatuses, classStudents]);

  const handleSubmitAttendance = async () => {
    if (!takeClassId || !takeTeacherId || !takeDate) return;
    setIsSubmitting(true);
    try {
      const records = classStudents.map((s) => {
        const sid = s.student_id || s.id || 0;
        const statusData = studentStatuses[sid] || { status: 'Present', remarks: '' };
        return {
          student_id: sid,
          teacher_id: takeTeacherId,
          class_id: takeClassId,
          attendance_date: takeDate,
          status: statusData.status,
          remarks: statusData.remarks || null,
        };
      });
      await attendanceAPI.bulkCreate(records);
      await actions.fetchAll();
      setStudentStatuses({});
      setTakeClassId(null);
      setTakeTeacherId(null);
      setTakeDate(todayISO());
    } catch (error) {
      console.error('Error submitting attendance:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStudentIdsForTeacher = (teacherId: number) =>
    students.filter((s) => s.teacher_id === teacherId).map((s) => s.student_id || s.id || 0);
  const getStudentIdsForClass = (classId: number) =>
    students.filter((s) => s.class_id === classId).map((s) => s.student_id || s.id || 0);
  const getAttendanceCountForTeacher = (teacherId: number) => {
    const ids = getStudentIdsForTeacher(teacherId);
    return state.items.filter((a) => ids.includes(a.student_id)).length;
  };
  const getAttendanceCountForClass = (classId: number) => {
    const ids = getStudentIdsForClass(classId);
    return state.items.filter((a) => ids.includes(a.student_id)).length;
  };
  const getPresentCountForClass = (classId: number) => {
    const ids = getStudentIdsForClass(classId);
    return state.items.filter((a) => ids.includes(a.student_id) && a.status === 'Present').length;
  };
  const getAttendanceCountForStudent = (studentId: number) =>
    state.items.filter((a) => a.student_id === studentId).length;
  const getPresentCountForStudent = (studentId: number) =>
    state.items.filter((a) => a.student_id === studentId && a.status === 'Present').length;

  const getFilteredAttendance = (): Attendance[] => {
    if (!selectedFolder) return state.items;
    let ids: number[] = [];
    if (selectedFolder.type === 'teacher') ids = getStudentIdsForTeacher(selectedFolder.id);
    else if (selectedFolder.type === 'class') ids = getStudentIdsForClass(selectedFolder.id);
    else ids = [selectedFolder.id];
    return state.items.filter((a) => ids.includes(a.student_id));
  };

  const displayedAttendance = useMemo(() => {
    let records = getFilteredAttendance();
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      records = records.filter((a) => {
        const student = students.find((s) => (s.student_id || s.id) === a.student_id);
        const name = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
        return name.includes(search);
      });
    }
    if (filterStatus) records = records.filter((a) => a.status === filterStatus);
    if (filterDate) {
      records = records.filter((a) => new Date(a.attendance_date).toISOString().split('T')[0] === filterDate);
    }
    return records;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterStatus, filterDate, selectedFolder, state.items, students]);

  const hasActiveFilters = filterStatus || filterDate || searchTerm;
  const clearFilters = () => { setSearchTerm(''); setFilterStatus(''); setFilterDate(''); };

  const handleFolderClick = (type: FolderType, id: number, name: string) => {
    setSelectedFolder({ type, id, name });
    clearFilters();
  };
  const handleBackToFolders = () => { setSelectedFolder(null); clearFilters(); };

  const getStudentName = (studentId: number) => {
    const s = students.find((s) => (s.student_id || s.id) === studentId);
    return s ? `${s.first_name} ${s.last_name}` : 'Unknown Student';
  };

  const handleOpenModal = (attendance?: Attendance) => {
    if (attendance) {
      setEditingId(attendance.attendance_id || attendance.id || null);
      setFormData(attendance);
    } else {
      setEditingId(null);
      setFormData({ status: 'Present' });
    }
    setIsModalOpen(true);
  };
  const handleCloseModal = () => { setIsModalOpen(false); setEditingId(null); setFormData({ status: 'Present' }); };
  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) await actions.update(editingId, formData);
    else await actions.create(formData);
    handleCloseModal();
  };
  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this attendance record?')) await actions.delete(id);
  };

  const getStatusBadgeClasses = (status: string): string => {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-800 border-green-200';
      case 'Absent': return 'bg-red-100 text-red-800 border-red-200';
      case 'Late': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Half Day': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6">
      {user?.userType === 'teacher' && (
        <div className="mb-8">
          <TeacherAttendanceTab teacherId={user.id} showManualSection={false} />
        </div>
      )}

      {/* Page Header & Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <div className="flex gap-2">
          <Button
            variant={pageMode === 'take' ? 'default' : 'outline'}
            onClick={() => { setPageMode('take'); setSelectedFolder(null); }}
            className="flex items-center gap-2"
          >
            <CalendarCheck className="h-4 w-4" />
            Take Attendance
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

      {/* ===== TAKE ATTENDANCE ===== */}
      {pageMode === 'take' && (
        <div className="space-y-6">
          {/* Session Selector */}
          <Card>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">Select Session</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Class *</Label>
                  <Select value={takeClassId ? String(takeClassId) : ''} onValueChange={(v) => handleClassChange(Number(v))}>
                    <SelectTrigger><SelectValue placeholder={loadingData ? 'Loading...' : 'Select a class'} /></SelectTrigger>
                    <SelectContent>{classOptions.map((o) => <SelectItem key={o.id} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Date *</Label>
                  <Input type="date" value={takeDate} onChange={(e) => setTakeDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Teacher *</Label>
                  <Select value={takeTeacherId ? String(takeTeacherId) : ''} onValueChange={(v) => setTakeTeacherId(Number(v))}>
                    <SelectTrigger><SelectValue placeholder={loadingData ? 'Loading...' : 'Select a teacher'} /></SelectTrigger>
                    <SelectContent>{teacherOptions.map((o) => <SelectItem key={o.id} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats row */}
          {takeClassId && classStudents.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="p-4 flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div><p className="text-2xl font-bold">{takeStats.total}</p><p className="text-xs text-muted-foreground">Total Students</p></div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="p-4 flex items-center gap-3">
                  <UserCheck className="h-8 w-8 text-green-500" />
                  <div><p className="text-2xl font-bold">{takeStats.present}</p><p className="text-xs text-muted-foreground">Present</p></div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-red-500">
                <CardContent className="p-4 flex items-center gap-3">
                  <UserX className="h-8 w-8 text-red-500" />
                  <div><p className="text-2xl font-bold">{takeStats.absent}</p><p className="text-xs text-muted-foreground">Absent</p></div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="p-4 flex items-center gap-3">
                  <Clock className="h-8 w-8 text-yellow-500" />
                  <div><p className="text-2xl font-bold">{takeStats.late + takeStats.halfDay}</p><p className="text-xs text-muted-foreground">Late / Half Day</p></div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Student list */}
          {!takeClassId ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <CalendarCheck className="h-14 w-14 opacity-30" />
              <p className="text-lg font-medium">Select a class to take attendance</p>
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
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Note (optional)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {classStudents.map((student, idx) => {
                        const sid = student.student_id || student.id || 0;
                        const current = studentStatuses[sid] || { status: 'Present', remarks: '' };
                        return (
                          <TableRow key={sid} className="hover:bg-muted/20">
                            <TableCell className="text-center text-muted-foreground text-sm">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium">{student.first_name} {student.last_name}</div>
                              {student.enrollment_number && <div className="text-xs text-muted-foreground">{student.enrollment_number}</div>}
                            </TableCell>
                            <TableCell className="text-center text-sm text-muted-foreground">{sid}</TableCell>
                            <TableCell>
                              <div className="flex gap-1.5 justify-center flex-wrap">
                                {STATUS_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setStatus(sid, opt.value)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 select-none ${opt.color} ${current.status === opt.value ? opt.activeColor + ' scale-105 shadow-sm' : 'opacity-40 hover:opacity-80'}`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                placeholder="Add note..."
                                value={current.remarks}
                                onChange={(e) => setRemarks(sid, e.target.value)}
                                className="h-8 text-sm"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => { setTakeClassId(null); setTakeTeacherId(null); setStudentStatuses({}); }}>Cancel</Button>
                <Button onClick={handleSubmitAttendance} disabled={isSubmitting || !takeTeacherId || !takeDate} className="px-8">
                  {isSubmitting ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><CheckCircle className="h-4 w-4 mr-2" />Submit Attendance ({classStudents.length} students)</>
                  )}
                </Button>
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
                {selectedFolder ? `Records  ${selectedFolder.name}` : 'Browse by Student / Class / Teacher'}
              </h2>
            </div>
            <Button onClick={() => handleOpenModal()}><Plus className="h-4 w-4 mr-2" /> Add Record</Button>
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
                      const total = getAttendanceCountForStudent(sid);
                      const present = getPresentCountForStudent(sid);
                      return (
                        <Card key={sid} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleFolderClick('student', sid, `${student.first_name} ${student.last_name}`)}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3"><Folder className="h-9 w-9 text-primary" /></div>
                            <div className="space-y-1">
                              <h3 className="font-semibold">{student.first_name} {student.last_name}</h3>
                              <p className="text-sm text-muted-foreground">ID: {sid}</p>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground"><CheckCircle className="h-3.5 w-3.5" /><span>{present}/{total} present</span></div>
                              <span className="text-sm font-semibold text-green-600">{total > 0 ? Math.round((present / total) * 100) : 0}%</span>
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
                      const total = getAttendanceCountForClass(cid);
                      const present = getPresentCountForClass(cid);
                      return (
                        <Card key={cid} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleFolderClick('class', cid, cls.class_name)}>
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3 mb-3"><Folder className="h-9 w-9 text-primary" /></div>
                            <div className="space-y-1">
                              <h3 className="font-semibold">{cls.class_name}</h3>
                              <p className="text-sm text-muted-foreground">{cls.class_code}  Level {cls.level}</p>
                            </div>
                            <div className="flex justify-between items-center mt-3 pt-3 border-t">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground"><CheckCircle className="h-3.5 w-3.5" /><span>{present}/{total} present</span></div>
                              <span className="text-sm font-semibold text-green-600">{total > 0 ? Math.round((present / total) * 100) : 0}%</span>
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
                      const count = getAttendanceCountForTeacher(tid);
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
                              <div className="flex items-center gap-1 text-sm text-muted-foreground"><CheckCircle className="h-3.5 w-3.5" /><span>{count} records</span></div>
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
                  <Input type="text" placeholder="Search by student name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                  {searchTerm && <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setSearchTerm('')}><X className="h-4 w-4" /></Button>}
                </div>
                <Button variant={showFilters ? 'default' : 'outline'} onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4 mr-2" />Filters
                  {hasActiveFilters && <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">{(filterStatus ? 1 : 0) + (filterDate ? 1 : 0)}</span>}
                </Button>
                {hasActiveFilters && <Button variant="outline" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-2" />Clear</Button>}
                <div className="text-sm text-muted-foreground flex items-center">{displayedAttendance.length} records</div>
              </div>
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg mb-6">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Status</SelectItem>
                        {STATUS_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                  </div>
                </div>
              )}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead>Remarks</TableHead><TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {state.loading ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-6">Loading...</TableCell></TableRow>
                    ) : displayedAttendance.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">{hasActiveFilters ? 'No records match your criteria' : 'No attendance records found'}</TableCell></TableRow>
                    ) : displayedAttendance.map((att) => (
                      <TableRow key={att.attendance_id || att.id}>
                        <TableCell>{getStudentName(att.student_id)}</TableCell>
                        <TableCell>{new Date(att.attendance_date).toLocaleDateString()}</TableCell>
                        <TableCell><Badge variant="outline" className={getStatusBadgeClasses(att.status)}>{att.status}</Badge></TableCell>
                        <TableCell>{att.remarks || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenModal(att)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(att.attendance_id || att.id || 0)}><Trash2 className="h-4 w-4" /></Button>
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
          <DialogHeader><DialogTitle>{editingId ? 'Edit Attendance Record' : 'Add Attendance Record'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitEdit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Student *</Label>
                <Select value={formData.student_id ? String(formData.student_id) : ''} onValueChange={(v) => setFormData({ ...formData, student_id: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select student'} /></SelectTrigger>
                  <SelectContent>{studentOptions.map((o) => <SelectItem key={o.id} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Teacher *</Label>
                <Select value={formData.teacher_id ? String(formData.teacher_id) : ''} onValueChange={(v) => setFormData({ ...formData, teacher_id: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select teacher'} /></SelectTrigger>
                  <SelectContent>{teacherOptions.map((o) => <SelectItem key={o.id} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class *</Label>
                <Select value={formData.class_id ? String(formData.class_id) : ''} onValueChange={(v) => setFormData({ ...formData, class_id: Number(v) })}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>{classOptions.map((o) => <SelectItem key={o.id} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" required value={formData.attendance_date || ''} onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={formData.status || 'Present'} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea value={formData.remarks || ''} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} placeholder="Optional remarks..." />
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

export default AttendancePage;
