import { useState } from 'react';
import { MdEdit, MdDelete, MdAdd, MdClose } from 'react-icons/md';
import { paymentAPI } from '../../../../shared/api/api';
import { showToast } from '../../../../utils/toast';

interface Payment {
  payment_id?: number;
  id?: number;
  student_id?: number;
  center_id?: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_type: string;
  payment_status: string;
  receipt_number: string;
  currency?: string;
  transaction_reference?: string;
  notes?: string;
}

interface Student {
  student_id?: number;
  id?: number;
  center_id?: number;
}

interface Class {
  class_id?: number;
  id?: number;
  payment_amount?: number;
  class_name?: string;
}

interface PaymentSectionProps {
  payments: Payment[];
  student?: Student;
  classData?: Class | null;
  onRefresh: () => void;
}

export const PaymentSection = ({ payments, student, classData, onRefresh }: PaymentSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Payment>>({
    payment_status: 'Pending',
    payment_method: 'Cash',
    currency: 'USD',
  });
  const [loading, setLoading] = useState(false);

  const handleOpenModal = (payment?: Payment) => {
    if (payment) {
      setEditingId(payment.payment_id || payment.id || null);
      setFormData(payment);
    } else {
      setEditingId(null);
      // Auto-fill amount from class payment_amount if available
      setFormData({ 
        payment_status: 'Pending', 
        payment_method: 'Cash',
        currency: 'USD',
        amount: classData?.payment_amount || 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ 
      payment_status: 'Pending', 
      payment_method: 'Cash',
      currency: 'USD',
      amount: classData?.payment_amount || 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const paymentData = {
        ...formData,
        student_id: student?.student_id || student?.id,
        center_id: student?.center_id,
      };
      
      if (editingId) {
        await paymentAPI.update(editingId, paymentData);
        showToast.success('Payment updated successfully');
      } else {
        await paymentAPI.create(paymentData);
        showToast.success('Payment created successfully');
      }
      onRefresh();
      handleCloseModal();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to save payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure?')) {
      try {
        await paymentAPI.delete(id);
        showToast.success('Payment deleted successfully');
        onRefresh();
      } catch (error: any) {
        showToast.error(error.message || 'Failed to delete payment');
      }
    }
  };

  return (
    <div className="detail-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Payment History</h2>
        <button className="btn-primary" onClick={() => handleOpenModal()} style={{ margin: 0 }}>
          <MdAdd /> Add Payment
        </button>
      </div>
      <div className="crud-table-container">
        <table className="crud-table">
          <thead>
            <tr>
              <th>Receipt #</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Method</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">No payment records</td>
              </tr>
            ) : (
              payments.map((payment,index) => (
                <tr key={payment.payment_id || payment.id}>
                  <td>{index + 1}</td>
                  <td>${(Number(payment.amount) || 0).toFixed(2)}</td>
                  <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                  <td>{payment.payment_method}</td>
                  <td>
                    <span className={`badge badge-${payment.payment_status.toLowerCase()}`}>
                      {payment.payment_status}
                    </span>
                  </td>
                  <td className="actions">
                    <button className="btn-icon btn-edit" onClick={() => handleOpenModal(payment)} title="Edit">
                      <MdEdit />
                    </button>
                    <button className="btn-icon btn-delete" onClick={() => handleDelete(payment.payment_id || payment.id || 0)} title="Delete">
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
              <h2>{editingId ? 'Edit Payment' : 'Add Payment'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>
                <MdClose size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Receipt Number *</label>
                <input
                  type="text"
                  required
                  value={formData.receipt_number || ''}
                  onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Payment Date *</label>
                <input
                  type="date"
                  required
                  value={formData.payment_date || ''}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Payment Method *</label>
                <select
                  required
                  value={formData.payment_method || 'Cash'}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="form-select"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Check">Check</option>
                  <option value="Card">Card</option>
                </select>
              </div>
              <div className="form-group">
                <label>Payment Type *</label>
                <select
                  required
                  value={formData.payment_type || ''}
                  onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select Type</option>
                  <option value="Tuition">Tuition</option>
                  <option value="Fee">Fee</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status *</label>
                <select
                  required
                  value={formData.payment_status || 'Pending'}
                  onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                  className="form-select"
                >
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
              <div className="form-group">
                <label>Currency</label>
                <input
                  type="text"
                  value={formData.currency || 'USD'}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Transaction Reference</label>
                <input
                  type="text"
                  value={formData.transaction_reference || ''}
                  onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
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
