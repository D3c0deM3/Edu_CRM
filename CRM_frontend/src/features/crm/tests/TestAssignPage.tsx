import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Users,
  School,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { testAPI, studentAPI, classAPI } from '../../../shared/api/api';
import { toast } from 'react-toastify';

interface Student {
  student_id: number;
  first_name: string;
  last_name: string;
  phone_number?: string;
  class_name?: string;
}

interface ClassType {
  class_id: number;
  class_name: string;
  students_count?: number;
}

const TestAssignPage = () => {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [test, setTest] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assignmentType, setAssignmentType] = useState<'all' | 'class' | 'individual'>('all');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [isMandatory, setIsMandatory] = useState(true);

  useEffect(() => {
    loadData();
  }, [testId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [testRes, studentsRes, classesRes] = await Promise.all([
        testAPI.getById(Number(testId)),
        studentAPI.getAll(),
        classAPI.getAll(),
      ]);

      setTest(testRes.data);
      setStudents(studentsRes.data || []);
      setClasses(classesRes.data || []);

      // Pre-fill from test data
      if (testRes.data.assignment_type) {
        setAssignmentType(testRes.data.assignment_type);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentToggle = (studentId: number) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleClassToggle = (classId: number) => {
    setSelectedClasses((prev) =>
      prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId]
    );
  };

  const handleSelectAllStudents = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s) => s.student_id));
    }
  };

  const handleSelectAllClasses = () => {
    if (selectedClasses.length === classes.length) {
      setSelectedClasses([]);
    } else {
      setSelectedClasses(classes.map((c) => c.class_id));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Build assignments array based on type
      // Backend expects: { assigned_to_type, assigned_to_id, due_date, is_mandatory, notes }
      let assignments: any[] = [];

      if (assignmentType === 'all') {
        // Assign to all students individually
        assignments = students.map((s) => ({
          assigned_to_type: 'student',
          assigned_to_id: s.student_id,
          due_date: dueDate || null,
          is_mandatory: isMandatory,
        }));
      } else if (assignmentType === 'class') {
        // Assign by class - each selected class gets an assignment entry
        assignments = selectedClasses.map((classId) => ({
          assigned_to_type: 'class',
          assigned_to_id: classId,
          due_date: dueDate || null,
          is_mandatory: isMandatory,
        }));
      } else {
        // Individual students
        assignments = selectedStudents.map((studentId) => ({
          assigned_to_type: 'student',
          assigned_to_id: studentId,
          due_date: dueDate || null,
          is_mandatory: isMandatory,
        }));
      }

      // Get current user ID from localStorage
      const authData = localStorage.getItem('crm_auth');
      const userId = authData ? JSON.parse(authData).user?.id : 0;

      await testAPI.assignTest(Number(testId), assignments, userId);

      toast.success('Test assigned successfully!');
      navigate(`/tests/${testId}`);
    } catch (err: any) {
      console.error('Error assigning test:', err);
      setError(err.response?.data?.error || 'Failed to assign test');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => navigate(`/tests/${testId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Assign Test</h1>
          <p className="text-gray-500">{test?.test_name}</p>
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

      {/* Assignment Settings */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4">Assignment Settings</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="assignmentType">Assignment Type</Label>
              <select
                id="assignmentType"
                value={assignmentType}
                onChange={(e) => setAssignmentType(e.target.value as any)}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Students</option>
                <option value="class">By Class</option>
                <option value="individual">Individual Students</option>
              </select>
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="mandatory">Mandatory</Label>
              <select
                id="mandatory"
                value={isMandatory ? 'yes' : 'no'}
                onChange={(e) => setIsMandatory(e.target.value === 'yes')}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="yes">Yes - Required</option>
                <option value="no">No - Optional</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Based on Type */}
      {assignmentType === 'all' && (
        <Card>
          <CardContent className="flex flex-col items-center py-10">
            <Users className="h-14 w-14 text-indigo-500 mb-3" />
            <h3 className="text-lg font-semibold">
              This test will be assigned to all students
            </h3>
            <p className="text-sm text-gray-500">
              Total: {students.length} students
            </p>
          </CardContent>
        </Card>
      )}

      {assignmentType === 'class' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Classes</h3>
              <Button variant="ghost" size="sm" onClick={handleSelectAllClasses}>
                {selectedClasses.length === classes.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {classes.length === 0 ? (
              <p className="text-gray-500">No classes available</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {classes.map((cls) => (
                  <button
                    key={cls.class_id}
                    onClick={() => handleClassToggle(cls.class_id)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors',
                      selectedClasses.includes(cls.class_id)
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <School className="h-4 w-4" />
                    {cls.class_name}
                  </button>
                ))}
              </div>
            )}

            {selectedClasses.length > 0 && (
              <p className="text-sm text-gray-500 mt-3">
                Selected: {selectedClasses.length} class(es)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {assignmentType === 'individual' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Select Students</h3>
              <Button variant="ghost" size="sm" onClick={handleSelectAllStudents}>
                {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {students.length === 0 ? (
              <p className="text-gray-500">No students available</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedStudents.length === students.length}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate =
                                selectedStudents.length > 0 &&
                                selectedStudents.length < students.length;
                            }
                          }}
                          onChange={handleSelectAllStudents}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Class</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow
                        key={student.student_id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => handleStudentToggle(student.student_id)}
                      >
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student.student_id)}
                            onChange={() => handleStudentToggle(student.student_id)}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </TableCell>
                        <TableCell>
                          {student.first_name} {student.last_name}
                        </TableCell>
                        <TableCell>{student.phone_number || '-'}</TableCell>
                        <TableCell>{student.class_name || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedStudents.length > 0 && (
              <p className="text-sm text-gray-500 mt-3">
                Selected: {selectedStudents.length} student(s)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(`/tests/${testId}`)}>
          Cancel
        </Button>
        <Button
          className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
          onClick={handleSave}
          disabled={
            saving ||
            (assignmentType === 'class' && selectedClasses.length === 0) ||
            (assignmentType === 'individual' && selectedStudents.length === 0)
          }
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? 'Saving...' : 'Save Assignment'}
        </Button>
      </div>
    </div>
  );
};

export default TestAssignPage;
