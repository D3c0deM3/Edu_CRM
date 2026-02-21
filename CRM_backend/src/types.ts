/**
 * CRM Backend Type Definitions
 * All database table types for frontend and backend integration
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum StudentStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  GRADUATED = 'Graduated',
  REMOVED = 'Removed'
}

export enum StudentGender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export enum TeacherStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  RETIRED = 'Retired'
}

export enum TeacherGender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export enum ClassStatus {
  ACTIVE = 'Active',
  DROPPED = 'Dropped',
  GRADUATED = 'Graduated'
}

export enum PaymentFrequency {
  MONTHLY = 'Monthly',
  QUARTERLY = 'Quarterly',
  ANNUAL = 'Annual'
}

export enum PaymentMethod {
  CASH = 'Cash',
  CREDIT_CARD = 'Credit Card',
  BANK_TRANSFER = 'Bank Transfer',
  CHECK = 'Check',
  DIGITAL_WALLET = 'Digital Wallet'
}

export enum PaymentStatus {
  PENDING = 'Pending',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  REFUNDED = 'Refunded'
}

export enum AttendanceStatus {
  PRESENT = 'Present',
  ABSENT = 'Absent',
  LATE = 'Late',
  HALF_DAY = 'Half Day'
}

export enum AssignmentStatus {
  PENDING = 'Pending',
  SUBMITTED = 'Submitted',
  GRADED = 'Graded'
}

export enum SuperuserStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  SUSPENDED = 'Suspended'
}

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Student Interface
 * Represents a student record in the system
 */
