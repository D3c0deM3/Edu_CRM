import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppSelector, useRBAC } from '../../features/crm/hooks';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredUserType?: 'superuser' | 'teacher' | 'student';
  allowedUserTypes?: Array<'superuser' | 'teacher' | 'student'>;
  requiredPermission?: string;
}

export const ProtectedRoute = ({
  children,
  requiredUserType,
  allowedUserTypes,
  requiredPermission,
}: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { canAccess } = useRBAC();

  if (!isAuthenticated || !user) {
    // Redirect to the correct login page based on any stored user type
    const storedUser = localStorage.getItem('user');
    const userType = storedUser ? JSON.parse(storedUser)?.userType : null;
    const loginPath = userType === 'student' ? '/login/student' : userType === 'teacher' ? '/login/teacher' : '/login/superuser';
    return <Navigate to={loginPath} replace />;
  }

  // Check if user type is in allowed list
  if (allowedUserTypes && allowedUserTypes.length > 0) {
    if (!allowedUserTypes.includes(user.userType as 'superuser' | 'teacher' | 'student')) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check single required user type
  if (requiredUserType && user.userType !== requiredUserType) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermission && !canAccess(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
