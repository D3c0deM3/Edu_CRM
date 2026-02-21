import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  FileQuestion,
  Timer,
  CheckCircle,
  MoreVertical,
  Edit,
  Trash2,
  ClipboardList,
  Eye,
  Award,
  Search,
  Users,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { testAPI } from '../../../shared/api/api';
import { useNavigate } from 'react-router-dom';

interface Test {
  test_id: number;
  test_name: string;
  test_type: string;
  description?: string;
  total_marks: number;
  duration_minutes: number;
  is_active: boolean;
  question_count?: number;
  submission_count?: number;
  subject_name?: string;
  created_at?: string;
}

interface Submission {
  submission_id: number;
  student_name: string;
  student_id: number;
  status: string;
  score: number;
  total_marks: number;
  submitted_at: string;
  graded_at?: string;
}

interface TeacherTestsTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const TeacherTestsTab = ({ teacherId, onRefresh }: TeacherTestsTabProps) => {
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [filteredTests, setFilteredTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [submissionsDialog, setSubmissionsDialog] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTests();
  }, [teacherId]);

  useEffect(() => {
    filterTests();
  }, [tests, searchTerm, filterTab]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await testAPI.getAll();
      setTests(response.data || []);
    } catch (err: any) {
      console.error('Error loading tests:', err);
      setError('Failed to load tests');
    } finally {
      setLoading(false);
    }
  };

  const filterTests = () => {
    let filtered = [...tests];

    if (searchTerm) {
      filtered = filtered.filter(
        (t) =>
          t.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.test_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.subject_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    switch (filterTab) {
      case 'active':
        filtered = filtered.filter((t) => t.is_active);
        break;
      case 'inactive':
        filtered = filtered.filter((t) => !t.is_active);
        break;
      case 'submissions':
        filtered = filtered.filter((t) => (t.submission_count || 0) > 0);
        break;
      default:
        break;
    }

    setFilteredTests(filtered);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, test: Test) => {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 180 });
    setSelectedTest(test);
    setMenuOpen(true);
  };

  const handleMenuClose = () => {
    setMenuOpen(false);
  };

  const handleViewSubmissions = async () => {
    handleMenuClose();
    if (!selectedTest) return;

    try {
      setSubmissionsLoading(true);
      setSubmissionsDialog(true);
      const response = await testAPI.getSubmissionsByTest(selectedTest.test_id);
      setSubmissions(response.data || []);
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleDeleteTest = async () => {
    if (!selectedTest) return;

    try {
      await testAPI.delete(selectedTest.test_id);
      loadTests();
      onRefresh?.();
    } catch (err) {
      console.error('Error deleting test:', err);
    } finally {
      setDeleteDialog(false);
      handleMenuClose();
    }
  };

  const getTestTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      multiple_choice: 'bg-indigo-500',
      essay: 'bg-rose-500',
      short_answer: 'bg-blue-400',
      true_false: 'bg-emerald-500',
      form_filling: 'bg-pink-500',
      reading_passage: 'bg-purple-500',
      writing: 'bg-pink-500',
      matching: 'bg-teal-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  const formatTestType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'graded':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'submitted':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header with Create Button and Search */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h3 className="text-lg font-semibold">
          My Tests ({filteredTests.length})
        </h3>
        <div className="flex gap-3 items-center">
          <div className="relative min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            onClick={() => navigate('/tests/create')}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Test
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filterTab} onValueChange={setFilterTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All ({tests.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({tests.filter((t) => t.is_active).length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({tests.filter((t) => !t.is_active).length})</TabsTrigger>
          <TabsTrigger value="submissions">
            With Submissions
            {tests.filter((t) => (t.submission_count || 0) > 0).length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-indigo-500 text-white text-xs w-5 h-5">
                {tests.filter((t) => (t.submission_count || 0) > 0).length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tests Grid */}
      {filteredTests.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <FileQuestion className="h-14 w-14 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-muted-foreground">No tests found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchTerm ? 'Try adjusting your search' : 'Create your first test to get started'}
          </p>
          {!searchTerm && (
            <Button
              onClick={() => navigate('/tests/create')}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTests.map((test) => (
            <Card
              key={test.test_id}
              className="cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg relative"
              onClick={() => navigate(`/tests/${test.test_id}`)}
            >
              <CardContent className="pt-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-1.5 flex-wrap">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full text-white font-medium', getTestTypeColor(test.test_type))}>
                      {formatTestType(test.test_type)}
                    </span>
                    {test.subject_name && (
                      <Badge variant="outline" className="text-xs">{test.subject_name}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={cn('text-xs', test.is_active ? 'border-green-400 text-green-600' : 'border-gray-300 text-gray-500')}>
                      {test.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <button
                      className="p-1 rounded hover:bg-gray-100 text-gray-500"
                      onClick={(e) => handleMenuOpen(e, test)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-semibold mb-1">{test.test_name}</h3>

                {test.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {test.description}
                  </p>
                )}

                <div className="flex gap-4 mt-3">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Timer className="h-4 w-4" />
                    {test.duration_minutes} min
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    {test.total_marks} marks
                  </div>
                </div>

                <div className="flex gap-4 mt-2 items-center">
                  <span className="text-xs text-muted-foreground">
                    {test.question_count || 0} questions
                  </span>
                  <span className="text-xs text-muted-foreground relative">
                    submissions
                    {(test.submission_count || 0) > 0 && (
                      <span className="absolute -top-2 -right-5 inline-flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] w-4 h-4">
                        {test.submission_count}
                      </span>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dropdown Menu (portal-style) */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed z-50 w-48 bg-white rounded-md shadow-lg border py-1"
          style={{ top: menuPos.top, left: menuPos.left }}
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
            onClick={() => { handleMenuClose(); navigate(`/tests/${selectedTest?.test_id}`); }}
          >
            <Eye className="h-4 w-4" /> View Details
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
            onClick={() => { handleMenuClose(); navigate(`/tests/${selectedTest?.test_id}/edit`); }}
          >
            <Edit className="h-4 w-4" /> Edit Test
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
            onClick={() => { handleMenuClose(); navigate(`/tests/${selectedTest?.test_id}/assign`); }}
          >
            <ClipboardList className="h-4 w-4" /> Assign Test
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
            onClick={handleViewSubmissions}
          >
            <Users className="h-4 w-4" />
            View Submissions
            {(selectedTest?.submission_count || 0) > 0 && (
              <span className="ml-auto inline-flex items-center justify-center rounded-full bg-indigo-500 text-white text-[10px] w-4 h-4">
                {selectedTest?.submission_count}
              </span>
            )}
          </button>
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            onClick={() => { handleMenuClose(); setDeleteDialog(true); }}
          >
            <Trash2 className="h-4 w-4" /> Delete Test
          </button>
        </div>
      )}

      {/* Submissions Dialog */}
      <Dialog open={submissionsDialog} onOpenChange={setSubmissionsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex justify-between items-center">
              <DialogTitle>Test Submissions - {selectedTest?.test_name}</DialogTitle>
              <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300">
                {submissions.length} submissions
              </Badge>
            </div>
          </DialogHeader>
          {submissionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No submissions yet</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub) => (
                    <TableRow key={sub.submission_id}>
                      <TableCell>{sub.student_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeClass(sub.status)}>
                          {sub.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sub.score !== null ? `${sub.score}/${sub.total_marks}` : '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(sub.submitted_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <button
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                          title="View Submission"
                          onClick={() => navigate(`/tests/submissions/${sub.submission_id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {sub.status !== 'graded' && (
                          <button
                            className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 ml-1"
                            title="Grade Submission"
                            onClick={() => navigate(`/tests/submissions/${sub.submission_id}/grade`)}
                          >
                            <Award className="h-4 w-4" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmissionsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{selectedTest?.test_name}&quot;? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTest}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherTestsTab;
