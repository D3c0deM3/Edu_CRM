import { PERMISSION_CODES } from '../../../types';

// Role-based permissions configuration
export const ROLE_PERMISSIONS = {
  superuser: Object.values(PERMISSION_CODES),
  teacher: [
    PERMISSION_CODES.CRUD_STUDENT,
    PERMISSION_CODES.CRUD_CLASS,
    PERMISSION_CODES.CRUD_GRADE,
    PERMISSION_CODES.CRUD_ATTENDANCE,
    PERMISSION_CODES.CRUD_ASSIGNMENT,
    PERMISSION_CODES.CRUD_SUBJECT,
    PERMISSION_CODES.VIEW_REPORTS,
  ],
  student: [
    'VIEW_OWN_GRADES',
    'VIEW_OWN_ATTENDANCE',
    'VIEW_OWN_ASSIGNMENTS',
    'SUBMIT_ASSIGNMENT',
    'VIEW_CLASS_SCHEDULE',
  ],
};

// Permission descriptions for UI
export const PERMISSION_DESCRIPTIONS = {
  [PERMISSION_CODES.CRUD_STUDENT]: 'Create, read, update, and delete student records',
  [PERMISSION_CODES.CRUD_TEACHER]: 'Create, read, update, and delete teacher records',
  [PERMISSION_CODES.CRUD_CLASS]: 'Create, read, update, and delete class records',
  [PERMISSION_CODES.CRUD_PAYMENT]: 'Create, read, update, and delete payment records',
  [PERMISSION_CODES.CRUD_GRADE]: 'Create, read, update, and delete grade records',
  [PERMISSION_CODES.CRUD_ATTENDANCE]: 'Create, read, update, and delete attendance records',
  [PERMISSION_CODES.CRUD_ASSIGNMENT]: 'Create, read, update, and delete assignment records',
  [PERMISSION_CODES.CRUD_SUBJECT]: 'Create, read, update, and delete subject records',
  [PERMISSION_CODES.CRUD_DEBT]: 'Create, read, update, and delete debt records',
  [PERMISSION_CODES.CRUD_CENTER]: 'Create, read, update, and delete center records',
  [PERMISSION_CODES.VIEW_REPORTS]: 'View system reports and analytics',
  [PERMISSION_CODES.MANAGE_USERS]: 'Manage user accounts and permissions',
  'VIEW_OWN_GRADES': 'View own grade records',
  'VIEW_OWN_ATTENDANCE': 'View own attendance records',
  'VIEW_OWN_ASSIGNMENTS': 'View own assignment records',
  'SUBMIT_ASSIGNMENT': 'Submit assignment responses',
  'VIEW_CLASS_SCHEDULE': 'View class schedule and timetable',
};

// Route permissions mapping
export const ROUTE_PERMISSIONS = {
  '/dashboard': null, // Accessible by all authenticated users
  '/students': PERMISSION_CODES.CRUD_STUDENT,
  '/teachers': PERMISSION_CODES.CRUD_TEACHER,
  '/classes': PERMISSION_CODES.CRUD_CLASS,
  '/payments': PERMISSION_CODES.CRUD_PAYMENT,
  '/grades': PERMISSION_CODES.CRUD_GRADE,
  '/attendance': PERMISSION_CODES.CRUD_ATTENDANCE,
  '/assignments': PERMISSION_CODES.CRUD_ASSIGNMENT,
  '/subjects': PERMISSION_CODES.CRUD_SUBJECT,
  '/debts': PERMISSION_CODES.CRUD_DEBT,
  '/centers': PERMISSION_CODES.CRUD_CENTER,
  '/reports': PERMISSION_CODES.VIEW_REPORTS,
  '/users': PERMISSION_CODES.MANAGE_USERS,
  '/teacher-portal': null, // Teacher specific route
  '/student-portal': null, // Student specific route
  '/my-tests': 'VIEW_OWN_ASSIGNMENTS',
};

// Helper functions
export const hasPermission = (userRole: string, userPermissions: string[] = [], requiredPermission: string): boolean => {
  if (userRole === 'superuser') return true;
  
  const rolePermissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];
  const allPermissions = [...rolePermissions, ...userPermissions];
  
  return allPermissions.includes(requiredPermission);
};

export const canAccessRoute = (user: any, route: string): boolean => {
  if (!user) return false;
  
  const requiredPermission = ROUTE_PERMISSIONS[route as keyof typeof ROUTE_PERMISSIONS];
  
  if (requiredPermission === null) return true; // Route accessible by all authenticated users
  
  return hasPermission(user.userType, user.roles || [], requiredPermission);
};

export const getAccessibleRoutes = (user: any): string[] => {
  if (!user) return [];
  
  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([_, permission]) => permission === null || hasPermission(user.userType, user.roles || [], permission))
    .map(([route, _]) => route);
};
