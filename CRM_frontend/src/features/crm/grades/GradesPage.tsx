import { useState, useEffect, useMemo } from 'react';
import { MdEdit, MdDelete, MdAdd, MdClose, MdArrowBack, MdFolder, MdSearch, MdFilterList, MdPerson, MdClass } from 'react-icons/md';
import { useCRUD } from '../hooks/useCRUD';
import { gradeAPI, teacherAPI, classAPI, studentAPI } from '../../../shared/api/api';
import { SelectField } from '../students/components/SelectField';
import { fetchStudents, fetchTeachers, fetchSubjects, fetchClasses, termOptions } from '../../../utils/dropdownOptions';
import '../dashboard/Dashboard.css';
import '../students/CRUDStyles.css';
import '../payments/PaymentsPage.css';
import { Plus, BookOpen, Users, X } from 'lucide-react';

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
  const [studentOptions, setStudentOptions] = useState<any[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<any[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<any[]>([]);
  const [classOptions, setClassOptions] = useState<any[]>([]);
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

  // Get average percentage for teacher
  const getAveragePercentageForTeacher = (teacherId: number): number => {
    const studentIds = getStudentIdsForTeacher(teacherId);
    const grades = state.items.filter((g) => studentIds.includes(g.student_id));
    if (grades.length === 0) return 0;
    const sum = grades.reduce((acc, g) => acc + (g.percentage || 0), 0);
    return sum / grades.length;
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

  return (
    <div className="payments-page">
      {/* Header */}
      <div className="payments-header">
        <div className="payments-header-left">
          {selectedFolder && (
            <button className="btn-back" onClick={handleBackToFolders}>
              <MdArrowBack size={20} /> Back
            </button>
          )}
          <h1>
            {selectedFolder
              ? `${selectedFolder.name} - Grades`
              : 'Grades Management'}
          </h1>
        </div>
        <button className="btn-add" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add Grade
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
                <Users size={18} />
                By Students
              </button>
              <button
                className={`tab ${activeTab === 'classes' ? 'active' : ''}`}
                onClick={() => setActiveTab('classes')}
              >
                <MdClass size={18} />
                By Classes
              </button>
              <button
                className={`tab ${activeTab === 'teachers' ? 'active' : ''}`}
                onClick={() => setActiveTab('teachers')}
              >
                <MdPerson size={18} />
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
                            <MdFolder size={36} />
                          </div>
                          <div className="folder-info">
                            <h3>{student.first_name} {student.last_name}</h3>
                            <span className="folder-code">ID: {studentId}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <BookOpen size={14} />
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
                            <MdFolder size={36} />
                          </div>
                          <div className="folder-info">
                            <h3>{cls.class_name}</h3>
                            <span className="folder-code">{cls.class_code} • Level {cls.level}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <BookOpen size={14} />
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
                      const avgPercentage = getAveragePercentageForTeacher(teacherId);
                      return (
                        <div
                          key={teacherId}
                          className="folder-card teacher-folder"
                          onClick={() => handleFolderClick('teacher', teacherId, `${teacher.first_name} ${teacher.last_name}`)}
                        >
                          <div className="folder-icon">
                            <MdFolder size={36} />
                          </div>
                          <div className="folder-info">
                            <h3>{teacher.first_name} {teacher.last_name}</h3>
                            <span className="folder-code">{teacher.employee_id}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <Users size={14} />
                              <span>{getStudentIdsForTeacher(teacherId).length} students</span>
                            </div>
                            <div className="stat">
                              <BookOpen size={14} />
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
              <MdArrowBack size={20} /> Back to Teachers
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
                            <MdFolder size={36} />
                          </div>
                          <div className="folder-info">
                            <h3>{student.first_name} {student.last_name}</h3>
                            <span className="folder-code">ID: {studentId}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <BookOpen size={14} />
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
              <MdSearch size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search by student or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              className={`btn-filter ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <MdFilterList size={18} />
              Filters
              {hasActiveFilters && (
                <span className="filter-badge">
                  {(filterTerm ? 1 : 0) + (filterGrade ? 1 : 0)}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button className="btn-clear-all" onClick={clearFilters}>
                <X size={16} /> Clear All
              </button>
            )}

            <div className="results-summary">
              <span>{displayedGrades.length} grades</span>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="filter-options">
              <div className="filter-group">
                <label>Term</label>
                <select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}>
                  <option value="">All Terms</option>
                  {termOptions.map((opt) => (
                    <option key={opt.id} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Grade Letter</label>
                <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                  <option value="">All Grades</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="F">F</option>
                </select>
              </div>
            </div>
          )}

          {/* Grades Table */}
          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Subject</th>
                  <th>Marks</th>
                  <th>Percentage</th>
                  <th>Grade</th>
                  <th>Term</th>
                  <th>Year</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.loading ? (
                  <tr>
                    <td colSpan={8} className="text-center">Loading...</td>
                  </tr>
                ) : displayedGrades.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center">
                      {hasActiveFilters ? 'No grades match your criteria' : 'No grades found'}
                    </td>
                  </tr>
                ) : (
                  displayedGrades.map((grade) => (
                    <tr key={grade.grade_id || grade.id}>
                      <td>{getStudentName(grade.student_id)}</td>
                      <td>{grade.subject}</td>
                      <td>{grade.marks_obtained}/{grade.total_marks}</td>
                      <td>{(Number(grade.percentage) || 0).toFixed(1)}%</td>
                      <td>
                        <span style={{ 
                          backgroundColor: getGradeColor(grade.grade_letter), 
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          {grade.grade_letter}
                        </span>
                      </td>
                      <td>{grade.term}</td>
                      <td>{grade.academic_year}</td>
                      <td className="actions-cell">
                        <button className="btn-icon btn-edit" onClick={() => handleOpenModal(grade)} title="Edit">
                          <MdEdit size={18} />
                        </button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(grade.grade_id || grade.id || 0)} title="Delete">
                          <MdDelete size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Grade' : 'Add New Grade'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>
                <MdClose size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <SelectField
                  label="Student"
                  name="student_id"
                  value={formData.student_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, student_id: Number(e.target.value) })
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
                  onChange={(e) =>
                    setFormData({ ...formData, teacher_id: Number(e.target.value) })
                  }
                  options={teacherOptions}
                  isLoading={isLoadingOptions}
                  required
                  placeholder="Select a teacher"
                />
              </div>
              <div className="form-row">
                <SelectField
                  label="Subject"
                  name="subject"
                  value={formData.subject || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
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
                  onChange={(e) =>
                    setFormData({ ...formData, class_id: Number(e.target.value) })
                  }
                  options={classOptions}
                  isLoading={isLoadingOptions}
                  required
                  placeholder="Select a class"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Marks Obtained *</label>
                  <input type="number" required step="0.1" value={formData.marks_obtained || ''} onChange={(e) => handleMarksChange(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label>Total Marks</label>
                  <input type="number" value={formData.total_marks || 100} onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Percentage</label>
                  <input type="number" step="0.1" value={formData.percentage || 0} disabled style={{ backgroundColor: '#f0f0f0' }} />
                </div>
                <div className="form-group">
                  <label>Grade Letter</label>
                  <input type="text" value={formData.grade_letter || 'F'} disabled style={{ backgroundColor: '#f0f0f0' }} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Academic Year *</label>
                  <input type="number" required value={formData.academic_year || new Date().getFullYear()} onChange={(e) => setFormData({ ...formData, academic_year: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Term *</label>
                  <select required value={formData.term || 'First'} onChange={(e) => setFormData({ ...formData, term: e.target.value })} className="form-select">
                    {termOptions.map((opt) => (
                      <option key={opt.id} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={state.loading}>
                  {state.loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GradesPage;
