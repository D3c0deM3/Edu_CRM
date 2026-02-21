import { useAppSelector } from './useAppSelector';
import type { AuthUser } from '../../../types';

interface RBACContextType {
  canAccess: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  user: AuthUser | null;
}

export const useRBAC = (): RBACContextType => {
  const user = useAppSelector((state) => state.auth.user);

  const canAccess = (permission: string): boolean => {
    if (!user) return false;

    // Superusers have all permissions
    if (user.userType === 'superuser') {
      return true;
    }

    // Teachers check for specific role codes
    if (user.userType === 'teacher' && user.roles) {
      return user.roles.includes(permission);
    }

    return false;
  };

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    if (user.userType === 'superuser') return true;
    if (user.roles) return user.roles.includes(role);
    return user.role === role;
  };

  return {
    canAccess,
    hasRole,
    user,
  };
};
