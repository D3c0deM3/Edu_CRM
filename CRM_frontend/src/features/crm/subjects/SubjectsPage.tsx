import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCRUD } from '../hooks/useCRUD';
import { subjectAPI } from '../../../shared/api/api';
import { SelectField } from '../students/components/SelectField';
import { fetchClasses, fetchTeachers } from '../../../utils/dropdownOptions';

interface Subject {
  subject_id?: number;
  id?: number;
  class_id: number;
  subject_name: string;
  subject_code: string;
  teacher_id?: number;
  total_marks: number;
  passing_marks: number;
}

const SubjectsPage = () => {
  const [state, actions] = useCRUD<Subject>(subjectAPI, 'Subject');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Subject>>({
    total_marks: 100,
    passing_marks: 40,
  });
  const [classOptions, setClassOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [teacherOptions, setTeacherOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadDropdownOptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const [classes, teachers] = await Promise.all([
        fetchClasses(),
        fetchTeachers(),
      ]);
      setClassOptions(classes);
      setTeacherOptions(teachers);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleOpenModal = (subject?: Subject) => {
    if (subject) {
      setEditingId(subject.subject_id || subject.id || null);
      setFormData(subject);
    } else {
      setEditingId(null);
      setFormData({
        total_marks: 100,
        passing_marks: 40,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      total_marks: 100,
      passing_marks: 40,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await actions.update(editingId, formData);
    } else {
      await actions.create(formData);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      await actions.delete(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Subjects Management</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" /> Add Subject
        </Button>
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Subjects Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class ID</TableHead>
                  <TableHead>Total Marks</TableHead>
                  <TableHead>Passing Marks</TableHead>
                  <TableHead>Teacher ID</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : state.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No subjects found
                    </TableCell>
                  </TableRow>
                ) : (
                  state.items.map((subject) => (
                    <TableRow key={subject.subject_id || subject.id}>
                      <TableCell className="font-mono text-sm">{subject.subject_code}</TableCell>
                      <TableCell className="font-medium">{subject.subject_name}</TableCell>
                      <TableCell>{subject.class_id}</TableCell>
                      <TableCell>{subject.total_marks}</TableCell>
                      <TableCell>{subject.passing_marks}</TableCell>
                      <TableCell>{subject.teacher_id || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal(subject)}
                            className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(subject.subject_id || subject.id || 0)}
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
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
      </Card>

      {/* Add/Edit Subject Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Subject' : 'Add New Subject'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject Name *</Label>
                <Input
                  type="text"
                  required
                  value={formData.subject_name || ''}
                  onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Subject Code *</Label>
                <Input
                  type="text"
                  required
                  value={formData.subject_code || ''}
                  onChange={(e) => setFormData({ ...formData, subject_code: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Class"
                name="class_id"
                value={formData.class_id || ''}
                onChange={(e) =>
                  setFormData({ ...formData, class_id: Number(e.target.value) })
                }
                options={classOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a class"
              />
              <SelectField
                label="Teacher"
                name="teacher_id"
                value={formData.teacher_id || ''}
                onChange={(e) =>
                  setFormData({ ...formData, teacher_id: e.target.value ? Number(e.target.value) : undefined })
                }
                options={teacherOptions}
                isLoading={isLoadingOptions}
                placeholder="Select a teacher (optional)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Marks *</Label>
                <Input
                  type="number"
                  required
                  value={formData.total_marks || 100}
                  onChange={(e) => setFormData({ ...formData, total_marks: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Passing Marks *</Label>
                <Input
                  type="number"
                  required
                  value={formData.passing_marks || 40}
                  onChange={(e) => setFormData({ ...formData, passing_marks: Number(e.target.value) })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={state.loading}>
                {state.loading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubjectsPage;
