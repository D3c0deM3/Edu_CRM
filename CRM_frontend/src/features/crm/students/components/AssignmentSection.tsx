import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { assignmentAPI } from '../../../../shared/api/api';
import { showToast } from '../../../../utils/toast';

interface Assignment {
  assignment_id?: number;
  id?: number;
  class_id?: number;
  student_id?: number;
  assignment_title: string;
  description?: string;
  due_date: string;
  status: string;
  grade?: number;
}

interface AssignmentSectionProps {
  assignments: Assignment[];
  studentClassId: number | undefined;
  studentId?: number;
  onRefresh: () => void;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'submitted':
      return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'graded':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const AssignmentSection = ({ assignments, studentClassId, studentId, onRefresh }: AssignmentSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Assignment>>({
    status: 'Pending',
  });
  const [loading, setLoading] = useState(false);

  // Filter assignments by class_id or student_id matching student's ID
  const filteredAssignments = assignments.filter(a =>
    Number(a.class_id) === Number(studentId) ||
    Number(a.student_id) === Number(studentId) ||
    Number(a.class_id) === Number(studentClassId)
  );

  const handleOpenModal = (assignment?: Assignment) => {
    if (assignment) {
      setEditingId(assignment.assignment_id || assignment.id || null);
      setFormData(assignment);
    } else {
      setEditingId(null);
      setFormData({ status: 'Pending' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ status: 'Pending' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await assignmentAPI.update(editingId, formData);
        showToast.success('Assignment updated successfully');
      } else {
        // When creating a new assignment, set class_id to student_id
        const newAssignment = {
          ...formData,
          class_id: studentId,
          student_id: studentId,
        };
        await assignmentAPI.create(newAssignment);
        showToast.success('Assignment created successfully');
      }
      onRefresh();
      handleCloseModal();
    } catch (error: unknown) {
      const err = error as { message?: string };
      showToast.error(err.message || 'Failed to save assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure?')) {
      try {
        await assignmentAPI.delete(id);
        showToast.success('Assignment deleted successfully');
        onRefresh();
      } catch (error: unknown) {
        const err = error as { message?: string };
        showToast.error(err.message || 'Failed to delete assignment');
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Assignments</CardTitle>
        <Button size="sm" onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" /> Add Assignment
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assignment Name</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No assignments for this class
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.assignment_id || assignment.id}>
                    <TableCell>{assignment.assignment_title}</TableCell>
                    <TableCell>{new Date(assignment.due_date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs font-semibold border ${getStatusBadgeVariant(assignment.status)}`}>
                        {assignment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{assignment.grade || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(assignment)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(assignment.assignment_id || assignment.id || 0)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Assignment' : 'Add Assignment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Assignment Name *</Label>
              <Input
                id="title"
                type="text"
                required
                value={formData.assignment_title || ''}
                onChange={(e) => setFormData({ ...formData, assignment_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description *</Label>
              <Textarea
                id="desc"
                required
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due">Due Date *</Label>
              <Input
                id="due"
                type="date"
                required
                value={formData.due_date || ''}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status || 'Pending'} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Submitted">Submitted</SelectItem>
                  <SelectItem value="Graded">Graded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Input
                id="grade"
                type="number"
                value={formData.grade || ''}
                onChange={(e) => setFormData({ ...formData, grade: Number(e.target.value) })}
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
