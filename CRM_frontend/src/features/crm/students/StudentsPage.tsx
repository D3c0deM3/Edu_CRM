import { useState, useEffect, useMemo } from 'react';
import { MdEdit, MdDelete, MdClose, MdInfo, MdArrowBack, MdFolder, MdFolderOpen, MdSearch, MdFilterList } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useCRUD } from '../hooks/useCRUD';
import { studentAPI, classAPI } from '../../../shared/api/api';
import { SelectField } from './components/SelectField';
import { fetchTeachers, fetchCenters, fetchClasses, genderOptions, statusOptions } from '../../../utils/dropdownOptions';
import './CRUDStyles.css';
import { Plus, Users, X } from 'lucide-react';

interface Student {
  student_id?: number;
  id?: number;
  center_id: number;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  parent_name: string;
  parent_phone: string;
  gender: string;
  status: string;
  teacher_id?: number;
  class_id?: number;
}

interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  class_code: string;
  level: number;
  capacity: number;
}

const StudentsPage = () => {
  const navigate = useNavigate();
  const [state, actions] = useCRUD<Student>(studentAPI, 'Student');
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({
    center_id: 1,
    gender: 'Male',
    status: 'Active',
  });
  const [teacherOptions, setTeacherOptions] = useState<any[]>([]);
  const [centerOptions, setCenterOptions] = useState<any[]>([]);
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadClasses();
    loadDropdownOptions();
  }, []);

  const loadClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await classAPI.getAll();
      const allClasses = response.data || response;
      setClasses(Array.isArray(allClasses) ? allClasses : []);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const [teachers, centers, classes] = await Promise.all([
        fetchTeachers(),
        fetchCenters(),
        fetchClasses(),
      ]);
      setTeacherOptions(teachers);
      setCenterOptions(centers);
      setClassOptions(classes);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingId(student.student_id || student.id || null);
      setFormData(student);
    } else {
      setEditingId(null);
      setFormData({
        center_id: 1,
        gender: 'Male',
        status: 'Active',
        class_id: selectedClass ? (selectedClass.class_id || selectedClass.id) : undefined,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      center_id: 1,
      gender: 'Male',
      status: 'Active',
    });
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
    if (window.confirm('Are you sure you want to delete this student?')) {
      await actions.delete(id);
    }
  };

  const handleClassClick = (cls: Class) => {
    setSelectedClass(cls);
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
  };

  // Get students for selected class
  const filteredStudents = selectedClass
    ? state.items.filter(
        (student) =>
          student.class_id === (selectedClass.class_id || selectedClass.id)
      )
    : [];

  // Get count of students per class
  const getStudentCount = (classId: number) => {
    return state.items.filter((student) => student.class_id === classId).length;
  };

  // Get unassigned students (no class)
  const unassignedStudents = state.items.filter((student) => !student.class_id);

  // Apply search and filters
  const displayedStudents = useMemo(() => {
    let students = selectedClass?.class_id === -1 ? unassignedStudents : filteredStudents;
    
    // Apply search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      students = students.filter((student) =>
        student.first_name?.toLowerCase().includes(search) ||
        student.last_name?.toLowerCase().includes(search) ||
        student.email?.toLowerCase().includes(search) ||
        student.phone?.includes(search) ||
        student.enrollment_number?.toLowerCase().includes(search) ||
        student.parent_name?.toLowerCase().includes(search) ||
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(search)
      );
    }
    
    // Apply gender filter
    if (filterGender) {
      students = students.filter((student) => student.gender === filterGender);
    }
    
    // Apply status filter
    if (filterStatus) {
      students = students.filter((student) => student.status === filterStatus);
    }
    
    return students;
  }, [filteredStudents, unassignedStudents, selectedClass, searchTerm, filterGender, filterStatus]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterGender('');
    setFilterStatus('');
  };

  const hasActiveFilters = searchTerm || filterGender || filterStatus;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {selectedClass && (
            <button
              className="btn-secondary"
              onClick={handleBackToClasses}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <MdArrowBack size={18} /> Back
            </button>
          )}
          <h1>
            {selectedClass
              ? `${selectedClass.class_name} - Students`
              : 'Students by Class'}
          </h1>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add Student
        </button>
      </div>

      {state.error && <div className="alert alert-error">{state.error}</div>}

      {!selectedClass ? (
        // FOLDER VIEW - Show Classes as Folders
        <div className="folder-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
          padding: '20px 0',
        }}>
          {loadingClasses ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
              Loading classes...
            </div>
          ) : classes.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
              No classes found. Create classes first.
            </div>
          ) : (
            <>
              {classes.map((cls) => {
                const classId = cls.class_id || cls.id || 0;
                const studentCount = getStudentCount(classId);
                return (
                  <div
                    key={classId}
                    onClick={() => handleClassClick(cls)}
                    className="folder-card"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: '12px',
                      padding: '24px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                      color: 'white',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                      <MdFolder size={40} />
                      <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                          {cls.class_name}
                        </h3>
                        <span style={{ fontSize: '12px', opacity: 0.8 }}>
                          {cls.class_code}
                        </span>
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginTop: '16px',
                      padding: '8px 12px',
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                    }}>
                      <Users size={16} />
                      <span style={{ fontWeight: 500 }}>
                        {studentCount} {studentCount === 1 ? 'Student' : 'Students'}
                      </span>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
                      Level {cls.level} • Capacity: {cls.capacity}
                    </div>
                  </div>
                );
              })}

              {/* Unassigned Students Folder */}
              {unassignedStudents.length > 0 && (
                <div
                  onClick={() => setSelectedClass({ class_id: -1, id: -1, class_name: 'Unassigned', class_code: 'N/A', level: 0, capacity: 0 })}
                  className="folder-card"
                  style={{
                    background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)',
                    borderRadius: '12px',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
                    color: 'white',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.3)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <MdFolderOpen size={40} />
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                        Unassigned
                      </h3>
                      <span style={{ fontSize: '12px', opacity: 0.8 }}>
                        No Class
                      </span>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginTop: '16px',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                  }}>
                    <Users size={16} />
                    <span style={{ fontWeight: 500 }}>
                      {unassignedStudents.length} {unassignedStudents.length === 1 ? 'Student' : 'Students'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        // STUDENT LIST VIEW - Show Students in Selected Class
        <>
          {/* Search and Filter Bar */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}>
            {/* Search Input */}
            <div style={{
              position: 'relative',
              flex: '1',
              minWidth: '250px',
              maxWidth: '400px',
            }}>
              <MdSearch 
                size={20} 
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#666',
                }}
              />
              <input
                type="text"
                placeholder="Search by name, email, phone, enrollment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px 12px 40px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  transition: 'border-color 0.2s',
                  outline: 'none',
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#999',
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                background: showFilters ? '#667eea' : 'white',
                color: showFilters ? 'white' : '#333',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              <MdFilterList size={18} />
              Filters
              {hasActiveFilters && (
                <span style={{
                  background: showFilters ? 'white' : '#667eea',
                  color: showFilters ? '#667eea' : 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                }}>
                  {(filterGender ? 1 : 0) + (filterStatus ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ff6b6b',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <X size={16} />
                Clear All
              </button>
            )}

            {/* Results Count */}
            <span style={{
              marginLeft: 'auto',
              color: '#666',
              fontSize: '14px',
            }}>
              {displayedStudents.length} student{displayedStudents.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '20px',
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              flexWrap: 'wrap',
            }}>
              <div style={{ minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px', color: '#555' }}>
                  Gender
                </label>
                <select
                  value={filterGender}
                  onChange={(e) => setFilterGender(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">All Genders</option>
                  {genderOptions.map((opt) => (
                    <option key={opt.id} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div style={{ minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px', color: '#555' }}>
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                    background: 'white',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map((opt) => (
                    <option key={opt.id} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="crud-table-container">
            <table className="crud-table">
              <thead>
                <tr>
                  <th>Enrollment #</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Date of Birth</th>
                  <th>Gender</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.loading ? (
                  <tr>
                    <td colSpan={8} className="text-center">Loading...</td>
                  </tr>
                ) : displayedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center">
                      {hasActiveFilters 
                        ? 'No students match your search criteria'
                        : 'No students found in this class'}
                    </td>
                  </tr>
                ) : (
                  displayedStudents.map((student) => (
                  <tr key={student.student_id || student.id}>
                    <td>{student.enrollment_number}</td>
                    <td>{student.first_name} {student.last_name}</td>
                    <td>{student.email}</td>
                    <td>{student.phone}</td>
                    <td>{new Date(student.date_of_birth).toLocaleDateString()}</td>
                    <td>{student.gender}</td>
                    <td>
                      <span className={`badge badge-${student.status.toLowerCase()}`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        className="btn-icon"
                        style={{ background: '#17a2b8', borderColor: '#17a2b8', color: 'white' }}
                        onClick={() => navigate(`/student/${student.student_id || student.id}`)}
                        title="View Details"
                      >
                        <MdInfo />
                      </button>
                      <button
                        className="btn-icon btn-edit"
                        onClick={() => handleOpenModal(student)}
                        title="Edit"
                      >
                        <MdEdit />
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => handleDelete(student.student_id || student.id || 0)}
                        title="Delete"
                      >
                        <MdDelete />
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
              <h2>{editingId ? 'Edit Student' : 'Add New Student'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>
                <MdClose size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, first_name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, last_name: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Enrollment Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.enrollment_number || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, enrollment_number: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth *</label>
                  <input
                    type="date"
                    required
                    value={formData.date_of_birth || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, date_of_birth: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Parent Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.parent_name || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, parent_name: e.target.value })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>Parent Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.parent_phone || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, parent_phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Gender *</label>
                  <select
                    required
                    value={formData.gender || 'Male'}
                    onChange={(e) =>
                      setFormData({ ...formData, gender: e.target.value })
                    }
                    className="form-select"
                  >
                    <option value="">Select Gender</option>
                    {genderOptions.map((opt) => (
                      <option key={opt.id} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status *</label>
                  <select
                    required
                    value={formData.status || 'Active'}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="form-select"
                  >
                    <option value="">Select Status</option>
                    {statusOptions.map((opt) => (
                      <option key={opt.id} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <SelectField
                  label="Center"
                  name="center_id"
                  value={formData.center_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, center_id: Number(e.target.value) })
                  }
                  options={centerOptions}
                  isLoading={isLoadingOptions}
                  required
                  placeholder="Select a center"
                />
                <SelectField
                  label="Teacher"
                  name="teacher_id"
                  value={formData.teacher_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, teacher_id: e.target.value ? Number(e.target.value) : undefined })
                  }
                  options={teacherOptions}
                  isLoading={isLoadingOptions}
                  placeholder="Select a teacher (optional)"
                />
              </div>

              <div className="form-group">
                <SelectField
                  label="Class"
                  name="class_id"
                  value={formData.class_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, class_id: e.target.value ? Number(e.target.value) : undefined })
                  }
                  options={classOptions}
                  isLoading={isLoadingOptions}
                  placeholder="Select a class (optional)"
                />
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

export default StudentsPage;
