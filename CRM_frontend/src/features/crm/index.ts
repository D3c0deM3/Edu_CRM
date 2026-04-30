// Feature-based architecture exports for CRM module

// Hooks
export * from './hooks';

// RBAC
export * from './rbac';

// Feature modules (existing ones)
export * from './students';
export { default as TeachersPage } from './teachers/TeachersPage';
export { default as ClassesPage } from './classes/ClassesPage';
export { default as PaymentsPage } from './payments/PaymentsPage';
export { default as GradesPage } from './grades/GradesPage';
export { default as AttendancePage } from './attendance/AttendancePage';
export { default as AssignmentsPage } from './assignments/AssignmentsPage';
export { default as SubjectsPage } from './subjects/SubjectsPage';
export { default as CentersPage } from './centers/CentersPage';
export { default as DebtsPage } from './debts/DebtsPage';
export { default as Dashboard } from './dashboard/Dashboard';
