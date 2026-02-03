import { useState, useEffect } from 'react';
import { MdEdit, MdDelete, MdClose, MdInfo } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { useCRUD } from '../../features/crm/hooks/useCRUD';
import { studentAPI } from '../../shared/api/api';
import { SelectField } from '../../features/crm/students/components/SelectField';
import { fetchTeachers, fetchCenters, fetchClasses, genderOptions, statusOptions } from '../../utils/dropdownOptions';
// import '../dashboard/Dashboard.css';
import './CRUDStyles.css';
import { Plus } from 'lucide-react';

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

const StudentsPage = () => {
  const navigate = useNavigate();
  const [state, actions] = useCRUD<Student>(studentAPI, 'Student');
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

  useEffect(() => {
    actions.fetchAll();
    loadDropdownOptions();
  }, []);

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

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Students Management</h1>
        <button
          className="btn-primary"
          onClick={() => handleOpenModal()}
        >
          <Plus size={18} /> Add Student
        </button>
      </div>

      {state.error && <div className="alert alert-error">{state.error}</div>}

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
            ) : state.items.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center">No students found</td>
              </tr>
            ) : (
              state.items.map((student) => (
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
                      style={{background: '#17a2b8', borderColor: '#17a2b8', color: 'white'}}
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
