import { useState, useEffect, useMemo } from 'react';
import { MdEdit, MdDelete, MdAdd, MdClose, MdArrowBack, MdFolder, MdSearch, MdFilterList, MdPerson, MdClass } from 'react-icons/md';
import { useCRUD } from '../hooks/useCRUD';
import { attendanceAPI, teacherAPI, classAPI, studentAPI } from '../../../shared/api/api';
import { SelectField } from '../students/components/SelectField';
import { fetchStudents, fetchTeachers, fetchClasses, attendanceStatusOptions } from '../../../utils/dropdownOptions';
import '../dashboard/Dashboard.css';
import '../students/CRUDStyles.css';
import '../payments/PaymentsPage.css';
import { Plus, CheckCircle, Users, X } from 'lucide-react';

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
  const [studentOptions, setStudentOptions] = useState<any[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<any[]>([]);
  const [classOptions, setClassOptions] = useState<any[]>([]);
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

  // Get present count for teacher
  const getPresentCountForTeacher = (teacherId: number): number => {
    const studentIds = getStudentIdsForTeacher(teacherId);
    return state.items.filter((a) => studentIds.includes(a.student_id) && a.status === 'Present').length;
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
              ? `${selectedFolder.name} - Attendance`
              : 'Attendance Management'}
          </h1>
        </div>
        <button className="btn-add" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add Attendance
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
                            <MdFolder size={36} />
                          </div>
                          <div className="folder-info">
                            <h3>{student.first_name} {student.last_name}</h3>
                            <span className="folder-code">ID: {studentId}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <CheckCircle size={14} />
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
                            <MdFolder size={36} />
                          </div>
                          <div className="folder-info">
                            <h3>{cls.class_name}</h3>
                            <span className="folder-code">{cls.class_code} • Level {cls.level}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <CheckCircle size={14} />
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
                      const presentCount = getPresentCountForTeacher(teacherId);
                      const presentPercentage = attCount > 0 ? (presentCount / attCount) * 100 : 0;
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
                              <CheckCircle size={14} />
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
                            <MdFolder size={36} />
                          </div>
                          <div className="folder-info">
                            <h3>{student.first_name} {student.last_name}</h3>
                            <span className="folder-code">ID: {studentId}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <CheckCircle size={14} />
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
              <MdSearch size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search by student name..."
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
                  {(filterStatus ? 1 : 0) + (filterDate ? 1 : 0)}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button className="btn-clear-all" onClick={clearFilters}>
                <X size={16} /> Clear All
              </button>
            )}

            <div className="results-summary">
              <span>{displayedAttendance.length} records</span>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="filter-options">
              <div className="filter-group">
                <label>Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Status</option>
                  {attendanceStatusOptions.map((opt) => (
                    <option key={opt.id} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Date</label>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
              </div>
            </div>
          )}

          {/* Attendance Table */}
          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.loading ? (
                  <tr>
                    <td colSpan={5} className="text-center">Loading...</td>
                  </tr>
                ) : displayedAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center">
                      {hasActiveFilters ? 'No records match your criteria' : 'No attendance records found'}
                    </td>
                  </tr>
                ) : (
                  displayedAttendance.map((attendance) => (
                    <tr key={attendance.attendance_id || attendance.id}>
                      <td>{getStudentName(attendance.student_id)}</td>
                      <td>{new Date(attendance.attendance_date).toLocaleDateString()}</td>
                      <td>
                        <span style={{ 
                          backgroundColor: getStatusColor(attendance.status), 
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          {attendance.status}
                        </span>
                      </td>
                      <td>{attendance.remarks || '-'}</td>
                      <td className="actions-cell">
                        <button className="btn-icon btn-edit" onClick={() => handleOpenModal(attendance)} title="Edit">
                          <MdEdit size={18} />
                        </button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(attendance.attendance_id || attendance.id || 0)} title="Delete">
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
              <h2>{editingId ? 'Edit Attendance' : 'Add Attendance Record'}</h2>
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
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" required value={formData.attendance_date || ''} onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Status *</label>
                  <select required value={formData.status || 'Present'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="form-select">
                    {attendanceStatusOptions.map((opt) => (
                      <option key={opt.id} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row full">
                <div className="form-group">
                  <label>Remarks</label>
                  <textarea value={formData.remarks || ''} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} />
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

export default AttendancePage;
