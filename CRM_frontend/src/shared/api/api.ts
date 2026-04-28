import axios from 'axios';
import { showToast, handleApiError } from '../../utils/toast';

const configuredApiOrigin = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const defaultApiOrigin = import.meta.env.PROD
  ? 'https://guarded-fortress-75118-0236acf5cd86.herokuapp.com'
  : 'http://localhost:3000';
const apiOrigin = configuredApiOrigin || defaultApiOrigin;
const API_BASE_URL = apiOrigin.endsWith('/api') ? apiOrigin : `${apiOrigin}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const desktopAdminClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

desktopAdminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('desktopAdminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => {
    // Show success toast for POST, PUT, DELETE requests
    if (response.config.method && ['post', 'put', 'delete'].includes(response.config.method)) {
      const message = response.data?.message || 'Operation successful!';
      showToast.success(message);
    }
    return response;
  },
  (error) => {
    // Handle 401 (unauthorized) - token expired or invalid
    if (error.response?.status === 401) {
      // Clear auth data and redirect to appropriate login page
      const storedUser = localStorage.getItem('user');
      const userType = storedUser ? JSON.parse(storedUser)?.userType : null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const errorMessage = error.response?.data?.error || 'Session expired. Please log in again.';
      showToast.error(errorMessage);
      // Redirect to the correct login page for the user's role
      const loginPath = userType === 'student' ? '/login/student' : userType === 'teacher' ? '/login/teacher' : '/login/superuser';
      if (!window.location.pathname.includes('/login')) {
        window.location.href = loginPath;
      }
      return Promise.reject(error);
    }

    // Handle 403 (forbidden) - insufficient permissions
    if (error.response?.status === 403) {
      const errorMessage = error.response?.data?.error || 'Access denied. Insufficient permissions.';
      showToast.error(errorMessage);
      return Promise.reject(error);
    }

    const errorMessage = handleApiError(error);
    showToast.error(errorMessage);
    return Promise.reject(error);
  }
);

// API Services
export const studentAPI = {
  getAll: () => apiClient.get('/students'),
  getById: (id: number) => apiClient.get(`/students/${id}`),
  create: (data: any) => apiClient.post('/students', data),
  update: (id: number, data: any) => apiClient.put(`/students/${id}`, data),
  delete: (id: number) => apiClient.delete(`/students/${id}`),
};

export const teacherAPI = {
  getAll: () => apiClient.get('/teachers'),
  getById: (id: number) => apiClient.get(`/teachers/${id}`),
  create: (data: any) => apiClient.post('/teachers', data),
  update: (id: number, data: any) => apiClient.put(`/teachers/${id}`, data),
  delete: (id: number) => apiClient.delete(`/teachers/${id}`),
};

export const classAPI = {
  getAll: () => apiClient.get('/classes'),
  getById: (id: number) => apiClient.get(`/classes/${id}`),
  create: (data: any) => apiClient.post('/classes', data),
  update: (id: number, data: any) => apiClient.put(`/classes/${id}`, data),
  delete: (id: number) => apiClient.delete(`/classes/${id}`),
};

export const paymentAPI = {
  getAll: () => apiClient.get('/payments'),
  getById: (id: number) => apiClient.get(`/payments/${id}`),
  getByStudent: (studentId: number) => apiClient.get(`/payments/student/${studentId}`),
  create: (data: any) => apiClient.post('/payments', data),
  update: (id: number, data: any) => apiClient.put(`/payments/${id}`, data),
  delete: (id: number) => apiClient.delete(`/payments/${id}`),
};

export const gradeAPI = {
  getAll: () => apiClient.get('/grades'),
  getById: (id: number) => apiClient.get(`/grades/${id}`),
  getByStudent: (studentId: number) => apiClient.get(`/grades/student/${studentId}`),
  create: (data: any) => apiClient.post('/grades', data),
  bulkCreate: (grades: any[]) => apiClient.post('/grades/bulk', { grades }),
  update: (id: number, data: any) => apiClient.put(`/grades/${id}`, data),
  delete: (id: number) => apiClient.delete(`/grades/${id}`),
};

export const attendanceAPI = {
  getAll: () => apiClient.get('/attendance'),
  getById: (id: number) => apiClient.get(`/attendance/${id}`),
  getByStudent: (studentId: number) => apiClient.get(`/attendance/student/${studentId}`),
  getByClass: (classId: number) => apiClient.get(`/attendance/class/${classId}`),
  create: (data: any) => apiClient.post('/attendance', data),
  bulkCreate: (records: any[]) => apiClient.post('/attendance/bulk', { records }),
  update: (id: number, data: any) => apiClient.put(`/attendance/${id}`, data),
  delete: (id: number) => apiClient.delete(`/attendance/${id}`),
  createQrSession: (data: any) => apiClient.post('/attendance/qr-sessions', data),
  getQrSessions: (params?: Record<string, any>) => apiClient.get('/attendance/qr-sessions', { params }),
  getQrSession: (sessionToken: string) => apiClient.get(`/attendance/qr-sessions/${sessionToken}`),
  checkInQrSession: (sessionToken: string, data: any) =>
    apiClient.post(`/attendance/qr-sessions/${sessionToken}/check-in`, data),
  closeQrSession: (sessionToken: string) => apiClient.post(`/attendance/qr-sessions/${sessionToken}/close`),
};

export const assignmentAPI = {
  getAll: () => apiClient.get('/assignments'),
  getById: (id: number) => apiClient.get(`/assignments/${id}`),
  create: (data: any) => apiClient.post('/assignments', data),
  update: (id: number, data: any) => apiClient.put(`/assignments/${id}`, data),
  delete: (id: number) => apiClient.delete(`/assignments/${id}`),
};

export const debtAPI = {
  getAll: () => apiClient.get('/debts'),
  getById: (id: number) => apiClient.get(`/debts/${id}`),
  getByStudent: (studentId: number) => apiClient.get(`/debts/student/${studentId}`),
  getPaymentSummary: (studentId: number) => apiClient.get(`/debts/student/${studentId}/summary`),
  analyzeUnpaidMonths: (params?: { center_id?: number; start_date?: string; end_date?: string }) => 
    apiClient.get('/debts/analyze', { params }),
  generateFromAnalysis: (data: { student_ids: number[]; monthly_fee?: number; center_id?: number; remarks?: string }) =>
    apiClient.post('/debts/generate-from-analysis', data),
  create: (data: any) => apiClient.post('/debts', data),
  update: (id: number, data: any) => apiClient.put(`/debts/${id}`, data),
  delete: (id: number) => apiClient.delete(`/debts/${id}`),
};

export const teacherSalaryAPI = {
  getOverview: (params?: { month?: number; year?: number }) =>
    apiClient.get('/teacher-salaries/overview', { params }),
  getRates: () => apiClient.get('/teacher-salaries/rates'),
  createRate: (data: any) => apiClient.post('/teacher-salaries/rates', data),
  updateRate: (id: number, data: any) => apiClient.put(`/teacher-salaries/rates/${id}`, data),
  deleteRate: (id: number) => apiClient.delete(`/teacher-salaries/rates/${id}`),
  getPayments: (params?: { teacher_id?: number; month?: number; year?: number }) =>
    apiClient.get('/teacher-salaries/payments', { params }),
  createPayment: (data: any) => apiClient.post('/teacher-salaries/payments', data),
  updatePayment: (id: number, data: any) => apiClient.put(`/teacher-salaries/payments/${id}`, data),
  deletePayment: (id: number) => apiClient.delete(`/teacher-salaries/payments/${id}`),
};

export const testAPI = {
  // Test CRUD
  getAll: (params?: { center_id?: number; test_type?: string; is_active?: boolean; subject_id?: number }) =>
    apiClient.get('/tests', { params }),
  getById: (id: number) => apiClient.get(`/tests/${id}`),
  create: (data: any) => apiClient.post('/tests', data),
  update: (id: number, data: any) => apiClient.put(`/tests/${id}`, data),
  delete: (id: number) => apiClient.delete(`/tests/${id}`),
  
  // Questions
  addQuestion: (testId: number, data: any) => apiClient.post(`/tests/${testId}/questions`, data),
  updateQuestion: (questionId: number, data: any) => apiClient.put(`/tests/questions/${questionId}`, data),
  deleteQuestion: (questionId: number) => apiClient.delete(`/tests/questions/${questionId}`),
  
  // Passages
  addPassage: (testId: number, data: any) => apiClient.post(`/tests/${testId}/passages`, data),
  updatePassage: (passageId: number, data: any) => apiClient.put(`/tests/passages/${passageId}`, data),
  deletePassage: (passageId: number) => apiClient.delete(`/tests/passages/${passageId}`),
  
  // Submissions
  startTest: (testId: number, studentId: number, userType?: string) => 
    apiClient.post(`/tests/${testId}/start`, { student_id: studentId, user_type: userType }),
  submitTest: (submissionId: number, answers: any) => apiClient.post(`/tests/submissions/${submissionId}/submit`, { answers }),
  gradeSubmission: (submissionId: number, data: any) => apiClient.post(`/tests/submissions/${submissionId}/grade`, data),
  getSubmissionsByTest: (testId: number) => apiClient.get(`/tests/${testId}/submissions`),
  getSubmissionsByStudent: (studentId: number) => apiClient.get(`/tests/student/${studentId}/submissions`),
  getSubmissionDetails: (submissionId: number) => apiClient.get(`/tests/submissions/${submissionId}`),
  
  // Results
  getTestResults: (testId: number) => apiClient.get(`/tests/${testId}/results`),
  getStudentResults: (studentId: number) => apiClient.get(`/tests/student/${studentId}/results`),
  
  // Assignments
  assignTest: (testId: number, assignments: any[], assignedBy: number) =>
    apiClient.post(`/tests/${testId}/assign`, { assignments, assigned_by: assignedBy }),
  getAssignedTests: (type: 'student' | 'teacher' | 'class', id: number, studentId?: number) =>
    apiClient.get(`/tests/assigned/${type}/${id}${studentId ? `?student_id=${studentId}` : ''}`),
};

export const centerAPI = {
  getAll: () => apiClient.get('/centers'),
  getById: (id: number) => apiClient.get(`/centers/${id}`),
  create: (data: any) => apiClient.post('/centers', data),
  update: (id: number, data: any) => apiClient.put(`/centers/${id}`, data),
  delete: (id: number) => apiClient.delete(`/centers/${id}`),
};

export const subjectAPI = {
  getAll: () => apiClient.get('/subjects'),
  getById: (id: number) => apiClient.get(`/subjects/${id}`),
  getByClass: (classId: number) => apiClient.get(`/subjects/class/${classId}`),
  create: (data: any) => apiClient.post('/subjects', data),
  update: (id: number, data: any) => apiClient.put(`/subjects/${id}`, data),
  delete: (id: number) => apiClient.delete(`/subjects/${id}`),
};

export const superuserAPI = {
  login: (credentials: { username: string; password: string }) =>
    apiClient.post('/superusers/auth/login', credentials),
  getAll: () => apiClient.get('/superusers'),
  getById: (id: number) => apiClient.get(`/superusers/${id}`),
  create: (data: any) => apiClient.post('/superusers', data),
  update: (id: number, data: any) => apiClient.put(`/superusers/${id}`, data),
  delete: (id: number) => apiClient.delete(`/superusers/${id}`),
};

export const authAPI = {
  loginSuperuser: (credentials: { username: string; password: string }) =>
    superuserAPI.login(credentials),
  loginTeacher: (credentials: { username: string; password: string }) =>
    apiClient.post('/teachers/auth/login', credentials),
  loginStudent: (credentials: { username: string; password: string }) =>
    apiClient.post('/students/auth/login', credentials),
};

export const desktopAdminAPI = {
  login: (credentials: { username: string; password: string }) =>
    desktopAdminClient.post('/desktop-auth/admin/login', credentials),
  getUsers: () => desktopAdminClient.get('/desktop-auth/admin/users'),
  activateUser: (id: number) => desktopAdminClient.post(`/desktop-auth/admin/users/${id}/activate`),
  deactivateUser: (id: number) => desktopAdminClient.post(`/desktop-auth/admin/users/${id}/deactivate`),
};
