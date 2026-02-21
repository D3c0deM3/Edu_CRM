import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Eye,
  BarChart3,
  FileQuestion,
  Clock,
  CheckCircle,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { testAPI } from '../../../shared/api/api';
import { useAppSelector } from '../hooks';

interface Test {
  test_id: number;
  test_name: string;
  test_type: string;
  description?: string;
  total_marks: number;
  passing_marks: number;
  duration_minutes: number;
  is_active: boolean;
  question_count?: number;
  submission_count?: number;
  subject_name?: string;
  created_at?: string;
}

const TestsPage = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await testAPI.getAll();
      setTests(response.data || []);
    } catch (err: any) {
      console.error('Error loading tests:', err);
      setError('Failed to load tests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (selectedTest) {
      try {
        await testAPI.delete(selectedTest.test_id);
        setTests(tests.filter((t) => t.test_id !== selectedTest.test_id));
        setDeleteDialogOpen(false);
        setSelectedTest(null);
      } catch (err) {
        console.error('Error deleting test:', err);
      }
    }
  };

  const getTestTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      multiple_choice: 'bg-indigo-500',
      essay: 'bg-rose-500',
      short_answer: 'bg-sky-500',
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

  const filteredTests = tests.filter((test) => {
    const matchesSearch =
      test.test_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || test.test_type === filterType;
    const matchesTab =
      tabValue === 'all' ||
      (tabValue === 'active' && test.is_active) ||
      (tabValue === 'inactive' && !test.is_active);

    return matchesSearch && matchesType && matchesTab;
  });

  const testTypes = [
    { value: 'all', label: 'All Types' },
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'essay', label: 'Essay' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'true_false', label: 'True/False' },
    { value: 'form_filling', label: 'Form Filling' },
    { value: 'reading_passage', label: 'Reading Passage' },
    { value: 'writing', label: 'Writing' },
    { value: 'matching', label: 'Matching' },
  ];

  const stats = {
    total: tests.length,
    active: tests.filter((t) => t.is_active).length,
    inactive: tests.filter((t) => !t.is_active).length,
    totalSubmissions: tests.reduce((sum, t) => sum + (t.submission_count || 0), 0),
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tests Management</h1>
          <p className="text-sm text-muted-foreground">
            Create, manage, and grade tests for your students
          </p>
        </div>
        {(user?.userType === 'superuser' || user?.userType === 'teacher') && (
          <Button
            onClick={() => navigate('/tests/create')}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-6 py-3"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Test
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription className="flex justify-between items-center">
            {error}
            <button onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="text-center pt-6">
            <p className="text-4xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center pt-6">
            <p className="text-4xl font-bold text-green-600">{stats.active}</p>
            <p className="text-sm text-muted-foreground">Active Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center pt-6">
            <p className="text-4xl font-bold text-muted-foreground">{stats.inactive}</p>
            <p className="text-sm text-muted-foreground">Inactive Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center pt-6">
            <p className="text-4xl font-bold text-blue-600">{stats.totalSubmissions}</p>
            <p className="text-sm text-muted-foreground">Total Submissions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <Tabs value={tabValue} onValueChange={setTabValue}>
          <div className="border-b">
            <TabsList className="bg-transparent h-auto p-0">
              <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
                All Tests ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
                Active ({stats.active})
              </TabsTrigger>
              <TabsTrigger value="inactive" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
                Inactive ({stats.inactive})
              </TabsTrigger>
            </TabsList>
          </div>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="md:col-span-3">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    {testTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Tabs>
      </Card>

      {/* Tests Grid */}
      {filteredTests.length === 0 ? (
        <div className="text-center py-16 bg-muted/50 rounded-lg border-2 border-dashed border-border">
          <FileQuestion className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No tests found</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {searchTerm || filterType !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first test to get started'}
          </p>
          {!searchTerm && filterType === 'all' && (
            <Button
              onClick={() => navigate('/tests/create')}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Test
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredTests.map((test) => (
            <Card
              key={test.test_id}
              className="h-full cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              onClick={() => navigate(`/tests/${test.test_id}`)}
            >
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-3">
                  <span
                    className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white',
                      getTestTypeColor(test.test_type)
                    )}
                  >
                    {formatTestType(test.test_type)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant={test.is_active ? 'default' : 'secondary'} className={cn(test.is_active && 'bg-green-100 text-green-800 border-green-300')}>
                      {test.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="p-1 rounded-md hover:bg-muted"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTest(test);
                          }}
                        >
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/tests/${test.test_id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/tests/${test.test_id}/edit`)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Test
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/tests/${test.test_id}/results`)}>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Results
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => {
                            setSelectedTest(test);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Test
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <h3 className="text-lg font-semibold mb-1">{test.test_name}</h3>

                {test.subject_name && (
                  <p className="text-sm text-primary mb-1">{test.subject_name}</p>
                )}

                {test.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {test.description}
                  </p>
                )}

                <div className="flex gap-4 mt-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{test.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{test.total_marks} marks</span>
                  </div>
                </div>

                <div className="flex gap-4 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {test.question_count || 0} questions
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {test.submission_count || 0} submissions
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{selectedTest?.test_name}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestsPage;
