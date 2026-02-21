import { useState, useEffect } from 'react';
import {
  CalendarDays,
  CheckCircle,
  XCircle,
  Clock,
  Save,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { classAPI, studentAPI, attendanceAPI } from '../../../shared/api/api';

interface ClassInfo {
  class_id: number;
  class_name: string;
  student_count?: number;
}

interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
  enrollment_number: string;
}

interface AttendanceRecord {
  student_id: number;
  status: 'Present' | 'Absent' | 'Late' | 'Half Day';
  notes?: string;
}

interface TeacherAttendanceTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const TeacherAttendanceTab = ({ teacherId, onRefresh }: TeacherAttendanceTabProps) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<Map<number, AttendanceRecord>>(new Map());
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [existingAttendance, setExistingAttendance] = useState<any[]>([]);

  useEffect(() => {
    loadClasses();
  }, [teacherId]);

  useEffect(() => {
    if (selectedClass) {
      loadClassStudents();
      loadExistingAttendance();
    }
  }, [selectedClass, attendanceDate]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await classAPI.getAll();
      setClasses(response.data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClassStudents = async () => {
    try {
      setStudentsLoading(true);
      const response = await studentAPI.getAll();
      const allStudents = response.data || [];
      const classStudents = selectedClass
        ? allStudents.filter((s: any) => s.class_id === selectedClass)
        : allStudents;
      setStudents(classStudents);

      const initialAttendance = new Map<number, AttendanceRecord>();
      classStudents.forEach((student: Student) => {
        initialAttendance.set(student.student_id, {
          student_id: student.student_id,
          status: 'Present',
        });
      });
      setAttendance(initialAttendance);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadExistingAttendance = async () => {
    try {
      if (!selectedClass) return;
      const response = await attendanceAPI.getByClass(selectedClass);
      const existing = (response.data || []).filter(
        (a: any) => a.attendance_date?.split('T')[0] === attendanceDate
      );
      setExistingAttendance(existing);

      const updatedAttendance = new Map(attendance);
      existing.forEach((record: any) => {
        updatedAttendance.set(record.student_id, {
          student_id: record.student_id,
          status: record.status,
          notes: record.notes,
        });
      });
      setAttendance(updatedAttendance);
    } catch (error) {
      console.error('Error loading existing attendance:', error);
    }
  };

  const handleStatusChange = (studentId: number, status: 'Present' | 'Absent' | 'Late' | 'Half Day') => {
    const current = attendance.get(studentId) || { student_id: studentId, status: 'Present' };
    const updated = new Map(attendance);
    updated.set(studentId, { ...current, status });
    setAttendance(updated);
  };

  const handleNotesChange = (studentId: number, notes: string) => {
    const current = attendance.get(studentId) || { student_id: studentId, status: 'Present' };
    const updated = new Map(attendance);
    updated.set(studentId, { ...current, notes });
    setAttendance(updated);
  };

  const markAllPresent = () => {
    const updated = new Map<number, AttendanceRecord>();
    students.forEach((student) => {
      updated.set(student.student_id, {
        student_id: student.student_id,
        status: 'Present',
      });
    });
    setAttendance(updated);
  };

  const markAllAbsent = () => {
    const updated = new Map<number, AttendanceRecord>();
    students.forEach((student) => {
      updated.set(student.student_id, {
        student_id: student.student_id,
        status: 'Absent',
      });
    });
    setAttendance(updated);
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      setError(null);

      const records = Array.from(attendance.values()).map((record) => ({
        student_id: record.student_id,
        class_id: selectedClass,
        attendance_date: attendanceDate,
        status: record.status,
        remarks: record.notes,
        teacher_id: teacherId,
      }));

      for (const record of records) {
        await attendanceAPI.create(record);
      }

      setSuccess(`Attendance saved successfully for ${records.length} students`);
      setShowSaveDialog(false);
      onRefresh?.();
    } catch (err: any) {
      setError('Failed to save attendance. Please try again.');
      console.error('Error saving attendance:', err);
    } finally {
      setSaving(false);
    }
  };

  const attendanceStats = {
    present: Array.from(attendance.values()).filter((a) => a.status === 'Present').length,
    absent: Array.from(attendance.values()).filter((a) => a.status === 'Absent').length,
    late: Array.from(attendance.values()).filter((a) => a.status === 'Late').length,
    halfDay: Array.from(attendance.values()).filter((a) => a.status === 'Half Day').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h3 className="text-lg font-semibold">Take Attendance</h3>
        <div className="flex gap-3 items-center">
          <div>
            <Label htmlFor="att-date" className="text-xs text-muted-foreground">Date</Label>
            <Input
              id="att-date"
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div>
            <Label htmlFor="att-class" className="text-xs text-muted-foreground">Select Class</Label>
            <select
              id="att-class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : '')}
              className="flex h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="">-- Select --</option>
              {classes.map((cls) => (
                <option key={cls.class_id} value={cls.class_id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
          <button onClick={() => setError(null)} className="absolute top-2 right-2 text-sm">✕</button>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 border-green-300 bg-green-50 text-green-800">
          <AlertDescription>{success}</AlertDescription>
          <button onClick={() => setSuccess(null)} className="absolute top-2 right-2 text-sm">✕</button>
        </Alert>
      )}

      {!selectedClass ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <CalendarDays className="h-14 w-14 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-muted-foreground">Select a class to take attendance</h3>
          <p className="text-sm text-muted-foreground">Choose a class from the dropdown above</p>
        </div>
      ) : studentsLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No students in this class</p>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Card className="bg-green-50/50 text-center">
              <CardContent className="py-3">
                <p className="text-3xl font-bold text-green-600">{attendanceStats.present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </CardContent>
            </Card>
            <Card className="bg-red-50/50 text-center">
              <CardContent className="py-3">
                <p className="text-3xl font-bold text-red-500">{attendanceStats.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/50 text-center">
              <CardContent className="py-3">
                <p className="text-3xl font-bold text-amber-500">{attendanceStats.late}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50/50 text-center">
              <CardContent className="py-3">
                <p className="text-3xl font-bold text-blue-500">{attendanceStats.halfDay}</p>
                <p className="text-xs text-muted-foreground">Half Day</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 mb-4 flex-wrap">
            <Button variant="outline" className="border-green-400 text-green-600 hover:bg-green-50" onClick={markAllPresent}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Present
            </Button>
            <Button variant="outline" className="border-red-400 text-red-600 hover:bg-red-50" onClick={markAllAbsent}>
              <XCircle className="h-4 w-4 mr-2" />
              Mark All Absent
            </Button>
            <div className="flex-1" />
            <Button
              onClick={() => setShowSaveDialog(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Attendance
            </Button>
          </div>

          {existingAttendance.length > 0 && (
            <Alert className="mb-4 border-blue-300 bg-blue-50 text-blue-800">
              <AlertDescription>
                Attendance already recorded for this date. Saving will update the records.
              </AlertDescription>
            </Alert>
          )}

          {/* Attendance Table */}
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Enrollment #</TableHead>
                  <TableHead className="w-[300px]">Status</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student, index) => {
                  const record = attendance.get(student.student_id);
                  return (
                    <TableRow key={student.student_id} className="hover:bg-gray-50">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-medium">
                            {student.first_name?.[0]}{student.last_name?.[0]}
                          </div>
                          <span className="font-medium text-sm">
                            {student.first_name} {student.last_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{student.enrollment_number}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {(['Present', 'Absent', 'Late', 'Half Day'] as const).map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(student.student_id, status)}
                              className={cn(
                                'px-2 py-1 text-xs rounded border transition-colors',
                                record?.status === status
                                  ? status === 'Present'
                                    ? 'bg-green-500 text-white border-green-500'
                                    : status === 'Absent'
                                    ? 'bg-red-500 text-white border-red-500'
                                    : status === 'Late'
                                    ? 'bg-amber-500 text-white border-amber-500'
                                    : 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                              )}
                            >
                              {status === 'Present' && <CheckCircle className="h-3 w-3 inline mr-1" />}
                              {status === 'Absent' && <XCircle className="h-3 w-3 inline mr-1" />}
                              {status === 'Late' && <Clock className="h-3 w-3 inline mr-1" />}
                              {status === 'Half Day' ? 'HD' : status.charAt(0)}
                            </button>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Add notes..."
                          value={record?.notes || ''}
                          onChange={(e) => handleNotesChange(student.student_id, e.target.value)}
                          className="w-48 h-8 text-sm"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Save Confirmation Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Attendance</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            You are about to save attendance for <strong>{students.length}</strong> students on{' '}
            <strong>{new Date(attendanceDate).toLocaleDateString()}</strong>.
          </p>
          <div className="flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-xs border border-green-400 text-green-600 rounded-full px-2.5 py-1">
              <CheckCircle className="h-3 w-3" /> {attendanceStats.present} Present
            </span>
            <span className="inline-flex items-center gap-1 text-xs border border-red-400 text-red-600 rounded-full px-2.5 py-1">
              <XCircle className="h-3 w-3" /> {attendanceStats.absent} Absent
            </span>
            <span className="inline-flex items-center gap-1 text-xs border border-amber-400 text-amber-600 rounded-full px-2.5 py-1">
              <Clock className="h-3 w-3" /> {attendanceStats.late} Late
            </span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSaveAttendance}
              disabled={saving}
              className="bg-gradient-to-r from-indigo-500 to-purple-500"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Attendance
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherAttendanceTab;
