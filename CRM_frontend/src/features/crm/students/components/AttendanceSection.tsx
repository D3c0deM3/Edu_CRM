import { useState } from 'react';
import { MdEdit, MdDelete, MdAdd, MdClose } from 'react-icons/md';
import { attendanceAPI } from '../../../../shared/api/api';
import { showToast } from '../../../../utils/toast';

interface Attendance {
  attendance_id?: number;
  id?: number;
  student_id?: number;
  attendance_date: string;
  status: string;
  remarks?: string;
}

interface AttendanceSectionProps {
  attendance: Attendance[];
  onRefresh: () => void;
}

export const AttendanceSection = ({ attendance, onRefresh }: AttendanceSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Attendance>>({
    status: 'Present',
  });
  const [loading, setLoading] = useState(false);

  const handleOpenModal = (record?: Attendance) => {
    if (record) {
      setEditingId(record.attendance_id || record.id || null);
      setFormData(record);
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
    setLoading(true);
    try {
      if (editingId) {
        await attendanceAPI.update(editingId, formData);
        showToast.success('Attendance updated successfully');
      } else {
        await attendanceAPI.create(formData);
        showToast.success('Attendance created successfully');
      }
      onRefresh();
      handleCloseModal();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure?')) {
      try {
        await attendanceAPI.delete(id);
        showToast.success('Attendance deleted successfully');
        onRefresh();
      } catch (error: any) {
        showToast.error(error.message || 'Failed to delete attendance');
      }
    }
  };

  return (
    <div className="detail-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Attendance History</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()} style={{ margin: 0 }}>
          <MdAdd /> Add Record
        </button>
      </div>
      <div className="crud-table-container">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {attendance.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center">No attendance records</td>
              </tr>
            ) : (
              attendance.map((record) => (
                <tr key={record.attendance_id || record.id}>
                  <td>{new Date(record.attendance_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge badge-${record.status.toLowerCase()}`}>
                      {record.status}
                    </span>
                  </td>
                  <td>{record.remarks || '-'}</td>
                  <td className="actions">
                    <button className="btn-icon btn-edit" onClick={() => handleOpenModal(record)} title="Edit">
                      <MdEdit />
                    </button>
                    <button className="btn-icon btn-delete" onClick={() => handleDelete(record.attendance_id || record.id || 0)} title="Delete">
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
              <h2>{editingId ? 'Edit Attendance' : 'Add Attendance'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>
                <MdClose size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  required
                  value={formData.attendance_date || ''}
                  onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select
                  required
                  value={formData.status || 'Present'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="form-select"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                </select>
              </div>
              <div className="form-group">
                <label>Remarks</label>
                <textarea
                  value={formData.remarks || ''}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
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
