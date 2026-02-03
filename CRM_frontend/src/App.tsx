import './App.css';
import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { store } from './store';
import { useAppDispatch } from './features/crm/hooks';
import { initializeAuth } from './slices/authSlice';
import Layout from './components/layout/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { OwnerLoginPage } from './pages/auth/OwnerLoginPage';
import Dashboard from './features/crm/dashboard/Dashboard';
import OwnerManager from './pages/owner/OwnerManager';

// Lazy load pages for better performance
const StudentsPage = lazy(() => import('./features/crm/students/StudentsPage'));
const StudentDetailPage = lazy(() => import('./features/crm/students/StudentDetailPage'));
const TeachersPage = lazy(() => import('./features/crm/teachers/TeachersPage'));
const TeacherDetailPage = lazy(() => import('./features/crm/teachers/TeacherDetailPage'));
const PaymentsPage = lazy(() => import('./features/crm/payments/PaymentsPage'));
const GradesPage = lazy(() => import('./features/crm/grades/GradesPage'));
const AttendancePage = lazy(() => import('./features/crm/attendance/AttendancePage'));
const ClassesPage = lazy(() => import('./features/crm/classes/ClassesPage'));
const CentersPage = lazy(() => import('./features/crm/centers/CentersPage'));
const DebtsPage = lazy(() => import('./features/crm/debts/DebtsPage'));
const AssignmentsPage = lazy(() => import('./features/crm/assignments/AssignmentsPage'));
const SubjectsPage = lazy(() => import('./features/crm/subjects/SubjectsPage'));

// Loading component
const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Loading...</p>
  </div>
);

// Unauthorized page
const UnauthorizedPage = () => (
  <div className="unauthorized">
    <h1>Access Denied</h1>
    <p>You don't have permission to access this resource.</p>
    <a href="/dashboard">Go to Dashboard</a>
  </div>
);

function AppContent() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login/owner" element={<OwnerLoginPage />} />
      <Route path="/login/superuser" element={<LoginPage userType="superuser" />} />
      <Route path="/login/teacher" element={<LoginPage userType="teacher" />} />
      <Route path="/login/student" element={<LoginPage userType="student" />} />

      {/* Owner Routes */}
      <Route
        path="/owner/manage"
        element={
          <ProtectedRoute>
            <Layout>
              <OwnerManager />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Unauthorized */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <StudentsPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/:studentId"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <StudentDetailPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teachers"
        element={
          <ProtectedRoute requiredUserType="superuser">
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <TeachersPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/teacher/:teacherId"
        element={
          <ProtectedRoute requiredUserType="superuser">
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <TeacherDetailPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <PaymentsPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/grades"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <GradesPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/attendance"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <AttendancePage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/classes"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <ClassesPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/centers"
        element={
          <ProtectedRoute requiredUserType="superuser">
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <CentersPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/debts"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <DebtsPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/assignments"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <AssignmentsPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/subjects"
        element={
          <ProtectedRoute>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <SubjectsPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Default route */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
