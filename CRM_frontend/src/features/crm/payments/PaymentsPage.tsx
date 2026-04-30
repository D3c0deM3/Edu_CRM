import { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, X, ArrowLeft, Search, Filter, User, BookOpen, Plus, CreditCard, Users, Loader2, ChevronLeft, ChevronRight, Zap, SlidersHorizontal, Bell, Save } from 'lucide-react';
import { useCRUD } from '../hooks/useCRUD';
import { paymentAPI, teacherAPI, classAPI, studentAPI, centerAPI } from '../../../shared/api/api';
import { SelectField } from '../students/components/SelectField';
import { fetchStudents, paymentMethodOptions, paymentStatusOptions, paymentTypeOptions } from '../../../utils/dropdownOptions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useAppSelector } from '../hooks';
import type { RootState } from '../../../store';
import { formatCurrency } from '../../../utils/helpers';

interface Payment {
  payment_id?: number;
  id?: number;
  student_id: number;
  center_id: number;
  class_id?: number;
  payment_date: string;
  amount: number | string;
  currency: string;
  payment_method: string;
  payment_type: string;
  payment_status?: string;
  status?: string;
  receipt_number: string;
  transaction_reference?: string;
  reference_number?: string;
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
  level: string | number;
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

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function generateReceiptNumber() {
  return `RCP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random()*1000).toString().padStart(3,'0')}`;
}

const PaymentsPage = () => {
  const { user } = useAppSelector((state: RootState) => state.auth);
  const [state, actions] = useCRUD<Payment>(paymentAPI, 'Payment');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [selectedFolder, setSelectedFolder] = useState<{ type: FolderType; id: number; name: string } | null>(null);

  // Quick-pay state
  const now = new Date();
  const [quickYear, setQuickYear] = useState(now.getFullYear());
  const [quickMonth, setQuickMonth] = useState(now.getMonth()); // 0-indexed
  const [quickAmount, setQuickAmount] = useState('');
  const [quickMethod, setQuickMethod] = useState('Cash');
  const [quickType, setQuickType] = useState('Tuition');
  const [quickClassId, setQuickClassId] = useState<number | ''>('');
  const [quickNotes, setQuickNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  // Full modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Payment>>({
    currency: 'UZS',
    payment_method: 'Cash',
    payment_type: 'Tuition',
    payment_status: 'Completed',
  });
  const [studentOptions, setStudentOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Card grid search
  const [cardSearch, setCardSearch] = useState('');

  // Search and Filter (payment table)
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Quick pay student selector (for class/teacher folder views)
  const [quickStudentId, setQuickStudentId] = useState<number | ''>('');
  const [reminderDays, setReminderDays] = useState(3);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [reminderLoading, setReminderLoading] = useState(false);

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
      const arr = (r: any) => Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : [];
      setTeachers(arr(teachersRes));
      setClasses(arr(classesRes));
      setStudents(arr(studentsRes));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const loadReminderSettings = async () => {
    if (!user?.center_id) {
      return;
    }

    setReminderLoading(true);
    try {
      const response = await centerAPI.getById(user.center_id);
      const center = response.data || response;
      setReminderDays(Number(center.parent_payment_warning_days ?? 3));
    } catch (error) {
      console.error('Error loading payment reminder settings:', error);
    } finally {
      setReminderLoading(false);
    }
  };

  useEffect(() => {
    loadReminderSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.center_id]);

  const saveReminderSettings = async () => {
    if (!user?.center_id) {
      return;
    }

    setReminderSaving(true);
    try {
      await centerAPI.update(user.center_id, {
        parent_payment_warning_days: Math.max(0, Number(reminderDays) || 0),
      });
    } catch (error) {
      console.error('Error saving payment reminder settings:', error);
    } finally {
      setReminderSaving(false);
    }
  };

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const studs = await fetchStudents();
      setStudentOptions(studs);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  // ── Quick Pay ──
  const handleQuickPay = async () => {
    if (!quickAmount || !selectedFolder) return;
    setQuickSubmitting(true);
    try {
      const payDate = new Date(quickYear, quickMonth, 1).toISOString().split('T')[0];
      const studentId = selectedFolder.type === 'student' ? selectedFolder.id : Number(quickStudentId);
      await actions.create({
        student_id: studentId,
        center_id: user?.center_id || 1,
        class_id: quickClassId || undefined,
        payment_date: payDate,
        amount: Number(quickAmount),
        currency: 'UZS',
        payment_method: quickMethod,
        payment_type: quickType,
        payment_status: 'Completed',
        receipt_number: generateReceiptNumber(),
        notes: quickNotes || undefined,
      });
      setQuickAmount('');
      setQuickNotes('');
      if (selectedFolder.type !== 'student') setQuickStudentId('');
    } finally {
      setQuickSubmitting(false);
    }
  };

  const prevMonth = () => {
    if (quickMonth === 0) { setQuickMonth(11); setQuickYear(y => y - 1); }
    else setQuickMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (quickMonth === 11) { setQuickMonth(0); setQuickYear(y => y + 1); }
    else setQuickMonth(m => m + 1);
  };
  const isCurrentMonth = quickYear === now.getFullYear() && quickMonth === now.getMonth();

  // ── Full modal ──
  const handleOpenModal = (payment?: Payment) => {
    if (payment) {
      setEditingId(payment.payment_id || payment.id || null);
      setFormData(payment);
    } else {
      setEditingId(null);
      setFormData({
        student_id: selectedFolder?.type === 'student' ? selectedFolder.id : undefined,
        center_id: user?.center_id || 1,
        currency: 'UZS',
        payment_method: 'Cash',
        payment_type: 'Tuition',
        payment_status: 'Completed',
        payment_date: new Date().toISOString().split('T')[0],
        receipt_number: generateReceiptNumber(),
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ currency: 'UZS', payment_method: 'Cash', payment_type: 'Tuition', payment_status: 'Completed' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await actions.update(editingId, formData);
    } else {
      await actions.create({ ...formData, receipt_number: formData.receipt_number || generateReceiptNumber() });
    }
    handleCloseModal();
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      await actions.delete(id);
    }
  };

  const getStudentIdsForTeacher = (teacherId: number) =>
    students.filter((s) => s.teacher_id === teacherId).map((s) => s.student_id || s.id || 0);
  const getStudentIdsForClass = (classId: number) =>
    students.filter((s) => s.class_id === classId).map((s) => s.student_id || s.id || 0);

  const getPaymentCountForTeacher = (tid: number) => {
    const ids = getStudentIdsForTeacher(tid);
    return state.items.filter((p) => ids.includes(p.student_id)).length;
  };
  const getPaymentCountForClass = (cid: number) => {
    const ids = getStudentIdsForClass(cid);
    return state.items.filter((p) => ids.includes(p.student_id)).length;
  };
  const getTotalAmountForClass = (cid: number) => {
    const ids = getStudentIdsForClass(cid);
    return state.items.filter((p) => ids.includes(p.student_id) && (p.payment_status || p.status) === 'Completed').reduce((s, p) => s + Number(p.amount || 0), 0);
  };
  const getPaymentCountForStudent = (sid: number) => state.items.filter((p) => p.student_id === sid).length;
  const getTotalAmountForStudent = (sid: number) =>
    state.items.filter((p) => p.student_id === sid && (p.payment_status || p.status) === 'Completed').reduce((s, p) => s + Number(p.amount || 0), 0);

  const getFilteredPayments = (): Payment[] => {
    if (!selectedFolder) return state.items;
    let studentIds: number[] = [];
    if (selectedFolder.type === 'teacher') studentIds = getStudentIdsForTeacher(selectedFolder.id);
    else if (selectedFolder.type === 'class') studentIds = getStudentIdsForClass(selectedFolder.id);
    else studentIds = [selectedFolder.id];
    return state.items.filter((p) => studentIds.includes(p.student_id));
  };

  const displayedPayments = useMemo(() => {
    let payments = getFilteredPayments();
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      payments = payments.filter((p) => {
        const student = students.find((s) => (s.student_id || s.id) === p.student_id);
        const name = student ? `${student.first_name} ${student.last_name}`.toLowerCase() : '';
        return name.includes(search) || (p.receipt_number || '').toLowerCase().includes(search);
      });
    }
    if (filterStatus !== 'all') payments = payments.filter((p) => (p.payment_status || p.status) === filterStatus);
    if (filterMethod !== 'all') payments = payments.filter((p) => p.payment_method === filterMethod);
    return payments;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterStatus, filterMethod, selectedFolder, state.items, students]);

  const hasActiveFilters = filterStatus !== 'all' || filterMethod !== 'all' || !!searchTerm;
  const totalAmount = displayedPayments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const clearFilters = () => { setSearchTerm(''); setFilterStatus('all'); setFilterMethod('all'); };

  // Returns classes a specific student is enrolled in
  const getClassesForStudent = (studentId: number) => {
    const s = students.find((s) => (s.student_id || s.id) === studentId);
    if (!s?.class_id) return [];
    return classes.filter((c) => (c.class_id || c.id) === s.class_id);
  };

  // Class options filtered to a specific student
  const getClassOptionsForStudent = (studentId: number) => {
    return getClassesForStudent(studentId).map((c) => ({
      id: c.class_id || c.id,
      label: c.class_name,
      value: c.class_id || c.id || 0,
    }));
  };

  // Students belonging to the current folder (class or teacher)
  const getFolderStudents = () => {
    if (!selectedFolder) return [];
    if (selectedFolder.type === 'class') return students.filter((s) => s.class_id === selectedFolder.id);
    if (selectedFolder.type === 'teacher') return students.filter((s) => s.teacher_id === selectedFolder.id);
    return [];
  };

  const handleFolderClick = (type: FolderType, id: number, name: string) => {
    setSelectedFolder({ type, id, name });
    setQuickStudentId('');
    clearFilters();
    if (type === 'class') {
      setQuickClassId(id);
    } else if (type === 'student') {
      const s = students.find((s) => (s.student_id || s.id) === id);
      setQuickClassId(s?.class_id || '');
    } else {
      setQuickClassId('');
    }
  };
  const handleBackToFolders = () => { setSelectedFolder(null); clearFilters(); setCardSearch(''); };

  const getStudentName = (studentId: number) => {
    const s = students.find((s) => (s.student_id || s.id) === studentId);
    return s ? `${s.first_name} ${s.last_name}` : 'Unknown Student';
  };

  const getStatusBadgeClasses = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          {selectedFolder && (
            <Button variant="outline" size="sm" onClick={handleBackToFolders}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}
          <h1 className="text-2xl font-bold">
            {selectedFolder ? `${selectedFolder.name} — Payments` : 'Payments Management'}
          </h1>
        </div>
        <Button variant="outline" onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Full Form
        </Button>
      </div>

      {state.error && <Alert className="mb-4"><AlertDescription>{state.error}</AlertDescription></Alert>}

      <Card className="mb-6 border-amber-200 bg-amber-50/60">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Parent payment bot reminders</h2>
              <p className="text-sm text-muted-foreground">
                Telegram reminders are sent this many days before each monthly payment date.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto">
            <Label htmlFor="payment-reminder-days" className="sr-only">Reminder days</Label>
            <Input
              id="payment-reminder-days"
              type="number"
              min={0}
              className="w-full sm:w-28"
              disabled={reminderLoading}
              value={reminderDays}
              onChange={(event) => setReminderDays(Number(event.target.value))}
            />
            <Button onClick={saveReminderSettings} disabled={reminderSaving || reminderLoading} className="w-full sm:w-auto">
              {reminderSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {!selectedFolder ? (
        <>
          {/* Tab Navigation */}
          <div className="mb-6 overflow-x-auto border-b border-border [-webkit-overflow-scrolling:touch]">
            <div className="flex min-w-max space-x-1">
              {([['students', <Users className="h-4 w-4" />, 'By Students'], ['classes', <BookOpen className="h-4 w-4" />, 'By Classes'], ['teachers', <User className="h-4 w-4" />, 'By Teachers']] as const).map(([tab, icon, label]) => (
                <Button key={tab} variant={activeTab === tab ? 'default' : 'ghost'} onClick={() => setActiveTab(tab)} className="gap-2 rounded-b-none">
                  {icon}{label}
                </Button>
              ))}
            </div>
          </div>

          {/* Card search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'students' ? 'Search students...' : activeTab === 'classes' ? 'Search classes...' : 'Search teachers...'}
              value={cardSearch}
              onChange={(e) => setCardSearch(e.target.value)}
              className="pl-10"
            />
            {cardSearch && <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setCardSearch('')}><X className="h-4 w-4" /></Button>}
          </div>

          {loadingData ? (
            <div className="text-center py-16"><Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" /><p className="text-muted-foreground">Loading...</p></div>
          ) : (() => {
            const cs = cardSearch.toLowerCase();
            const filteredStudents = students.filter((s) => !cs || `${s.first_name} ${s.last_name}`.toLowerCase().includes(cs));
            const filteredClasses = classes.filter((c) => !cs || c.class_name.toLowerCase().includes(cs) || c.class_code.toLowerCase().includes(cs));
            const filteredTeachers = teachers.filter((t) => !cs || `${t.first_name} ${t.last_name}`.toLowerCase().includes(cs) || t.employee_id.toLowerCase().includes(cs));
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeTab === 'students' && (filteredStudents.length === 0 ? (
                  <p className="col-span-full text-center py-8 text-muted-foreground">No students found</p>
                ) : filteredStudents.map((student) => {
                  const sid = student.student_id || student.id || 0;
                  return (
                    <Card key={sid} className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all" onClick={() => handleFolderClick('student', sid, `${student.first_name} ${student.last_name}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {student.first_name[0]}{student.last_name[0]}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">{student.first_name} {student.last_name}</h3>
                            <p className="text-xs text-muted-foreground">ID: {sid}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground"><CreditCard className="h-3 w-3" />{getPaymentCountForStudent(sid)} payments</div>
                          <div className="text-sm font-bold text-primary">${getTotalAmountForStudent(sid).toLocaleString()}</div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }))}
                {activeTab === 'classes' && (filteredClasses.length === 0 ? (
                  <p className="col-span-full text-center py-8 text-muted-foreground">No classes found</p>
                ) : filteredClasses.map((cls) => {
                  const cid = cls.class_id || cls.id || 0;
                  return (
                    <Card key={cid} className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all" onClick={() => handleFolderClick('class', cid, cls.class_name)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center"><BookOpen className="h-5 w-5 text-blue-500" /></div>
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">{cls.class_name}</h3>
                            <p className="text-xs text-muted-foreground">{cls.class_code} · Level {cls.level}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground"><CreditCard className="h-3 w-3" />{getPaymentCountForClass(cid)} payments</div>
                          <div className="text-sm font-bold text-primary">${getTotalAmountForClass(cid).toLocaleString()}</div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }))}
                {activeTab === 'teachers' && (filteredTeachers.length === 0 ? (
                  <p className="col-span-full text-center py-8 text-muted-foreground">No teachers found</p>
                ) : filteredTeachers.map((teacher) => {
                  const tid = teacher.teacher_id || teacher.id || 0;
                  return (
                    <Card key={tid} className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all" onClick={() => handleFolderClick('teacher', tid, `${teacher.first_name} ${teacher.last_name}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-sm font-bold text-purple-600">
                            {teacher.first_name[0]}{teacher.last_name[0]}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">{teacher.first_name} {teacher.last_name}</h3>
                            <p className="text-xs text-muted-foreground">{teacher.employee_id}</p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" />{getStudentIdsForTeacher(tid).length} students</div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground"><CreditCard className="h-3 w-3" />{getPaymentCountForTeacher(tid)} payments</div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                }))}
              </div>
            );
          })()}
        </>
      ) : (
        <>
          {/* ══ QUICK PAY PANEL ══ */}
          {(() => {
            const folderStudents = getFolderStudents();
            const isMulti = selectedFolder.type !== 'student';
            // For multi-folder: resolve student id from quickStudentId; for student folder: use folder id
            const resolvedStudentId = isMulti ? (quickStudentId || 0) : selectedFolder.id;
            const studentClassOptions = resolvedStudentId ? getClassOptionsForStudent(resolvedStudentId) : [];
            return (
              <Card className="mb-6 border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" /> Quick Pay — {selectedFolder.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Month selector */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                    <div className="flex-1 text-center">
                      <p className="font-semibold text-sm">{MONTH_NAMES[quickMonth]} {quickYear}</p>
                      {isCurrentMonth && <Badge variant="outline" className="text-[10px] border-primary text-primary mt-0.5">Current Month</Badge>}
                    </div>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
                    {!isCurrentMonth && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setQuickMonth(now.getMonth()); setQuickYear(now.getFullYear()); }}>
                        Today
                      </Button>
                    )}
                  </div>

                  {/* Quick month shortcuts */}
                  <div className="flex gap-1.5 flex-wrap">
                    {[-2, -1, 0, 1].map((offset) => {
                      const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
                      const m = d.getMonth(); const y = d.getFullYear();
                      const active = m === quickMonth && y === quickYear;
                      return (
                        <button key={offset} onClick={() => { setQuickMonth(m); setQuickYear(y); }}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${active ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary/50 hover:bg-muted'}`}>
                          {offset === 0 ? 'This Month' : offset === -1 ? 'Last Month' : MONTH_NAMES[m].slice(0, 3) + ' ' + (y !== now.getFullYear() ? y : '')}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick pay fields */}
                  <div className={`grid grid-cols-1 gap-3 ${isMulti ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
                    {/* Student picker — only for class/teacher folders */}
                    {isMulti && (
                      <div className="space-y-1">
                        <Label className="text-xs">Student *</Label>
                        <Select value={String(quickStudentId)} onValueChange={(v) => {
                          const sid = v === 'none' ? '' : Number(v);
                          setQuickStudentId(sid);
                          // auto-set class to student's class
                          if (sid) {
                            const s = students.find((s) => (s.student_id || s.id) === sid);
                            setQuickClassId(s?.class_id || '');
                          } else {
                            setQuickClassId('');
                          }
                        }}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="Select student" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— select student —</SelectItem>
                            {folderStudents.map((s) => {
                              const sid = s.student_id || s.id || 0;
                              return <SelectItem key={sid} value={String(sid)}>{s.first_name} {s.last_name}</SelectItem>;
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label className="text-xs">Amount *</Label>
                      <div className="relative">
                        <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          type="number" min="0" step="0.01" placeholder="0.00"
                          value={quickAmount}
                          onChange={(e) => setQuickAmount(e.target.value)}
                          className="pl-7"
                          onKeyDown={(e) => e.key === 'Enter' && handleQuickPay()}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Class</Label>
                      <Select
                        value={String(quickClassId)}
                        onValueChange={(v) => setQuickClassId(v === 'none' ? '' : Number(v))}
                        disabled={!resolvedStudentId || studentClassOptions.length === 0}
                      >
                        <SelectTrigger className="h-9"><SelectValue placeholder={resolvedStudentId ? (studentClassOptions.length === 0 ? 'No class' : '— none —') : 'Select student first'} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— none —</SelectItem>
                          {studentClassOptions.map((o) => <SelectItem key={o.id} value={String(o.value)}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Method</Label>
                      <Select value={quickMethod} onValueChange={setQuickMethod}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {paymentMethodOptions.map((o) => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={quickType} onValueChange={setQuickType}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {paymentTypeOptions.map((o) => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Advanced (notes) toggle */}
                  <div>
                    <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowAdvanced(v => !v)}>
                      <SlidersHorizontal className="h-3 w-3" />{showAdvanced ? 'Hide' : 'Show'} advanced options
                    </button>
                    {showAdvanced && (
                      <div className="mt-2">
                        <Label className="text-xs">Notes</Label>
                        <Input placeholder="Optional note..." value={quickNotes} onChange={(e) => setQuickNotes(e.target.value)} className="mt-1" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                    <Button
                      onClick={() => {
                        if (isMulti && !quickStudentId) return;
                        handleQuickPay();
                      }}
                      disabled={!quickAmount || quickSubmitting || (isMulti && !quickStudentId)}
                      className="w-full gap-2 sm:w-auto"
                    >
                      {quickSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      Record Payment
                    </Button>
                    <p className="text-xs text-muted-foreground">Receipt auto-generated. Use <strong>Full Form</strong> for custom receipts.</p>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* ══ PAYMENT HISTORY TABLE ══ */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or receipt..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              {searchTerm && <Button variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={() => setSearchTerm('')}><X className="h-4 w-4" /></Button>}
            </div>
            <Button variant={showFilters ? 'default' : 'outline'} onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            {hasActiveFilters && <Button variant="outline" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" />Clear</Button>}
            <div className="text-sm text-muted-foreground flex items-center gap-3">
              <span>{displayedPayments.length} records</span>
              <span className="font-semibold text-foreground">{formatCurrency(totalAmount, 'UZS')}</span>
            </div>
          </div>

          {showFilters && (
            <div className="mb-4 grid grid-cols-1 gap-3 rounded-lg bg-muted/50 p-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {paymentStatusOptions.map((o) => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Method</Label>
                <Select value={filterMethod} onValueChange={setFilterMethod}>
                  <SelectTrigger><SelectValue placeholder="All Methods" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {paymentMethodOptions.map((o) => <SelectItem key={o.id} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  {selectedFolder.type !== 'student' && <TableHead>Student</TableHead>}
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>
                ) : displayedPayments.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {hasActiveFilters ? 'No payments match your filters' : 'No payments yet — use Quick Pay above to add one.'}
                  </TableCell></TableRow>
                ) : displayedPayments.map((payment) => (
                  <TableRow key={payment.payment_id || payment.id}>
                    <TableCell className="font-mono text-xs">{payment.receipt_number}</TableCell>
                    {selectedFolder.type !== 'student' && <TableCell>{getStudentName(payment.student_id)}</TableCell>}
                    <TableCell>{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '—'}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(Number(payment.amount || 0), 'UZS')}</TableCell>
                    <TableCell>{payment.payment_method}</TableCell>
                    <TableCell>{payment.payment_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeClasses(payment.payment_status || payment.status || '')}>
                        {payment.payment_status || payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenModal(payment)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(payment.payment_id || payment.id || 0)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Full Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label="Student *" name="student_id" value={formData.student_id || ''} onChange={(v) => {
                const sid = Number(v);
                const s = students.find((s) => (s.student_id || s.id) === sid);
                setFormData({ ...formData, student_id: sid, class_id: s?.class_id || undefined });
              }} options={studentOptions} isLoading={isLoadingOptions} required placeholder="Select student" />
              <SelectField
                label="Class"
                name="class_id"
                value={formData.class_id || ''}
                onChange={(v) => setFormData({ ...formData, class_id: v ? Number(v) : undefined })}
                options={formData.student_id ? getClassOptionsForStudent(formData.student_id) : []}
                isLoading={isLoadingOptions}
                placeholder={formData.student_id ? (getClassOptionsForStudent(formData.student_id).length === 0 ? 'No class enrolled' : 'Select class') : 'Select student first'}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" required value={formData.payment_date || ''} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Amount *</Label>
                <div className="relative"><CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input type="number" required step="0.01" min="0" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })} className="pl-7" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label="Method *" name="payment_method" value={formData.payment_method || ''} onChange={(v) => setFormData({ ...formData, payment_method: v })} options={paymentMethodOptions} required placeholder="Select method" />
              <SelectField label="Type *" name="payment_type" value={formData.payment_type || ''} onChange={(v) => setFormData({ ...formData, payment_type: v })} options={paymentTypeOptions} required placeholder="Select type" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label="Status *" name="payment_status" value={formData.payment_status || ''} onChange={(v) => setFormData({ ...formData, payment_status: v })} options={paymentStatusOptions} required placeholder="Select status" />
              <div className="space-y-1.5">
                <Label>Receipt Number *</Label>
                <Input required value={formData.receipt_number || ''} onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reference Number</Label>
              <Input value={formData.transaction_reference || ''} onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional notes..." rows={2} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button type="submit" disabled={state.loading}>{state.loading ? 'Saving...' : 'Save Payment'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsPage;
