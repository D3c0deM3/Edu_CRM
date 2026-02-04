// Utility functions to fetch and manage dropdown options
import { studentAPI, teacherAPI, centerAPI, classAPI, subjectAPI, paymentAPI } from '../shared/api/api';

export interface DropdownOption {
  id: number;
  label: string;
  value: any;
}

const getId = (item: any) => item?.student_id || item?.teacher_id || item?.class_id || item?.center_id || item?.subject_id || item?.payment_id || item?.id;

export const mapTeachersToOptions = (teacherList: any[]): DropdownOption[] => {
  return teacherList.map((teacher: any) => ({
    id: teacher.teacher_id || teacher.id,
    label: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || `Teacher ${getId(teacher)}`,
    value: teacher.teacher_id || teacher.id,
  }));
};

export const mapStudentsToOptions = (studentList: any[]): DropdownOption[] => {
  return studentList.map((student: any) => {
    const baseName = `${student.first_name || ''} ${student.last_name || ''}`.trim();
    const enrollment = student.enrollment_number ? ` (${student.enrollment_number})` : '';
    return {
      id: student.student_id || student.id,
      label: `${baseName || `Student ${getId(student)}`}${enrollment}`,
      value: student.student_id || student.id,
    };
  });
};

export const mapClassesToOptions = (classList: any[]): DropdownOption[] => {
  return classList.map((cls: any) => ({
    id: cls.class_id || cls.id,
    label: `${cls.class_name} - ${cls.level}${cls.section ? ' ' + cls.section : ''}`,
    value: cls.class_id || cls.id,
  }));
};

export const mapCentersToOptions = (centerList: any[]): DropdownOption[] => {
  return centerList.map((center: any) => ({
    id: center.center_id || center.id,
    label: center.center_name || `${center.city} - ${center.id}`,
    value: center.center_id || center.id,
  }));
};

export const mapSubjectsToOptions = (subjectList: any[]): DropdownOption[] => {
  return subjectList.map((subject: any) => ({
    id: subject.subject_id || subject.id,
    label: subject.subject_name,
    value: subject.subject_id || subject.id,
  }));
};

export const mapPaymentsToOptions = (paymentList: any[]): DropdownOption[] => {
  return paymentList.map((payment: any) => ({
    id: payment.payment_id || payment.id,
    label: `Receipt #${payment.receipt_number} - ${payment.amount}`,
    value: payment.payment_id || payment.id,
  }));
};

// Fetch Teachers
export const fetchTeachers = async (): Promise<DropdownOption[]> => {
  try {
    const response = await teacherAPI.getAll();
    const data = response.data || response;
    const teacherList = Array.isArray(data) ? data : [];
    return mapTeachersToOptions(teacherList);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return [];
  }
};

// Fetch Students
export const fetchStudents = async (): Promise<DropdownOption[]> => {
  try {
    const response = await studentAPI.getAll();
    const data = response.data || response;
    const studentList = Array.isArray(data) ? data : [];
    return mapStudentsToOptions(studentList);
  } catch (error) {
    console.error('Error fetching students:', error);
    return [];
  }
};

// Fetch Classes
export const fetchClasses = async (): Promise<DropdownOption[]> => {
  try {
    const response = await classAPI.getAll();
    const data = response.data || response;
    const classList = Array.isArray(data) ? data : [];
    return mapClassesToOptions(classList);
  } catch (error) {
    console.error('Error fetching classes:', error);
    return [];
  }
};

// Fetch Centers
export const fetchCenters = async (): Promise<DropdownOption[]> => {
  try {
    const response = await centerAPI.getAll();
    const data = response.data || response;
    const centerList = Array.isArray(data) ? data : [];
    return mapCentersToOptions(centerList);
  } catch (error) {
    console.error('Error fetching centers:', error);
    return [];
  }
};

// Fetch Subjects
export const fetchSubjects = async (): Promise<DropdownOption[]> => {
  try {
    const response = await subjectAPI.getAll();
    const data = response.data || response;
    const subjectList = Array.isArray(data) ? data : [];
    return mapSubjectsToOptions(subjectList);
  } catch (error) {
    console.error('Error fetching subjects:', error);
    return [];
  }
};

// Fetch Payments
export const fetchPayments = async (): Promise<DropdownOption[]> => {
  try {
    const response = await paymentAPI.getAll();
    const data = response.data || response;
    const paymentList = Array.isArray(data) ? data : [];
    return mapPaymentsToOptions(paymentList);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
};

// Gender options
export const genderOptions: DropdownOption[] = [
  { id: 1, label: 'Male', value: 'Male' },
  { id: 2, label: 'Female', value: 'Female' },
  { id: 3, label: 'Other', value: 'Other' },
];

// Student Status options
export const statusOptions: DropdownOption[] = [
  { id: 1, label: 'Active', value: 'Active' },
  { id: 2, label: 'Inactive', value: 'Inactive' },
  { id: 3, label: 'Suspended', value: 'Suspended' },
];

// Teacher Status options
export const teacherStatusOptions: DropdownOption[] = [
  { id: 1, label: 'Active', value: 'Active' },
  { id: 2, label: 'Inactive', value: 'Inactive' },
  { id: 3, label: 'On Leave', value: 'On Leave' },
];

// Payment Frequency options
export const frequencyOptions: DropdownOption[] = [
  { id: 1, label: 'Weekly', value: 'Weekly' },
  { id: 2, label: 'Monthly', value: 'Monthly' },
  { id: 3, label: 'Quarterly', value: 'Quarterly' },
  { id: 4, label: 'Annually', value: 'Annually' },
];

// Payment Method options
export const paymentMethodOptions: DropdownOption[] = [
  { id: 1, label: 'Cash', value: 'Cash' },
  { id: 2, label: 'Check', value: 'Check' },
  { id: 3, label: 'Bank Transfer', value: 'Bank Transfer' },
  { id: 4, label: 'Credit Card', value: 'Credit Card' },
];

// Payment Status options
export const paymentStatusOptions: DropdownOption[] = [
  { id: 1, label: 'Pending', value: 'Pending' },
  { id: 2, label: 'Completed', value: 'Completed' },
  { id: 3, label: 'Cancelled', value: 'Cancelled' },
];

// Payment Type options
export const paymentTypeOptions: DropdownOption[] = [
  { id: 1, label: 'Tuition', value: 'Tuition' },
  { id: 2, label: 'Fee', value: 'Fee' },
  { id: 3, label: 'Exam', value: 'Exam' },
];

// Assignment Status options
export const assignmentStatusOptions: DropdownOption[] = [
  { id: 1, label: 'Pending', value: 'Pending' },
  { id: 2, label: 'Submitted', value: 'Submitted' },
  { id: 3, label: 'Graded', value: 'Graded' },
];

// Attendance Status options
export const attendanceStatusOptions: DropdownOption[] = [
  { id: 1, label: 'Present', value: 'Present' },
  { id: 2, label: 'Absent', value: 'Absent' },
  { id: 3, label: 'Late', value: 'Late' },
  { id: 4, label: 'Excused', value: 'Excused' },
];

// Term options
export const termOptions: DropdownOption[] = [
  { id: 1, label: 'First', value: 'First' },
  { id: 2, label: 'Second', value: 'Second' },
  { id: 3, label: 'Third', value: 'Third' },
];

// Currency options
export const currencyOptions: DropdownOption[] = [
  { id: 1, label: 'USD', value: 'USD' },
  { id: 2, label: 'EUR', value: 'EUR' },
  { id: 3, label: 'GBP', value: 'GBP' },
  { id: 4, label: 'AUD', value: 'AUD' },
];
