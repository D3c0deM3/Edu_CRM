import { ReactNode } from 'react';
import { useEnhancedRBAC } from '../rbac/useEnhancedRBAC';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean; // If true, requires all permissions; if false, requires any
  fallback?: ReactNode;
  role?: string;
  roles?: string[];
}

export const PermissionGuard = ({
  children,
  permission,
  permissions = [],
  requireAll = false,
  fallback = null,
  role,
  roles = [],
}: PermissionGuardProps) => {
  const { canAccess, hasRole, hasAnyPermission, hasAllPermissions } = useEnhancedRBAC();

  // Check role-based access
  if (role && !hasRole(role)) {
    return <>{fallback}</>;
  }

  if (roles.length > 0) {
    const hasAnyRole = roles.some(r => hasRole(r));
    if (!hasAnyRole) {
      return <>{fallback}</>;
    }
  }

  // Check permission-based access
  if (permission && !canAccess(permission)) {
    return <>{fallback}</>;
  }

  if (permissions.length > 0) {
    const hasPermission = requireAll 
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);
    
    if (!hasPermission) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

// Higher-order component for route protection
export const withPermissionGuard = (
  Component: React.ComponentType<any>,
  requiredPermissions: string[] = [],
  requireAll: boolean = false
) => {
  return (props: any) => (
    <PermissionGuard 
      permissions={requiredPermissions} 
      requireAll={requireAll}
      fallback={<div>Access Denied</div>}
    >
      <Component {...props} />
    </PermissionGuard>
  );
};
