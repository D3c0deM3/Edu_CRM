import { useState, useEffect, memo } from 'react';
import { studentAPI, teacherAPI, centerAPI, superuserAPI } from '../../shared/api/api';
import { showToast, handleApiError } from '../../utils/toast';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';

interface FormData {
  [key: string]: string | number | boolean;
}

const OwnerManager = memo(() => {
  const [activeTab, setActiveTab] = useState<'centers' | 'superusers' | 'teachers' | 'students'>(
    'centers'
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [formData, setFormData] = useState<FormData>({});

  const centerFields = [
    { name: 'center_name', label: 'Center Name', type: 'text', required: true },
    { name: 'center_code', label: 'Center Code', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'text', required: true },
    { name: 'address', label: 'Address', type: 'text', required: true },
    { name: 'city', label: 'City', type: 'text', required: true },
    { name: 'principal_name', label: 'Principal Name', type: 'text', required: true },
  ];

  const superuserFields = [
    { name: 'center_id', label: 'Center ID', type: 'number', required: true },
    { name: 'username', label: 'Username', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'password', label: 'Password', type: 'password', required: true },
    { name: 'first_name', label: 'First Name', type: 'text', required: true },
    { name: 'last_name', label: 'Last Name', type: 'text', required: true },
    { name: 'role', label: 'Role', type: 'text', required: true },
    { name: 'status', label: 'Status', type: 'text', required: true },
  ];

  const teacherFields = [
    { name: 'center_id', label: 'Center ID', type: 'number', required: true },
    { name: 'employee_id', label: 'Employee ID', type: 'text', required: true },
    { name: 'first_name', label: 'First Name', type: 'text', required: true },
    { name: 'last_name', label: 'Last Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'text', required: true },
    { name: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
    { name: 'gender', label: 'Gender', type: 'text', required: true },
    { name: 'qualification', label: 'Qualification', type: 'text', required: true },
    { name: 'specialization', label: 'Specialization', type: 'text', required: true },
    { name: 'status', label: 'Status', type: 'text', required: true },
  ];

  const studentFields = [
    { name: 'center_id', label: 'Center ID', type: 'number', required: true },
    { name: 'enrollment_number', label: 'Enrollment Number', type: 'text', required: true },
    { name: 'first_name', label: 'First Name', type: 'text', required: true },
    { name: 'last_name', label: 'Last Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'text', required: true },
    { name: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
    { name: 'parent_name', label: 'Parent Name', type: 'text', required: true },
    { name: 'parent_phone', label: 'Parent Phone', type: 'text', required: true },
    { name: 'gender', label: 'Gender', type: 'text', required: true },
    { name: 'status', label: 'Status', type: 'text', required: true },
    { name: 'teacher_id', label: 'Teacher ID', type: 'number', required: true },
    { name: 'class_id', label: 'Class ID', type: 'number', required: true },
  ];

  const getFields = () => {
    switch (activeTab) {
      case 'centers':
        return centerFields;
      case 'superusers':
        return superuserFields;
      case 'teachers':
        return teacherFields;
      case 'students':
        return studentFields;
      default:
        return [];
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let response;
      switch (activeTab) {
        case 'centers':
          response = await centerAPI.getAll();
          break;
        case 'superusers':
          response = await superuserAPI.getAll();
          break;
        case 'teachers':
          response = await teacherAPI.getAll();
          break;
        case 'students':
          response = await studentAPI.getAll();
          break;
        default:
          response = { data: [] };
      }
      setData(response.data);
      showToast.success(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} loaded successfully!`);
    } catch (err) {
      const errorMessage = handleApiError(err);
      showToast.error(errorMessage);
      setData([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    setFormData({});
    setEditingId(null);
    setShowForm(false);
  }, [activeTab]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        // Update
        switch (activeTab) {
          case 'centers':
            await centerAPI.update(editingId, formData);
            break;
          case 'superusers':
            await superuserAPI.update(editingId, formData);
            break;
          case 'teachers':
            await teacherAPI.update(editingId, formData);
            break;
          case 'students':
            await studentAPI.update(editingId, formData);
            break;
        }
      } else {
        // Create
        switch (activeTab) {
          case 'centers':
            await centerAPI.create(formData);
            break;
          case 'superusers':
            await superuserAPI.create(formData);
            break;
          case 'teachers':
            await teacherAPI.create(formData);
            break;
          case 'students':
            await studentAPI.create(formData);
            break;
        }
      }

      setFormData({});
      setEditingId(null);
      setShowForm(false);
      await fetchData();
    } catch (err) {
      const errorMessage = handleApiError(err);
      showToast.error(errorMessage);
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure?')) return;

    setLoading(true);
    try {
      switch (activeTab) {
        case 'centers':
          await centerAPI.delete(id);
          break;
        case 'superusers':
          await superuserAPI.delete(id);
          break;
        case 'teachers':
          await teacherAPI.delete(id);
          break;
        case 'students':
          await studentAPI.delete(id);
          break;
      }
      showToast.success('Record deleted successfully!');
      await fetchData();
    } catch (err) {
      const errorMessage = handleApiError(err);
      showToast.error(errorMessage);
    }
    setLoading(false);
  };

  const handleEdit = (item: any) => {
    setFormData(item);
    setEditingId(item.id || item.superuser_id || item.center_id);
    setShowForm(true);
  };

  return (
    <div className="owner-manager">
      <div className="dashboard-header">
        <h1>Database Manager</h1>
        <p>Manage all system data: Centers, Superusers, Teachers, Students</p>
      </div>

      {/* Tabs */}
      <div className="manager-tabs">
        <button
          className={`tab ${activeTab === 'centers' ? 'active' : ''}`}
          onClick={() => setActiveTab('centers')}
        >
          Centers
        </button>
        <button
          className={`tab ${activeTab === 'superusers' ? 'active' : ''}`}
          onClick={() => setActiveTab('superusers')}
        >
          Superusers
        </button>
        <button
          className={`tab ${activeTab === 'teachers' ? 'active' : ''}`}
          onClick={() => setActiveTab('teachers')}
        >
          Teachers
        </button>
        <button
          className={`tab ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          Students
        </button>
      </div>

      {/* Add Button */}
      <div className="manager-actions">
        <button
          className="add-btn"
          onClick={() => {
            setFormData({});
            setEditingId(null);
            setShowForm(!showForm);
          }}
        >
          <Plus size={20} />
          Add New {activeTab.slice(0, -1)}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="manager-form">
          <div className="form-header">
            <h3>{editingId ? 'Edit' : 'Add New'} {activeTab.slice(0, -1)}</h3>
            <button className="close-form-btn" onClick={() => setShowForm(false)}>
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-fields">
              {getFields().map((field) => (
                <div key={field.name} className="form-field">
                  <label htmlFor={field.name}>{field.label}</label>
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    value={String(formData[field.name] || '')}
                    onChange={handleInputChange}
                    required={field.required}
                    disabled={loading}
                  />
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button type="submit" className="submit-btn" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => setShowForm(false)}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Data Table */}
      <div className="manager-table">
        {loading && !showForm ? (
          <p className="loading-text">Loading...</p>
        ) : data.length === 0 ? (
          <p className="empty-text">No data found</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {getFields().map((field) => (
                    <th key={field.name}>{field.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id || item.superuser_id || item.center_id}>
                    {getFields().map((field) => (
                      <td key={field.name}>{String(item[field.name] || '-')}</td>
                    ))}
                    <td className="actions-cell">
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(item)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() =>
                          handleDelete(item.id || item.superuser_id || item.center_id)
                        }
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
});

OwnerManager.displayName = 'OwnerManager';
export default OwnerManager;
