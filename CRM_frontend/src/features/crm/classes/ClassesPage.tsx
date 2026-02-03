import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Container,
  Typography,
  useTheme,
  Grid,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useCRUD } from '../hooks/useCRUD';
import { classAPI } from '../../../shared/api/api';
import { fetchCenters, fetchTeachers, frequencyOptions } from '../../../utils/dropdownOptions';
import { showToast } from '../../../utils/toast';
import ClassDetailModal from './ClassDetailModal';

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
}

const ClassesPage = () => {
  const theme = useTheme();
  const [state, actions] = useCRUD<Class>(classAPI, 'Class');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Class>>({
    center_id: 1,
    payment_frequency: 'Monthly',
  });
  const [centerOptions, setCenterOptions] = useState<any[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<any[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // Schedule state
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Class detail modal state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);

  useEffect(() => {
    actions.fetchAll();
    loadDropdownOptions();
  }, []);

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const [centers, teachers] = await Promise.all([
        fetchCenters(),
        fetchTeachers(),
      ]);
      setCenterOptions(centers);
      setTeacherOptions(teachers);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleOpenModal = (cls?: Class) => {
    if (cls) {
      setEditingId(cls.class_id || cls.id || null);
      setFormData(cls);
      // Parse schedule from section field if it exists
      if (cls.section) {
        try {
          const parsed = JSON.parse(cls.section);
          setSelectedDays(parsed.days || []);
          setScheduleTime(parsed.time || '09:00');
        } catch {
          // If section is not JSON (plain text), keep it as is
          setSelectedDays([]);
          setScheduleTime('09:00');
        }
      } else {
        setSelectedDays([]);
        setScheduleTime('09:00');
      }
    } else {
      setEditingId(null);
      setFormData({
        center_id: 1,
        payment_frequency: 'Monthly',
      });
      setSelectedDays([]);
      setScheduleTime('09:00');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      center_id: 1,
      payment_frequency: 'Monthly',
    });
    setSelectedDays([]);
    setScheduleTime('09:00');
  };

  const handleDayChange = (day: string, checked: boolean) => {
    setSelectedDays(
      checked
        ? [...selectedDays, day]
        : selectedDays.filter((d) => d !== day)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const scheduleObject = {
      days: selectedDays,
      time: scheduleTime,
    };

    const dataToSubmit = {
      ...formData,
      section: JSON.stringify(scheduleObject),
    };

    try {
      if (editingId) {
        await actions.update(editingId, dataToSubmit);
        showToast.success('Class updated successfully!');
      } else {
        await actions.create(dataToSubmit);
        showToast.success('Class created successfully!');
      }
      handleCloseModal();
    } catch (error) {
      showToast.error('Error saving class');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        await actions.delete(id);
        showToast.success('Class deleted successfully!');
      } catch (error) {
        showToast.error('Error deleting class');
      }
    }
  };

  const handleViewDetails = (cls: Class) => {
    setSelectedClass(cls);
    setDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedClass(null);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Classes Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenModal()}
          sx={{
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
        >
          Add Class
        </Button>
      </Box>

      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      )}

      {state.loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : state.items.length === 0 ? (
        <Alert severity="info">No classes found. Create your first class to get started!</Alert>
      ) : (
        <Grid container spacing={3}>
          {state.items.map((cls) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={cls.class_id || cls.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 4,
                    transform: 'translateY(-8px)',
                  },
                }}
              >
                <CardHeader
                  title={cls.class_name}
                  subheader={cls.class_code}
                  sx={{
                    backgroundColor: theme.palette.primary.light,
                    color: 'white',
                    '& .MuiCardHeader-subheader': {
                      color: 'rgba(255, 255, 255, 0.8)',
                    },
                  }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Level
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Level {cls.level}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Schedule
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {(() => {
                          try {
                            const schedule = JSON.parse(cls.section || '{}');
                            return `${schedule.days?.join(', ')} at ${schedule.time}`;
                          } catch {
                            return cls.section || 'Not set';
                          }
                        })()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Capacity
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {cls.capacity} students
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Room Number
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {cls.room_number}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="textSecondary">
                        Payment
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        ${cls.payment_amount} ({cls.payment_frequency})
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
                <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
                  <Button
                    size="small"
                    startIcon={<InfoIcon />}
                    onClick={() => handleViewDetails(cls)}
                    sx={{ color: theme.palette.primary.main }}
                  >
                    Details
                  </Button>
                  <Stack direction="row" spacing={0.5}>
                    <Button
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleOpenModal(cls)}
                      sx={{ minWidth: 'auto' }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDelete(cls.class_id || cls.id || 0)}
                      sx={{ color: 'error.main', minWidth: 'auto' }}
                    >
                      Delete
                    </Button>
                  </Stack>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add/Edit Class Dialog */}
      <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Class' : 'Add New Class'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Class Name"
              required
              value={formData.class_name || ''}
              onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Class Code"
              required
              value={formData.class_code || ''}
              onChange={(e) => setFormData({ ...formData, class_code: e.target.value })}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label="Level"
                type="number"
                required
                value={formData.level || ''}
                onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
              />

            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label="Capacity"
                type="number"
                required
                value={formData.capacity || ''}
                onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
              />
              <TextField
                fullWidth
                label="Room Number"
                required
                value={formData.room_number || ''}
                onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
              />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                fullWidth
                label="Payment Amount"
                type="number"
                required
                inputProps={{ step: '0.01' }}
                value={formData.payment_amount || ''}
                onChange={(e) => setFormData({ ...formData, payment_amount: Number(e.target.value) })}
              />
              <FormControl fullWidth>
                <InputLabel>Payment Frequency</InputLabel>
                <Select
                  value={formData.payment_frequency || 'Monthly'}
                  label="Payment Frequency"
                  onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}
                >
                  {frequencyOptions.map((opt) => (
                    <MenuItem key={opt.id} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Schedule Section */}
            <Box
              sx={{
                p: 2,
                backgroundColor: theme.palette.background.default,
                borderRadius: 1,
                mt: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
                Class Schedule
              </Typography>

              {/* Days Selection */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                  Select Class Days
                </Typography>
                <FormGroup>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
                    {weekDays.map((day) => (
                      <FormControlLabel
                        key={day}
                        control={
                          <Checkbox
                            checked={selectedDays.includes(day)}
                            onChange={(e) => handleDayChange(day, e.target.checked)}
                          />
                        }
                        label={day}
                      />
                    ))}
                  </Box>
                </FormGroup>
              </Box>

              {/* Time Selection */}
              <TextField
                fullWidth
                label="Class Time"
                type="time"
                InputLabelProps={{ shrink: true }}
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </Box>

            {/* Center and Teacher Selection */}
            <FormControl fullWidth>
              <InputLabel>Center</InputLabel>
              <Select
                value={formData.center_id || ''}
                label="Center"
                onChange={(e) => setFormData({ ...formData, center_id: Number(e.target.value) })}
              >
                {centerOptions.map((opt) => (
                  <MenuItem key={opt.id || opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Teacher (Optional)</InputLabel>
              <Select
                value={formData.teacher_id || ''}
                label="Teacher (Optional)"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    teacher_id: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              >
                <MenuItem value="">None</MenuItem>
                {teacherOptions.map((opt) => (
                  <MenuItem key={opt.id || opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={state.loading}>
            {state.loading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Class Detail Modal with Tabs */}
      <ClassDetailModal
        open={detailModalOpen}
        classData={selectedClass}
        onClose={handleCloseDetailModal}
      />
    </Container>
  );
};

export default ClassesPage;
