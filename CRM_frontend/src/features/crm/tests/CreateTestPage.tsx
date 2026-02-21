import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { testAPI, subjectAPI, centerAPI } from '../../../shared/api/api';
import { useAppSelector } from '../hooks';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  marks: number;
  options?: string[];
  correct_answer?: any;
  explanation?: string;
  word_limit?: number;
}

interface Passage {
  id: string;
  title: string;
  content: string;
  difficulty_level: string;
}

const CreateTestPage = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [centers, setCenters] = useState<any[]>([]);

  // Test basic info
  const [testData, setTestData] = useState({
    test_name: '',
    test_type: 'multiple_choice',
    description: '',
    instructions: '',
    subject_id: '',
    center_id: user?.center_id || 1,
    total_marks: 0,
    passing_marks: 0,
    duration_minutes: 60,
    is_timed: true,
    shuffle_questions: false,
    show_results_immediately: true,
    allow_retake: false,
    max_retakes: 1,
    assignment_type: 'all_students',
  });

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);

  // Passages (for reading tests)
  const [passages, setPassages] = useState<Passage[]>([]);

  const steps = ['Basic Info', 'Add Questions', 'Settings', 'Review'];

  const testTypes = [
    { value: 'multiple_choice', label: 'Multiple Choice' },
    { value: 'essay', label: 'Essay' },
    { value: 'short_answer', label: 'Short Answer' },
    { value: 'true_false', label: 'True/False' },
    { value: 'form_filling', label: 'Form Filling' },
    { value: 'reading_passage', label: 'Reading Passage' },
    { value: 'writing', label: 'Writing' },
    { value: 'matching', label: 'Matching' },
  ];

  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const [subjectsRes, centersRes] = await Promise.all([
        subjectAPI.getAll(),
        centerAPI.getAll(),
      ]);
      setSubjects(subjectsRes.data || []);
      setCenters(centersRes.data || []);
    } catch (err) {
      console.error('Error loading options:', err);
    }
  };

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question_text: '',
      question_type: testData.test_type === 'reading_passage' ? 'multiple_choice' : testData.test_type,
      marks: 1,
      options: testData.test_type === 'multiple_choice' || testData.test_type === 'true_false' ? ['', '', '', ''] : undefined,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const addOption = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && question.options) {
      updateQuestion(questionId, { options: [...question.options, ''] });
    }
  };

  const updateOption = (questionId: string, index: number, value: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && question.options) {
      const newOptions = [...question.options];
      newOptions[index] = value;
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const deleteOption = (questionId: string, index: number) => {
    const question = questions.find((q) => q.id === questionId);
    if (question && question.options && question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== index);
      updateQuestion(questionId, { options: newOptions });
    }
  };

  const addPassage = () => {
    const newPassage: Passage = {
      id: Date.now().toString(),
      title: '',
      content: '',
      difficulty_level: 'medium',
    };
    setPassages([...passages, newPassage]);
  };

  const updatePassage = (id: string, updates: Partial<Passage>) => {
    setPassages(passages.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deletePassage = (id: string) => {
    setPassages(passages.filter((p) => p.id !== id));
  };

  const calculateTotalMarks = () => {
    return questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const formattedQuestions = questions.map((q, index) => ({
        question_text: q.question_text,
        question_type: q.question_type,
        marks: q.marks,
        question_order: index + 1,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        word_limit: q.word_limit,
        is_required: true,
      }));

      const formattedPassages = passages.map((p, index) => ({
        title: p.title,
        content: p.content,
        difficulty_level: p.difficulty_level,
        passage_order: index + 1,
      }));

      const submitData = {
        ...testData,
        total_marks: calculateTotalMarks(),
        passing_marks: testData.passing_marks || Math.ceil(calculateTotalMarks() * 0.6),
        created_by: user?.id,
        created_by_type: user?.userType || 'superuser',
        questions: formattedQuestions,
        passages: testData.test_type === 'reading_passage' ? formattedPassages : undefined,
      };

      await testAPI.create(submitData);
      navigate('/tests');
    } catch (err: any) {
      console.error('Error creating test:', err);
      setError(err.response?.data?.error || 'Failed to create test. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <div className="grid grid-cols-1 gap-6">
      <div>
        <Label htmlFor="test_name">Test Name *</Label>
        <Input
          id="test_name"
          value={testData.test_name}
          onChange={(e) => setTestData({ ...testData, test_name: e.target.value })}
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="test_type">Test Type</Label>
          <select
            id="test_type"
            value={testData.test_type}
            onChange={(e) => setTestData({ ...testData, test_type: e.target.value })}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {testTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="subject_id">Subject</Label>
          <select
            id="subject_id"
            value={testData.subject_id}
            onChange={(e) => setTestData({ ...testData, subject_id: e.target.value })}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">No Subject</option>
            {subjects.map((subject) => (
              <option key={subject.subject_id} value={subject.subject_id}>
                {subject.subject_name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={testData.description}
          onChange={(e) => setTestData({ ...testData, description: e.target.value })}
          rows={3}
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="instructions">Instructions</Label>
        <Textarea
          id="instructions"
          value={testData.instructions}
          onChange={(e) => setTestData({ ...testData, instructions: e.target.value })}
          rows={3}
          placeholder="Enter instructions for students taking this test..."
          className="mt-1"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            value={testData.duration_minutes}
            onChange={(e) => setTestData({ ...testData, duration_minutes: parseInt(e.target.value) || 60 })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="passing_marks">Passing Marks</Label>
          <Input
            id="passing_marks"
            type="number"
            value={testData.passing_marks}
            onChange={(e) => setTestData({ ...testData, passing_marks: parseInt(e.target.value) || 0 })}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="center_id">Center</Label>
          <select
            id="center_id"
            value={testData.center_id}
            onChange={(e) => setTestData({ ...testData, center_id: Number(e.target.value) })}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {centers.map((center) => (
              <option key={center.center_id} value={center.center_id}>
                {center.center_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderQuestions = () => (
    <div>
      {/* Reading Passages Section */}
      {testData.test_type === 'reading_passage' && (
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Reading Passages</h3>
            <Button variant="outline" onClick={addPassage}>
              <Plus className="h-4 w-4 mr-2" />
              Add Passage
            </Button>
          </div>
          {passages.map((passage, index) => (
            <div key={passage.id} className="border rounded-lg p-4 mb-3 bg-background">
              <div className="flex justify-between mb-3">
                <h4 className="font-semibold">Passage {index + 1}</h4>
                <button
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                  onClick={() => deletePassage(passage.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-8">
                  <Label>Title</Label>
                  <Input
                    value={passage.title}
                    onChange={(e) => updatePassage(passage.id, { title: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-4">
                  <Label>Difficulty</Label>
                  <select
                    value={passage.difficulty_level}
                    onChange={(e) => updatePassage(passage.id, { difficulty_level: e.target.value })}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div className="md:col-span-12">
                  <Label>Passage Content</Label>
                  <Textarea
                    value={passage.content}
                    onChange={(e) => updatePassage(passage.id, { content: e.target.value })}
                    rows={6}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
          <hr className="my-6" />
        </div>
      )}

      {/* Questions Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold">Questions</h3>
          <p className="text-sm text-muted-foreground">Total Marks: {calculateTotalMarks()}</p>
        </div>
        <Button onClick={addQuestion}>
          <Plus className="h-4 w-4 mr-2" />
          Add Question
        </Button>
      </div>

      {questions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-muted-foreground mb-4">No questions added yet</p>
          <Button variant="outline" onClick={addQuestion}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Question
          </Button>
        </div>
      ) : (
        questions.map((question, index) => (
          <div key={question.id} className="border rounded-lg p-4 mb-3 bg-background">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <Badge>Q{index + 1}</Badge>
                <Badge variant="outline">{question.marks} marks</Badge>
              </div>
              <button
                className="p-1 text-red-500 hover:bg-red-50 rounded"
                onClick={() => deleteQuestion(question.id)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Question Text</Label>
                <Textarea
                  value={question.question_text}
                  onChange={(e) => updateQuestion(question.id, { question_text: e.target.value })}
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Question Type</Label>
                  <select
                    value={question.question_type}
                    onChange={(e) => updateQuestion(question.id, { question_type: e.target.value })}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {testTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Marks</Label>
                  <Input
                    type="number"
                    value={question.marks}
                    onChange={(e) => updateQuestion(question.id, { marks: parseInt(e.target.value) || 1 })}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Options for MCQ */}
              {(question.question_type === 'multiple_choice' || question.question_type === 'true_false') && (
                <div>
                  <Label className="mb-2 block">Options</Label>
                  {question.question_type === 'true_false' ? (
                    <select
                      value={question.correct_answer?.value ?? ''}
                      onChange={(e) => updateQuestion(question.id, { correct_answer: { value: e.target.value === 'true' } })}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Select correct answer</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  ) : (
                    <>
                      {question.options?.map((option, optIndex) => (
                        <div key={optIndex} className="flex gap-2 mb-2 items-center">
                          <Input
                            placeholder={`Option ${optIndex + 1}`}
                            value={option}
                            onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                          />
                          <button
                            className={cn(
                              'p-2 rounded-md border',
                              question.correct_answer?.index === optIndex
                                ? 'bg-green-100 text-green-700 border-green-300'
                                : 'hover:bg-muted'
                            )}
                            onClick={() => updateQuestion(question.id, { correct_answer: { index: optIndex } })}
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          {question.options && question.options.length > 2 && (
                            <button
                              className="p-2 text-red-500 hover:bg-red-50 rounded-md"
                              onClick={() => deleteOption(question.id, optIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <Button variant="ghost" size="sm" onClick={() => addOption(question.id)}>
                        Add Option
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Word limit for essay/writing */}
              {(question.question_type === 'essay' || question.question_type === 'writing') && (
                <div className="md:w-1/2">
                  <Label>Word Limit (optional)</Label>
                  <Input
                    type="number"
                    value={question.word_limit || ''}
                    onChange={(e) => updateQuestion(question.id, { word_limit: parseInt(e.target.value) || undefined })}
                    className="mt-1"
                  />
                </div>
              )}

              {/* Correct answer for short answer/form filling */}
              {(question.question_type === 'short_answer' || question.question_type === 'form_filling') && (
                <div>
                  <Label>Correct Answer(s) - comma separated for multiple accepted answers</Label>
                  <Input
                    value={question.correct_answer?.answers?.join(', ') || ''}
                    onChange={(e) => updateQuestion(question.id, {
                      correct_answer: { answers: e.target.value.split(',').map(a => a.trim()) }
                    })}
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <Label>Explanation (shown after submission)</Label>
                <Input
                  value={question.explanation || ''}
                  onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Test Settings</h3>
          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testData.is_timed}
                onChange={(e) => setTestData({ ...testData, is_timed: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Timed Test</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testData.shuffle_questions}
                onChange={(e) => setTestData({ ...testData, shuffle_questions: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Shuffle Questions</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testData.show_results_immediately}
                onChange={(e) => setTestData({ ...testData, show_results_immediately: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Show Results Immediately</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={testData.allow_retake}
                onChange={(e) => setTestData({ ...testData, allow_retake: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm">Allow Retakes</span>
            </label>
            {testData.allow_retake && (
              <div className="ml-7 w-36">
                <Label>Maximum Retakes</Label>
                <Input
                  type="number"
                  value={testData.max_retakes}
                  onChange={(e) => setTestData({ ...testData, max_retakes: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Assignment</h3>
          <div>
            <Label htmlFor="assignment_type">Assign To</Label>
            <select
              id="assignment_type"
              value={testData.assignment_type}
              onChange={(e) => setTestData({ ...testData, assignment_type: e.target.value })}
              className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all_students">All Students</option>
              <option value="specific_students">Specific Students</option>
              <option value="specific_class">Specific Class</option>
              <option value="specific_teacher">Specific Teacher's Students</option>
            </select>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            You can assign this test to specific students after creation.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderReview = () => (
    <div>
      <Alert className="mb-6">
        <AlertDescription>Review your test details before creating.</AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-3">Test Information</h3>
            <div className="flex flex-col gap-2 text-sm">
              <p><strong>Name:</strong> {testData.test_name}</p>
              <p><strong>Type:</strong> {testTypes.find(t => t.value === testData.test_type)?.label}</p>
              <p><strong>Duration:</strong> {testData.duration_minutes} minutes</p>
              <p><strong>Total Marks:</strong> {calculateTotalMarks()}</p>
              <p><strong>Passing Marks:</strong> {testData.passing_marks || Math.ceil(calculateTotalMarks() * 0.6)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <h3 className="text-lg font-semibold mb-3">Content Summary</h3>
            <div className="flex flex-col gap-2 text-sm">
              <p><strong>Questions:</strong> {questions.length}</p>
              {testData.test_type === 'reading_passage' && (
                <p><strong>Passages:</strong> {passages.length}</p>
              )}
              <p><strong>Timed:</strong> {testData.is_timed ? 'Yes' : 'No'}</p>
              <p><strong>Retakes Allowed:</strong> {testData.allow_retake ? `Yes (${testData.max_retakes})` : 'No'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return renderBasicInfo();
      case 1:
        return renderQuestions();
      case 2:
        return renderSettings();
      case 3:
        return renderReview();
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          className="p-2 rounded-md hover:bg-muted"
          onClick={() => navigate('/tests')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-3xl font-bold">Create New Test</h1>
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

      {/* Stepper */}
      <div className="flex items-center mb-8">
        {steps.map((label, index) => (
          <div key={label} className="flex items-center flex-1">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2',
                  index < activeStep
                    ? 'bg-primary text-primary-foreground border-primary'
                    : index === activeStep
                    ? 'border-primary text-primary'
                    : 'border-muted-foreground/30 text-muted-foreground'
                )}
              >
                {index < activeStep ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  'text-sm font-medium hidden sm:inline',
                  index <= activeStep ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-4',
                  index < activeStep ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {getStepContent(activeStep)}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={loading}
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : activeStep === steps.length - 1 ? (
            'Create Test'
          ) : (
            'Next'
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreateTestPage;
