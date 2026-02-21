import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
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
  const [state, actions] = useCRUD<Class>(classAPI, 'Class');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Class>>({
    center_id: 1,
    payment_frequency: 'Monthly',
  });
  const [centerOptions, setCenterOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [teacherOptions, setTeacherOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [, setIsLoadingOptions] = useState(false);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch {
      showToast.error('Error saving class');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        await actions.delete(id);
        showToast.success('Class deleted successfully!');
      } catch {
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
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Classes Management</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Class
        </Button>
      </div>

      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state.loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : state.items.length === 0 ? (
        <Alert className="mb-4">
          <AlertDescription>No classes found. Create your first class to get started!</AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.items.map((cls) => (
            <Card
              key={cls.class_id || cls.id}
              className="flex flex-col h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-2"
            >
              <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                <CardTitle className="text-lg">{cls.class_name}</CardTitle>
                <p className="text-sm text-primary-foreground/80">{cls.class_code}</p>
              </CardHeader>
              <CardContent className="flex-1 pt-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Level</p>
                  <p className="text-sm font-semibold">Level {cls.level}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Schedule</p>
                  <p className="text-sm font-semibold">
                    {(() => {
                      try {
                        const schedule = JSON.parse(cls.section || '{}');
                        return `${schedule.days?.join(', ')} at ${schedule.time}`;
                      } catch {
                        return cls.section || 'Not set';
                      }
                    })()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="text-sm font-semibold">{cls.capacity} students</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Room Number</p>
                  <p className="text-sm font-semibold">{cls.room_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <p className="text-sm font-semibold">
                    ${cls.payment_amount} ({cls.payment_frequency})
                  </p>
                </div>
              </CardContent>
              <div className="px-4 pb-4 pt-0 flex justify-between items-center">
                <Button variant="ghost" size="sm" onClick={() => handleViewDetails(cls)}>
                  <Info className="mr-1 h-4 w-4" />
                  Details
                </Button>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenModal(cls)}>
                    <Pencil className="mr-1 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(cls.class_id || cls.id || 0)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Class Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Class' : 'Add New Class'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class_name">Class Name *</Label>
              <Input
                id="class_name"
                required
                value={formData.class_name || ''}
                onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class_code">Class Code *</Label>
              <Input
                id="class_code"
                required
                value={formData.class_code || ''}
                onChange={(e) => setFormData({ ...formData, class_code: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">Level *</Label>
                <Input
                  id="level"
                  type="number"
                  required
                  value={formData.level || ''}
                  onChange={(e) => setFormData({ ...formData, level: Number(e.target.value) })}
                />
              </div>
              <div />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  required
                  value={formData.capacity || ''}
                  onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room_number">Room Number *</Label>
                <Input
                  id="room_number"
                  required
                  value={formData.room_number || ''}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment_amount">Payment Amount *</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  required
                  step="0.01"
                  value={formData.payment_amount || ''}
                  onChange={(e) => setFormData({ ...formData, payment_amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_frequency">Payment Frequency</Label>
                <Select
                  value={formData.payment_frequency || 'Monthly'}
                  onValueChange={(val) => setFormData({ ...formData, payment_frequency: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map((opt) => (
                      <SelectItem key={opt.id} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="p-4 bg-muted rounded-lg mt-2">
              <h4 className="font-bold text-sm mb-3">Class Schedule</h4>

              {/* Days Selection */}
              <div className="mb-3">
                <p className="text-xs font-semibold mb-2">Select Class Days</p>
                <div className="grid grid-cols-2 gap-2">
                  {weekDays.map((day) => (
                    <label key={day} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Switch
                        checked={selectedDays.includes(day)}
                        onCheckedChange={(checked) => handleDayChange(day, checked)}
                      />
                      {day}
                    </label>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              <div className="space-y-2">
                <Label htmlFor="schedule_time">Class Time</Label>
                <Input
                  id="schedule_time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            {/* Center and Teacher Selection */}
            <div className="space-y-2">
              <Label htmlFor="center_id">Center</Label>
              <Select
                value={String(formData.center_id || '')}
                onValueChange={(val) => setFormData({ ...formData, center_id: Number(val) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Center" />
                </SelectTrigger>
                <SelectContent>
                  {centerOptions.map((opt) => (
                    <SelectItem key={opt.id || opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacher_id">Teacher (Optional)</Label>
              <Select
                value={String(formData.teacher_id || 'none')}
                onValueChange={(val) =>
                  setFormData({
                    ...formData,
                    teacher_id: val === 'none' ? undefined : Number(val),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {teacherOptions.map((opt) => (
                    <SelectItem key={opt.id || opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={state.loading}>
                {state.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Class Detail Modal with Tabs */}
      <ClassDetailModal
        open={detailModalOpen}
        classData={selectedClass}
        onClose={handleCloseDetailModal}
      />
    </div>
  );
};

export default ClassesPage;
