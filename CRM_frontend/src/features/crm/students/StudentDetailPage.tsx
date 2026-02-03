import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdArrowBack } from 'react-icons/md';
import { studentAPI, attendanceAPI, paymentAPI, assignmentAPI, gradeAPI, classAPI } from '../../../shared/api/api';
import { StudentInfoSection } from './components/StudentInfoSection';
import { StatisticsSection } from './components/StatisticsSection';
import { AttendanceTab, PaymentsTab, AssignmentsTab, IndividualTasksTab, GradesTab } from './tabs';
import '../dashboard/Dashboard.css';
import './CRUDStyles.css';
import './StudentDetailPage.css';

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
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'payments' | 'assignments' | 'individual-tasks' | 'grades'>('info');

  useEffect(() => {
    loadStudentDetails();
  }, [studentId]);

  const loadStudentDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch student details
      const studentResponse = await studentAPI.getById(Number(studentId));
      const studentData = studentResponse.data || studentResponse;
      setStudent(studentData);

      // Fetch class data if student has a class
      if (studentData.class_id) {
        try {
          const classResponse = await classAPI.getById(studentData.class_id);
          const classDataResponse = classResponse.data || classResponse;
          setClassData(classDataResponse);
        } catch (err) {
          console.error('Error loading class data:', err);
        }
      }

      // Fetch all related data in parallel
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

      // Filter by student_id and class_id
      const studentIdNum = Number(studentId);
      const studentClassId = Number(studentData.class_id);


      
      setAttendance(
        Array.isArray(attendanceData)
          ? attendanceData.filter((a: any) => a.student_id === studentIdNum)
          : []
      );
      setPayments(
        Array.isArray(paymentData)
          ? paymentData.filter((p: any) => p.student_id === studentIdNum)
          : []
      );
      console.log(studentClassId)
      // Filter assignments by class_id (assignments are given to classes, not individual students)
      setAssignments(
        Array.isArray(assignmentData)
          ? assignmentData.filter((a: any) => Number(a.class_id) === studentClassId || studentId)
          : []
      );
      console.log("hrer",assignmentData,Number(studentClassId),studentId)
      setGrades(
        Array.isArray(gradeData)
          ? gradeData.filter((g: any) => g.student_id === studentIdNum)
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
    return <div className="dashboard"><div className="text-center" style={{padding: '2rem'}}>Loading...</div></div>;
  }

  if (!student) {
    return (
      <div className="dashboard">
        <div className="text-center" style={{padding: '2rem'}}>Student not found</div>
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
    <div className="dashboard">
      <div className="dashboard-header">
        <button className="btn-back" onClick={() => navigate('/students')}>
          <MdArrowBack /> Back to Students
        </button>
        <h1>{student.first_name} {student.last_name}</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="student-detail-container">
        <StudentInfoSection student={student} />

        <StatisticsSection
          attendanceStats={attendanceStats}
          paymentStats={paymentStats}
          assignmentStats={assignmentStats}
          gradeAverage={gradeAverage}
        />

        {/* Tab Menu */}
        <div className="tabs-menu">
          <button 
            className={`tab-button ${activeTab === 'attendance' ? 'active' : ''}`}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance
          </button>
          <button 
            className={`tab-button ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            Payments
          </button>
          <button 
            className={`tab-button ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            Assignments
          </button>
          <button 
            className={`tab-button ${activeTab === 'individual-tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('individual-tasks')}
          >
            Individual Tasks
          </button>
          <button 
            className={`tab-button ${activeTab === 'grades' ? 'active' : ''}`}
            onClick={() => setActiveTab('grades')}
          >
            Grades
          </button>
        </div>

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
    </div>
  );
};

export default StudentDetailPage;
