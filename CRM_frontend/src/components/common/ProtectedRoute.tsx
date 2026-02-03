import './ProtectedRoute.css';
import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppSelector, useRBAC } from '../../features/crm/hooks';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredUserType?: 'superuser' | 'teacher' | 'student';
  requiredPermission?: string;
}

export const ProtectedRoute = ({
  children,
  requiredUserType,
  requiredPermission,
}: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { canAccess } = useRBAC();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login/superuser" replace />;
  }

  if (requiredUserType && user.userType !== requiredUserType) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (requiredPermission && !canAccess(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
