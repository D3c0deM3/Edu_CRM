import { MdEvent, MdAttachMoney, MdTaskAlt, MdGrade } from 'react-icons/md';

interface StatisticsSectionProps {
  attendanceStats: {
    total: number;
    present: number;
    absent: number;
    late: number;
  };
  paymentStats: {
    total: number;
    completed: number;
    pending: number;
    totalAmount: number;
  };
  assignmentStats: {
    total: number;
    submitted: number;
    pending: number;
  };
  gradeAverage: string;
}

export const StatisticsSection = ({
  attendanceStats,
  paymentStats,
  assignmentStats,
  gradeAverage,
}: StatisticsSectionProps) => {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon attendance">
          <MdEvent />
        </div>
        <div className="stat-content">
          <h3>Attendance</h3>
          <p className="stat-value">{attendanceStats.present}/{attendanceStats.total}</p>
          <small>Present out of Total</small>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon payment">
          <MdAttachMoney />
        </div>
        <div className="stat-content">
          <h3>Payments</h3>
          <p className="stat-value">${(Number(paymentStats.totalAmount) || 0).toFixed(2)}</p>
          <small>{paymentStats.completed} completed</small>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon assignment">
          <MdTaskAlt />
        </div>
        <div className="stat-content">
          <h3>Assignments</h3>
          <p className="stat-value">{assignmentStats.submitted}/{assignmentStats.total}</p>
          <small>Submitted</small>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon grade">
          <MdGrade />
        </div>
        <div className="stat-content">
          <h3>Average Grade</h3>
          <p className="stat-value">{gradeAverage}%</p>
          <small>Overall</small>
        </div>
      </div>
    </div>
  );
};