export interface Student {
  student_id?: number;
  center_id: number;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  username?: string;
  password?: string;
  email?: string;
  phone?: string;
  date_of_birth?: Date | string;
  parent_name?: string;
  parent_phone?: string;
  gender?: StudentGender;
  status?: StudentStatus;
  teacher_id?: number;
  class_id?: number;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Teacher Interface
 * Represents a teacher record in the system
 */
export interface Teacher {
  teacher_id?: number;
  center_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: Date | string;
  gender?: TeacherGender;
  qualification?: string;
  specialization?: string;
  status?: TeacherStatus;
  roles?: string[] | any;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Class Interface
 * Represents a class in the system
 */
export interface Class {
  class_id?: number;
  center_id: number;
  class_name: string;
  class_code: string;
  level?: number;
  section?: string;
  capacity?: number;
  teacher_id?: number;
  room_number?: string;
  total_students?: number;
  payment_amount?: number;
  payment_frequency?: PaymentFrequency;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Center Interface
 * Represents an educational center/institution
 */
export interface Center {
  center_id?: number;
  center_name: string;
  center_code: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  principal_name?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Payment Interface
 * Represents a payment record
 */
export interface Payment {
  payment_id?: number;
  student_id: number;
  center_id: number;
  payment_date: Date | string;
  amount: number;
  currency?: string;
  payment_method?: PaymentMethod;
  transaction_reference?: string;
  receipt_number?: string;
  payment_status?: PaymentStatus;
  payment_type?: string;
  notes?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Debt Interface
 * Represents a debt record
 */
export interface Debt {
  debt_id?: number;
  student_id: number;
  center_id: number;
  debt_amount: number;
  debt_date: Date | string;
  due_date?: Date | string;
  amount_paid?: number;
  balance?: number;
  remarks?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Grade Interface
 * Represents a student's grade
 */
export interface Grade {
  grade_id?: number;
  student_id: number;
  teacher_id: number;
  subject?: string;
  class_id?: number;
  marks_obtained?: number;
  total_marks?: number;
  percentage?: number;
  grade_letter?: string;
  academic_year?: number;
  term?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Attendance Interface
 * Represents an attendance record
 */
export interface Attendance {
  attendance_id?: number;
  student_id: number;
  teacher_id: number;
  class_id: number;
  attendance_date: Date | string;
  status?: AttendanceStatus;
  remarks?: string;
  created_at?: Date | string;
}

/**
 * Assignment Interface
 * Represents an assignment
 */
export interface Assignment {
  assignment_id?: number;
  class_id: number;
  assignment_title: string;
  description?: string;
  due_date?: Date | string;
  submission_date?: Date | string;
  grade?: number;
  status?: AssignmentStatus;
  created_at?: Date | string;
  updated_at?: Date | string;
}

/**
 * Subject Interface
 * Represents a subject/course
 */
export interface Subject {
  subject_id?: number;
  class_id: number;
  subject_name: string;
  subject_code?: string;
  teacher_id?: number;
  total_marks?: number;
  passing_marks?: number;
  created_at?: Date | string;
}

/**
 * Superuser Interface
 * Represents a superuser/admin account
 */
export interface Superuser {
  superuser_id?: number;
  center_id: number;
  username: string;
  email?: string;
  password_hash?: string;
  password?: string; // Only for creation/login
  first_name?: string;
  last_name?: string;
  role?: string;
  permissions?: any;
  status?: SuperuserStatus;
  last_login?: Date | string;
  login_attempts?: number;
  is_locked?: boolean;
  locked_until?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Generic API Response wrapper
 */
export interface ApiResponse<T> {
  message?: string;
  data?: T;
  error?: string;
  status?: number;
}

/**
 * Pagination Response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Login Response
 */
export interface LoginResponse {
  message: string;
  superuser: {
    superuser_id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

/**
 * Error Response
 */
export interface ErrorResponse {
  error: string;
  status: number;
  timestamp?: string;
  path?: string;
}

// ============================================================================
// REQUEST/FORM TYPES
// ============================================================================

/**
 * Create Student Request
 */
export interface CreateStudentRequest {
  center_id: number;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  parent_name?: string;
  parent_phone?: string;
  gender?: StudentGender;
  status?: StudentStatus;
  teacher_id?: number;
  class_id?: number;
}

/**
 * Update Student Request
 */
export interface UpdateStudentRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: StudentStatus;
  teacher_id?: number;
  class_id?: number;
}

/**
 * Create Teacher Request
 */
export interface CreateTeacherRequest {
  center_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: TeacherGender;
  qualification?: string;
  specialization?: string;
  status?: TeacherStatus;
  roles?: string[];
}

/**
 * Create Payment Request
 */
export interface CreatePaymentRequest {
  student_id: number;
  center_id: number;
  payment_date: string;
  amount: number;
  currency?: string;
  payment_method?: PaymentMethod;
  transaction_reference?: string;
  receipt_number?: string;
  payment_status?: PaymentStatus;
  payment_type?: string;
  notes?: string;
}

/**
 * Create Superuser Request
 */
export interface CreateSuperuserRequest {
  center_id: number;
  username: string;
  email?: string;
  password: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  permissions?: any;
  status?: SuperuserStatus;
}

/**
 * Login Request
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * Change Password Request
 */
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

// ============================================================================
// DASHBOARD/STATISTICS TYPES
// ============================================================================

/**
 * Dashboard Statistics
 */
export interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalCenters: number;
  totalRevenue?: number;
  totalDebts?: number;
  attendanceRate?: number;
}

/**
 * Student Performance
 */
export interface StudentPerformance {
  student_id: number;
  student_name: string;
  average_grade?: number;
  attendance_percentage?: number;
  total_payments?: number;
  outstanding_debt?: number;
  status: StudentStatus;
}

/**
 * Class Report
 */
export interface ClassReport {
  class_id: number;
  class_name: string;
  total_students: number;
  average_attendance?: number;
  average_grade?: number;
  teacher_name?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Query Filter Options
 */
export interface FilterOptions {
  status?: string;
  search?: string;
  center_id?: number;
  class_id?: number;
  teacher_id?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

/**
 * Sort Options
 */
export interface SortOptions {
  field: string;
  order: 'ASC' | 'DESC';
}

/**
 * Date Range
 */
export interface DateRange {
  startDate: Date | string;
  endDate: Date | string;
}
