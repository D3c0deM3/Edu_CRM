import { useState } from 'react';
import { MdEdit, MdDelete, MdAdd, MdClose } from 'react-icons/md';
import { assignmentAPI } from '../../../../shared/api/api';
import { showToast } from '../../../../utils/toast';

interface Assignment {
  assignment_id?: number;
  id?: number;
  class_id?: number;
  student_id?: number;
  assignment_title: string;
  description: string;
  due_date: string;
  status: string;
  grade?: number;
}

interface AssignmentSectionProps {
  assignments: Assignment[];
  studentClassId: number | undefined;
  studentId?: number;
  onRefresh: () => void;
}

export const AssignmentSection = ({ assignments, studentClassId, studentId, onRefresh }: AssignmentSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Assignment>>({
    status: 'Pending',
  });
  const [loading, setLoading] = useState(false);

  // Filter assignments by class_id or student_id matching student's ID
  const filteredAssignments = assignments.filter(a => 
    Number(a.class_id) === Number(studentId) || 
    Number(a.student_id) === Number(studentId) ||
    Number(a.class_id) === Number(studentClassId)
  );

  const handleOpenModal = (assignment?: Assignment) => {
    if (assignment) {
      setEditingId(assignment.assignment_id || assignment.id || null);
      setFormData(assignment);
    } else {
      setEditingId(null);
      setFormData({ status: 'Pending' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ status: 'Pending' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await assignmentAPI.update(editingId, formData);
        showToast.success('Assignment updated successfully');
      } else {
        // When creating a new assignment, set class_id to student_id
        const newAssignment = {
          ...formData,
          class_id: studentId,
          student_id: studentId,
        };
        await assignmentAPI.create(newAssignment);
        showToast.success('Assignment created successfully');
      }
      onRefresh();
      handleCloseModal();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to save assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure?')) {
      try {
        await assignmentAPI.delete(id);
        showToast.success('Assignment deleted successfully');
        onRefresh();
      } catch (error: any) {
        showToast.error(error.message || 'Failed to delete assignment');
      }
    }
  };

  return (
    <div className="detail-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Assignments</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()} style={{ margin: 0 }}>
          <MdAdd /> Add Assignment
        </button>
      </div>
      <div className="crud-table-container">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Assignment Name</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Grade</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssignments.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center">No assignments for this class</td>
              </tr>
            ) : (
              filteredAssignments.map((assignment) => (
                <tr key={assignment.assignment_id || assignment.id}>
                  <td>{assignment.assignment_title}</td>
                  <td>{new Date(assignment.due_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge badge-${assignment.status.toLowerCase()}`}>
                      {assignment.status}
                    </span>
                  </td>
                  <td>{assignment.grade || '-'}</td>
                  <td className="actions">
                    <button className="btn-icon btn-edit" onClick={() => handleOpenModal(assignment)} title="Edit">
                      <MdEdit />
                    </button>
                    <button className="btn-icon btn-delete" onClick={() => handleDelete(assignment.assignment_id || assignment.id || 0)} title="Delete">
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
              <h2>{editingId ? 'Edit Assignment' : 'Add Assignment'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>
                <MdClose size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Assignment Name *</label>
                <input
                  type="text"
                  required
                  value={formData.assignment_title || ''}
                  onChange={(e) => setFormData({ ...formData, assignment_title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Description *</label>
                <textarea
                  required
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Due Date *</label>
                <input
                  type="date"
                  required
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select
                  required
                  value={formData.status || 'Pending'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="form-select"
                >
                  <option value="Pending">Pending</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Graded">Graded</option>
                </select>
              </div>
              <div className="form-group">
                <label>Grade</label>
                <input
                  type="number"
                  value={formData.grade || ''}
                  onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
                />
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
