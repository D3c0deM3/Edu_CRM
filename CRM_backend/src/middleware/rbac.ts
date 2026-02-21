import { Request, Response, NextFunction } from 'express';

// Enhanced RBAC middleware for fine-grained permissions
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Superusers have all permissions
    if (user.userType === 'superuser') {
      next();
      return;
    }

    // Check if user has the required permission
    if (user.userType === 'teacher' && user.roles && user.roles.includes(permission)) {
      next();
      return;
    }

    res.status(403).json({ error: 'Insufficient permissions' });
  };
};

// Require multiple permissions (any or all)
export const requirePermissions = (
  permissions: string[], 
  requireAll: boolean = false
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (user.userType === 'superuser') {
      next();
      return;
    }

    const userPermissions = user.roles || [];
    
    const hasPermission = requireAll 
      ? permissions.every(p => userPermissions.includes(p))
      : permissions.some(p => userPermissions.includes(p));

    if (hasPermission) {
      next();
      return;
    }

    res.status(403).json({ error: 'Insufficient permissions' });
  };
};

// Resource owner check (users can only access their own resources)
export const requireOwnership = (resourceIdParam: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    const resourceId = req.params[resourceIdParam];
    
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Superusers and teachers can access any resource
    if (user.userType === 'superuser' || user.userType === 'teacher') {
      next();
      return;
    }

    // Students can only access their own resources
    if (user.userType === 'student') {
      const studentId = user.id.toString();
      if (resourceId === studentId) {
        next();
        return;
      }
    }

    res.status(403).json({ error: 'Access denied' });
  };
};

// Check if user can access a specific student's data
export const canAccessStudentData = () => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    const studentId = req.params.studentId || req.params.id;
    
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Superusers can access any student data
    if (user.userType === 'superuser') {
      next();
      return;
    }

    // Teachers can access any student data
    if (user.userType === 'teacher') {
      next();
      return;
    }

    // Students can only access their own data
    if (user.userType === 'student' && user.id.toString() === studentId) {
      next();
      return;
    }

    res.status(403).json({ error: 'Access denied' });
  };
};

// Permission codes constants
export const PERMISSIONS = {
  CRUD_STUDENT: 'CRUD_STUDENT',
  CRUD_TEACHER: 'CRUD_TEACHER',
  CRUD_CLASS: 'CRUD_CLASS',
  CRUD_PAYMENT: 'CRUD_PAYMENT',
  CRUD_GRADE: 'CRUD_GRADE',
  CRUD_ATTENDANCE: 'CRUD_ATTENDANCE',
  CRUD_ASSIGNMENT: 'CRUD_ASSIGNMENT',
  CRUD_SUBJECT: 'CRUD_SUBJECT',
  CRUD_DEBT: 'CRUD_DEBT',
  CRUD_CENTER: 'CRUD_CENTER',
  VIEW_REPORTS: 'VIEW_REPORTS',
  MANAGE_USERS: 'MANAGE_USERS',
  VIEW_OWN_GRADES: 'VIEW_OWN_GRADES',
  VIEW_OWN_ATTENDANCE: 'VIEW_OWN_ATTENDANCE',
  VIEW_OWN_ASSIGNMENTS: 'VIEW_OWN_ASSIGNMENTS',
  SUBMIT_ASSIGNMENT: 'SUBMIT_ASSIGNMENT',
  VIEW_CLASS_SCHEDULE: 'VIEW_CLASS_SCHEDULE',
} as const;
