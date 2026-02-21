import { PaymentSection } from '../components/PaymentSection';

interface Class {
  class_id?: number;
  id?: number;
  payment_amount?: number;
  class_name?: string;
}

interface Student {
  student_id?: number;
  id?: number;
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
  class_id?: number;
  center_id?: number;
}

interface Payment {
  payment_id?: number;
  id?: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_type: string;
  payment_status: string;
  receipt_number: string;
}

interface PaymentsTabProps {
  payments: Payment[];
  student: Student;
  classData: Class | null;
  onRefresh: () => void;
}

export const PaymentsTab = ({ payments, student, classData, onRefresh }: PaymentsTabProps) => {
  return <PaymentSection payments={payments} student={student} classData={classData} onRefresh={onRefresh} />;
};
