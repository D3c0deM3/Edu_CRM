import { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, ArrowLeft, Folder, Search, Filter, User, BookOpen, Plus, Loader2, X, Users } from 'lucide-react';
import { useCRUD } from '../hooks/useCRUD';
import { gradeAPI, teacherAPI, classAPI, studentAPI } from '../../../shared/api/api';
import { SelectField } from '../students/components/SelectField';
import { fetchStudents, fetchTeachers, fetchClasses, fetchSubjects, termOptions } from '../../../utils/dropdownOptions';
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
import { cn } from '@/lib/utils';

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

const GradesPage = () => {
  const [state, actions] = useCRUD<Grade>(gradeAPI, 'Grade');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [selectedFolder, setSelectedFolder] = useState<{ type: FolderType; id: number; name: string } | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Grade>>({
    total_marks: 100,
    academic_year: new Date().getFullYear(),
    term: 'First',
  });
  const [studentOptions, setStudentOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [teacherOptions, setTeacherOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [subjectOptions, setSubjectOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [classOptions, setClassOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
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
      const [students, teachers, subjects, classes] = await Promise.all([
        fetchStudents(),
        fetchTeachers(),
        fetchSubjects(),
        fetchClasses(),
      ]);
      setStudentOptions(students);
      setTeacherOptions(teachers);
      setSubjectOptions(subjects);
      setClassOptions(classes);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleOpenModal = (grade?: Grade) => {
    if (grade) {
      setEditingId(grade.grade_id || grade.id || null);
      setFormData(grade);
    } else {
      setEditingId(null);
      setFormData({
        total_marks: 100,
        academic_year: new Date().getFullYear(),
        term: 'First',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      total_marks: 100,
      academic_year: new Date().getFullYear(),
      term: 'First',
    });
  };

  const handleMarksChange = (marks: number) => {
    const total = formData.total_marks || 100;
    const percentage = (marks / total) * 100;
    let gradeLetter = 'F';
    if (percentage >= 90) gradeLetter = 'A';
    else if (percentage >= 80) gradeLetter = 'B';
    else if (percentage >= 70) gradeLetter = 'C';
    else if (percentage >= 60) gradeLetter = 'D';
    setFormData({ ...formData, marks_obtained: marks, percentage, grade_letter: gradeLetter });
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

  // Get grades count for teacher
  const getGradeCountForTeacher = (teacherId: number): number => {
    const studentIds = getStudentIdsForTeacher(teacherId);
    return state.items.filter((g) => studentIds.includes(g.student_id)).length;
  };

  // Get grades count for class
  const getGradeCountForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    return state.items.filter((g) => studentIds.includes(g.student_id)).length;
  };

  // Get average percentage for class
  const getAveragePercentageForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    const grades = state.items.filter((g) => studentIds.includes(g.student_id));
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + (g.percentage || 0), 0);
    return sum / grades.length;
  };

  // Get grades count for student
  const getGradeCountForStudent = (studentId: number): number => {
    return state.items.filter((g) => g.student_id === studentId).length;
  };

  // Get average percentage for student
  const getAveragePercentageForStudent = (studentId: number): number => {
    const grades = state.items.filter((g) => g.student_id === studentId);
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + (g.percentage || 0), 0);
    return sum / grades.length;
  };

  // Filter grades based on selected folder
  const getFilteredGrades = (): Grade[] => {
    if (!selectedFolder) return state.items;

    let studentIds: number[] = [];
    if (selectedFolder.type === 'teacher') {
      studentIds = getStudentIdsForTeacher(selectedFolder.id);
    } else if (selectedFolder.type === 'class') {
      studentIds = getStudentIdsForClass(selectedFolder.id);
    } else if (selectedFolder.type === 'student') {
      studentIds = [selectedFolder.id];
    }
    return state.items.filter((g) => studentIds.includes(g.student_id));
  };

  // Apply search and filters
  const displayedGrades = useMemo(() => {
    let grades = getFilteredGrades();

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      grades = grades.filter((g) => {
        const student = students.find((s) => (s.student_id || s.id) === g.student_id);
        const studentName = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
        return (
          g.subject?.toLowerCase().includes(search) ||
          studentName.includes(search)
        );
      });
    }

    if (filterTerm) {
      grades = grades.filter((g) => g.term === filterTerm);
    }

    if (filterGrade) {
      grades = grades.filter((g) => g.grade_letter === filterGrade);
    }

    return grades;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.items, selectedFolder, searchTerm, filterTerm, filterGrade, students]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTerm('');
    setFilterGrade('');
  };

  const hasActiveFilters = searchTerm || filterTerm || filterGrade;

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
    if (window.confirm('Are you sure you want to delete this grade?')) {
      await actions.delete(id);
    }
  };

  const getGradeColor = (grade: string) => {
    switch(grade) {
      case 'A': return '#4CAF50';
      case 'B': return '#8BC34A';
      case 'C': return '#FFC107';
      case 'D': return '#FF9800';
      case 'F': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getGradeBadgeClasses = (grade: string) => {
    switch(grade) {
      case 'A': return 'bg-green-100 text-green-800 border-green-300';
      case 'B': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'D': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'F': return 'bg-red-100 text-red-800 border-red-300';
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
              ? `${selectedFolder.name} - Grades`
              : 'Grades Management'}
          </h1>
        </div>
        <button className="btn-add" onClick={() => handleOpenModal()}>
          <Plus className="h-[18px] w-[18px]" /> Add Grade
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
                      const gradeCount = getGradeCountForStudent(studentId);
                      const avgPercentage = getAveragePercentageForStudent(studentId);
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
                              <BookOpen className="h-3.5 w-3.5" />
                              <span>{gradeCount} grades</span>
                            </div>
                            <div className="stat total">
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: getGradeColor('A') }}>
                                {avgPercentage.toFixed(1)}%
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
                      const gradeCount = getGradeCountForClass(classId);
                      const avgPercentage = getAveragePercentageForClass(classId);
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
                              <BookOpen className="h-3.5 w-3.5" />
                              <span>{gradeCount} grades</span>
                            </div>
                            <div className="stat total">
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: getGradeColor('A') }}>
                                {avgPercentage.toFixed(1)}%
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
                      const gradeCount = getGradeCountForTeacher(teacherId);
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
                              <BookOpen className="h-3.5 w-3.5" />
                              <span>{gradeCount} grades</span>
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
                      const gradeCount = getGradeCountForStudent(studentId);
                      const avgPercentage = getAveragePercentageForStudent(studentId);
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
                              <BookOpen className="h-3.5 w-3.5" />
                              <span>{gradeCount} grades</span>
                            </div>
                            <div className="stat total">
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: getGradeColor('A') }}>
                                {avgPercentage.toFixed(1)}%
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
        // GRADES LIST VIEW
        <>
          {/* Search and Filter Bar */}
          <div className="search-filter-bar">
            <div className="search-input-wrapper">
              <Search className="h-5 w-5 search-icon" />
              <input
                type="text"
                placeholder="Search by student or subject..."
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
                  {(filterTerm ? 1 : 0) + (filterGrade ? 1 : 0)}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button className="btn-clear-all" onClick={clearFilters}>
                <X className="h-4 w-4" /> Clear All
              </button>
            )}

            <div className="results-summary">
              <span>{displayedGrades.length} grades</span>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="filter-options">
              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={filterTerm} onValueChange={setFilterTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Terms</SelectItem>
                    {termOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="filter-group">
                <label>Grade Letter</label>
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Grades</SelectItem>
                    <SelectItem value="A">A</SelectItem>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="C">C</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                    <SelectItem value="F">F</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Grades Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">Loading...</TableCell>
                  </TableRow>
                ) : displayedGrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      {hasActiveFilters ? 'No grades match your criteria' : 'No grades found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedGrades.map((grade) => (
                    <TableRow key={grade.grade_id || grade.id}>
                      <TableCell>{getStudentName(grade.student_id)}</TableCell>
                      <TableCell>{grade.subject}</TableCell>
                      <TableCell>{grade.marks_obtained}/{grade.total_marks}</TableCell>
                      <TableCell>{(Number(grade.percentage) || 0).toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs font-bold border min-w-[2.5rem] justify-center ${getGradeBadgeClasses(grade.grade_letter)}`}>
                          {grade.grade_letter}
                        </Badge>
                      </TableCell>
                      <TableCell>{grade.term}</TableCell>
                      <TableCell>{grade.academic_year}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(grade)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(grade.grade_id || grade.id || 0)}>
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

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Grade' : 'Add New Grade'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                label="Subject"
                name="subject"
                value={formData.subject || ''}
                onChange={(value) =>
                  setFormData({ ...formData, subject: value })
                }
                options={subjectOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a subject"
              />
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
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marks_obtained">Marks Obtained *</Label>
                  <Input
                    type="number"
                    id="marks_obtained"
                    required
                    step="0.1"
                    value={formData.marks_obtained || ''}
                    onChange={(e) => handleMarksChange(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_marks">Total Marks</Label>
                  <Input
                    type="number"
                    id="total_marks"
                    value={formData.total_marks || 100}
                    onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="percentage">Percentage</Label>
                  <Input
                    type="number"
                    id="percentage"
                    step="0.1"
                    value={formData.percentage || 0}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade_letter">Grade Letter</Label>
                  <Input
                    type="text"
                    id="grade_letter"
                    value={formData.grade_letter || 'F'}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="academic_year">Academic Year *</Label>
                  <Input
                    type="number"
                    id="academic_year"
                    required
                    value={formData.academic_year || new Date().getFullYear()}
                    onChange={(e) => setFormData({ ...formData, academic_year: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="term">Term *</Label>
                  <Select required value={formData.term || 'First'} onValueChange={(value) => setFormData({ ...formData, term: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select term" />
                    </SelectTrigger>
                    <SelectContent>
                      {termOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={state.loading} form="grade-form">
                {state.loading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default GradesPage;
