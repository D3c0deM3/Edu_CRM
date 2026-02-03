import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { teacherAPI, classAPI, studentAPI, gradeAPI, subjectAPI, assignmentAPI } from '../../../shared/api/api';
import { AssignmentSectionTeacher } from './components/AssignmentSectionTeacher';
import { showToast } from '../../../utils/toast';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  IconButton,
  Chip,
  Avatar,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
  Divider,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Close as CloseIcon,
  Add as AddIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  Badge as BadgeIcon,
  CalendarMonth as CalendarIcon,
  ExpandMore as ExpandMoreIcon,
  Person as PersonIcon,
  Class as ClassIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';

interface Subject {
  subject_id?: number;
  id?: number;
  subject_name: string;
}

interface Teacher {
  teacher_id?: number;
  id?: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  qualification: string;
  specialization: string;
  status: string;
}

interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  teacher_id?: number;
  level: string;
  section?: string;
}

interface Student {
  student_id?: number;
  id?: number;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  class_id: number;
  email: string;
  phone: string;
  status: string;
}

interface Assignment {
  assignment_id?: number;
  id?: number;
  class_id?: number;
  assignment_title: string;
  due_date: string;
  status: string;
  grade?: number;
}

interface GradeEntry {
  student_id: number;
  percentage: number;
  grade_letter: string;
}

