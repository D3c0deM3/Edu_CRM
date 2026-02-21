import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  X,
  Pencil,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { testAPI } from '../../../shared/api/api';

interface Answer {
  answer_id: number;
  question_id: number;
  question_text: string;
  question_type: string;
  marks: number;
  options?: string[];
  correct_answer?: any;
  student_answer?: any;
  is_correct?: boolean;
  marks_awarded?: number;
  feedback?: string;
  explanation?: string;
}

interface Submission {
  submission_id: number;
  test_id: number;
  test_name: string;
  test_type: string;
  student_id: number;
  first_name: string;
  last_name: string;
  enrollment_number?: string;
  status: string;
  score?: number;
  total_marks: number;
  passing_marks: number;
  started_at?: string;
  submitted_at?: string;
  graded_at?: string;
  graded_by?: number;
  attempt_number?: number;
  answers: Answer[];
}

const ViewSubmissionPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      const response = await testAPI.getSubmissionDetails(Number(submissionId));
      setSubmission(response.data);
    } catch (err: any) {
      console.error('Error loading submission:', err);
      setError('Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  const formatAnswer = (answer: Answer) => {
    const studentAnswer = answer.student_answer;
    if (!studentAnswer) return <em className="text-gray-400">No answer provided</em>;

    switch (answer.question_type) {
      case 'multiple_choice':
        if (studentAnswer.index !== undefined && answer.options) {
          return answer.options[studentAnswer.index] || 'Invalid selection';
        }
        return JSON.stringify(studentAnswer);
      case 'true_false':
        return studentAnswer.value ? 'True' : 'False';
      case 'short_answer':
      case 'essay':
      case 'writing':
      case 'form_filling':
        return studentAnswer.text || '';
      case 'matching':
        if (studentAnswer.matches) {
          return Object.entries(studentAnswer.matches).map(([key, val]) => (
            <div key={key}>Match {Number(key) + 1}: {String(val)}</div>
          ));
        }
        return JSON.stringify(studentAnswer);
      default:
        return JSON.stringify(studentAnswer);
    }
  };

  const formatCorrectAnswer = (answer: Answer) => {
    const correct = answer.correct_answer;
    if (!correct) return <em>Not specified</em>;

    switch (answer.question_type) {
      case 'multiple_choice':
        if (correct.index !== undefined && answer.options) {
          return answer.options[correct.index] || 'Invalid';
        }
        if (correct.indexes && answer.options) {
          return correct.indexes.map((i: number) => answer.options![i]).join(', ');
        }
        return JSON.stringify(correct);
      case 'true_false':
        return correct.value ? 'True' : 'False';
      case 'short_answer':
        return correct.text || correct.keywords?.join(', ') || JSON.stringify(correct);
      default:
        return JSON.stringify(correct);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      case 'graded':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>Submission not found</AlertDescription>
        </Alert>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const isPassing = (submission.score || 0) >= (submission.passing_marks || 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(`/tests/${submission.test_id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Submission Details</h1>
          <p className="text-gray-500">{submission.test_name}</p>
        </div>
        {submission.status === 'submitted' && (
          <Button
            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
            onClick={() => navigate(`/tests/submissions/${submissionId}/grade`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Grade Submission
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
          <button
            onClick={() => setError(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            ×
          </button>
        </Alert>
      )}

      {/* Student & Score Summary */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Student</p>
              <h3 className="text-lg font-semibold">
                {submission.first_name} {submission.last_name}
              </h3>
              {submission.enrollment_number && (
                <p className="text-sm text-gray-500">{submission.enrollment_number}</p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Score</p>
              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    'text-3xl font-bold',
                    submission.status === 'graded'
                      ? isPassing
                        ? 'text-green-600'
                        : 'text-red-600'
                      : 'text-gray-900'
                  )}
                >
                  {submission.score ?? '-'}
                </span>
                <span className="text-lg text-gray-500">/ {submission.total_marks}</span>
              </div>
              {submission.status === 'graded' && (
                <Badge
                  className={cn(
                    'mt-1',
                    isPassing
                      ? 'bg-green-100 text-green-800 hover:bg-green-100'
                      : 'bg-red-100 text-red-800 hover:bg-red-100'
                  )}
                >
                  {isPassing ? 'Passed' : 'Failed'}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Status</p>
              <Badge className={getStatusBadgeClass(submission.status)}>
                {submission.status.replace(/_/g, ' ')}
              </Badge>
              {submission.attempt_number && (
                <p className="text-sm text-gray-500 mt-1">
                  Attempt #{submission.attempt_number}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Timestamps</p>
              <p className="text-sm">
                Started: {submission.started_at ? new Date(submission.started_at).toLocaleString() : 'N/A'}
              </p>
              <p className="text-sm">
                Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}
              </p>
              {submission.graded_at && (
                <p className="text-sm">
                  Graded: {new Date(submission.graded_at).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Answers Summary Table */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Answers Summary</h2>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Correct</TableHead>
                  <TableHead className="text-right">Marks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submission.answers?.map((answer, index) => (
                  <TableRow key={answer.question_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell className="max-w-[300px] truncate">
                      {answer.question_text}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {answer.question_type?.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {answer.is_correct === true ? (
                        <Check className="h-5 w-5 text-green-600 mx-auto" />
                      ) : answer.is_correct === false ? (
                        <X className="h-5 w-5 text-red-600 mx-auto" />
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {answer.marks_awarded ?? '-'} / {answer.marks}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Answers */}
      <h2 className="text-lg font-semibold mb-4 mt-8">Detailed Answers</h2>

      {submission.answers?.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <p className="text-gray-500">No answers recorded</p>
          </CardContent>
        </Card>
      ) : (
        submission.answers?.map((answer, index) => (
          <Card key={answer.question_id} className="mb-4">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-500">Question {index + 1}</span>
                    <Badge variant="outline">
                      {answer.question_type?.replace(/_/g, ' ')}
                    </Badge>
                    {answer.is_correct === true && (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Correct
                      </Badge>
                    )}
                    {answer.is_correct === false && (
                      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                        Incorrect
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold">{answer.question_text}</h3>
                </div>
                <div className="text-right">
                  <span
                    className={cn(
                      'text-2xl font-bold',
                      answer.marks_awarded === answer.marks
                        ? 'text-green-600'
                        : 'text-gray-900'
                    )}
                  >
                    {answer.marks_awarded ?? '-'}
                  </span>
                  <p className="text-sm text-gray-500">/ {answer.marks} marks</p>
                </div>
              </div>

              <hr className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Student's Answer</p>
                  <div className="p-4 bg-gray-100 rounded-lg min-h-[60px] whitespace-pre-wrap">
                    {formatAnswer(answer)}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Correct Answer</p>
                  <div className="p-4 bg-green-50 rounded-lg min-h-[60px] whitespace-pre-wrap">
                    {formatCorrectAnswer(answer)}
                  </div>
                </div>

                {answer.feedback && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500 mb-2">Feedback</p>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      {answer.feedback}
                    </div>
                  </div>
                )}

                {answer.explanation && (
                  <div className="md:col-span-2">
                    <p className="text-sm font-medium text-gray-500 mb-2">Explanation</p>
                    <p className="text-sm text-gray-500">{answer.explanation}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default ViewSubmissionPage;
