import { useState, useEffect, useMemo } from 'react';
import { MdEdit, MdDelete, MdAdd, MdClose, MdArrowBack, MdFolder, MdSearch, MdFilterList } from 'react-icons/md';
import { useCRUD } from '../hooks/useCRUD';
import { assignmentAPI, classAPI } from '../../../shared/api/api';
import { SelectField } from '../students/components/SelectField';
import { fetchClasses, assignmentStatusOptions } from '../../../utils/dropdownOptions';
import '../dashboard/Dashboard.css';
import '../students/CRUDStyles.css';
import '../payments/PaymentsPage.css';
import { Plus, FileText, Users, X } from 'lucide-react';

interface Assignment {
  assignment_id?: number;
  id?: number;
  class_id?: number;
  assignment_title: string;
  description: string;
  due_date: string;
  submission_date: string;
  status: string;
  grade?: number;
}

interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  class_code: string;
  level: number;
}

type TabType = 'classes' | 'personal';
type FolderType = 'class' | 'personal';

const AssignmentsPage = () => {
  const [state, actions] = useCRUD<Assignment>(assignmentAPI, 'Assignment');
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('classes');
  const [selectedFolder, setSelectedFolder] = useState<{ type: FolderType; id?: number; name: string } | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Assignment>>({
    status: 'Pending',
  });
  const [classOptions, setClassOptions] = useState<any[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadAllData();
    loadDropdownOptions();
  }, []);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      const classesRes = await classAPI.getAll();
      setClasses(Array.isArray(classesRes.data || classesRes) ? (classesRes.data || classesRes) : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const classes = await fetchClasses();
      setClassOptions(classes);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

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
    if (editingId) {
      await actions.update(editingId, formData);
    } else {
      await actions.create(formData);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      await actions.delete(id);
    }
  };

  // Get assignments for a class
  const getAssignmentsForClass = (classId: number): Assignment[] => {
    return state.items.filter((a) => a.class_id === classId);
  };

  // Get personal assignments (no class_id or class doesn't exist)
  const getPersonalAssignments = (): Assignment[] => {
    return state.items.filter((a) => !a.class_id || !classes.find((c) => (c.class_id || c.id) === a.class_id));
  };

  // Get assignment count for class
  const getAssignmentCountForClass = (classId: number): number => {
    return getAssignmentsForClass(classId).length;
  };

  // Get completed count for class
  const getCompletedCountForClass = (classId: number): number => {
    return getAssignmentsForClass(classId).filter((a) => a.status === 'Completed').length;
  };

  // Filter assignments based on selected folder
  const getFilteredAssignments = (): Assignment[] => {
    if (!selectedFolder) return state.items;

    if (selectedFolder.type === 'class') {
      return getAssignmentsForClass(selectedFolder.id || 0);
    } else if (selectedFolder.type === 'personal') {
      return getPersonalAssignments();
    }
    return state.items;
  };

  // Apply search and filters
  const displayedAssignments = useMemo(() => {
    let assignments = getFilteredAssignments();

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      assignments = assignments.filter((a) =>
        a.assignment_title?.toLowerCase().includes(search) ||
        a.description?.toLowerCase().includes(search)
      );
    }

    if (filterStatus) {
      assignments = assignments.filter((a) => a.status === filterStatus);
    }

    return assignments;
  }, [state.items, selectedFolder, searchTerm, filterStatus, classes]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
  };

  const hasActiveFilters = searchTerm || filterStatus;

  const handleFolderClick = (type: FolderType, id: number | undefined, name: string) => {
    setSelectedFolder({ type, id, name });
  };

  const handleBackToFolders = () => {
    setSelectedFolder(null);
    clearFilters();
  };

  const getStatusColor = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'completed': return '#4CAF50';
      case 'pending': return '#FFC107';
      case 'submitted': return '#2196F3';
      case 'graded': return '#8BC34A';
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
              ? `${selectedFolder.name} - Assignments`
              : 'Assignments Management'}
          </h1>
        </div>
        <button className="btn-add" onClick={() => handleOpenModal()}>
          <Plus size={18} /> Add Assignment
        </button>
      </div>

      {state.error && <div className="alert-error">{state.error}</div>}

      {!selectedFolder ? (
        <>
          {/* Tab Navigation */}
          <div className="tabs-container">
            <div className="tabs-bar">
              <button
                className={`tab ${activeTab === 'classes' ? 'active' : ''}`}
                onClick={() => setActiveTab('classes')}
              >
                <Users size={18} />
                By Classes
              </button>
              <button
                className={`tab ${activeTab === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveTab('personal')}
              >
                <FileText size={18} />
                Personal Tasks
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
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
                      const assignmentCount = getAssignmentCountForClass(classId);
                      const completedCount = getCompletedCountForClass(classId);
                      const completionPercentage = assignmentCount > 0 ? (completedCount / assignmentCount) * 100 : 0;
                      
                      return assignmentCount > 0 ? (
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
                              <FileText size={14} />
                              <span>{assignmentCount} assignment{assignmentCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="stat total">
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: getStatusColor('completed') }}>
                                {completionPercentage.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : null;
                    })
                  )}
                </div>
              </div>
            )}

            {/* Personal Tasks Tab */}
            {activeTab === 'personal' && (
              <div className="folder-section">
                <div className="folder-grid">
                  {loadingData ? (
                    <div className="loading-text">Loading personal tasks...</div>
                  ) : (
                    (() => {
                      const personalCount = getPersonalAssignments().length;
                      const personalCompleted = getPersonalAssignments().filter((a) => a.status === 'Completed').length;
                      const completionPercentage = personalCount > 0 ? (personalCompleted / personalCount) * 100 : 0;

                      return personalCount > 0 ? (
                        <div
                          className="folder-card"
                          onClick={() => handleFolderClick('personal', undefined, 'Personal Tasks')}
                          style={{ backgroundColor: '#fef3c7', borderLeft: '4px solid #f59e0b' }}
                        >
                          <div className="folder-icon">
                            <MdFolder size={36} color="#f59e0b" />
                          </div>
                          <div className="folder-info">
                            <h3>Personal Tasks</h3>
                            <span className="folder-code">Independent assignments without class</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <FileText size={14} />
                              <span>{personalCount} task{personalCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="stat total">
                              <span style={{ fontSize: '14px', fontWeight: 'bold', color: getStatusColor('completed') }}>
                                {completionPercentage.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="empty-text">No personal tasks found</div>
                      );
                    })()
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        // ASSIGNMENTS LIST VIEW
        <>
          {/* Search and Filter Bar */}
          <div className="search-filter-bar">
            <div className="search-input-wrapper">
              <MdSearch size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search by title or description..."
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
                  {filterStatus ? 1 : 0}
                </span>
              )}
            </button>

            {hasActiveFilters && (
              <button className="btn-clear-all" onClick={clearFilters}>
                <X size={16} /> Clear All
              </button>
            )}

            <div className="results-summary">
              <span>{displayedAssignments.length} assignment{displayedAssignments.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="filter-options">
              <div className="filter-group">
                <label>Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="">All Status</option>
                  {assignmentStatusOptions.map((opt) => (
                    <option key={opt.id} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Assignments Table */}
          <div className="payments-table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Description</th>
                  <th>Due Date</th>
                  <th>Submission Date</th>
                  <th>Status</th>
                  <th>Grade</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {state.loading ? (
                  <tr>
                    <td colSpan={7} className="text-center">Loading...</td>
                  </tr>
                ) : displayedAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center">
                      {hasActiveFilters ? 'No assignments match your criteria' : 'No assignments found'}
                    </td>
                  </tr>
                ) : (
                  displayedAssignments.map((assignment) => (
                    <tr key={assignment.assignment_id || assignment.id}>
                      <td style={{ fontWeight: '600' }}>{assignment.assignment_title}</td>
                      <td style={{ fontSize: '12px', color: '#666' }}>{assignment.description.substring(0, 50)}...</td>
                      <td>{new Date(assignment.due_date).toLocaleDateString()}</td>
                      <td>{new Date(assignment.submission_date).toLocaleDateString()}</td>
                      <td>
                        <span style={{ 
                          backgroundColor: getStatusColor(assignment.status), 
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>
                          {assignment.status}
                        </span>
                      </td>
                      <td>{assignment.grade || '-'}</td>
                      <td className="actions-cell">
                        <button className="btn-icon btn-edit" onClick={() => handleOpenModal(assignment)} title="Edit">
                          <MdEdit size={18} />
                        </button>
                        <button className="btn-icon btn-delete" onClick={() => handleDelete(assignment.assignment_id || assignment.id || 0)} title="Delete">
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
              <h2>{editingId ? 'Edit Assignment' : 'Add New Assignment'}</h2>
              <button className="btn-close" onClick={handleCloseModal}>
                <MdClose size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row full">
                <div className="form-group">
                  <label>Title *</label>
                  <input type="text" required value={formData.assignment_title || ''} onChange={(e) => setFormData({ ...formData, assignment_title: e.target.value })} />
                </div>
              </div>
              <div className="form-row full">
                <div className="form-group">
                  <label>Description *</label>
                  <textarea required value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <SelectField
                  label="Class (Optional - leave empty for personal task)"
                  name="class_id"
                  value={formData.class_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, class_id: e.target.value ? Number(e.target.value) : undefined })
                  }
                  options={classOptions}
                  isLoading={isLoadingOptions}
                  placeholder="Select a class or leave empty"
                />
                <div className="form-group">
                  <label>Due Date *</label>
                  <input type="date" required value={formData.due_date || ''} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Submission Date *</label>
                  <input type="date" required value={formData.submission_date || ''} onChange={(e) => setFormData({ ...formData, submission_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Status *</label>
                  <select required value={formData.status || 'Pending'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="form-select">
                    {assignmentStatusOptions.map((opt) => (
                      <option key={opt.id} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Grade</label>
                  <input type="number" step="0.1" value={formData.grade || ''} onChange={(e) => setFormData({ ...formData, grade: e.target.value ? Number(e.target.value) : undefined })} />
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

export default AssignmentsPage;
