import { AssignmentSection } from '../components/AssignmentSection';

interface Assignment {
  assignment_id?: number;
  id?: number;
  class_id?: number;
  student_id?: number;
  assignment_title: string;
  due_date: string;
  status: string;
  grade?: number;
}

interface AssignmentsTabProps {
  assignments: Assignment[];
  studentClassId: number | undefined;
  studentId: number | undefined;
  onRefresh: () => void;
}

export const AssignmentsTab = ({ assignments, studentClassId, studentId, onRefresh }: AssignmentsTabProps) => {
  return (
    <AssignmentSection 
      assignments={assignments} 
      studentClassId={studentClassId}
      studentId={studentId}
      onRefresh={onRefresh} 
    />
  );
};
