import React, { useState, useEffect } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { studentAPI, attendanceAPI, gradeAPI } from '../../../shared/api/api';
import { showToast } from '../../../utils/toast';
import { fetchSubjects } from '../../../utils/dropdownOptions';
import ClassCalendar from './ClassCalendar';

interface Class {
  class_id?: number;
  id?: number;
  center_id: number;
  class_name: string;
  class_code: string;
  level: number;
  section?: string;
  capacity: number;
  teacher_id?: number;
  room_number: string;
  payment_amount: number;
  payment_frequency: string;
  schedule?: string; // JSON string: { days: ['Monday', 'Wednesday', 'Friday'], time: '10:00' }
}

interface Student {
  student_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  enrollment_number: string;
  class_id: number;
}

interface Attendance {
  attendance_id?: number;
  id?: number;
  student_id: number;
  teacher_id: number;
  class_id: number;
  attendance_date: string;
  status: string;
  remarks?: string;
}

interface ClassDetailModalProps {
  open: boolean;
  classData: Class | null;
  onClose: () => void;
}

const ClassDetailModal: React.FC<ClassDetailModalProps> = ({ open, classData, onClose }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Map<number, boolean>>(new Map());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [, setTodayAttendance] = useState<Attendance[]>([]);

  // Bulk Grading State
  const [gradeMarks, setGradeMarks] = useState<Map<number, number | string>>(new Map());
  const [gradeSubject, setGradeSubject] = useState('');
  const [gradeTotalMarks, setGradeTotalMarks] = useState(100);
  const [gradeAcademicYear, setGradeAcademicYear] = useState(new Date().getFullYear());
  const [gradeTerm, setGradeTerm] = useState('First');
  const [submittingGrades, setSubmittingGrades] = useState(false);
  const [subjectOptions, setSubjectOptions] = useState<{ id: number; label: string; value: string | number }[]>([]);

  useEffect(() => {
    if (open && classData) {
      loadStudents();
      loadTodayAttendance();
      loadSubjects();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, classData]);

  const loadSubjects = async () => {
    try {
      const subjects = await fetchSubjects();
      setSubjectOptions(subjects);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await studentAPI.getAll();
      const allStudents = response.data || response;
      const classStudents = Array.isArray(allStudents)
        ? allStudents.filter(
            (student: Student) =>
              (student.class_id === classData?.class_id || student.class_id === classData?.id)
          )
        : [];
      setStudents(classStudents);
      
      // Initialize all students in attendance map (default to false/Absent)
      setAttendance((prevMap) => {
        const newMap = new Map(prevMap);
        classStudents.forEach((student: Student) => {
          if (!newMap.has(student.student_id || student.id || 0)) {
            newMap.set(student.student_id || student.id || 0, false);
          }
        });
        return newMap;
      });
    } catch (error) {
      console.error('Error loading students:', error);
      showToast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const loadTodayAttendance = async () => {
    try {
      if (!classData?.class_id && !classData?.id) return;
      const response = await attendanceAPI.getByClass(classData?.class_id || classData?.id || 0);
      const allAttendance = response.data || response;
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = Array.isArray(allAttendance)
        ? allAttendance.filter((record: Attendance) => record.attendance_date.split('T')[0] === today)
        : [];
      setTodayAttendance(todayRecords);
      
      // Initialize attendance map
      const newMap = new Map<number, boolean>();
      todayRecords.forEach((record: Attendance) => {
        newMap.set(record.student_id, record.status === 'Present');
      });
      setAttendance(newMap);
    } catch (error) {
      console.error('Error loading attendance:', error);
    }
  };

  const handleAttendanceToggle = (studentId: number, status: boolean) => {
    const newMap = new Map(attendance);
    newMap.set(studentId, status);
    setAttendance(newMap);
  };

  const handleMarkAttendance = async () => {
    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const classId = classData?.class_id || classData?.id;

      // Fetch fresh attendance data to avoid race conditions
      const response = await attendanceAPI.getByClass(classId || 0);
      const allAttendance = response.data || response;
      const currentTodayRecords = Array.isArray(allAttendance)
        ? allAttendance.filter((record: Attendance) => record.attendance_date.split('T')[0] === today)
        : [];

      // Create/update attendance for each student
      for (const [studentId, isPresent] of attendance) {
        const existingRecord = currentTodayRecords.find(
          (r: Attendance) => r.student_id === studentId
        );

        const attendanceData = {
          student_id: studentId,
          class_id: classId,
          teacher_id: classData?.teacher_id || 1,
          attendance_date: today,
          status: isPresent ? 'Present' : 'Absent',
          remarks: 'Marked in class detail',
        };

        if (existingRecord) {
          await attendanceAPI.update(existingRecord.attendance_id || existingRecord.id || 0, attendanceData);
        } else {
          await attendanceAPI.create(attendanceData);
        }
      }

      showToast.success('Attendance marked successfully!');
      loadTodayAttendance();
    } catch (error) {
      console.error('Error marking attendance:', error);
      showToast.error('Failed to mark attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGradeMarksChange = (studentId: number, value: string) => {
    const newMap = new Map(gradeMarks);
    newMap.set(studentId, value === '' ? '' : Number(value));
    setGradeMarks(newMap);
  };

  const getGradeLetter = (marks: number, total: number): string => {
    const percentage = (marks / total) * 100;
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const getGradeColor = (letter: string): string => {
    switch (letter) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-lime-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      case 'F': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const handleSubmitBulkGrades = async () => {
    if (!gradeSubject) {
      showToast.error('Please select a subject');
      return;
    }

    const gradesToSubmit: Array<Record<string, unknown>> = [];
    for (const [studentId, marks] of gradeMarks) {
      if (marks === '' || marks === undefined || marks === null) continue;
      const marksNum = Number(marks);
      if (isNaN(marksNum) || marksNum < 0) continue;
      const percentage = (marksNum / gradeTotalMarks) * 100;
      const gradeLetter = getGradeLetter(marksNum, gradeTotalMarks);

      gradesToSubmit.push({
        student_id: studentId,
        teacher_id: classData?.teacher_id || 1,
        subject: gradeSubject,
        class_id: classData?.class_id || classData?.id,
        marks_obtained: marksNum,
        total_marks: gradeTotalMarks,
        percentage,
        grade_letter: gradeLetter,
        academic_year: gradeAcademicYear,
        term: gradeTerm,
      });
    }

    if (gradesToSubmit.length === 0) {
      showToast.error('Please enter marks for at least one student');
      return;
    }

    setSubmittingGrades(true);
    try {
      await gradeAPI.bulkCreate(gradesToSubmit);
      showToast.success(`${gradesToSubmit.length} grades submitted successfully!`);
      // Reset form
      setGradeMarks(new Map());
      setGradeSubject('');
      setGradeTotalMarks(100);
      setGradeTerm('First');
    } catch (error) {
      console.error('Error submitting grades:', error);
      showToast.error('Failed to submit grades');
    } finally {
      setSubmittingGrades(false);
    }
  };

  if (!classData) return null;

  // Parse schedule from section field
  let parsedSchedule = { days: [] as string[], time: '' };
  if (classData.section) {
    try {
      parsedSchedule = JSON.parse(classData.section);
    } catch {
      // If section is not JSON, keep default empty schedule
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-xl font-bold">
              {classData.class_name} ({classData.class_code})
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-2">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="info">Class Info</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="grades">Grades</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          {/* Tab 1: Class Info */}
          <TabsContent value="info" className="pt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Class Code</p>
                  <p className="font-semibold">{classData.class_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Level</p>
                  <p className="font-semibold">{classData.level}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Section</p>
                  <p className="font-semibold">{classData.section}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Capacity</p>
                  <p className="font-semibold">{classData.capacity} students</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Room Number</p>
                  <p className="font-semibold">{classData.room_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Amount</p>
                  <p className="font-semibold">
                    ${classData.payment_amount} ({classData.payment_frequency})
                  </p>
                </div>
              </div>

              {/* Schedule Info */}
              <div className="p-4 bg-muted rounded-lg mt-4">
                <h3 className="font-bold mb-2">Class Schedule</h3>
                {parsedSchedule.days && parsedSchedule.days.length > 0 ? (
                  <div className="space-y-1">
                    <p className="text-sm">
                      <strong>Days:</strong> {parsedSchedule.days.join(', ')}
                    </p>
                    <p className="text-sm">
                      <strong>Time:</strong> {parsedSchedule.time}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No schedule set</p>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Students */}
          <TabsContent value="students" className="pt-4">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : students.length === 0 ? (
              <Alert>
                <AlertDescription>No students enrolled in this class</AlertDescription>
              </Alert>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary">
                      <TableHead className="text-primary-foreground font-semibold">Enrollment #</TableHead>
                      <TableHead className="text-primary-foreground font-semibold">Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.student_id || student.id}>
                        <TableCell>{student.enrollment_number}</TableCell>
                        <TableCell>
                          {student.first_name} {student.last_name}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Tab 3: Attendance */}
          <TabsContent value="attendance" className="pt-4">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : students.length === 0 ? (
              <Alert>
                <AlertDescription>No students to mark attendance</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Marking attendance for today ({new Date().toLocaleDateString()})
                  </AlertDescription>
                </Alert>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary">
                        <TableHead className="text-primary-foreground font-semibold">Student Name</TableHead>
                        <TableHead className="text-primary-foreground font-semibold text-center">Attendance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => {
                        const studentId = student.student_id || student.id || 0;
                        const isPresent = attendance.get(studentId);
                        return (
                          <TableRow key={studentId}>
                            <TableCell>
                              {student.first_name} {student.last_name}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 justify-center">
                                <Button
                                  size="sm"
                                  variant={isPresent === true ? 'default' : 'outline'}
                                  className={cn(
                                    'min-w-[100px]',
                                    isPresent === true && 'bg-green-600 hover:bg-green-700'
                                  )}
                                  onClick={() => handleAttendanceToggle(studentId, true)}
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  Present
                                </Button>
                                <Button
                                  size="sm"
                                  variant={isPresent === false ? 'default' : 'outline'}
                                  className={cn(
                                    'min-w-[100px]',
                                    isPresent === false && 'bg-red-600 hover:bg-red-700'
                                  )}
                                  onClick={() => handleAttendanceToggle(studentId, false)}
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Absent
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleMarkAttendance}
                    disabled={submitting || students.length === 0}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Mark Attendance'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab 4: Grades */}
          <TabsContent value="grades" className="pt-4">
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : students.length === 0 ? (
              <Alert>
                <AlertDescription>No students enrolled in this class to grade</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Enter marks for students below, then submit all grades at once.
                  </AlertDescription>
                </Alert>

                {/* Grade Settings Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="grade_subject">Subject *</Label>
                    <select
                      id="grade_subject"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={gradeSubject}
                      onChange={(e) => setGradeSubject(e.target.value)}
                    >
                      <option value="">Select Subject</option>
                      {subjectOptions.map((opt) => (
                        <option key={opt.id} value={opt.label}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="total_marks">Total Marks</Label>
                    <Input
                      id="total_marks"
                      type="number"
                      min={1}
                      value={gradeTotalMarks}
                      onChange={(e) => setGradeTotalMarks(Number(e.target.value) || 100)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="academic_year">Academic Year</Label>
                    <Input
                      id="academic_year"
                      type="number"
                      value={gradeAcademicYear}
                      onChange={(e) => setGradeAcademicYear(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="term">Term</Label>
                    <select
                      id="term"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={gradeTerm}
                      onChange={(e) => setGradeTerm(e.target.value)}
                    >
                      <option value="First">First</option>
                      <option value="Second">Second</option>
                      <option value="Third">Third</option>
                    </select>
                  </div>
                </div>

                {/* Students Grading Table */}
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-primary">
                        <TableHead className="text-primary-foreground font-semibold">#</TableHead>
                        <TableHead className="text-primary-foreground font-semibold">Student Name</TableHead>
                        <TableHead className="text-primary-foreground font-semibold text-center">
                          Marks (/{gradeTotalMarks})
                        </TableHead>
                        <TableHead className="text-primary-foreground font-semibold text-center">Percentage</TableHead>
                        <TableHead className="text-primary-foreground font-semibold text-center">Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student, index) => {
                        const studentId = student.student_id || student.id || 0;
                        const marks = gradeMarks.get(studentId);
                        const marksNum = marks !== undefined && marks !== '' ? Number(marks) : null;
                        const percentage = marksNum !== null && !isNaN(marksNum) ? (marksNum / gradeTotalMarks) * 100 : null;
                        const gradeLetter = marksNum !== null && !isNaN(marksNum) ? getGradeLetter(marksNum, gradeTotalMarks) : null;

                        return (
                          <TableRow key={studentId} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                            <TableCell>{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              {student.first_name} {student.last_name}
                            </TableCell>
                            <TableCell className="text-center w-[140px]">
                              <Input
                                type="number"
                                className="w-[100px] mx-auto"
                                value={marks !== undefined ? marks : ''}
                                onChange={(e) => handleGradeMarksChange(studentId, e.target.value)}
                                min={0}
                                max={gradeTotalMarks}
                                step={0.5}
                                placeholder="--"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              {percentage !== null ? (
                                <span className="text-sm font-medium">{percentage.toFixed(1)}%</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">--</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {gradeLetter ? (
                                <span
                                  className={cn(
                                    'inline-flex items-center justify-center min-w-[36px] px-2 py-0.5 rounded text-xs font-bold text-white',
                                    getGradeColor(gradeLetter)
                                  )}
                                >
                                  {gradeLetter}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">--</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary & Submit */}
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {Array.from(gradeMarks.values()).filter((v) => v !== '' && v !== undefined).length} of {students.length} students graded
                  </p>
                  <Button
                    size="lg"
                    className="min-w-[180px]"
                    onClick={handleSubmitBulkGrades}
                    disabled={submittingGrades || students.length === 0}
                  >
                    {submittingGrades ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit All Grades'}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab 5: Calendar */}
          <TabsContent value="calendar" className="pt-4">
            <ClassCalendar schedule={parsedSchedule} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ClassDetailModal;
