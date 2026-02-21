import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { studentAPI, attendanceAPI, paymentAPI, assignmentAPI, gradeAPI, classAPI } from '../../../shared/api/api';
import { StudentInfoSection } from './components/StudentInfoSection';
import { StatisticsSection } from './components/StatisticsSection';
import { AttendanceTab, PaymentsTab, AssignmentsTab, IndividualTasksTab, GradesTab } from './tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

interface Attendance {
  attendance_id?: number;
  id?: number;
  attendance_date: string;
  status: string;
  remarks?: string;
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

interface Assignment {
  assignment_id?: number;
  id?: number;
  assignment_title: string;
  due_date: string;
  status: string;
  grade?: number;
}

interface Grade {
  grade_id?: number;
  id?: number;
  percentage: number;
  grade_letter: string;
  term: string;
  subject_name?: string;
}

const StudentDetailPage = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [student, setStudent] = useState<Student | null>(null);
  const [classData, setClassData] = useState<Class | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('attendance');

  useEffect(() => {
    loadStudentDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const loadStudentDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const studentResponse = await studentAPI.getById(Number(studentId));
      const studentData = studentResponse.data || studentResponse;
      setStudent(studentData);

      if (studentData.class_id) {
        try {
          const classResponse = await classAPI.getById(studentData.class_id);
          const classDataResponse = classResponse.data || classResponse;
          setClassData(classDataResponse);
        } catch (err) {
          console.error('Error loading class data:', err);
        }
      }

      const [attendanceRes, paymentRes, assignmentRes, gradeRes] = await Promise.all([
        attendanceAPI.getAll(),
        paymentAPI.getAll(),
        assignmentAPI.getAll(),
        gradeAPI.getAll(),
      ]);

      const attendanceData = attendanceRes.data || attendanceRes;
      const paymentData = paymentRes.data || paymentRes;
      const assignmentData = assignmentRes.data || assignmentRes;
      const gradeData = gradeRes.data || gradeRes;

      const studentIdNum = Number(studentId);
      const studentClassId = Number(studentData.class_id);

      setAttendance(
        Array.isArray(attendanceData)
          ? attendanceData.filter((a: Record<string, unknown>) => a.student_id === studentIdNum)
          : []
      );
      setPayments(
        Array.isArray(paymentData)
          ? paymentData.filter((p: Record<string, unknown>) => p.student_id === studentIdNum)
          : []
      );
      setAssignments(
        Array.isArray(assignmentData)
          ? assignmentData.filter((a: Record<string, unknown>) => Number(a.class_id) === studentClassId || studentId)
          : []
      );
      setGrades(
        Array.isArray(gradeData)
          ? gradeData.filter((g: Record<string, unknown>) => g.student_id === studentIdNum)
          : []
      );
    } catch (err) {
      console.error('Error loading student details:', err);
      setError('Failed to load student details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6 text-center py-16 text-muted-foreground">
        <h3 className="text-lg font-semibold">Student not found</h3>
      </div>
    );
  }

  const attendanceStats = {
    total: attendance.length,
    present: attendance.filter((a) => a.status === 'Present').length,
    absent: attendance.filter((a) => a.status === 'Absent').length,
    late: attendance.filter((a) => a.status === 'Late').length,
  };

  const paymentStats = {
    total: payments.length,
    completed: payments.filter((p) => p.payment_status === 'Completed').length,
    pending: payments.filter((p) => p.payment_status === 'Pending').length,
    totalAmount: payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
  };

  const assignmentStats = {
    total: assignments.length,
    submitted: assignments.filter((a) => a.status === 'Submitted').length,
    pending: assignments.filter((a) => a.status === 'Pending').length,
  };

  const gradeAverage =
    grades.length > 0
      ? (grades.reduce((sum, g) => sum + (Number(g.percentage) || 0), 0) / grades.length).toFixed(2)
      : 'N/A';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/students')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Students
        </Button>
        <h1 className="text-3xl font-bold text-foreground">
          {student.first_name} {student.last_name}
        </h1>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <StudentInfoSection student={student} />

      <StatisticsSection
        attendanceStats={attendanceStats}
        paymentStats={paymentStats}
        assignmentStats={assignmentStats}
        gradeAverage={gradeAverage}
      />

      {/* Tab Menu */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="individual-tasks">Individual Tasks</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Tab Content */}
      {activeTab === 'attendance' && (
        <AttendanceTab attendance={attendance} onRefresh={loadStudentDetails} />
      )}

      {activeTab === 'payments' && (
        <PaymentsTab payments={payments} student={student} classData={classData} onRefresh={loadStudentDetails} />
      )}

      {activeTab === 'assignments' && (
        <AssignmentsTab
          assignments={assignments}
          studentClassId={student.class_id}
          studentId={student.student_id || student.id}
          onRefresh={loadStudentDetails}
        />
      )}

      {activeTab === 'individual-tasks' && (
        <IndividualTasksTab
          assignments={assignments}
          studentId={student.student_id || student.id}
          onRefresh={loadStudentDetails}
        />
      )}

      {activeTab === 'grades' && (
        <GradesTab grades={grades} onRefresh={loadStudentDetails} />
      )}
    </div>
  );
};

export default StudentDetailPage;
