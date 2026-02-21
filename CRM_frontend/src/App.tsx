import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './features/crm/hooks';
import { initializeAuth } from './slices/authSlice';
import Layout from './components/layout/Layout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { OwnerLoginPage } from './pages/auth/OwnerLoginPage';
import Dashboard from './features/crm/dashboard/Dashboard';
import OwnerManager from './pages/owner/OwnerManager';
import { useThemeMode } from './theme/ThemeContext';
import { Loader2 } from 'lucide-react';

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
const TestsPage = lazy(() => import('./features/crm/tests/TestsPage'));
const CreateTestPage = lazy(() => import('./features/crm/tests/CreateTestPage'));
const TestDetailPage = lazy(() => import('./features/crm/tests/TestDetailPage'));
const TakeTestPage = lazy(() => import('./features/crm/tests/TakeTestPage'));
const StudentTestsPage = lazy(() => import('./features/crm/tests/StudentTestsPage'));
const TestAssignPage = lazy(() => import('./features/crm/tests/TestAssignPage'));
const GradeSubmissionPage = lazy(() => import('./features/crm/tests/GradeSubmissionPage'));
const ViewSubmissionPage = lazy(() => import('./features/crm/tests/ViewSubmissionPage'));
const TeacherPortal = lazy(() => import('./features/teacher/TeacherPortal'));
const StudentPortal = lazy(() => import('./features/student/StudentPortal'));

// Loading component
const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">Loading...</p>
  </div>
);

// Unauthorized page
const UnauthorizedPage = () => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center">
    <h1 className="text-4xl font-bold text-destructive">Access Denied</h1>
    <p className="text-muted-foreground">You don't have permission to access this resource.</p>
    <a href="/dashboard" className="text-primary hover:underline font-medium">Go to Dashboard</a>
  </div>
);

// Role-based redirect for default/catch-all routes
const RoleBasedRedirect = () => {
  const { isAuthenticated, user } = useAppSelector((state: any) => state.auth);
  
  if (!isAuthenticated || !user) {
    return <Navigate to="/login/superuser" replace />;
  }
  
  switch (user.userType) {
    case 'student':
      return <Navigate to="/student-portal" replace />;
    case 'teacher':
      return <Navigate to="/teacher-portal" replace />;
    case 'superuser':
    default:
      return <Navigate to="/dashboard" replace />;
  }
};

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
          <ProtectedRoute requiredUserType="superuser">
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
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/students"
        element={
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
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
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
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
          <ProtectedRoute requiredUserType="superuser">
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
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
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
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
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
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
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
          <ProtectedRoute requiredUserType="superuser">
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
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
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
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <SubjectsPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Tests Routes */}
      <Route
        path="/my-tests"
        element={
          <ProtectedRoute allowedUserTypes={['student']}>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <StudentTestsPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests"
        element={
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <TestsPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/create"
        element={
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <CreateTestPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/:testId"
        element={
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <TestDetailPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/:testId/edit"
        element={
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <CreateTestPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/:testId/assign"
        element={
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <TestAssignPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/take/:submissionId"
        element={
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher', 'student']}>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <TakeTestPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/submissions/:submissionId/grade"
        element={
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <GradeSubmissionPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tests/submissions/:submissionId"
        element={
          <ProtectedRoute allowedUserTypes={['superuser', 'teacher']}>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <ViewSubmissionPage />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Teacher Portal */}
      <Route
        path="/teacher-portal"
        element={
          <ProtectedRoute allowedUserTypes={['teacher']}>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <TeacherPortal />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Student Portal */}
      <Route
        path="/student-portal"
        element={
          <ProtectedRoute allowedUserTypes={['student']}>
            <Layout>
              <Suspense fallback={<LoadingSpinner />}>
                <StudentPortal />
              </Suspense>
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Default route - role-aware redirect */}
      <Route path="/" element={<RoleBasedRedirect />} />
      <Route path="*" element={<RoleBasedRedirect />} />
    </Routes>
  );
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
        <ThemedToast />
      </BrowserRouter>
    </Provider>
  );
}

function ThemedToast() {
  const { isDark } = useThemeMode();
  return (
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
      theme={isDark ? 'dark' : 'light'}
    />
  );
}

export default App;
