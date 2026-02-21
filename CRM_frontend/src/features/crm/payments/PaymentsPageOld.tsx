import { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, X, ArrowLeft, Folder, Search, Filter, User, BookOpen, Plus, DollarSign, CreditCard, Users } from 'lucide-react';
import { useCRUD } from '../hooks/useCRUD';
import { paymentAPI, teacherAPI, classAPI, studentAPI } from '../../../shared/api/api';
import { SelectField } from '../students/components/SelectField';
import { fetchStudents, fetchCenters, paymentMethodOptions, paymentStatusOptions, paymentTypeOptions, currencyOptions } from '../../../utils/dropdownOptions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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

interface Payment {
  payment_id?: number;
  id?: number;
  student_id: number;
  center_id: number;
  payment_date: string;
  amount: number;
  currency: string;
  payment_method: string;
  transaction_reference: string;
  receipt_number: string;
  payment_status: string;
  payment_type: string;
  notes?: string;
}

interface Teacher {
  teacher_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  employee_id: string;
}

interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  class_code: string;
  level: number;
  teacher_id?: number;
}

interface Student {
  student_id?: number;
  id?: number;
  first_name: string;
  last_name: string;
  class_id?: number;
  teacher_id?: number;
}

type TabType = 'students' | 'classes' | 'teachers';
type FolderType = 'teacher' | 'class' | 'student';

