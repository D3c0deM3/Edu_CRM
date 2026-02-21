// Auth Types
export interface AuthUser {
  id: number;
  username?: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  roles?: string[]; // For teachers
  userType: 'superuser' | 'teacher' | 'student';
  center_id: number;
  class_id?: number; // For students
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Student Types
export interface Student {
  id?: number;
  center_id: number;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  parent_name: string;
  parent_phone: string;
  gender: string;
  status: string;
  teacher_id: number;
  class_id: number;
}

// Teacher Types
export interface Teacher {
  id?: number;
  center_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  qualification: string;
  specialization: string;
  status: string;
  roles: string[];
}

// Class Types
export interface Class {
  id?: number;
  center_id: number;
  class_name: string;
  class_code: string;
  level: number;
  section: string;
  capacity: number;
  teacher_id: number;
  room_number: string;
  payment_amount: number;
  payment_frequency: string;
}

// Payment Types
export interface Payment {
  id?: number;
  student_id: number;
  center_id: number;
  payment_date: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_reference: string;
  receipt_number: string;
  payment_status: string;
  payment_type: string;
  notes: string;
}

// Grade Types
export interface Grade {
  id?: number;
  student_id: number;
  teacher_id: number;
  subject: string;
  class_id: number;
  marks_obtained: number;
  total_marks: number;
  percentage: number;
  grade_letter: string;
  academic_year: number;
  term: string;
}

// Attendance Types
export interface Attendance {
  id?: number;
  student_id: number;
  teacher_id: number;
  class_id: number;
  attendance_date: string;
  status: string;
  remarks: string;
}

// Assignment Types
export interface Assignment {
  id?: number;
  class_id: number;
  assignment_title: string;
  description: string;
  due_date: string;
  submission_date: string;
  status: string;
  grade?: number;
}

// Debt Types
export interface Debt {
  id?: number;
  student_id: number;
  center_id: number;
  debt_amount: number;
  debt_date: string;
  due_date: string;
  amount_paid: number;
  remarks: string;
}

// Center Types
export interface Center {
  id?: number;
  center_name: string;
  center_code: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  principal_name: string;
}

// Subject Types
export interface Subject {
  id?: number;
  class_id: number;
  subject_name: string;
  subject_code: string;
  teacher_id: number;
  total_marks: number;
  passing_marks: number;
}

// RBAC Types
export interface Role {
  name: string;
  permissions: Permission[];
}

export interface Permission {
  code: string;
  name: string;
  description?: string;
}

export const PERMISSION_CODES = {
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
};
