import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Tabs,
  Tab,
  Box,
  Stack,
  Button,
  CircularProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  useTheme,
} from '@mui/material';
import { Close as CloseIcon, Check as CheckIcon } from '@mui/icons-material';
import { studentAPI, attendanceAPI } from '../../../shared/api/api';
import { showToast } from '../../../utils/toast';
import ClassCalendar from './ClassCalendar';

interface Class {
  class_id?: number;
  id?: number;
  center_id: number;
  class_name: string;
  class_code: string;
  level: number;
  section: string;
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index } = props;
  return (
    <div role="tabpanel" hidden={value !== index} style={{ width: '100%' }}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
};

interface ClassDetailModalProps {
  open: boolean;
  classData: Class | null;
  onClose: () => void;
}

const ClassDetailModal: React.FC<ClassDetailModalProps> = ({ open, classData, onClose }) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Map<number, boolean>>(new Map());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<Attendance[]>([]);

  useEffect(() => {
    if (open && classData) {
      loadStudents();
      loadTodayAttendance();
    }
  }, [open, classData]);

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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {classData.class_name} ({classData.class_code})
        </Typography>
        <Button
          size="small"
          onClick={onClose}
          sx={{ minWidth: 'auto', p: 1 }}
        >
          <CloseIcon />
        </Button>
      </DialogTitle>

      <DialogContent sx={{ pb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, mt: 2 }}
        >
          <Tab label="Class Info" />
          <Tab label="Students" />
          <Tab label="Attendance" />
          <Tab label="Calendar" />
        </Tabs>

        {/* Tab 1: Class Info */}
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Class Code
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {classData.class_code}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Level
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {classData.level}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Section
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {classData.section}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Capacity
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {classData.capacity} students
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Room Number
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {classData.room_number}
                </Typography>
              </Box>
              <Box>
                <Typography variant="subtitle2" color="textSecondary">
                  Payment Amount
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  ${classData.payment_amount} ({classData.payment_frequency})
                </Typography>
              </Box>
            </Box>

            {/* Schedule Info */}
            <Box
              sx={{
                p: 2,
                backgroundColor: theme.palette.background.default,
                borderRadius: 1,
                mt: 2,
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Class Schedule
              </Typography>
              {parsedSchedule.days && parsedSchedule.days.length > 0 ? (
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Days:</strong> {parsedSchedule.days.join(', ')}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Time:</strong> {parsedSchedule.time}
                  </Typography>
                </Stack>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  No schedule set
                </Typography>
              )}
            </Box>
          </Stack>
        </TabPanel>

        {/* Tab 2: Students */}
        <TabPanel value={tabValue} index={1}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : students.length === 0 ? (
            <Alert severity="info">No students enrolled in this class</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Enrollment #</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 600 }}>Name</TableCell>
                  </TableRow>
                </TableHead>
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
            </TableContainer>
          )}
        </TabPanel>

        {/* Tab 3: Attendance */}
        <TabPanel value={tabValue} index={2}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : students.length === 0 ? (
            <Alert severity="info">No students to mark attendance</Alert>
          ) : (
            <Stack spacing={2}>
              <Alert severity="info">
                Marking attendance for today ({new Date().toLocaleDateString()})
              </Alert>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: theme.palette.primary.main }}>
                      <TableCell sx={{ color: 'white', fontWeight: 600 }}>Student Name</TableCell>
                      <TableCell
                        align="center"
                        sx={{ color: 'white', fontWeight: 600 }}
                      >
                        Attendance
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student) => {
                      const studentId = student.student_id || student.id || 0;
                      const isPresent = attendance.get(studentId);
                      return (
                        <TableRow key={studentId}>
                          <TableCell>
                            {student.first_name} {student.last_name}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                              <Button
                                size="small"
                                variant={isPresent === true ? 'contained' : 'outlined'}
                                color="success"
                                onClick={() => handleAttendanceToggle(studentId, true)}
                                startIcon={<CheckIcon />}
                                sx={{ minWidth: 100 }}
                              >
                                Present
                              </Button>
                              <Button
                                size="small"
                                variant={isPresent === false ? 'contained' : 'outlined'}
                                color="error"
                                onClick={() => handleAttendanceToggle(studentId, false)}
                                startIcon={<CloseIcon />}
                                sx={{ minWidth: 100 }}
                              >
                                Absent
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
              <Button
                variant="contained"
                onClick={handleMarkAttendance}
                disabled={submitting || students.length === 0}
                sx={{ alignSelf: 'flex-end' }}
              >
                {submitting ? <CircularProgress size={24} /> : 'Mark Attendance'}
              </Button>
            </Stack>
          )}
        </TabPanel>

        {/* Tab 4: Calendar */}
        <TabPanel value={tabValue} index={3}>
          <ClassCalendar schedule={parsedSchedule} />
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
};

export default ClassDetailModal;
