import { useState, useEffect } from 'react';
import { MdEdit, MdDelete, MdAdd, MdClose } from 'react-icons/md';
import { useCRUD } from '../hooks/useCRUD';
import { subjectAPI } from '../../../shared/api/api';
import { SelectField } from '../students/components/SelectField';
import { fetchClasses, fetchTeachers } from '../../../utils/dropdownOptions';
import '../dashboard/Dashboard.css';
import '../students/CRUDStyles.css';

interface Subject {
  subject_id?: number;
  id?: number;
  class_id: number;
  subject_name: string;
  subject_code: string;
  teacher_id?: number;
  total_marks: number;
  passing_marks: number;
}

const SubjectsPage = () => {
  const [state, actions] = useCRUD<Subject>(subjectAPI, 'Subject');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Subject>>({
    total_marks: 100,
    passing_marks: 40,
  });
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<any[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadDropdownOptions();
  }, []);

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const [classes, teachers] = await Promise.all([
        fetchClasses(),
        fetchTeachers(),
      ]);
      setClassOptions(classes);
      setTeacherOptions(teachers);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleOpenModal = (subject?: Subject) => {
    if (subject) {
      setEditingId(subject.subject_id || subject.id || null);
      setFormData(subject);
    } else {
      setEditingId(null);
      setFormData({
        total_marks: 100,
        passing_marks: 40,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      total_marks: 100,
      passing_marks: 40,
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
    if (window.confirm('Are you sure you want to delete this subject?')) {
      await actions.delete(id);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Subjects Management</h1>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <MdAdd /> Add Subject
        </button>
      </div>

      {state.error && <div className="alert alert-error">{state.error}</div>}

      <div className="crud-table-container">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Subject Code</th>
              <th>Name</th>
              <th>Class ID</th>
              <th>Total Marks</th>
              <th>Passing Marks</th>
              <th>Teacher ID</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.loading ? (
              <tr>
                <td colSpan={7} className="text-center">Loading...</td>
              </tr>
            ) : state.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center">No subjects found</td>
              </tr>
            ) : (
              state.items.map((subject) => (
                <tr key={subject.subject_id || subject.id}>
                  <td>{subject.subject_code}</td>
                  <td>{subject.subject_name}</td>
                  <td>{subject.class_id}</td>
                  <td>{subject.total_marks}</td>
                  <td>{subject.passing_marks}</td>
                  <td>{subject.teacher_id || '-'}</td>
                  <td className="actions">
                    <button className="btn-icon btn-edit" onClick={() => handleOpenModal(subject)}>
                      <MdEdit />
                    </button>
                    <button className="btn-icon btn-delete" onClick={() => handleDelete(subject.subject_id || subject.id || 0)}>
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
              <h2>{editingId ? 'Edit Subject' : 'Add New Subject'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>
                <MdClose size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Subject Name *</label>
                  <input type="text" required value={formData.subject_name || ''} onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Subject Code *</label>
                  <input type="text" required value={formData.subject_code || ''} onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })} />
                </div>
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
              <div className="form-row">
                <div className="form-group">
                  <label>Total Marks *</label>
                  <input type="number" required value={formData.total_marks || 100} onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Passing Marks *</label>
                  <input type="number" required value={formData.passing_marks || 40} onChange={(e) => setFormData({ ...formData, passing_marks: Number(e.target.value) })} />
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

export default SubjectsPage;
