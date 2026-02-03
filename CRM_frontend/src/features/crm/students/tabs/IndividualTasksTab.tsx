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

interface IndividualTasksTabProps {
  assignments: Assignment[];
  studentId: number | undefined;
  onRefresh: () => void;
}

export const IndividualTasksTab = ({ assignments, studentId, onRefresh }: IndividualTasksTabProps) => {
  // Filter assignments where class_id equals student_id (individual tasks)
  console.log(assignments,studentId)
  const individualTasksAssignments = assignments.filter(
    a => Number(a.class_id) === Number(studentId)
  );

  return (
    <AssignmentSection 
      assignments={individualTasksAssignments}
      studentClassId={studentId}
      studentId={studentId}
      onRefresh={onRefresh}
    />
  );
};
