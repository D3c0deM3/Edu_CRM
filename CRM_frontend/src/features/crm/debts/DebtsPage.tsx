import { useState, useEffect } from 'react';
import { MdEdit, MdDelete, MdAdd, MdClose } from 'react-icons/md';
import { useCRUD } from '../hooks/useCRUD';
import { debtAPI } from '../../../shared/api/api';
import { SelectField } from '../students/components/SelectField';
import { fetchStudents, fetchCenters } from '../../../utils/dropdownOptions';
import '../dashboard/Dashboard.css';
import '../students/CRUDStyles.css';

interface Debt {
  debt_id?: number;
  id?: number;
  student_id: number;
  center_id: number;
  debt_amount: number;
  debt_date: string;
  due_date: string;
  amount_paid: number;
  remarks?: string;
}

const DebtsPage = () => {
  const [state, actions] = useCRUD<Debt>(debtAPI, 'Debt');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Debt>>({
    center_id: 1,
    amount_paid: 0,
  });
  const [studentOptions, setStudentOptions] = useState<any[]>([]);
  const [centerOptions, setCenterOptions] = useState<any[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadDropdownOptions();
  }, []);

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const [students, centers] = await Promise.all([
        fetchStudents(),
        fetchCenters(),
      ]);
      setStudentOptions(students);
      setCenterOptions(centers);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleOpenModal = (debt?: Debt) => {
    if (debt) {
      setEditingId(debt.debt_id || debt.id || null);
      setFormData(debt);
    } else {
      setEditingId(null);
      setFormData({ center_id: 1, amount_paid: 0 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ center_id: 1, amount_paid: 0 });
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
    if (window.confirm('Are you sure you want to delete this debt record?')) {
      await actions.delete(id);
    }
  };

  const getStudentName = (studentId: number) => {
    const student = studentOptions.find(s => s.id === studentId);
    return student ? student.label : `Student ${studentId}`;
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Debts Management</h1>
        <button className="btn-primary" onClick={() => handleOpenModal()}>
          <MdAdd /> Add Debt
        </button>
      </div>

      {state.error && <div className="alert alert-error">{state.error}</div>}

      <div className="crud-table-container">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Debt Amount</th>
              <th>Paid Amount</th>
              <th>Remaining</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.loading ? (
              <tr>
                <td colSpan={6} className="text-center">Loading...</td>
              </tr>
            ) : state.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">No debt records found</td>
              </tr>
            ) : (
              state.items.map((debt) => {
                const debtAmount = typeof debt.debt_amount === 'string' ? parseFloat(debt.debt_amount) : debt.debt_amount;
                const amountPaid = typeof debt.amount_paid === 'string' ? parseFloat(debt.amount_paid) : debt.amount_paid;
                const remaining = debtAmount - amountPaid;
                return (
                  <tr key={debt.debt_id || debt.id}>
                    <td>{getStudentName(debt.student_id)}</td>
                    <td>${debtAmount.toFixed(2)}</td>
                    <td>${amountPaid.toFixed(2)}</td>
                    <td>${remaining.toFixed(2)}</td>
                    <td>{new Date(debt.due_date).toLocaleDateString()}</td>
                    <td className="actions">
                      <button className="btn-icon btn-edit" onClick={() => handleOpenModal(debt)}>
                        <MdEdit />
                      </button>
                      <button className="btn-icon btn-delete" onClick={() => handleDelete(debt.debt_id || debt.id || 0)}>
                        <MdDelete />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Debt' : 'Add New Debt'}</h2>
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
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Debt Amount *</label>
                  <input type="number" required step="0.01" value={formData.debt_amount || ''} onChange={(e) => setFormData({ ...formData, debt_amount: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Amount Paid *</label>
                  <input type="number" required step="0.01" value={formData.amount_paid || 0} onChange={(e) => setFormData({ ...formData, amount_paid: Number(e.target.value) })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Debt Date *</label>
                  <input type="date" required value={formData.debt_date || ''} onChange={(e) => setFormData({ ...formData, debt_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Due Date *</label>
                  <input type="date" required value={formData.due_date || ''} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
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

export default DebtsPage;
