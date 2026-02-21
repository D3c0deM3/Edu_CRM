import { useState } from 'react';
import { useMemo } from 'react';
import { Pencil, Trash2, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { attendanceAPI } from '../../../../shared/api/api';
import { showToast } from '../../../../utils/toast';

interface Attendance {
  attendance_id?: number;
  id?: number;
  student_id?: number;
  attendance_date: string;
  status: string;
  remarks?: string;
}

interface AttendanceSectionProps {
  attendance: Attendance[];
  onRefresh: () => void;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'present':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'absent':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'late':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const AttendanceSection = ({ attendance, onRefresh }: AttendanceSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Attendance>>({
    status: 'Present',
  });
  const [loading, setLoading] = useState(false);

  const handleOpenModal = (record?: Attendance) => {
    if (record) {
      setEditingId(record.attendance_id || record.id || null);
      setFormData(record);
    } else {
      setEditingId(null);
      setFormData({ status: 'Present' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ status: 'Present' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await attendanceAPI.update(editingId, formData);
        showToast.success('Attendance updated successfully');
      } else {
        await attendanceAPI.create(formData);
        showToast.success('Attendance created successfully');
      }
      onRefresh();
      handleCloseModal();
    } catch (error: unknown) {
      const err = error as { message?: string };
      showToast.error(err.message || 'Failed to save attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure?')) {
      try {
        await attendanceAPI.delete(id);
        showToast.success('Attendance deleted successfully');
        onRefresh();
      } catch (error: unknown) {
        const err = error as { message?: string };
        showToast.error(err.message || 'Failed to delete attendance');
      }
    }
  };


  // Filter by day of week
  const [dayFilter, setDayFilter] = useState<string>('');
  const filteredAttendance = useMemo(() => {
    if (!dayFilter) return attendance;
    return attendance.filter((rec) => {
      const day = new Date(rec.attendance_date).toLocaleDateString('en-US', { weekday: 'long' });
      return day === dayFilter;
    });
  }, [attendance, dayFilter]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Attendance Calendar</CardTitle>
        <Button size="sm" onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" /> Add Record
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <label htmlFor="day-filter" className="font-medium">Filter by Day:</label>
            <select
              id="day-filter"
              className="border rounded px-2 py-1 text-sm"
              value={dayFilter}
              onChange={e => setDayFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAttendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">No records found.</TableCell>
                  </TableRow>
                ) : (
                  filteredAttendance.map((rec) => (
                    <TableRow key={rec.attendance_id || rec.id}>
                      <TableCell>{rec.attendance_date}</TableCell>
                      <TableCell>{new Date(rec.attendance_date).toLocaleDateString('en-US', { weekday: 'long' })}</TableCell>
                      <TableCell>
                        <Badge className={getStatusBadgeVariant(rec.status)}>{rec.status}</Badge>
                      </TableCell>
                      <TableCell>{rec.remarks || '-'}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => handleOpenModal(rec)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => rec.attendance_id && handleDelete(rec.attendance_id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Attendance' : 'Add Attendance'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                required
                value={formData.attendance_date || ''}
                onChange={(e) => setFormData({ ...formData, attendance_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status || 'Present'} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
