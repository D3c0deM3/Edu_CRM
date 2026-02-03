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

interface StudentInfoSectionProps {
  student: Student;
}

export const StudentInfoSection = ({ student }: StudentInfoSectionProps) => {
  return (
    <div className="detail-section">
      <h2>Personal Information</h2>
      <div className="info-grid">
        <div className="info-item">
          <label>Enrollment Number</label>
          <p>{student.enrollment_number}</p>
        </div>
        <div className="info-item">
          <label>Email</label>
          <p>{student.email}</p>
        </div>
        <div className="info-item">
          <label>Phone</label>
          <p>{student.phone}</p>
        </div>
        <div className="info-item">
          <label>Date of Birth</label>
          <p>{new Date(student.date_of_birth).toLocaleDateString()}</p>
        </div>
        <div className="info-item">
          <label>Gender</label>
          <p>{student.gender}</p>
        </div>
        <div className="info-item">
          <label>Status</label>
          <p><span className={`badge badge-${student.status.toLowerCase()}`}>{student.status}</span></p>
        </div>
        <div className="info-item">
          <label>Parent Name</label>
          <p>{student.parent_name}</p>
        </div>
        <div className="info-item">
          <label>Parent Phone</label>
          <p>{student.parent_phone}</p>
        </div>
      </div>
    </div>
  );
};
