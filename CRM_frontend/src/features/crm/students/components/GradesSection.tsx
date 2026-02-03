import { useState, useEffect } from 'react';
import { MdEdit, MdDelete, MdAdd, MdClose } from 'react-icons/md';
import { gradeAPI, subjectAPI } from '../../../../shared/api/api';
import { showToast } from '../../../../utils/toast';

interface Subject {
  subject_id?: number;
  id?: number;
  subject_name: string;
}

interface Grade {
  grade_id?: number;
  id?: number;
  student_id?: number;
  subject?: number;
  percentage: number;
  grade_letter: string;
  term: string;
  subject_name?: string;
}

interface GradesSectionProps {
  grades: Grade[];
  onRefresh: () => void;
}

export const GradesSection = ({ grades, onRefresh }: GradesSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Grade>>({});
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const response = await subjectAPI.getAll();
      const data = response.data || response;
      setSubjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const getSubjectName = (subjectId?: number) => {
    if (!subjectId) return '-';
    const subject = subjects.find(s => Number(s.subject_id) === Number(subjectId));
    return subject?.subject_name || '-';
  };

  const handleOpenModal = (grade?: Grade) => {
    if (grade) {
      setEditingId(grade.grade_id || grade.id || null);
      setFormData(grade);
    } else {
      setEditingId(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await gradeAPI.update(editingId, formData);
        showToast.success('Grade updated successfully');
      } else {
        await gradeAPI.create(formData);
        showToast.success('Grade created successfully');
      }
      onRefresh();
      handleCloseModal();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to save grade');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure?')) {
      try {
        await gradeAPI.delete(id);
        showToast.success('Grade deleted successfully');
        onRefresh();
      } catch (error: any) {
        showToast.error(error.message || 'Failed to delete grade');
      }
    }
  };

  return (
    <div className="detail-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Grades</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()} style={{ margin: 0 }}>
          <MdAdd /> Add Grade
        </button>
      </div>
      <div className="crud-table-container">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Percentage</th>
              <th>Grade</th>
              <th>Term</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {grades.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center">No grades</td>
              </tr>
            ) : (
              grades.map((grade) => (
                <tr key={grade.grade_id || grade.id}>
                  <td>{getSubjectName(grade.subject)}</td>
                  <td>{(Number(grade.percentage) || 0).toFixed(1)}%</td>
                  <td><strong>{grade.grade_letter}</strong></td>
                  <td>{grade.term}</td>
                  <td className="actions">
                    <button className="btn-icon btn-edit" onClick={() => handleOpenModal(grade)} title="Edit">
                      <MdEdit />
                    </button>
                    <button className="btn-icon btn-delete" onClick={() => handleDelete(grade.grade_id || grade.id || 0)} title="Delete">
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
              <h2>{editingId ? 'Edit Grade' : 'Add Grade'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>
                <MdClose size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Subject *</label>
                <select
                  required
                  value={formData.subject || ''}
                  onChange={(e) => setFormData({ ...formData, subject: Number(e.target.value) })}
                  className="form-select"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.subject_id || subject.id} value={subject.subject_id || subject.id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Percentage *</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={formData.percentage || ''}
                  onChange={(e) => setFormData({ ...formData, percentage: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Grade Letter *</label>
                <select
                  required
                  value={formData.grade_letter || ''}
                  onChange={(e) => setFormData({ ...formData, grade_letter: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select Grade</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                  <option value="F">F</option>
                </select>
              </div>
              <div className="form-group">
                <label>Term *</label>
                <select
                  required
                  value={formData.term || ''}
                  onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select Term</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                  <option value="Semester 1">Semester 1</option>
                  <option value="Semester 2">Semester 2</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
