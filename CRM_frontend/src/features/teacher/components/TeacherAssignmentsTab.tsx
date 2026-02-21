import { useState, useEffect, useRef } from 'react';
import {
  ClipboardList,
  Save,
  Plus,
  Edit,
  Trash2,
  Search,
  MoreVertical,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Users,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { classAPI, subjectAPI, assignmentAPI } from '../../../shared/api/api';

interface ClassInfo {
  class_id: number;
  class_name: string;
}

interface SubjectInfo {
  subject_id: number;
  subject_name: string;
}

interface Assignment {
  assignment_id: number;
  assignment_title: string;
  description?: string;
  class_id: number;
  subject_id?: number;
  due_date: string;
  max_score?: number;
  status?: string;
  submission_count?: number;
  created_at?: string;
}

interface TeacherAssignmentsTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const TeacherAssignmentsTab = ({ teacherId, onRefresh }: TeacherAssignmentsTabProps) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tabValue, setTabValue] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    assignment_title: '',
    description: '',
    class_id: '' as number | '',
    subject_id: '' as number | '',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    max_score: 100,
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    loadInitialData();
  }, [teacherId]);

  useEffect(() => {
    loadAssignments();
  }, [selectedClass]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-hide snackbar
  useEffect(() => {
    if (snackbar.open) {
      const timer = setTimeout(() => setSnackbar({ ...snackbar, open: false }), 4000);
      return () => clearTimeout(timer);
    }
  }, [snackbar.open]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [classRes, subjectRes, assignmentRes] = await Promise.all([
        classAPI.getAll(),
        subjectAPI.getAll(),
        assignmentAPI.getAll(),
      ]);
      setClasses(classRes.data || []);
      setSubjects(subjectRes.data || []);
      setAssignments(assignmentRes.data || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      const response = await assignmentAPI.getAll();
      let all = response.data || [];
      if (selectedClass) {
        all = all.filter((a: Assignment) => a.class_id === selectedClass);
      }
      setAssignments(all);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const handleOpenDialog = (assignment?: Assignment) => {
    if (assignment) {
      setSelectedAssignment(assignment);
      setFormData({
        assignment_title: assignment.assignment_title,
        description: assignment.description || '',
        class_id: assignment.class_id,
        subject_id: assignment.subject_id || '',
        due_date: assignment.due_date?.split('T')[0] || '',
        max_score: assignment.max_score || 100,
      });
    } else {
      setSelectedAssignment(null);
      setFormData({
        assignment_title: '',
        description: '',
        class_id: selectedClass || '',
        subject_id: '',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        max_score: 100,
      });
    }
    setDialogOpen(true);
    setMenuOpen(false);
  };

  const handleSaveAssignment = async () => {
    if (!formData.assignment_title || !formData.class_id || !formData.due_date) {
      setSnackbar({
        open: true,
        message: 'Please fill in all required fields',
        severity: 'error',
      });
      return;
    }

    try {
      setSaving(true);
      const data = {
        ...formData,
        created_by: teacherId,
      };

      if (selectedAssignment) {
        await assignmentAPI.update(selectedAssignment.assignment_id, data);
        setSnackbar({
          open: true,
          message: 'Assignment updated successfully!',
          severity: 'success',
        });
      } else {
        await assignmentAPI.create(data);
        setSnackbar({
          open: true,
          message: 'Assignment created successfully!',
          severity: 'success',
        });
      }

      setDialogOpen(false);
      loadAssignments();
      onRefresh?.();
    } catch (error) {
      console.error('Error saving assignment:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save assignment',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      await assignmentAPI.delete(selectedAssignment.assignment_id);
      setSnackbar({
        open: true,
        message: 'Assignment deleted successfully!',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setSelectedAssignment(null);
      loadAssignments();
      onRefresh?.();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      setSnackbar({
        open: true,
        message: 'Failed to delete assignment',
        severity: 'error',
      });
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, assignment: Assignment) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 140 });
    setSelectedAssignment(assignment);
    setMenuOpen(true);
  };

  const getAssignmentStatus = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Overdue', colorClass: 'bg-red-100 text-red-700 border-red-300', icon: <AlertTriangle className="h-3.5 w-3.5" /> };
    if (diffDays === 0) return { label: 'Due Today', colorClass: 'bg-amber-100 text-amber-700 border-amber-300', icon: <Clock className="h-3.5 w-3.5" /> };
    if (diffDays <= 3) return { label: 'Due Soon', colorClass: 'bg-amber-100 text-amber-700 border-amber-300', icon: <Clock className="h-3.5 w-3.5" /> };
    return { label: 'Active', colorClass: 'bg-green-100 text-green-700 border-green-300', icon: <CheckCircle className="h-3.5 w-3.5" /> };
  };

  const filteredAssignments = assignments.filter(
    (a) =>
      a.assignment_title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeAssignments = filteredAssignments.filter((a) => {
    const due = new Date(a.due_date);
    return due >= new Date();
  });

  const pastAssignments = filteredAssignments.filter((a) => {
    const due = new Date(a.due_date);
    return due < new Date();
  });

  if (loading && classes.length === 0) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const currentList = tabValue === 'active' ? activeAssignments : tabValue === 'past' ? pastAssignments : filteredAssignments;

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h3 className="text-lg font-semibold">Manage Assignments</h3>
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assignments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-52"
            />
          </div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : '')}
            className="flex h-9 w-[150px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Classes</option>
            {classes.map((cls) => (
              <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
            ))}
          </select>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Assignment
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="bg-indigo-50/50 text-center p-3">
          <ClipboardList className="h-8 w-8 text-indigo-500 mx-auto" />
          <p className="text-3xl font-bold text-indigo-500">{assignments.length}</p>
          <p className="text-xs text-muted-foreground">Total Assignments</p>
        </Card>
        <Card className="bg-green-50/50 text-center p-3">
          <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
          <p className="text-3xl font-bold text-green-500">{activeAssignments.length}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </Card>
        <Card className="bg-red-50/50 text-center p-3">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-3xl font-bold text-red-500">{pastAssignments.length}</p>
          <p className="text-xs text-muted-foreground">Past Due</p>
        </Card>
        <Card className="bg-blue-50/50 text-center p-3">
          <Users className="h-8 w-8 text-blue-500 mx-auto" />
          <p className="text-3xl font-bold text-blue-500">{classes.length}</p>
          <p className="text-xs text-muted-foreground">Classes</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tabValue} onValueChange={setTabValue} className="mb-6">
        <TabsList>
          <TabsTrigger value="active">Active ({activeAssignments.length})</TabsTrigger>
          <TabsTrigger value="past">Past Due ({pastAssignments.length})</TabsTrigger>
          <TabsTrigger value="all">All ({filteredAssignments.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Assignment Cards */}
      {currentList.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <ClipboardList className="h-14 w-14 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-muted-foreground">No assignments found</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {tabValue === 'active' ? 'Create a new assignment to get started' : 'No past due assignments'}
          </p>
          {tabValue === 'active' && (
            <Button variant="outline" onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assignment
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentList.map((assignment) => {
            const status = getAssignmentStatus(assignment.due_date);
            const classInfo = classes.find((c) => c.class_id === assignment.class_id);
            const subjectInfo = subjects.find((s) => s.subject_id === assignment.subject_id);

            return (
              <Card key={assignment.assignment_id} className="hover:shadow-lg transition-shadow relative">
                <CardContent className="pt-5">
                  <div className="flex justify-between items-start mb-2">
                    <span className={cn('inline-flex items-center gap-1 text-xs border rounded-full px-2 py-0.5', status.colorClass)}>
                      {status.icon}
                      {status.label}
                    </span>
                    <button
                      className="p-1 rounded hover:bg-gray-100 text-gray-500"
                      onClick={(e) => handleMenuClick(e, assignment)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-semibold mb-1">{assignment.assignment_title}</h3>

                  {assignment.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {assignment.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {classInfo && (
                      <Badge variant="outline" className="text-xs">{classInfo.class_name}</Badge>
                    )}
                    {subjectInfo && (
                      <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-600">{subjectInfo.subject_name}</Badge>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </div>
                    {assignment.max_score && (
                      <span className="text-xs text-muted-foreground">Max: {assignment.max_score} pts</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dropdown Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 w-36 bg-white rounded-md shadow-lg border py-1"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
            onClick={() => handleOpenDialog(selectedAssignment!)}
          >
            <Edit className="h-4 w-4" /> Edit
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => { setDeleteDialogOpen(true); setMenuOpen(false); }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedAssignment ? 'Edit Assignment' : 'Create New Assignment'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="assign-title">Title *</Label>
              <Input
                id="assign-title"
                value={formData.assignment_title}
                onChange={(e) => setFormData({ ...formData, assignment_title: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="assign-desc">Description</Label>
              <Textarea
                id="assign-desc"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assign-class">Class *</Label>
                <select
                  id="assign-class"
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value ? Number(e.target.value) : '' })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">-- Select --</option>
                  {classes.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-subject">Subject</Label>
                <select
                  id="assign-subject"
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value ? Number(e.target.value) : '' })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">None</option>
                  {subjects.map((subj) => (
                    <option key={subj.subject_id} value={subj.subject_id}>{subj.subject_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="assign-due">Due Date *</Label>
                <Input
                  id="assign-due"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assign-score">Max Score</Label>
                <Input
                  id="assign-score"
                  type="number"
                  value={formData.max_score}
                  onChange={(e) => setFormData({ ...formData, max_score: parseInt(e.target.value) || 100 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveAssignment}
              disabled={saving}
              className="bg-gradient-to-r from-indigo-500 to-purple-500"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {selectedAssignment ? 'Update' : 'Create'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Assignment</DialogTitle>
          </DialogHeader>
          <Alert variant="destructive" className="mb-3">
            <AlertDescription>This action cannot be undone.</AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{selectedAssignment?.assignment_title}&quot;?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAssignment}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Snackbar / Toast */}
      {snackbar.open && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <Alert
            className={cn(
              'shadow-lg min-w-[300px]',
              snackbar.severity === 'success'
                ? 'border-green-300 bg-green-50 text-green-800'
                : 'border-red-300 bg-red-50 text-red-800'
            )}
          >
            <AlertDescription className="flex items-center justify-between">
              {snackbar.message}
              <button onClick={() => setSnackbar({ ...snackbar, open: false })} className="ml-3 text-sm font-medium">✕</button>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};

export default TeacherAssignmentsTab;
