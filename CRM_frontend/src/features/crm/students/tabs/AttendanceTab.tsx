import { AttendanceSection } from '../components/AttendanceSection';

interface Attendance {
  attendance_id?: number;
  id?: number;
  attendance_date: string;
  status: string;
  remarks?: string;
}

interface AttendanceTabProps {
  attendance: Attendance[];
  onRefresh: () => void;
}

export const AttendanceTab = ({ attendance, onRefresh }: AttendanceTabProps) => {
  return <AttendanceSection attendance={attendance} onRefresh={onRefresh} />;
};