const PaymentsPage = () => {
  const [state, actions] = useCRUD<Payment>(paymentAPI, 'Payment');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [selectedFolder, setSelectedFolder] = useState<{ type: FolderType; id: number; name: string } | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Payment>>({
    center_id: 1,
    currency: 'USD',
    payment_status: 'Completed',
    payment_type: 'Tuition',
  });
  const [studentOptions, setStudentOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [centerOptions, setCenterOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Search and Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
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
      const [teachersRes, classesRes, studentsRes] = await Promise.all([
        teacherAPI.getAll(),
        classAPI.getAll(),
        studentAPI.getAll(),
      ]);
      setTeachers(Array.isArray(teachersRes.data || teachersRes) ? (teachersRes.data || teachersRes) : []);
      setClasses(Array.isArray(classesRes.data || classesRes) ? (classesRes.data || classesRes) : []);
      setStudents(Array.isArray(studentsRes.data || studentsRes) ? (studentsRes.data || studentsRes) : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const [studentOpts, centers] = await Promise.all([
        fetchStudents(),
        fetchCenters(),
      ]);
      setStudentOptions(studentOpts);
      setCenterOptions(centers);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  // Get student IDs for a teacher (students assigned to this teacher)
  const getStudentIdsForTeacher = (teacherId: number): number[] => {
    return students
      .filter((s) => s.teacher_id === teacherId)
      .map((s) => s.student_id || s.id || 0);
  };

  // Get student IDs for a class
  const getStudentIdsForClass = (classId: number): number[] => {
    return students
      .filter((s) => s.class_id === classId)
      .map((s) => s.student_id || s.id || 0);
  };

  // Get payments count for class
  const getPaymentCountForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    return state.items.filter((p) => studentIds.includes(p.student_id)).length;
  };

  // Get total amount for class
  const getTotalAmountForClass = (classId: number): number => {
    const studentIds = getStudentIdsForClass(classId);
    return state.items
      .filter((p) => studentIds.includes(p.student_id))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  // Get payments count for student
  const getPaymentCountForStudent = (studentId: number): number => {
    return state.items.filter((p) => p.student_id === studentId).length;
  };

  // Get total amount for student
  const getTotalAmountForStudent = (studentId: number): number => {
    return state.items
      .filter((p) => p.student_id === studentId)
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  // Filter payments based on selected folder
  const getFilteredPayments = (): Payment[] => {
    if (!selectedFolder) return state.items;

    let studentIds: number[] = [];
    if (selectedFolder.type === 'teacher') {
      studentIds = getStudentIdsForTeacher(selectedFolder.id);
    } else if (selectedFolder.type === 'class') {
      studentIds = getStudentIdsForClass(selectedFolder.id);
    } else if (selectedFolder.type === 'student') {
      studentIds = [selectedFolder.id];
    }
    return state.items.filter((p) => studentIds.includes(p.student_id));
  };

  // Apply search and filters
  const displayedPayments = useMemo(() => {
    let payments = getFilteredPayments();

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      payments = payments.filter((p) => {
        const student = students.find((s) => (s.student_id || s.id) === p.student_id);
        const studentName = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
        return (
          p.receipt_number?.toLowerCase().includes(search) ||
          p.transaction_reference?.toLowerCase().includes(search) ||
          studentName.includes(search) ||
          p.amount?.toString().includes(search)
        );
      });
    }

    if (filterStatus) {
      payments = payments.filter((p) => p.payment_status === filterStatus);
    }

    if (filterMethod) {
      payments = payments.filter((p) => p.payment_method === filterMethod);
    }

    return payments;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.items, selectedFolder, searchTerm, filterStatus, filterMethod, students]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('');
    setFilterMethod('');
  };

  const hasActiveFilters = searchTerm || filterStatus || filterMethod;

  const getStudentName = (studentId: number): string => {
    const student = students.find((s) => (s.student_id || s.id) === studentId);
    return student ? `${student.first_name} ${student.last_name}` : `Student #${studentId}`;
  };

  const handleOpenModal = (payment?: Payment) => {
    if (payment) {
      setEditingId(payment.payment_id || payment.id || null);
      setFormData(payment);
    } else {
      setEditingId(null);
      setFormData({
        center_id: 1,
        currency: 'USD',
        payment_status: 'Completed',
        payment_type: 'Tuition',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      center_id: 1,
      currency: 'USD',
      payment_status: 'Completed',
      payment_type: 'Tuition',
    });
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
    if (window.confirm('Are you sure you want to delete this payment?')) {
      await actions.delete(id);
    }
  };

  const handleFolderClick = (type: FolderType, id: number, name: string) => {
    setSelectedFolder({ type, id, name });
  };

  const handleBackToFolders = () => {
    setSelectedFolder(null);
    clearFilters();
  };

  const totalAmount = displayedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {selectedFolder && (
            <Button variant="outline" size="sm" onClick={handleBackToFolders}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
          <h1 className="text-2xl font-bold">
            {selectedFolder
              ? `${selectedFolder.name} - Payments`
              : 'Payments Management'}
          </h1>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" /> Add Payment
        </Button>
      </div>

      {state.error && (
        <Alert className="mb-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {!selectedFolder ? (
        <>
          {/* Tab Navigation */}
          <div className="border-b border-border mb-6">
            <div className="flex space-x-1">
              <Button
                variant={activeTab === 'students' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('students')}
                className="rounded-b-none"
              >
                <Users className="h-4 w-4 mr-2" />
                By Students
              </Button>
              <Button
                variant={activeTab === 'classes' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('classes')}
                className="rounded-b-none"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                By Classes
              </Button>
              <Button
                variant={activeTab === 'teachers' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('teachers')}
                className="rounded-b-none"
              >
                <User className="h-4 w-4 mr-2" />
                By Teachers
              </Button>
            </div>
          </div>

          {/* Tab Content */}
          <div>
            {/* By Students Tab */}
            {activeTab === 'students' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingData ? (
                  <div className="col-span-full text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Loading students...</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-muted-foreground">No students found</p>
                  </div>
                ) : (
                  students.map((student) => {
                    const studentId = student.student_id || student.id || 0;
                    const paymentCount = getPaymentCountForStudent(studentId);
                    const totalAmount = getTotalAmountForStudent(studentId);
                    return (
                      <Card
                        key={studentId}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => handleFolderClick('student', studentId, `${student.first_name} ${student.last_name}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <Folder className="h-9 w-9 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="font-semibold">{student.first_name} {student.last_name}</h3>
                            <p className="text-sm text-muted-foreground">ID: {studentId}</p>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>{paymentCount} payments</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm font-semibold text-primary">
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>${totalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}

            {/* By Classes Tab */}
            {activeTab === 'classes' && (
              <div className="folder-section">
                <div className="folder-grid">
                  {loadingData ? (
                    <div className="loading-text">Loading classes...</div>
                  ) : classes.length === 0 ? (
                    <div className="empty-text">No classes found</div>
                  ) : (
                    classes.map((cls) => {
                      const classId = cls.class_id || cls.id || 0;
                      const paymentCount = getPaymentCountForClass(classId);
                      const totalAmount = getTotalAmountForClass(classId);
                      return (
                        <div
                          key={classId}
                          className="folder-card class-folder"
                          onClick={() => handleFolderClick('class', classId, cls.class_name)}
                        >
                          <div className="folder-icon">
                            <Folder className="h-9 w-9" />
                          </div>
                          <div className="folder-info">
                            <h3>{cls.class_name}</h3>
                            <span className="folder-code">{cls.class_code} • Level {cls.level}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>{paymentCount} payments</span>
                            </div>
                            <div className="stat total">
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>${totalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* By Teachers Tab - Show Teachers */}
            {activeTab === 'teachers' && (
              <div className="folder-section">
                <div className="folder-grid">
                  {loadingData ? (
                    <div className="loading-text">Loading teachers...</div>
                  ) : teachers.length === 0 ? (
                    <div className="empty-text">No teachers found</div>
                  ) : (
                    teachers.map((teacher) => {
                      const teacherId = teacher.teacher_id || teacher.id || 0;
                      return (
                        <div
                          key={teacherId}
                          className="folder-card teacher-folder"
                          onClick={() => handleFolderClick('teacher', teacherId, `${teacher.first_name} ${teacher.last_name}`)}
                        >
                          <div className="folder-icon">
                            <Folder className="h-9 w-9" />
                          </div>
                          <div className="folder-info">
                            <h3>{teacher.first_name} {teacher.last_name}</h3>
                            <span className="folder-code">{teacher.employee_id}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <Users className="h-3.5 w-3.5" />
                              <span>{getStudentIdsForTeacher(teacherId).length} students</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      ) : selectedFolder.type === 'teacher' ? (
        // TEACHER STUDENTS VIEW
        <>
          {/* Back Button */}
          <div className="folder-section">
            <button className="btn-back" onClick={handleBackToFolders} style={{ marginBottom: '20px' }}>
              <ArrowLeft className="h-5 w-5" /> Back to Teachers
            </button>

            <div className="folder-grid">
              {loadingData ? (
                <div className="loading-text">Loading students...</div>
              ) : (
                (() => {
                  const teacherStudentIds = getStudentIdsForTeacher(selectedFolder.id);
                  const teacherStudents = students.filter((s) => teacherStudentIds.includes(s.student_id || s.id || 0));
                  
                  return teacherStudents.length === 0 ? (
                    <div className="empty-text">No students found for this teacher</div>
                  ) : (
                    teacherStudents.map((student) => {
                      const studentId = student.student_id || student.id || 0;
                      const paymentCount = getPaymentCountForStudent(studentId);
                      const totalAmount = getTotalAmountForStudent(studentId);
                      return (
                        <div
                          key={studentId}
                          className="folder-card student-folder"
                          onClick={() => handleFolderClick('student', studentId, `${student.first_name} ${student.last_name}`)}
                        >
                          <div className="folder-icon">
                            <Folder className="h-9 w-9" />
                          </div>
                          <div className="folder-info">
                            <h3>{student.first_name} {student.last_name}</h3>
                            <span className="folder-code">ID: {studentId}</span>
                          </div>
                          <div className="folder-stats">
                            <div className="stat">
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>{paymentCount} payments</span>
                            </div>
                            <div className="stat total">
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>${totalAmount.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  );
                })()
              )}
            </div>
          </div>
        </>
      ) : (
        // PAYMENT LIST VIEW
        <>
          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by student, receipt, reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {(filterStatus ? 1 : 0) + (filterMethod ? 1 : 0)}
                </span>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" /> Clear All
              </Button>
            )}

            <div className="text-sm text-muted-foreground flex items-center gap-4">
              <span>{displayedPayments.length} payments</span>
              <span className="font-semibold">Total: ${totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label>Payment Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Statuses</SelectItem>
                    {paymentStatusOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={filterMethod} onValueChange={setFilterMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Methods</SelectItem>
                    {paymentMethodOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Payments Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">Loading...</TableCell>
                  </TableRow>
                ) : displayedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                      {hasActiveFilters ? 'No payments match your criteria' : 'No payments found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedPayments.map((payment) => (
                    <TableRow key={payment.payment_id || payment.id}>
                      <TableCell className="font-mono">{payment.receipt_number}</TableCell>
                      <TableCell>{getStudentName(payment.student_id)}</TableCell>
                      <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">{payment.currency}</span>
                          <span className="font-medium">{payment.amount.toLocaleString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {payment.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.payment_type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-semibold border">
                          {payment.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenModal(payment)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(payment.payment_id || payment.id || 0)}>
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
        </>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Payment' : 'Add New Payment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Student"
                name="student_id"
                value={formData.student_id || ''}
                onChange={(value) => setFormData({ ...formData, student_id: Number(value) })}
                options={studentOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a student"
              />
              <SelectField
                label="Center"
                name="center_id"
                value={formData.center_id || ''}
                onChange={(value) => setFormData({ ...formData, center_id: Number(value) })}
                options={centerOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a center"
              />
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_date">Payment Date *</Label>
                  <Input
                    type="date"
                    id="payment_date"
                    required
                    value={formData.payment_date || ''}
                    onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    type="number"
                    id="amount"
                    required
                    step="0.01"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency || 'USD'} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select required value={formData.payment_method || ''} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethodOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transaction_reference">Transaction Reference *</Label>
                  <Input
                    type="text"
                    id="transaction_reference"
                    required
                    value={formData.transaction_reference || ''}
                    onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt_number">Receipt Number *</Label>
                  <Input
                    type="text"
                    id="receipt_number"
                    required
                    value={formData.receipt_number || ''}
                    onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payment_status">Payment Status *</Label>
                  <Select required value={formData.payment_status || 'Completed'} onValueChange={(value) => setFormData({ ...formData, payment_status: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentStatusOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_type">Payment Type *</Label>
                  <Select required value={formData.payment_type || 'Tuition'} onValueChange={(value) => setFormData({ ...formData, payment_type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTypeOptions.map((opt) => (
                        <SelectItem key={opt.id} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional notes..."
                />
              </div>
            </form>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={state.loading} form="payment-form">
                {state.loading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </div>
  );
};

export default PaymentsPage;
