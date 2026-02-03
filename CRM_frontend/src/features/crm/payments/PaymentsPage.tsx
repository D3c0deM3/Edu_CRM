import { useState, useEffect, useMemo } from 'react';
import { MdEdit, MdDelete, MdClose, MdArrowBack, MdFolder, MdSearch, MdFilterList, MdPerson, MdClass } from 'react-icons/md';
import { useCRUD } from '../hooks/useCRUD';
import { paymentAPI, teacherAPI, classAPI, studentAPI } from '../../../shared/api/api';
import { SelectField } from '../students/components/SelectField';
import { fetchStudents, fetchCenters, paymentMethodOptions, paymentStatusOptions, paymentTypeOptions, currencyOptions } from '../../../utils/dropdownOptions';
import './PaymentsPage.css';
import { Plus, DollarSign, X, CreditCard, Users } from 'lucide-react';

interface Payment {
  payment_id?: number;
  id?: number;
  student_id: number;
  center_id: number;
  payment_date: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_reference: string;
  receipt_number: string;
  payment_status: string;
  payment_type: string;
  notes?: string;
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

const PaymentsPage = () => {
  const [state, actions] = useCRUD<Payment>(paymentAPI, 'Payment');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [selectedFolder, setSelectedFolder] = useState<{ type: FolderType; id: number; name: string } | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Payment>>({
    center_id: 1,
    currency: 'USD',
    payment_status: 'Completed',
    payment_type: 'Tuition',
  });
  const [studentOptions, setStudentOptions] = useState<any[]>([]);
  const [centerOptions, setCenterOptions] = useState<any[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
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
      const [studentOpts, centers] = await Promise.all([
        fetchStudents(),
        fetchCenters(),
      ]);
      setStudentOptions(studentOpts);
      setCenterOptions(centers);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  // Get student IDs for a teacher (students assigned to this teacher)
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

  // Get payments count for teacher
  const getPaymentCountForTeacher = (teacherId: number): number => {
    const studentIds = getStudentIdsForTeacher(teacherId);
    return state.items.filter((p) => studentIds.includes(p.student_id)).length;
  };

  // Get payments count for class
  const getPaymentCountForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    return state.items.filter((p) => studentIds.includes(p.student_id)).length;
  };

  // Get total amount for teacher
  const getTotalAmountForTeacher = (teacherId: number): number => {
    const studentIds = getStudentIdsForTeacher(teacherId);
    return state.items
      .filter((p) => studentIds.includes(p.student_id))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  // Get total amount for class
  const getTotalAmountForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    return state.items
      .filter((p) => studentIds.includes(p.student_id))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  // Get payments count for student
  const getPaymentCountForStudent = (studentId: number): number => {
    return state.items.filter((p) => p.student_id === studentId).length;
  };

  // Get total amount for student
  const getTotalAmountForStudent = (studentId: number): number => {
    return state.items
      .filter((p) => p.student_id === studentId)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  // Filter payments based on selected folder
  const getFilteredPayments = (): Payment[] => {
    if (!selectedFolder) return state.items;

    let studentIds: number[] = [];
    if (selectedFolder.type === 'teacher') {
      studentIds = getStudentIdsForTeacher(selectedFolder.id);
    } else if (selectedFolder.type === 'class') {
      studentIds = getStudentIdsForClass(selectedFolder.id);
    } else if (selectedFolder.type === 'student') {
      studentIds = [selectedFolder.id];
    }
    return state.items.filter((p) => studentIds.includes(p.student_id));
  };

  // Apply search and filters
  const displayedPayments = useMemo(() => {
    let payments = getFilteredPayments();

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      payments = payments.filter((p) => {
        const student = students.find((s) => (s.student_id || s.id) === p.student_id);
        const studentName = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
        return (
          p.receipt_number?.toLowerCase().includes(search) ||
          p.transaction_reference?.toLowerCase().includes(search) ||
          studentName.includes(search) ||
          p.amount?.toString().includes(search)
        );
      });
    }

    if (filterStatus) {
      payments = payments.filter((p) => p.payment_status === filterStatus);
    }

    if (filterMethod) {
      payments = payments.filter((p) => p.payment_method === filterMethod);
    }

    return payments;
  }, [state.items, selectedFolder, searchTerm, filterStatus, filterMethod, students]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterMethod('');
  };

  const hasActiveFilters = searchTerm || filterStatus || filterMethod;

  const getStudentName = (studentId: number): string => {
    const student = students.find((s) => (s.student_id || s.id) === studentId);
    return student ? `${student.first_name} ${student.last_name}` : `Student #${studentId}`;
  };

  const handleOpenModal = (payment?: Payment) => {
    if (payment) {
      setEditingId(payment.payment_id || payment.id || null);
      setFormData(payment);
    } else {
      setEditingId(null);
      setFormData({
        center_id: 1,
        currency: 'USD',
        payment_status: 'Completed',
        payment_type: 'Tuition',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      center_id: 1,
      currency: 'USD',
      payment_status: 'Completed',
      payment_type: 'Tuition',
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
    if (window.confirm('Are you sure you want to delete this payment?')) {
      await actions.delete(id);
    }
  };

  const handleFolderClick = (type: FolderType, id: number, name: string) => {
    setSelectedFolder({ type, id, name });
  };

  const handleBackToFolders = () => {
    setSelectedFolder(null);
    clearFilters();
  };

  const totalAmount = displayedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

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
              ? `${selectedFolder.name} - Payments`
              : 'Payments Management'}
          </h1>
        </div>
        <button className="btn-add" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add Payment
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
                      const paymentCount = getPaymentCountForStudent(studentId);
                      const totalAmount = getTotalAmountForStudent(studentId);
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
                              <CreditCard size={14} />
                              <span>{paymentCount} payments</span>
                            </div>
                            <div className="stat total">
                              <DollarSign size={14} />
                              <span>${totalAmount.toLocaleString()}</span>
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
                      const paymentCount = getPaymentCountForClass(classId);
                      const totalAmount = getTotalAmountForClass(classId);
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
                              <CreditCard size={14} />
                              <span>{paymentCount} payments</span>
                            </div>
                            <div className="stat total">
                              <DollarSign size={14} />
                              <span>${totalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* By Teachers Tab - Show Teachers */}
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
                      const paymentCount = getPaymentCountForStudent(studentId);
                      const totalAmount = getTotalAmountForStudent(studentId);
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
                              <CreditCard size={14} />
                              <span>{paymentCount} payments</span>
                            </div>
                            <div className="stat total">
                              <DollarSign size={14} />
                              <span>${totalAmount.toLocaleString()}</span>
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
        // PAYMENT LIST VIEW
        <>
          {/* Search and Filter Bar */}
          <div className="search-filter-bar">
            <div className="search-input-wrapper">
              <MdSearch size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search by student, receipt, reference..."
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
                  {(filterStatus ? 1 : 0) + (filterMethod ? 1 : 0)}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button className="btn-clear-all" onClick={clearFilters}>
                <X size={16} /> Clear All
              </button>
            )}

            <div className="results-summary">
              <span>{displayedPayments.length} payments</span>
              <span className="total-amount">Total: ${totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="filter-options">
              <div className="filter-group">
                <label>Payment Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  {paymentStatusOptions.map((opt) => (
                    <option key={opt.id} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Payment Method</label>
                <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)}>
                  <option value="">All Methods</option>
                  {paymentMethodOptions.map((opt) => (
                    <option key={opt.id} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Payments Table */}
          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Student</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.loading ? (
                  <tr>
                    <td colSpan={8} className="text-center">Loading...</td>
                  </tr>
                ) : displayedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center">
                      {hasActiveFilters ? 'No payments match your criteria' : 'No payments found'}
                    </td>
                  </tr>
                ) : (
                  displayedPayments.map((payment) => (
                    <tr key={payment.payment_id || payment.id}>
                      <td className="receipt-cell">{payment.receipt_number}</td>
                      <td>{getStudentName(payment.student_id)}</td>
                      <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                      <td className="amount-cell">
                        <span className="currency">{payment.currency}</span>
                        <span className="amount">{payment.amount.toLocaleString()}</span>
                      </td>
                      <td>
                        <span className="method-badge">{payment.payment_method}</span>
                      </td>
                      <td>{payment.payment_type}</td>
                      <td>
                        <span className={`status-badge status-${payment.payment_status.toLowerCase()}`}>
                          {payment.payment_status}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button className="btn-icon btn-edit" onClick={() => handleOpenModal(payment)} title="Edit">
                          <MdEdit size={18} />
                        </button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(payment.payment_id || payment.id || 0)} title="Delete">
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Edit Payment' : 'Add New Payment'}</h2>
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
                  onChange={(e) => setFormData({ ...formData, student_id: Number(e.target.value) })}
                  options={studentOptions}
                  isLoading={isLoadingOptions}
                  required
                  placeholder="Select a student"
                />
                <SelectField
                  label="Center"
                  name="center_id"
                  value={formData.center_id || ''}
                  onChange={(e) => setFormData({ ...formData, center_id: Number(e.target.value) })}
                  options={centerOptions}
                  isLoading={isLoadingOptions}
                  required
                  placeholder="Select a center"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Payment Date *</label>
                  <input type="date" required value={formData.payment_date || ''} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Amount *</label>
                  <input type="number" required step="0.01" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Currency</label>
                  <select value={formData.currency || 'USD'} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}>
                    {currencyOptions.map((opt) => (
                      <option key={opt.id} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Method *</label>
                  <select required value={formData.payment_method || ''} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}>
                    <option value="">Select Method</option>
                    {paymentMethodOptions.map((opt) => (
                      <option key={opt.id} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Transaction Reference *</label>
                  <input type="text" required value={formData.transaction_reference || ''} onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Receipt Number *</label>
                  <input type="text" required value={formData.receipt_number || ''} onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Payment Status *</label>
                  <select required value={formData.payment_status || 'Completed'} onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}>
                    {paymentStatusOptions.map((opt) => (
                      <option key={opt.id} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Type *</label>
                  <select required value={formData.payment_type || 'Tuition'} onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}>
                    {paymentTypeOptions.map((opt) => (
                      <option key={opt.id} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row full">
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
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

export default PaymentsPage;
