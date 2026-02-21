import { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, Plus, X, ArrowLeft, Folder, Search, Filter, FileText, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { assignmentAPI, classAPI } from '../../../shared/api/api';
import { SelectField } from '../students/components/SelectField';
import { fetchClasses, assignmentStatusOptions } from '../../../utils/dropdownOptions';

interface Assignment {
  assignment_id?: number;
  id?: number;
  class_id?: number;
  assignment_title: string;
  description: string;
  due_date: string;
  submission_date: string;
  status: string;
  grade?: number;
}

interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  class_code: string;
  level: number;
}

type TabType = 'classes' | 'personal';
type FolderType = 'class' | 'personal';

const AssignmentsPage = () => {
  const [state, actions] = useCRUD<Assignment>(assignmentAPI, 'Assignment');
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('classes');
  const [selectedFolder, setSelectedFolder] = useState<{ type: FolderType; id?: number; name: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Assignment>>({
    status: 'Pending',
  });
  const [classOptions, setClassOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadAllData();
    loadDropdownOptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAllData = async () => {
    setLoadingData(true);
    try {
      const classesRes = await classAPI.getAll();
      setClasses(Array.isArray(classesRes.data || classesRes) ? (classesRes.data || classesRes) : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const classes = await fetchClasses();
      setClassOptions(classes);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

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
    if (editingId) {
      await actions.update(editingId, formData);
    } else {
      await actions.create(formData);
    }
    handleCloseModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      await actions.delete(id);
    }
  };

  // Get assignments for a class
  const getAssignmentsForClass = (classId: number): Assignment[] => {
    return state.items.filter((a) => a.class_id === classId);
  };

  // Get personal assignments (no class_id or class doesn't exist)
  const getPersonalAssignments = (): Assignment[] => {
    return state.items.filter((a) => !a.class_id || !classes.find((c) => (c.class_id || c.id) === a.class_id));
  };

  // Get assignment count for class
  const getAssignmentCountForClass = (classId: number): number => {
    return getAssignmentsForClass(classId).length;
  };

  // Get completed count for class
  const getCompletedCountForClass = (classId: number): number => {
    return getAssignmentsForClass(classId).filter((a) => a.status === 'Completed').length;
  };

  // Filter assignments based on selected folder
  const getFilteredAssignments = (): Assignment[] => {
    if (!selectedFolder) return state.items;

    if (selectedFolder.type === 'class') {
      return getAssignmentsForClass(selectedFolder.id || 0);
    } else if (selectedFolder.type === 'personal') {
      return getPersonalAssignments();
    }
    return state.items;
  };

  // Apply search and filters
  const displayedAssignments = useMemo(() => {
    let assignments = getFilteredAssignments();

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      assignments = assignments.filter((a) =>
        a.assignment_title?.toLowerCase().includes(search) ||
        a.description?.toLowerCase().includes(search)
      );
    }

    if (filterStatus) {
      assignments = assignments.filter((a) => a.status === filterStatus);
    }

    return assignments;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.items, selectedFolder, searchTerm, filterStatus, classes]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
  };

  const hasActiveFilters = searchTerm || filterStatus;

  const handleFolderClick = (type: FolderType, id: number | undefined, name: string) => {
    setSelectedFolder({ type, id, name });
  };

  const handleBackToFolders = () => {
    setSelectedFolder(null);
    clearFilters();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-amber-500';
      case 'submitted': return 'bg-blue-500';
      case 'graded': return 'bg-lime-600';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedFolder && (
            <Button variant="ghost" size="sm" onClick={handleBackToFolders}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
          <h1 className="text-2xl font-bold tracking-tight">
            {selectedFolder
              ? `${selectedFolder.name} - Assignments`
              : 'Assignments Management'}
          </h1>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" /> Add Assignment
        </Button>
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {!selectedFolder ? (
        <>
          {/* Tab Navigation */}
          <div className="border-b">
            <div className="flex gap-1">
              <button
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'classes'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                )}
                onClick={() => setActiveTab('classes')}
              >
                <Users className="h-4 w-4" />
                By Classes
              </button>
              <button
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'personal'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                )}
                onClick={() => setActiveTab('personal')}
              >
                <FileText className="h-4 w-4" />
                Personal Tasks
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {/* By Classes Tab */}
            {activeTab === 'classes' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingData ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading classes...
                  </div>
                ) : classes.length === 0 ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    No classes found
                  </div>
                ) : (
                  classes.map((cls) => {
                    const classId = cls.class_id || cls.id || 0;
                    const assignmentCount = getAssignmentCountForClass(classId);
                    const completedCount = getCompletedCountForClass(classId);
                    const completionPercentage = assignmentCount > 0 ? (completedCount / assignmentCount) * 100 : 0;

                    return assignmentCount > 0 ? (
                      <Card
                        key={classId}
                        className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-indigo-500"
                        onClick={() => handleFolderClick('class', classId, cls.class_name)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-indigo-50">
                              <Folder className="h-8 w-8 text-indigo-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{cls.class_name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {cls.class_code} &bull; Level {cls.level}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <FileText className="h-3.5 w-3.5" />
                              <span>{assignmentCount} assignment{assignmentCount !== 1 ? 's' : ''}</span>
                            </div>
                            <span className="text-sm font-bold text-green-600">
                              {completionPercentage.toFixed(0)}%
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ) : null;
                  })
                )}
              </div>
            )}

            {/* Personal Tasks Tab */}
            {activeTab === 'personal' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingData ? (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading personal tasks...
                  </div>
                ) : (
                  (() => {
                    const personalCount = getPersonalAssignments().length;
                    const personalCompleted = getPersonalAssignments().filter((a) => a.status === 'Completed').length;
                    const completionPercentage = personalCount > 0 ? (personalCompleted / personalCount) * 100 : 0;

                    return personalCount > 0 ? (
                      <Card
                        className="cursor-pointer hover:shadow-md transition-shadow bg-amber-50 border-l-4 border-l-amber-500"
                        onClick={() => handleFolderClick('personal', undefined, 'Personal Tasks')}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-amber-100">
                              <Folder className="h-8 w-8 text-amber-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold">Personal Tasks</h3>
                              <p className="text-sm text-muted-foreground">
                                Independent assignments without class
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <FileText className="h-3.5 w-3.5" />
                              <span>{personalCount} task{personalCount !== 1 ? 's' : ''}</span>
                            </div>
                            <span className="text-sm font-bold text-green-600">
                              {completionPercentage.toFixed(0)}%
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="col-span-full text-center py-8 text-muted-foreground">
                        No personal tasks found
                      </div>
                    );
                  })()
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ASSIGNMENTS LIST VIEW */
        <>
          {/* Search and Filter Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-8"
              />
              {searchTerm && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-1 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {filterStatus ? 1 : 0}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-1 h-4 w-4" /> Clear All
              </Button>
            )}

            <span className="text-sm text-muted-foreground ml-auto">
              {displayedAssignments.length} assignment{displayedAssignments.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Status</Label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="flex h-9 w-[180px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">All Status</option>
                      {assignmentStatusOptions.map((opt) => (
                        <option key={opt.id} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Assignments Table */}
          <Card>
            <CardContent className="p-0">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Submission Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Grade</TableHead>
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
                    ) : displayedAssignments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {hasActiveFilters ? 'No assignments match your criteria' : 'No assignments found'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedAssignments.map((assignment) => (
                        <TableRow key={assignment.assignment_id || assignment.id}>
                          <TableCell className="font-semibold">{assignment.assignment_title}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {assignment.description?.substring(0, 50)}...
                          </TableCell>
                          <TableCell>{new Date(assignment.due_date).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(assignment.submission_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'inline-flex items-center px-2 py-1 rounded text-xs font-bold text-white',
                                getStatusColor(assignment.status)
                              )}
                            >
                              {assignment.status}
                            </span>
                          </TableCell>
                          <TableCell>{assignment.grade || '-'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenModal(assignment)}
                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(assignment.assignment_id || assignment.id || 0)}
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete"
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
        </>
      )}

      {/* Add/Edit Assignment Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Assignment' : 'Add New Assignment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                type="text"
                required
                value={formData.assignment_title || ''}
                onChange={(e) => setFormData({ ...formData, assignment_title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <textarea
                required
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Class (Optional - leave empty for personal task)"
                name="class_id"
                value={formData.class_id || ''}
                onChange={(e) =>
                  setFormData({ ...formData, class_id: e.target.value ? Number(e.target.value) : undefined })
                }
                options={classOptions}
                isLoading={isLoadingOptions}
                placeholder="Select a class or leave empty"
              />
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Submission Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.submission_date || ''}
                  onChange={(e) => setFormData({ ...formData, submission_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <select
                  required
                  value={formData.status || 'Pending'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {assignmentStatusOptions.map((opt) => (
                    <option key={opt.id} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Grade</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.grade || ''}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value ? Number(e.target.value) : undefined })}
              />
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

export default AssignmentsPage;
