import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Clock,
  Flag,
  FlagOff,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { testAPI } from '../../../shared/api/api';

const TakeTestPage = () => {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: any }>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [timeUpDialogOpen, setTimeUpDialogOpen] = useState(false);

  useEffect(() => {
    if (submissionId) {
      loadSubmission();
    }
  }, [submissionId]);

  // Timer effect
  useEffect(() => {
    if (!test?.is_timed || timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          setTimeUpDialogOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [test?.is_timed, timeRemaining]);

  const loadSubmission = async () => {
    try {
      setLoading(true);

      // First try to get test ID from localStorage, then from submission details
      let testId = localStorage.getItem(`submission_${submissionId}_test`);

      if (!testId) {
        // Fetch submission details to get test_id
        try {
          const submissionRes = await testAPI.getSubmissionDetails(Number(submissionId));
          testId = String(submissionRes.data.test_id);
        } catch (subErr) {
          console.error('Could not fetch submission details:', subErr);
          throw new Error('Test information not found. Please go back and start the test again.');
        }
      }

      const testRes = await testAPI.getById(Number(testId));
      setTest(testRes.data);

      const testQuestions = testRes.data.questions || [];
      // Shuffle questions if enabled
      if (testRes.data.shuffle_questions) {
        testQuestions.sort(() => Math.random() - 0.5);
      }
      setQuestions(testQuestions);

      if (testQuestions.length === 0) {
        setError('This test has no questions. Please contact the administrator.');
      }

      // Calculate remaining time
      if (testRes.data.is_timed) {
        setTimeRemaining(testRes.data.duration_minutes * 60);
      }
    } catch (err: any) {
      console.error('Error loading submission:', err);
      setError(err.message || 'Failed to load test');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = useCallback((questionId: number, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }, []);

  const toggleFlag = (questionId: number) => {
    setFlagged((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (force: boolean = false) => {
    if (!force) {
      setConfirmDialogOpen(true);
      return;
    }

    try {
      setSubmitting(true);
      setConfirmDialogOpen(false);
      setTimeUpDialogOpen(false);

      // Format answers as object with question_id as keys (backend expects this format)
      const formattedAnswers: { [key: number]: any } = {};
      questions.forEach((q) => {
        formattedAnswers[q.question_id] = answers[q.question_id] || null;
      });

      await testAPI.submitTest(Number(submissionId), formattedAnswers);

      // Navigate to results or confirmation
      navigate('/tests', {
        state: { message: 'Test submitted successfully!' },
      });
    } catch (err: any) {
      console.error('Error submitting test:', err);
      setError(err.response?.data?.error || 'Failed to submit test');
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColorClass = () => {
    if (timeRemaining === null) return 'bg-indigo-100 text-indigo-800 border-indigo-300';
    if (timeRemaining < 60) return 'bg-red-100 text-red-800 border-red-300 animate-pulse';
    if (timeRemaining < 300) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-indigo-100 text-indigo-800 border-indigo-300';
  };

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error && !test) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="ghost" onClick={() => navigate('/tests')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tests
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-lg border p-4 mb-6 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold">{test?.test_name}</h2>
            <p className="text-sm text-gray-500">
              Question {currentIndex + 1} of {questions.length}
            </p>
          </div>

          {test?.is_timed && timeRemaining !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full border text-lg font-semibold',
                getTimeColorClass()
              )}
            >
              <Clock className="h-5 w-5" />
              {formatTime(timeRemaining)}
            </span>
          )}

          <div className="flex gap-3">
            <span className="text-sm text-gray-500">
              {answeredCount}/{questions.length} answered
            </span>
            <span className="text-sm text-amber-600">
              {flagged.size} flagged
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
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

      {/* Question Navigator */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <p className="text-sm font-semibold mb-2">Question Navigator</p>
        <div className="flex flex-wrap gap-1.5">
          {questions.map((q, index) => (
            <button
              key={q.question_id}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'min-w-[40px] h-10 rounded-md text-sm font-medium border transition-colors',
                index === currentIndex
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : flagged.has(q.question_id)
                    ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                    : answers[q.question_id]
                      ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              )}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Current Question */}
      {currentQuestion && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{currentQuestion.marks} marks</Badge>
                  <Badge variant="outline">
                    {currentQuestion.question_type?.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold">{currentQuestion.question_text}</h3>
              </div>
              <button
                onClick={() => toggleFlag(currentQuestion.question_id)}
                className={cn(
                  'p-2 rounded-md transition-colors',
                  flagged.has(currentQuestion.question_id)
                    ? 'text-amber-500 hover:bg-amber-50'
                    : 'text-gray-400 hover:bg-gray-100'
                )}
              >
                {flagged.has(currentQuestion.question_id) ? (
                  <Flag className="h-5 w-5" />
                ) : (
                  <FlagOff className="h-5 w-5" />
                )}
              </button>
            </div>

            <hr className="my-4" />

            {/* Answer Input based on question type */}
            {currentQuestion.question_type === 'multiple_choice' && (
              <div className="space-y-2">
                {currentQuestion.options?.map((option: string, index: number) => (
                  <label
                    key={index}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border',
                      answers[currentQuestion.question_id]?.index === index
                        ? 'bg-indigo-50 border-indigo-300'
                        : 'hover:bg-gray-50 border-transparent'
                    )}
                  >
                    <input
                      type="radio"
                      name={`q_${currentQuestion.question_id}`}
                      value={index}
                      checked={answers[currentQuestion.question_id]?.index === index}
                      onChange={() =>
                        handleAnswerChange(currentQuestion.question_id, { index })
                      }
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span>
                      {String.fromCharCode(65 + index)}. {option}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.question_type === 'true_false' && (
              <div className="space-y-2">
                {[
                  { value: true, label: 'True' },
                  { value: false, label: 'False' },
                ].map((opt) => (
                  <label
                    key={String(opt.value)}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border',
                      answers[currentQuestion.question_id]?.value === opt.value
                        ? 'bg-indigo-50 border-indigo-300'
                        : 'hover:bg-gray-50 border-transparent'
                    )}
                  >
                    <input
                      type="radio"
                      name={`q_${currentQuestion.question_id}`}
                      value={String(opt.value)}
                      checked={answers[currentQuestion.question_id]?.value === opt.value}
                      onChange={() =>
                        handleAnswerChange(currentQuestion.question_id, { value: opt.value })
                      }
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}

            {(currentQuestion.question_type === 'short_answer' ||
              currentQuestion.question_type === 'form_filling') && (
              currentQuestion.question_type === 'form_filling' ? (
                <Textarea
                  placeholder="Type your answer here..."
                  value={answers[currentQuestion.question_id]?.text || ''}
                  onChange={(e) =>
                    handleAnswerChange(currentQuestion.question_id, { text: e.target.value })
                  }
                  rows={3}
                />
              ) : (
                <Input
                  placeholder="Type your answer here..."
                  value={answers[currentQuestion.question_id]?.text || ''}
                  onChange={(e) =>
                    handleAnswerChange(currentQuestion.question_id, { text: e.target.value })
                  }
                />
              )
            )}

            {(currentQuestion.question_type === 'essay' ||
              currentQuestion.question_type === 'writing') && (
              <div>
                <Textarea
                  placeholder="Write your answer here..."
                  value={answers[currentQuestion.question_id]?.text || ''}
                  onChange={(e) =>
                    handleAnswerChange(currentQuestion.question_id, { text: e.target.value })
                  }
                  rows={10}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {(answers[currentQuestion.question_id]?.text || '').length} characters
                </p>
              </div>
            )}

            {currentQuestion.question_type === 'matching' && currentQuestion.matching_pairs && (
              <div>
                <p className="text-sm text-gray-500 mb-3">
                  Match the items on the left with the correct items on the right
                </p>
                {currentQuestion.matching_pairs.map((pair: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 mb-3">
                    <div className="flex-1 p-3 bg-gray-100 rounded-lg">
                      <span>{pair.left}</span>
                    </div>
                    <select
                      value={answers[currentQuestion.question_id]?.matches?.[index] ?? ''}
                      onChange={(e) => {
                        const currentMatches =
                          answers[currentQuestion.question_id]?.matches || {};
                        handleAnswerChange(currentQuestion.question_id, {
                          matches: { ...currentMatches, [index]: e.target.value },
                        });
                      }}
                      className="min-w-[200px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select match...</option>
                      {currentQuestion.matching_pairs.map((p: any, i: number) => (
                        <option key={i} value={p.right}>
                          {p.right}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Reading Passage */}
            {currentQuestion.question_type === 'reading_passage' && currentQuestion.passage && (
              <div className="mb-4">
                <div className="p-4 bg-gray-50 rounded-lg max-h-[300px] overflow-auto mb-3 border">
                  <h4 className="font-semibold mb-2">{currentQuestion.passage.title}</h4>
                  <p className="text-sm whitespace-pre-wrap">{currentQuestion.passage.content}</p>
                </div>
                <Textarea
                  placeholder="Answer based on the reading passage..."
                  value={answers[currentQuestion.question_id]?.text || ''}
                  onChange={(e) =>
                    handleAnswerChange(currentQuestion.question_id, { text: e.target.value })
                  }
                  rows={4}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <div className="flex gap-3">
          {/* Always show Submit button */}
          <Button
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
          >
            Submit Test
            <Send className="ml-2 h-4 w-4" />
          </Button>

          {currentIndex < questions.length - 1 && (
            <Button
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
              onClick={() =>
                setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))
              }
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Confirm Submit Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Test?</DialogTitle>
          </DialogHeader>
          <div>
            <p className="mb-3">Are you sure you want to submit your test?</p>
            <div className="space-y-1 text-sm">
              <p>• Answered: {answeredCount} of {questions.length} questions</p>
              <p>• Unanswered: {questions.length - answeredCount}</p>
              <p className="text-amber-600">• Flagged for review: {flagged.size}</p>
            </div>
            {questions.length - answeredCount > 0 && (
              <Alert variant="destructive" className="mt-3">
                <AlertDescription>
                  You have {questions.length - answeredCount} unanswered question(s).
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Review Answers
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={submitting}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Up Dialog */}
      <Dialog open={timeUpDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="[&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Time's Up!</DialogTitle>
          </DialogHeader>
          <p>Your time has expired. Your test will be submitted automatically.</p>
          <DialogFooter>
            <Button onClick={() => handleSubmit(true)} disabled={submitting}>
              Submit Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TakeTestPage;
