import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { testAPI } from '../../../shared/api/api';
import { toast } from 'react-toastify';

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
  answers: Answer[];
}

const GradeSubmissionPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [grades, setGrades] = useState<{ [key: number]: { marks: number; feedback: string } }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubmission();
  }, [submissionId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      const response = await testAPI.getSubmissionDetails(Number(submissionId));
      setSubmission(response.data);

      // Initialize grades from existing data
      const initialGrades: { [key: number]: { marks: number; feedback: string } } = {};
      response.data.answers?.forEach((answer: Answer) => {
        initialGrades[answer.question_id] = {
          marks: answer.marks_awarded ?? (answer.is_correct ? answer.marks : 0),
          feedback: answer.feedback || '',
        };
      });
      setGrades(initialGrades);
    } catch (err: any) {
      console.error('Error loading submission:', err);
      setError('Failed to load submission details');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (questionId: number, field: 'marks' | 'feedback', value: any) => {
    setGrades((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
      },
    }));
  };

  const handleQuickGrade = (questionId: number, marks: number, _maxMarks: number) => {
    setGrades((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        marks: marks === prev[questionId]?.marks ? 0 : marks,
      },
    }));
  };

  const calculateTotalScore = () => {
    return Object.values(grades).reduce((sum, g) => sum + (Number(g.marks) || 0), 0);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const answerGrades = Object.entries(grades).map(([questionId, grade]) => ({
        question_id: Number(questionId),
        marks_obtained: Number(grade.marks) || 0,
        feedback: grade.feedback || '',
      }));

      // Get current user info
      const authData = localStorage.getItem('crm_auth');
      const authUser = authData ? JSON.parse(authData).user : null;

      await testAPI.gradeSubmission(Number(submissionId), {
        answer_grades: answerGrades,
        graded_by: authUser?.id,
        graded_by_type: authUser?.userType || 'superuser',
      });

      toast.success('Submission graded successfully!');
      navigate(`/tests/${submission?.test_id}`);
    } catch (err: any) {
      console.error('Error saving grades:', err);
      setError(err.response?.data?.error || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const formatAnswer = (answer: Answer) => {
    const studentAnswer = answer.student_answer;
    if (!studentAnswer) return <em>No answer provided</em>;

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

  const totalScore = calculateTotalScore();
  const isPassing = totalScore >= (submission.passing_marks || 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(`/tests/${submission.test_id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Grade Submission</h1>
          <p className="text-gray-500">
            {submission.test_name} - {submission.first_name} {submission.last_name}
          </p>
        </div>
        <Button
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? 'Saving...' : 'Save Grades'}
        </Button>
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

      {/* Score Summary */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-1">Student</h3>
              <p>{submission.first_name} {submission.last_name}</p>
              {submission.enrollment_number && (
                <p className="text-sm text-gray-500">{submission.enrollment_number}</p>
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Current Score</h3>
              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    'text-4xl font-bold',
                    isPassing ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {totalScore}
                </span>
                <span className="text-xl text-gray-500">/ {submission.total_marks}</span>
              </div>
              <Badge
                className={cn(
                  'mt-1',
                  isPassing
                    ? 'bg-green-100 text-green-800 hover:bg-green-100'
                    : 'bg-red-100 text-red-800 hover:bg-red-100'
                )}
              >
                {isPassing ? 'Passing' : 'Failing'}
              </Badge>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Submission Info</h3>
              <p className="text-sm">
                Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'N/A'}
              </p>
              <p className="text-sm">
                Status: <Badge variant="outline" className="ml-1">{submission.status}</Badge>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions and Grading */}
      {submission.answers?.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <p className="text-gray-500">No answers to grade</p>
          </CardContent>
        </Card>
      ) : (
        submission.answers?.map((answer, index) => (
          <Card key={answer.question_id} className="mb-4">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm text-gray-500">
                    Question {index + 1} • {answer.question_type?.replace(/_/g, ' ')}
                  </p>
                  <h3 className="text-lg font-semibold mt-1">{answer.question_text}</h3>
                </div>
                <Badge variant="outline">{answer.marks} marks</Badge>
              </div>

              <hr className="my-4" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Student Answer */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Student's Answer</p>
                  <div className="p-4 bg-gray-100 rounded-lg min-h-[80px] whitespace-pre-wrap">
                    {formatAnswer(answer)}
                  </div>
                </div>

                {/* Correct Answer */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Correct Answer</p>
                  <div className="p-4 bg-green-50 rounded-lg min-h-[80px] whitespace-pre-wrap">
                    {formatCorrectAnswer(answer)}
                  </div>
                  {answer.explanation && (
                    <p className="text-sm text-gray-500 mt-2">
                      <strong>Explanation:</strong> {answer.explanation}
                    </p>
                  )}
                </div>
              </div>

              {/* Grading Section */}
              <hr className="my-4" />
              <div className="flex gap-6 items-start flex-wrap">
                {/* Quick Grade Buttons */}
                <div>
                  <p className="text-sm font-medium mb-2">Quick Grade</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={grades[answer.question_id]?.marks === 0 ? 'default' : 'outline'}
                      className={cn(
                        grades[answer.question_id]?.marks === 0 &&
                          'bg-red-600 hover:bg-red-700 text-white'
                      )}
                      onClick={() => handleQuickGrade(answer.question_id, 0, answer.marks)}
                    >
                      <X className="mr-1 h-3 w-3" />
                      0
                    </Button>
                    {answer.marks > 1 && (
                      <Button
                        size="sm"
                        variant={
                          grades[answer.question_id]?.marks === Math.floor(answer.marks / 2)
                            ? 'default'
                            : 'outline'
                        }
                        className={cn(
                          grades[answer.question_id]?.marks === Math.floor(answer.marks / 2) &&
                            'bg-amber-500 hover:bg-amber-600 text-white'
                        )}
                        onClick={() =>
                          handleQuickGrade(
                            answer.question_id,
                            Math.floor(answer.marks / 2),
                            answer.marks
                          )
                        }
                      >
                        {Math.floor(answer.marks / 2)}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={
                        grades[answer.question_id]?.marks === answer.marks ? 'default' : 'outline'
                      }
                      className={cn(
                        grades[answer.question_id]?.marks === answer.marks &&
                          'bg-green-600 hover:bg-green-700 text-white'
                      )}
                      onClick={() => handleQuickGrade(answer.question_id, answer.marks, answer.marks)}
                    >
                      <Check className="mr-1 h-3 w-3" />
                      {answer.marks}
                    </Button>
                  </div>
                </div>

                {/* Manual Marks */}
                <div>
                  <p className="text-sm font-medium mb-2">Marks Awarded</p>
                  <Input
                    type="number"
                    value={grades[answer.question_id]?.marks ?? 0}
                    onChange={(e) =>
                      handleGradeChange(
                        answer.question_id,
                        'marks',
                        Math.min(Number(e.target.value), answer.marks)
                      )
                    }
                    min={0}
                    max={answer.marks}
                    step={0.5}
                    className="w-24"
                  />
                </div>

                {/* Feedback */}
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-medium mb-2">Feedback (optional)</p>
                  <Textarea
                    placeholder="Add feedback for this answer..."
                    value={grades[answer.question_id]?.feedback || ''}
                    onChange={(e) =>
                      handleGradeChange(answer.question_id, 'feedback', e.target.value)
                    }
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Floating Save Button */}
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Grades ({totalScore}/{submission.total_marks})
        </Button>
      </div>
    </div>
  );
};

export default GradeSubmissionPage;
