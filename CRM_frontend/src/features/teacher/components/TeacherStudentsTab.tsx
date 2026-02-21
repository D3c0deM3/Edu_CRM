import { useState, useEffect } from 'react';
import {
  Search,
  Eye,
  Mail,
  Phone,
  MoreVertical,
  Star,
  CalendarDays,
  FileQuestion,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { studentAPI, gradeAPI, attendanceAPI, testAPI } from '../../../shared/api/api';
import { useNavigate } from 'react-router-dom';

interface Student {
  student_id: number;
  center_id?: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  enrollment_number: string;
  date_of_birth?: string;
  parent_name?: string;
  parent_phone?: string;
  gender?: string;
  status: string;
  teacher_id?: number;
  class_id?: number;
  class_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface StudentDetails {
  grades: any[];
  attendance: any[];
  testResults: any[];
  assignments: any[];
}

interface TeacherStudentsTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const TeacherStudentsTab = ({ teacherId, onRefresh: _onRefresh }: TeacherStudentsTabProps) => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [detailsTab, setDetailsTab] = useState('overview');
  const [studentDetails, setStudentDetails] = useState<StudentDetails>({
    grades: [],
    attendance: [],
    testResults: [],
    assignments: [],
  });
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [teacherId]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = students.filter(
        (s) =>
          s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.enrollment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          s.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [searchTerm, students]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await studentAPI.getAll();
      const allStudents = response.data || [];
      setStudents(allStudents);
      setFilteredStudents(allStudents);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentDetails = async (student: Student) => {
    try {
      setDetailsLoading(true);
      const [gradesRes, attendanceRes, testsRes] = await Promise.all([
        gradeAPI.getByStudent(student.student_id).catch(() => ({ data: [] })),
        attendanceAPI.getByStudent(student.student_id).catch(() => ({ data: [] })),
        testAPI.getStudentResults(student.student_id).catch(() => ({ data: [] })),
      ]);

      setStudentDetails({
        grades: gradesRes.data || [],
        attendance: attendanceRes.data || [],
        testResults: testsRes.data || [],
        assignments: [],
      });
    } catch (error) {
      console.error('Error loading student details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleViewDetails = (student: Student, tab = 'overview') => {
    setSelectedStudent(student);
    setDetailsDialog(true);
    setDetailsTab(tab);
    loadStudentDetails(student);
  };

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'destructive';
      case 'graduated':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const calculateAttendancePercentage = () => {
    if (studentDetails.attendance.length === 0) return 0;
    const present = studentDetails.attendance.filter(
      (a) => a.status === 'Present' || a.status === 'Late'
    ).length;
    return Math.round((present / studentDetails.attendance.length) * 100);
  };

  const calculateAverageGrade = () => {
    if (studentDetails.grades.length === 0) return 0;
    const total = studentDetails.grades.reduce((sum, g) => sum + (g.percentage || 0), 0);
    return Math.round(total / studentDetails.grades.length);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Search Bar */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <h3 className="text-lg font-semibold">
          My Students ({filteredStudents.length})
        </h3>
        <div className="relative min-w-[350px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search students by name, email, or enrollment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Students Table */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No students found</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Student</TableHead>
                <TableHead>Enrollment #</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow
                  key={student.student_id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => handleViewDetails(student)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-semibold">
                        {student.first_name?.[0]}{student.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-semibold">
                          {student.first_name} {student.last_name}
                        </p>
                        {student.email && (
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{student.enrollment_number}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {student.class_name || 'Unassigned'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {student.email && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="p-1.5 rounded-md hover:bg-muted text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `mailto:${student.email}`;
                                }}
                              >
                                <Mail className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{student.email}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {student.phone && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                className="p-1.5 rounded-md hover:bg-muted text-primary"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.location.href = `tel:${student.phone}`;
                                }}
                              >
                                <Phone className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{student.phone}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(student.status) as any}>
                      {student.status || 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-1.5 rounded-md hover:bg-muted"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(student)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/student/${student.student_id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Full Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewDetails(student, 'grades')}>
                          <Star className="h-4 w-4 mr-2" />
                          View Grades
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewDetails(student, 'attendance')}>
                          <CalendarDays className="h-4 w-4 mr-2" />
                          View Attendance
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewDetails(student, 'tests')}>
                          <FileQuestion className="h-4 w-4 mr-2" />
                          View Test Results
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="mt-3">
        <p className="text-sm text-muted-foreground">
          Showing {filteredStudents.length} of {students.length} students
        </p>
      </div>

      {/* Student Details Dialog */}
      <Dialog open={detailsDialog} onOpenChange={setDetailsDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xl font-bold">
                {selectedStudent?.first_name?.[0]}{selectedStudent?.last_name?.[0]}
              </div>
              <div>
                <DialogTitle className="text-lg">
                  {selectedStudent?.first_name} {selectedStudent?.last_name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedStudent?.enrollment_number}
                </p>
              </div>
            </div>
          </DialogHeader>

          {detailsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Card className="bg-indigo-500/10 text-center p-4">
                  <p className="text-3xl font-bold text-primary">{calculateAverageGrade()}%</p>
                  <p className="text-xs text-muted-foreground">Avg. Grade</p>
                </Card>
                <Card className="bg-emerald-500/10 text-center p-4">
                  <p className="text-3xl font-bold text-emerald-500">{calculateAttendancePercentage()}%</p>
                  <p className="text-xs text-muted-foreground">Attendance</p>
                </Card>
                <Card className="bg-rose-500/10 text-center p-4">
                  <p className="text-3xl font-bold text-rose-500">{studentDetails.testResults.length}</p>
                  <p className="text-xs text-muted-foreground">Tests Taken</p>
                </Card>
                <Card className="bg-sky-500/10 text-center p-4">
                  <p className="text-3xl font-bold text-sky-500">{studentDetails.grades.length}</p>
                  <p className="text-xs text-muted-foreground">Grades</p>
                </Card>
              </div>

              {/* Tabs */}
              <Tabs value={detailsTab} onValueChange={setDetailsTab}>
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="overview" className="gap-1.5">
                    <TrendingUp className="h-4 w-4" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="grades" className="gap-1.5">
                    <Star className="h-4 w-4" /> Grades
                  </TabsTrigger>
                  <TabsTrigger value="attendance" className="gap-1.5">
                    <CalendarDays className="h-4 w-4" /> Attendance
                  </TabsTrigger>
                  <TabsTrigger value="tests" className="gap-1.5">
                    <FileQuestion className="h-4 w-4" /> Test Results
                  </TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview">
                  <h4 className="font-semibold mb-3">Personal Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm">{selectedStudent?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm">{selectedStudent?.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Date of Birth</p>
                      <p className="text-sm">
                        {selectedStudent?.date_of_birth
                          ? new Date(selectedStudent.date_of_birth).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Gender</p>
                      <p className="text-sm">{selectedStudent?.gender || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Parent/Guardian</p>
                      <p className="text-sm">{selectedStudent?.parent_name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Parent Phone</p>
                      <p className="text-sm">{selectedStudent?.parent_phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Class</p>
                      <p className="text-sm">{selectedStudent?.class_name || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge variant={getStatusVariant(selectedStudent?.status || '') as any}>
                        {selectedStudent?.status || 'Active'}
                      </Badge>
                    </div>
                  </div>

                  <h4 className="font-semibold mb-3">Recent Activity</h4>
                  {studentDetails.grades.length === 0 && studentDetails.attendance.length === 0 ? (
                    <p className="text-muted-foreground">No activity recorded yet</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {studentDetails.grades.slice(0, 3).map((grade, i) => (
                        <Card key={i} className="p-3 border">
                          <p className="text-sm">
                            Grade: <strong>{grade.marks_obtained}/{grade.total_marks}</strong> in {grade.subject}
                          </p>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Grades Tab */}
                <TabsContent value="grades">
                  {studentDetails.grades.length === 0 ? (
                    <p className="text-center py-6 text-muted-foreground">No grades recorded</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Percentage</TableHead>
                          <TableHead>Grade</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentDetails.grades.map((grade, i) => (
                          <TableRow key={i}>
                            <TableCell>{grade.subject}</TableCell>
                            <TableCell>{grade.marks_obtained}/{grade.total_marks}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-primary"
                                    style={{ width: `${grade.percentage || 0}%` }}
                                  />
                                </div>
                                <span className="text-sm">{grade.percentage}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge>{grade.grade_letter}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* Attendance Tab */}
                <TabsContent value="attendance">
                  {studentDetails.attendance.length === 0 ? (
                    <p className="text-center py-6 text-muted-foreground">No attendance records</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentDetails.attendance.slice(0, 10).map((att, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              {new Date(att.attendance_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  att.status === 'Present'
                                    ? 'success'
                                    : att.status === 'Late'
                                    ? 'warning'
                                    : 'destructive'
                                }
                              >
                                {att.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{att.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                {/* Test Results Tab */}
                <TabsContent value="tests">
                  {studentDetails.testResults.length === 0 ? (
                    <p className="text-center py-6 text-muted-foreground">No test results</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Test</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentDetails.testResults.map((result, i) => (
                          <TableRow key={i}>
                            <TableCell>{result.test_name}</TableCell>
                            <TableCell>
                              {result.score !== null ? `${result.score}/${result.total_marks}` : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={result.status === 'graded' ? 'success' : 'warning'}
                              >
                                {result.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {result.submitted_at
                                ? new Date(result.submitted_at).toLocaleDateString()
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialog(false)}>
              Close
            </Button>
            <Button onClick={() => navigate(`/student/${selectedStudent?.student_id}`)}>
              View Full Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherStudentsTab;