// TabPanel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const TeacherDetailPage = () => {
  const theme = useTheme();
  const { teacherId } = useParams<{ teacherId: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedTerm, setSelectedTerm] = useState('Q1');
  const [gradeEntries, setGradeEntries] = useState<GradeEntry[]>([]);
  const [isSavingGrades, setIsSavingGrades] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadTeacherDetails();
  }, [teacherId]);

  const loadTeacherDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch teacher details
      const teacherResponse = await teacherAPI.getById(Number(teacherId));
      const teacherData = teacherResponse.data || teacherResponse;
      setTeacher(teacherData);

      // Fetch all classes, students, subjects and assignments
      const [classesRes, studentsRes, subjectsRes, assignmentRes] = await Promise.all([
        classAPI.getAll(),
        studentAPI.getAll(),
        subjectAPI.getAll(),
        assignmentAPI.getAll(),
      ]);

      const classesData = classesRes.data || classesRes;
      const studentsData = studentsRes.data || studentsRes;
      const subjectsData = subjectsRes.data || subjectsRes;
      const assignmentData = assignmentRes.data || assignmentRes;

      // Filter classes taught by this teacher
      const teacherIdNum = Number(teacherId);
      const teacherClasses = Array.isArray(classesData)
        ? classesData.filter((c: any) => (c.teacher_id || c.class_id === teacherIdNum))
        : [];
      setClasses(teacherClasses);

      // Get all students
      const allStudents = Array.isArray(studentsData) ? studentsData : [];
      setStudents(allStudents);

      // Get all subjects
      const allSubjects = Array.isArray(subjectsData) ? subjectsData : [];
      setSubjects(allSubjects);

      // Get assignments where class_id equals teacher_id
      const teacherAssignments = Array.isArray(assignmentData)
        ? assignmentData.filter((a: any) => Number(a.class_id) === teacherIdNum)
        : [];
      setAssignments(teacherAssignments);
    } catch (err) {
      console.error('Error loading teacher details:', err);
      setError('Failed to load teacher details');
    } finally {
      setLoading(false);
    }
  };

  const getStudentsByClass = (classId: number | undefined) => {
    if (!classId) return [];
    return students.filter((s) => s.class_id === classId);
  };

  const calculateGradeLetter = (percentage: number): string => {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  const handleOpenGradeModal = () => {
    setSelectedClassId(null);
    setSelectedSubjectId(null);
    setSelectedTerm('Q1');
    setGradeEntries([]);
    setIsGradeModalOpen(true);
  };

  const handleCloseGradeModal = () => {
    setIsGradeModalOpen(false);
    setSelectedClassId(null);
    setSelectedSubjectId(null);
    setGradeEntries([]);
  };

  const handleClassSelect = (classId: number) => {
    setSelectedClassId(classId);
    const classStudents = getStudentsByClass(classId);
    setGradeEntries(
      classStudents.map((s) => ({
        student_id: s.student_id || s.id || 0,
        percentage: 0,
        grade_letter: 'F',
      }))
    );
  };

  const handlePercentageChange = (index: number, percentage: number) => {
    const newEntries = [...gradeEntries];
    newEntries[index].percentage = percentage;
    newEntries[index].grade_letter = calculateGradeLetter(percentage);
    setGradeEntries(newEntries);
  };

  const handleSaveGrades = async () => {
    if (!selectedClassId || !selectedSubjectId) {
      showToast.error('Please select class and subject');
      return;
    }

    setIsSavingGrades(true);
    try {
      const teacherIdNum = Number(teacherId);
      const subjectIdNum = Number(selectedSubjectId);
      // Save grades for all students
      const gradePromises = gradeEntries.map((entry) =>
        gradeAPI.create({
          student_id: entry.student_id,
          teacher_id: teacherIdNum,
          subject: subjectIdNum,
          percentage: entry.percentage,
          grade_letter: entry.grade_letter,
          term: selectedTerm,
        })
      );

      await Promise.all(gradePromises);
      showToast.success('Grades saved successfully');
      handleCloseGradeModal();
      loadTeacherDetails();
    } catch (error: any) {
      showToast.error(error.message || 'Failed to save grades');
    } finally {
      setIsSavingGrades(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress size={48} />
      </Box>
    );
  }

  if (!teacher) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Alert severity="error">Teacher not found</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/teachers')} sx={{ mt: 2 }}>
          Back to Teachers
        </Button>
      </Box>
    );
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'inactive': return 'error';
      case 'on leave': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/teachers')}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700, flexGrow: 1 }}>
          Teacher Details
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenGradeModal}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            textTransform: 'none',
          }}
        >
          Add Grades
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Teacher Profile Card */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.15)}`,
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            p: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <Avatar
            sx={{
              width: 100,
              height: 100,
              fontSize: '2rem',
              fontWeight: 700,
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: '4px solid rgba(255,255,255,0.4)',
            }}
          >
            {getInitials(teacher.first_name, teacher.last_name)}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
              {teacher.first_name} {teacher.last_name}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
              {teacher.specialization}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              <Chip
                label={teacher.status}
                color={getStatusColor(teacher.status) as any}
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={teacher.employee_id}
                variant="outlined"
                size="small"
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
              />
            </Box>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Chip
              icon={<ClassIcon sx={{ color: 'white !important' }} />}
              label={`${classes.length} Classes`}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 600,
              }}
            />
            <Chip
              icon={<PersonIcon sx={{ color: 'white !important' }} />}
              label={`${students.filter(s => classes.some(c => (c.class_id || c.id) === s.class_id)).length} Students`}
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>
      </Card>

      {/* Tabs */}
      <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '1rem',
              minHeight: 56,
            },
          }}
        >
          <Tab icon={<PersonIcon />} iconPosition="start" label="Information" />
          <Tab icon={<ClassIcon />} iconPosition="start" label="Classes & Students" />
          <Tab icon={<AssignmentIcon />} iconPosition="start" label="Assignments" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Tab 0: Information */}
          <TabPanel value={tabValue} index={0}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.primary.main }}>
                      Contact Information
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <EmailIcon sx={{ color: theme.palette.text.secondary }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Email</Typography>
                          <Typography variant="body1">{teacher.email}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <PhoneIcon sx={{ color: theme.palette.text.secondary }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Phone</Typography>
                          <Typography variant="body1">{teacher.phone}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CalendarIcon sx={{ color: theme.palette.text.secondary }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Date of Birth</Typography>
                          <Typography variant="body1">
                            {teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString() : 'N/A'}
                          </Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.primary.main }}>
                      Professional Details
                    </Typography>
                    <Stack spacing={2}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <BadgeIcon sx={{ color: theme.palette.text.secondary }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Employee ID</Typography>
                          <Typography variant="body1">{teacher.employee_id}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <SchoolIcon sx={{ color: theme.palette.text.secondary }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Qualification</Typography>
                          <Typography variant="body1">{teacher.qualification}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <SchoolIcon sx={{ color: theme.palette.text.secondary }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Specialization</Typography>
                          <Typography variant="body1">{teacher.specialization}</Typography>
                        </Box>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 1: Classes & Students */}
          <TabPanel value={tabValue} index={1}>
            {classes.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6, color: theme.palette.text.secondary }}>
                <ClassIcon sx={{ fontSize: 64, opacity: 0.3, mb: 2 }} />
                <Typography variant="h6">No classes assigned to this teacher</Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {classes.map((classItem) => {
                  const classStudents = getStudentsByClass(classItem.class_id || classItem.id);
                  return (
                    <Accordion
                      key={classItem.class_id || classItem.id}
                      sx={{
                        borderRadius: '12px !important',
                        '&:before': { display: 'none' },
                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.08)}`,
                      }}
                    >
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        sx={{
                          backgroundColor: alpha(theme.palette.primary.main, 0.05),
                          borderRadius: '12px',
                          '&.Mui-expanded': {
                            borderBottomLeftRadius: 0,
                            borderBottomRightRadius: 0,
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                          <Avatar sx={{ backgroundColor: theme.palette.primary.main }}>
                            <ClassIcon />
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {classItem.class_name}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Level: {classItem.level || 'N/A'}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${classStudents.length} Students`}
                            color="primary"
                            size="small"
                            sx={{ fontWeight: 600 }}
                          />
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails sx={{ p: 0 }}>
                        <TableContainer>
                          <Table>
                            <TableHead>
                              <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
                                <TableCell sx={{ fontWeight: 600 }}>Enrollment #</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {classStudents.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} sx={{ textAlign: 'center', py: 3 }}>
                                    No students in this class
                                  </TableCell>
                                </TableRow>
                              ) : (
                                classStudents.map((student) => (
                                  <TableRow key={student.student_id || student.id} hover>
                                    <TableCell>{student.enrollment_number}</TableCell>
                                    <TableCell>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                                          {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                                        </Avatar>
                                        {student.first_name} {student.last_name}
                                      </Box>
                                    </TableCell>
                                    <TableCell>{student.email}</TableCell>
                                    <TableCell>{student.phone}</TableCell>
                                    <TableCell>
                                      <Chip
                                        label={student.status}
                                        color={getStatusColor(student.status) as any}
                                        size="small"
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
              </Stack>
            )}
          </TabPanel>

          {/* Tab 2: Assignments */}
          <TabPanel value={tabValue} index={2}>
            <AssignmentSectionTeacher
              assignments={assignments}
              teacherId={teacher?.teacher_id || teacher?.id}
              onRefresh={loadTeacherDetails}
            />
          </TabPanel>
        </Box>
      </Card>

      {/* Grade Modal */}
      <Dialog
        open={isGradeModalOpen}
        onClose={handleCloseGradeModal}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Add Grades to Students
          </Typography>
          <IconButton onClick={handleCloseGradeModal} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Select Class</InputLabel>
                <Select
                  value={selectedClassId || ''}
                  label="Select Class"
                  onChange={(e) => handleClassSelect(Number(e.target.value))}
                >
                  <MenuItem value="">-- Select Class --</MenuItem>
                  {classes.map((cls) => (
                    <MenuItem key={cls.class_id || cls.id} value={cls.class_id || cls.id}>
                      {cls.class_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Select Subject</InputLabel>
                <Select
                  value={selectedSubjectId || ''}
                  label="Select Subject"
                  onChange={(e) => setSelectedSubjectId(Number(e.target.value))}
                >
                  <MenuItem value="">-- Select Subject --</MenuItem>
                  {subjects.map((subject) => (
                    <MenuItem key={subject.subject_id || subject.id} value={subject.subject_id || subject.id}>
                      {subject.subject_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel>Select Term</InputLabel>
                <Select
                  value={selectedTerm}
                  label="Select Term"
                  onChange={(e) => setSelectedTerm(e.target.value)}
                >
                  <MenuItem value="Q1">Q1</MenuItem>
                  <MenuItem value="Q2">Q2</MenuItem>
                  <MenuItem value="Q3">Q3</MenuItem>
                  <MenuItem value="Q4">Q4</MenuItem>
                  <MenuItem value="Semester 1">Semester 1</MenuItem>
                  <MenuItem value="Semester 2">Semester 2</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          {selectedClassId && gradeEntries.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Enter Grades for Students
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.08) }}>
                      <TableCell sx={{ fontWeight: 600 }}>Enrollment #</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Percentage</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Grade</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {gradeEntries.map((entry, index) => {
                      const student = students.find((s) => (s.student_id || s.id) === entry.student_id);
                      return (
                        <TableRow key={entry.student_id} hover>
                          <TableCell>{student?.enrollment_number}</TableCell>
                          <TableCell>{student?.first_name} {student?.last_name}</TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              size="small"
                              inputProps={{ min: 0, max: 100 }}
                              value={entry.percentage}
                              onChange={(e) => handlePercentageChange(index, Number(e.target.value))}
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={entry.grade_letter}
                              color={
                                entry.grade_letter === 'A' ? 'success' :
                                entry.grade_letter === 'B' ? 'primary' :
                                entry.grade_letter === 'C' ? 'info' :
                                entry.grade_letter === 'D' ? 'warning' : 'error'
                              }
                              sx={{ fontWeight: 700, minWidth: 40 }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleCloseGradeModal} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveGrades}
            variant="contained"
            disabled={isSavingGrades || !selectedClassId || !selectedSubjectId || gradeEntries.length === 0}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 2,
              px: 4,
            }}
          >
            {isSavingGrades ? <CircularProgress size={24} /> : 'Save Grades'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TeacherDetailPage;
