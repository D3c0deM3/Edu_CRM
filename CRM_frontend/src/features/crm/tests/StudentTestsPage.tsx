import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Clock,
  CheckCircle,
  CalendarClock,
  FileQuestion,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { testAPI } from '../../../shared/api/api';
import { useAppSelector } from '../hooks';
import type { RootState } from '../../../store';

interface Test {
  test_id: number;
  test_name: string;
  test_type: string;
  description?: string;
  total_marks: number;
  duration_minutes: number;
  passing_marks: number;
  subject_name?: string;
  is_mandatory?: boolean;
  due_date?: string;
  submission_status?: string;
}

const StudentTestsPage = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state: RootState) => state.auth);

  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState('available');

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get tests assigned to the student (via their ID or class)
      const response = await testAPI.getAssignedTests('student', user?.id || 0);
      setTests(response.data || []);
    } catch (err: any) {
      console.error('Error loading tests:', err);
      setError('Failed to load available tests. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (test: Test) => {
    try {
      // Store test ID for the take test page
      localStorage.setItem(`submission_pending_test`, String(test.test_id));

      const response = await testAPI.startTest(test.test_id, user?.id || 0);
      const submissionId = response.data.submission_id;

      // Store test ID associated with submission
      localStorage.setItem(`submission_${submissionId}_test`, String(test.test_id));

      navigate(`/tests/take/${submissionId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start test');
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
    return type?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || '';
  };

  const availableTests = tests.filter((t) => !t.submission_status || t.submission_status === 'not_started');
  const inProgressTests = tests.filter((t) => t.submission_status === 'in_progress');
  const completedTests = tests.filter((t) => t.submission_status === 'submitted' || t.submission_status === 'graded');

  const getFilteredTests = () => {
    switch (tabValue) {
      case 'in_progress':
        return inProgressTests;
      case 'completed':
        return completedTests;
      default:
        return availableTests;
    }
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1">My Tests</h1>
        <p className="text-muted-foreground">View and take tests assigned to you</p>
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

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="text-center pt-6">
            <p className="text-4xl font-bold text-primary">{availableTests.length}</p>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center pt-6">
            <p className="text-4xl font-bold text-amber-500">{inProgressTests.length}</p>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="text-center pt-6">
            <p className="text-4xl font-bold text-green-600">{completedTests.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tabValue} onValueChange={setTabValue}>
        <Card className="mb-6">
          <TabsList className="bg-transparent h-auto p-0 w-full justify-start border-b rounded-none">
            <TabsTrigger value="available" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
              Available ({availableTests.length})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
              In Progress ({inProgressTests.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
              Completed ({completedTests.length})
            </TabsTrigger>
          </TabsList>
        </Card>

        {/* Tests Grid */}
        {getFilteredTests().length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileQuestion className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground">
                {tabValue === 'available'
                  ? 'No tests available at the moment'
                  : tabValue === 'in_progress'
                  ? 'No tests in progress'
                  : 'No completed tests yet'}
              </h3>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {getFilteredTests().map((test) => (
              <Card
                key={test.test_id}
                className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
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
                    {test.is_mandatory && (
                      <Badge variant="outline" className="border-red-300 text-red-600">
                        Required
                      </Badge>
                    )}
                  </div>

                  <h3 className="text-lg font-semibold mb-1">{test.test_name}</h3>

                  {test.subject_name && (
                    <p className="text-sm text-primary mb-1">{test.subject_name}</p>
                  )}

                  {test.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {test.description.substring(0, 100)}
                      {test.description.length > 100 ? '...' : ''}
                    </p>
                  )}

                  <div className="flex gap-4 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{test.duration_minutes} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{test.total_marks} marks</span>
                    </div>
                  </div>

                  {test.due_date && (
                    <div className="flex items-center gap-1 mb-3">
                      <CalendarClock className="h-4 w-4 text-amber-500" />
                      <span className="text-sm text-amber-600">
                        Due: {new Date(test.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {tabValue === 'available' && (
                    <Button
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                      onClick={() => handleStartTest(test)}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Test
                    </Button>
                  )}

                  {tabValue === 'in_progress' && (
                    <Button
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={() => {
                        navigate(`/tests/${test.test_id}`);
                      }}
                    >
                      Continue
                    </Button>
                  )}

                  {tabValue === 'completed' && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/tests/${test.test_id}`)}
                    >
                      View Results
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Tabs>
    </div>
  );
};

export default StudentTestsPage;
