import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCRUD } from '../hooks/useCRUD';
import { attendanceAPI, teacherAPI, classAPI, studentAPI } from '../../../shared/api/api';
import { SelectField } from '../students/components/SelectField';
import { fetchStudents, fetchTeachers, fetchClasses, attendanceStatusOptions } from '../../../utils/dropdownOptions';
import { 
  ArrowLeft, 
  Plus, 
  Mail, 
  Phone, 
  BookOpen, 
  Users, 
  User, 
  Folder, 
  CheckCircle, 
  Filter, 
  Search, 
  Pencil, 
  Trash2, 
  X 
} from 'lucide-react';
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
import { cn } from '@/lib/utils';

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
  teacher_id?: number;
}

interface Student {
  student_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  class_id?: number;
  teacher_id?: number;
}

type TabType = 'students' | 'classes' | 'teachers';
type FolderType = 'teacher' | 'class' | 'student';

const AttendancePage = () => {
  const [state, actions] = useCRUD<Attendance>(attendanceAPI, 'Attendance');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [selectedFolder, setSelectedFolder] = useState<{ type: FolderType; id: number; name: string } | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Attendance>>({
    status: 'Present',
  });
  const [studentOptions, setStudentOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [teacherOptions, setTeacherOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [classOptions, setClassOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadAllData();
    loadDropdownOptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      const [teachersRes, classesRes, studentsRes] = await Promise.all([
        teacherAPI.getAll(),
        classAPI.getAll(),
        studentAPI.getAll(),
      ]);
      setTeachers(Array.isArray(teachersRes.data || teachersRes) ? (teachersRes.data || teachersRes) : []);
      setClasses(Array.isArray(classesRes.data || classesRes) ? (classesRes.data || classesRes) : []);
      setStudents(Array.isArray(studentsRes.data || studentsRes) ? (studentsRes.data || studentsRes) : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const [students, teachers, classes] = await Promise.all([
        fetchStudents(),
        fetchTeachers(),
        fetchClasses(),
      ]);
      setStudentOptions(students);
      setTeacherOptions(teachers);
      setClassOptions(classes);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ status: 'Present' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await actions.update(editingId, formData);
    } else {
      await actions.create(formData);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this attendance record?')) {
      await actions.delete(id);
    }
  };

  // Get student IDs for a teacher
  const getStudentIdsForTeacher = (teacherId: number): number[] => {
    return students
      .filter((s) => s.teacher_id === teacherId)
      .map((s) => s.student_id || s.id || 0);
  };

  // Get student IDs for a class
  const getStudentIdsForClass = (classId: number): number[] => {
    return students
      .filter((s) => s.class_id === classId)
      .map((s) => s.student_id || s.id || 0);
  };

  // Get attendance count for teacher
  const getAttendanceCountForTeacher = (teacherId: number): number => {
    const studentIds = getStudentIdsForTeacher(teacherId);
    return state.items.filter((a) => studentIds.includes(a.student_id)).length;
  };

  // Get attendance count for class
  const getAttendanceCountForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    return state.items.filter((a) => studentIds.includes(a.student_id)).length;
  };

  // Get present count for class
  const getPresentCountForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    return state.items.filter((a) => studentIds.includes(a.student_id) && a.status === 'Present').length;
  };

  // Get attendance count for student
  const getAttendanceCountForStudent = (studentId: number): number => {
    return state.items.filter((a) => a.student_id === studentId).length;
  };

  // Get present count for student
  const getPresentCountForStudent = (studentId: number): number => {
    return state.items.filter((a) => a.student_id === studentId && a.status === 'Present').length;
  };

  // Filter attendance based on selected folder
  const getFilteredAttendance = (): Attendance[] => {
    if (!selectedFolder) return state.items;

    let studentIds: number[] = [];
    if (selectedFolder.type === 'teacher') {
      studentIds = getStudentIdsForTeacher(selectedFolder.id);
    } else if (selectedFolder.type === 'class') {
      studentIds = getStudentIdsForClass(selectedFolder.id);
    } else if (selectedFolder.type === 'student') {
      studentIds = [selectedFolder.id];
    }
    return state.items.filter((a) => studentIds.includes(a.student_id));
  };

  // Apply search and filters
  const displayedAttendance = useMemo(() => {
    let records = getFilteredAttendance();

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      records = records.filter((a) => {
        const student = students.find((s) => (s.student_id || s.id) === a.student_id);
        const studentName = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
        return studentName.includes(search);
      });
    }

    if (filterStatus) {
      records = records.filter((a) => a.status === filterStatus);
    }

    if (filterDate) {
      records = records.filter((a) => a.attendance_date === filterDate);
    }

    return records;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.items, selectedFolder, searchTerm, filterStatus, filterDate, students]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterDate('');
  };

  const hasActiveFilters = searchTerm || filterStatus || filterDate;

  const getStudentName = (studentId: number): string => {
    const student = students.find((s) => (s.student_id || s.id) === studentId);
    return student ? `${student.first_name} ${student.last_name}` : `Student #${studentId}`;
  };

  const handleFolderClick = (type: FolderType, id: number, name: string) => {
    setSelectedFolder({ type, id, name });
  };

  const handleBackToFolders = () => {
    setSelectedFolder(null);
    clearFilters();
  };

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'present': return '#4CAF50';
      case 'absent': return '#F44336';
      case 'late': return '#FFC107';
      case 'excused': return '#2196F3';
      default: return '#9E9E9E';
    }
  };

  const getStatusBadgeClasses = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'present': return 'bg-green-100 text-green-800 border-green-300';
      case 'absent': return 'bg-red-100 text-red-800 border-red-300';
      case 'late': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'excused': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="payments-page">
      {/* Header */}
      <div className="payments-header">
        <div className="payments-header-left">
          {selectedFolder && (
            <button className="btn-back" onClick={handleBackToFolders}>
              <ArrowLeft className="h-5 w-5" /> Back
            </button>
          )}
          <h1>
            {selectedFolder
              ? `${selectedFolder.name} - Attendance`
              : 'Attendance Management'}
          </h1>
        </div>
        <button className="btn-add" onClick={() => handleOpenModal()}>
          <Plus className="h-[18px] w-[18px]" /> Add Attendance
        </button>
      </div>

      {state.error && <div className="alert-error">{state.error}</div>}

      {!selectedFolder ? (
        <>
          {/* Tab Navigation */}
          <div className="tabs-container">
            <div className="tabs-bar">
              <button
                className={`tab ${activeTab === 'students' ? 'active' : ''}`}
                onClick={() => setActiveTab('students')}
              >
                <Users className="h-[18px] w-[18px]" />
                By Students
              </button>
              <button
                className={`tab ${activeTab === 'classes' ? 'active' : ''}`}
                onClick={() => setActiveTab('classes')}
              >
                <BookOpen className="h-[18px] w-[18px]" />
                By Classes
              </button>
              <button
                className={`tab ${activeTab === 'teachers' ? 'active' : ''}`}
                onClick={() => setActiveTab('teachers')}
              >
                <User className="h-[18px] w-[18px]" />
                By Teachers
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {/* By Students Tab */}
            {activeTab === 'students' && (
              <div className="folder-section">
                <div className="folder-grid">
                  {loadingData ? (
                    <div className="loading-text">Loading students...</div>
                  ) : students.length === 0 ? (
                    <div className="empty-text">No students found</div>
                  ) : (
                    students.map((student) => {
                      const studentId = student.student_id || student.id || 0;
                      const attCount = getAttendanceCountForStudent(studentId);
                      const presentCount = getPresentCountForStudent(studentId);
                      const presentPercentage = attCount > 0 ? (presentCount / attCount) * 100 : 0;
                      return (
                        <div
                          key={studentId}
                          className="folder-card student-folder"
                          onClick={() => handleFolderClick('student', studentId, `${student.first_name} ${student.last_name}`)}
                        >
                          <div className="folder-icon">
                            <Folder className="h-9 w-9" />
                          </div>
                          <div className="folder-info">
                            <h3>{student.first_name} {student.last_name}</h3>
                            <span className="folder-code">ID: {studentId}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>{attCount} records</span>
                            </div>
                            <div className="stat total">
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: getStatusColor('present') }}>
                                {presentPercentage.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* By Classes Tab */}
            {activeTab === 'classes' && (
              <div className="folder-section">
                <div className="folder-grid">
                  {loadingData ? (
                    <div className="loading-text">Loading classes...</div>
                  ) : classes.length === 0 ? (
                    <div className="empty-text">No classes found</div>
                  ) : (
                    classes.map((cls) => {
                      const classId = cls.class_id || cls.id || 0;
                      const attCount = getAttendanceCountForClass(classId);
                      const presentCount = getPresentCountForClass(classId);
                      const presentPercentage = attCount > 0 ? (presentCount / attCount) * 100 : 0;
                      return (
                        <div
                          key={classId}
                          className="folder-card class-folder"
                          onClick={() => handleFolderClick('class', classId, cls.class_name)}
                        >
                          <div className="folder-icon">
                            <Folder className="h-9 w-9" />
                          </div>
                          <div className="folder-info">
                            <h3>{cls.class_name}</h3>
                            <span className="folder-code">{cls.class_code} • Level {cls.level}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>{attCount} records</span>
                            </div>
                            <div className="stat total">
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: getStatusColor('present') }}>
                                {presentPercentage.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* By Teachers Tab */}
            {activeTab === 'teachers' && (
              <div className="folder-section">
                <div className="folder-grid">
                  {loadingData ? (
                    <div className="loading-text">Loading teachers...</div>
                  ) : teachers.length === 0 ? (
                    <div className="empty-text">No teachers found</div>
                  ) : (
                    teachers.map((teacher) => {
                      const teacherId = teacher.teacher_id || teacher.id || 0;
                      const attCount = getAttendanceCountForTeacher(teacherId);
                      return (
                        <div
                          key={teacherId}
                          className="folder-card teacher-folder"
                          onClick={() => handleFolderClick('teacher', teacherId, `${teacher.first_name} ${teacher.last_name}`)}
                        >
                          <div className="folder-icon">
                            <Folder className="h-9 w-9" />
                          </div>
                          <div className="folder-info">
                            <h3>{teacher.first_name} {teacher.last_name}</h3>
                            <span className="folder-code">{teacher.employee_id}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <Users className="h-3.5 w-3.5" />
                              <span>{getStudentIdsForTeacher(teacherId).length} students</span>
                            </div>
                            <div className="stat">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>{attCount} records</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : selectedFolder.type === 'teacher' ? (
        // TEACHER STUDENTS VIEW
        <>
          {/* Back Button */}
          <div className="folder-section">
            <button className="btn-back" onClick={handleBackToFolders} style={{ marginBottom: '20px' }}>
              <ArrowLeft className="h-5 w-5" /> Back to Teachers
            </button>

            <div className="folder-grid">
              {loadingData ? (
                <div className="loading-text">Loading students...</div>
              ) : (
                (() => {
                  const teacherStudentIds = getStudentIdsForTeacher(selectedFolder.id);
                  const teacherStudents = students.filter((s) => teacherStudentIds.includes(s.student_id || s.id || 0));
                  
                  return teacherStudents.length === 0 ? (
                    <div className="empty-text">No students found for this teacher</div>
                  ) : (
                    teacherStudents.map((student) => {
                      const studentId = student.student_id || student.id || 0;
                      const attCount = getAttendanceCountForStudent(studentId);
                      const presentCount = getPresentCountForStudent(studentId);
                      const presentPercentage = attCount > 0 ? (presentCount / attCount) * 100 : 0;
                      return (
                        <div
                          key={studentId}
                          className="folder-card student-folder"
                          onClick={() => handleFolderClick('student', studentId, `${student.first_name} ${student.last_name}`)}
                        >
                          <div className="folder-icon">
                            <Folder className="h-9 w-9" />
                          </div>
                          <div className="folder-info">
                            <h3>{student.first_name} {student.last_name}</h3>
                            <span className="folder-code">ID: {studentId}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>{attCount} records</span>
                            </div>
                            <div className="stat total">
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: getStatusColor('present') }}>
                                {presentPercentage.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  );
                })()
              )}
            </div>
          </div>
        </>
      ) : (
        // ATTENDANCE LIST VIEW
        <>
          {/* Search and Filter Bar */}
          <div className="search-filter-bar">
            <div className="search-input-wrapper">
              <Search className="h-5 w-5 search-icon" />
              <input
                type="text"
                placeholder="Search by student name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <button
              className={`btn-filter ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-[18px] w-[18px]" />
              Filters
              {hasActiveFilters && (
                <span className="filter-badge">
                  {(filterStatus ? 1 : 0) + (filterDate ? 1 : 0)}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="ml-2">
                <X className="h-4 w-4 mr-1" /> Clear All
              </Button>
            )}

            <div className="text-sm text-muted-foreground ml-4">
              <span>{displayedAttendance.length} records</span>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    {attendanceStatusOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              </div>
            </div>
          )}

          {/* Attendance Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">Loading...</TableCell>
                  </TableRow>
                ) : displayedAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      {hasActiveFilters ? 'No records match your criteria' : 'No attendance records found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedAttendance.map((attendance) => (
                    <TableRow key={attendance.attendance_id || attendance.id}>
                      <TableCell>{getStudentName(attendance.student_id)}</TableCell>
                      <TableCell>{new Date(attendance.attendance_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs font-semibold border ${getStatusBadgeClasses(attendance.status)}`}>
                          {attendance.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{attendance.remarks || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(attendance)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(attendance.attendance_id || attendance.id || 0)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {isModalOpen && (
        <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit Attendance' : 'Add Attendance Record'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <SelectField
                  label="Student"
                  name="student_id"
                  value={formData.student_id || ''}
                  onChange={(value) =>
                    setFormData({ ...formData, student_id: Number(value) })
                  }
                  options={studentOptions}
                  isLoading={isLoadingOptions}
                  required
                  placeholder="Select a student"
                />
                <SelectField
                  label="Teacher"
                  name="teacher_id"
                  value={formData.teacher_id || ''}
                  onChange={(value) =>
                    setFormData({ ...formData, teacher_id: Number(value) })
                  }
                  options={teacherOptions}
                  isLoading={isLoadingOptions}
                  required
                  placeholder="Select a teacher"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SelectField
                  label="Class"
                  name="class_id"
                  value={formData.class_id || ''}
                  onChange={(value) =>
                    setFormData({ ...formData, class_id: Number(value) })
                  }
                  options={classOptions}
                  isLoading={isLoadingOptions}
                  required
                  placeholder="Select a class"
                />
                <div className="space-y-2">
                  <Label htmlFor="attendance_date">Date *</Label>
                  <Input
                    type="date"
                    id="attendance_date"
                    required
                    value={formData.attendance_date || ''}
                    onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select required value={formData.status || 'Present'} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {attendanceStatusOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Add any remarks..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={state.loading}>
                  {state.loading ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AttendancePage;
