import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { gradeAPI, subjectAPI } from '../../../../shared/api/api';
import { showToast } from '../../../../utils/toast';

interface Subject {
  subject_id?: number;
  id?: number;
  subject_name: string;
}

interface Grade {
  grade_id?: number;
  id?: number;
  student_id?: number;
  subject?: number;
  percentage: number;
  grade_letter: string;
  term: string;
  subject_name?: string;
}

interface GradesSectionProps {
  grades: Grade[];
  onRefresh: () => void;
}

export const GradesSection = ({ grades, onRefresh }: GradesSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Grade>>({});
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const response = await subjectAPI.getAll();
      const data = response.data || response;
      setSubjects(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const getSubjectName = (subjectId?: number) => {
    if (!subjectId) return '-';
    const subject = subjects.find(s => Number(s.subject_id) === Number(subjectId));
    return subject?.subject_name || '-';
  };

  const handleOpenModal = (grade?: Grade) => {
    if (grade) {
      setEditingId(grade.grade_id || grade.id || null);
      setFormData(grade);
    } else {
      setEditingId(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await gradeAPI.update(editingId, formData);
        showToast.success('Grade updated successfully');
      } else {
        await gradeAPI.create(formData);
        showToast.success('Grade created successfully');
      }
      onRefresh();
      handleCloseModal();
    } catch (error: unknown) {
      const err = error as { message?: string };
      showToast.error(err.message || 'Failed to save grade');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure?')) {
      try {
        await gradeAPI.delete(id);
        showToast.success('Grade deleted successfully');
        onRefresh();
      } catch (error: unknown) {
        const err = error as { message?: string };
        showToast.error(err.message || 'Failed to delete grade');
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Grades</CardTitle>
        <Button size="sm" onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" /> Add Grade
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Term</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No grades
                  </TableCell>
                </TableRow>
              ) : (
                grades.map((grade) => (
                  <TableRow key={grade.grade_id || grade.id}>
                    <TableCell>{getSubjectName(grade.subject)}</TableCell>
                    <TableCell>{(Number(grade.percentage) || 0).toFixed(1)}%</TableCell>
                    <TableCell>
                      <span className="font-semibold">{grade.grade_letter}</span>
                    </TableCell>
                    <TableCell>{grade.term}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(grade)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(grade.grade_id || grade.id || 0)}>
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
            <DialogTitle>{editingId ? 'Edit Grade' : 'Add Grade'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Select value={String(formData.subject || '')} onValueChange={(value) => setFormData({ ...formData, subject: Number(value) })}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.subject_id || subject.id} value={String(subject.subject_id || subject.id)}>
                      {subject.subject_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="percentage">Percentage *</Label>
              <Input
                id="percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                value={formData.percentage || ''}
                onChange={(e) => setFormData({ ...formData, percentage: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="letter">Grade Letter *</Label>
              <Select value={formData.grade_letter || ''} onValueChange={(value) => setFormData({ ...formData, grade_letter: value })}>
                <SelectTrigger id="letter">
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                  <SelectItem value="D">D</SelectItem>
                  <SelectItem value="F">F</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="term">Term *</Label>
              <Select value={formData.term || ''} onValueChange={(value) => setFormData({ ...formData, term: value })}>
                <SelectTrigger id="term">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1">Q1</SelectItem>
                  <SelectItem value="Q2">Q2</SelectItem>
                  <SelectItem value="Q3">Q3</SelectItem>
                  <SelectItem value="Q4">Q4</SelectItem>
                  <SelectItem value="Semester 1">Semester 1</SelectItem>
                  <SelectItem value="Semester 2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
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
