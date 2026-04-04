import { useEffect, useMemo, useState } from 'react';
import {
  HandCoins,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Wallet,
  CircleDollarSign,
  BookOpen,
  BadgeDollarSign,
} from 'lucide-react';
import { teacherSalaryAPI, teacherAPI, classAPI } from '../../../shared/api/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Teacher {
  teacher_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  status: string;
}

interface ClassInfo {
  class_id: number;
  class_name: string;
  class_code: string;
  teacher_id?: number | null;
}

interface SalaryRate {
  rate_id: number;
  teacher_id: number;
  class_id: number;
  monthly_salary_amount: number | string;
  effective_from?: string | null;
  notes?: string | null;
  teacher_name?: string;
  employee_id?: string;
  class_name?: string;
  class_code?: string;
  assignment_active?: boolean;
}

interface SalaryPayment {
  salary_payment_id: number;
  teacher_id: number;
  salary_year: number;
  salary_month: number;
  amount_paid: number | string;
  payment_date: string;
  payment_method?: string | null;
  notes?: string | null;
  teacher_name?: string;
  employee_id?: string;
}

interface OverviewTeacherRow {
  teacher_id: number;
  teacher_name: string;
  employee_id: string;
  status: string;
  assigned_classes_count: number;
  configured_rates_count: number;
  expected_salary: number;
  total_paid: number;
  outstanding_balance: number;
  class_breakdown: Array<{
    rate_id: number;
    class_id: number;
    class_name: string;
    class_code: string;
    monthly_salary_amount: number;
    effective_from?: string | null;
  }>;
}

interface SalaryOverviewResponse {
  period: {
    month: number;
    year: number;
  };
  summary: {
    total_expected_salary: number;
    total_paid_salary: number;
    total_outstanding_salary: number;
    teachers_with_balance_due: number;
  };
  teachers: OverviewTeacherRow[];
}

interface RateFormState {
  teacher_id: string;
  class_id: string;
  monthly_salary_amount: string;
  effective_from: string;
  notes: string;
}

interface PaymentFormState {
  teacher_id: string;
  salary_year: string;
  salary_month: string;
  amount_paid: string;
  payment_date: string;
  payment_method: string;
  notes: string;
}

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const PAYMENT_METHOD_OPTIONS = ['Cash', 'Bank Transfer', 'Card', 'Other'];

const todayIso = () => new Date().toISOString().split('T')[0];

const formatMoney = (value: number | string | null | undefined): string => {
  const numericValue = Number(value || 0);
  return `$${numericValue.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const TeacherSalariesPage = () => {
  const now = new Date();

  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [overview, setOverview] = useState<SalaryOverviewResponse | null>(null);
  const [rates, setRates] = useState<SalaryRate[]>([]);
  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isRateModalOpen, setIsRateModalOpen] = useState(false);
  const [editingRateId, setEditingRateId] = useState<number | null>(null);
  const [rateForm, setRateForm] = useState<RateFormState>({
    teacher_id: '',
    class_id: '',
    monthly_salary_amount: '',
    effective_from: todayIso(),
    notes: '',
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
    teacher_id: '',
    salary_year: String(now.getFullYear()),
    salary_month: String(now.getMonth() + 1),
    amount_paid: '',
    payment_date: todayIso(),
    payment_method: 'Cash',
    notes: '',
  });

  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let year = now.getFullYear() - 2; year <= now.getFullYear() + 2; year += 1) {
      years.push(year);
    }
    return years;
  }, [now]);

  const assignedClassesForSelectedTeacher = useMemo(() => {
    const selectedTeacherId = Number(rateForm.teacher_id);
    if (!selectedTeacherId) {
      return [];
    }

    return classes.filter(
      (classItem) =>
        Number(classItem.teacher_id) === selectedTeacherId ||
        Number(classItem.class_id) === Number(rateForm.class_id)
    );
  }, [classes, rateForm.teacher_id, rateForm.class_id]);

  const loadSalaryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewRes, ratesRes, paymentsRes, teachersRes, classesRes] = await Promise.all([
        teacherSalaryAPI.getOverview({ month: selectedMonth, year: selectedYear }),
        teacherSalaryAPI.getRates(),
        teacherSalaryAPI.getPayments({ month: selectedMonth, year: selectedYear }),
        teacherAPI.getAll(),
        classAPI.getAll(),
      ]);

      setOverview(overviewRes.data);
      setRates(Array.isArray(ratesRes.data) ? ratesRes.data : []);
      setPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : []);
      setTeachers(Array.isArray(teachersRes.data) ? teachersRes.data : []);
      setClasses(Array.isArray(classesRes.data) ? classesRes.data : []);
    } catch (loadError: any) {
      console.error('Error loading teacher salary data:', loadError);
      setError(loadError?.response?.data?.error || 'Failed to load teacher salary data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSalaryData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  const resetRateForm = () => {
    setEditingRateId(null);
    setRateForm({
      teacher_id: '',
      class_id: '',
      monthly_salary_amount: '',
      effective_from: todayIso(),
      notes: '',
    });
  };

  const resetPaymentForm = () => {
    setEditingPaymentId(null);
    setPaymentForm({
      teacher_id: '',
      salary_year: String(selectedYear),
      salary_month: String(selectedMonth),
      amount_paid: '',
      payment_date: todayIso(),
      payment_method: 'Cash',
      notes: '',
    });
  };

  const openRateModal = (rate?: SalaryRate) => {
    if (rate) {
      setEditingRateId(rate.rate_id);
      setRateForm({
        teacher_id: String(rate.teacher_id),
        class_id: String(rate.class_id),
        monthly_salary_amount: String(rate.monthly_salary_amount),
        effective_from: rate.effective_from?.split('T')[0] || todayIso(),
        notes: rate.notes || '',
      });
    } else {
      resetRateForm();
    }
    setIsRateModalOpen(true);
  };

  const openPaymentModal = (payment?: SalaryPayment) => {
    if (payment) {
      setEditingPaymentId(payment.salary_payment_id);
      setPaymentForm({
        teacher_id: String(payment.teacher_id),
        salary_year: String(payment.salary_year),
        salary_month: String(payment.salary_month),
        amount_paid: String(payment.amount_paid),
        payment_date: payment.payment_date?.split('T')[0] || todayIso(),
        payment_method: payment.payment_method || 'Cash',
        notes: payment.notes || '',
      });
    } else {
      resetPaymentForm();
    }
    setIsPaymentModalOpen(true);
  };

  const handleRateSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        teacher_id: Number(rateForm.teacher_id),
        class_id: Number(rateForm.class_id),
        monthly_salary_amount: Number(rateForm.monthly_salary_amount),
        effective_from: rateForm.effective_from || undefined,
        notes: rateForm.notes || undefined,
      };

      if (editingRateId) {
        await teacherSalaryAPI.updateRate(editingRateId, payload);
      } else {
        await teacherSalaryAPI.createRate(payload);
      }

      setIsRateModalOpen(false);
      resetRateForm();
      await loadSalaryData();
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        teacher_id: Number(paymentForm.teacher_id),
        salary_year: Number(paymentForm.salary_year),
        salary_month: Number(paymentForm.salary_month),
        amount_paid: Number(paymentForm.amount_paid),
        payment_date: paymentForm.payment_date || undefined,
        payment_method: paymentForm.payment_method || undefined,
        notes: paymentForm.notes || undefined,
      };

      if (editingPaymentId) {
        await teacherSalaryAPI.updatePayment(editingPaymentId, payload);
      } else {
        await teacherSalaryAPI.createPayment(payload);
      }

      setIsPaymentModalOpen(false);
      resetPaymentForm();
      await loadSalaryData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRate = async (rateId: number) => {
    if (!window.confirm('Delete this class salary rate?')) {
      return;
    }

    await teacherSalaryAPI.deleteRate(rateId);
    await loadSalaryData();
  };

  const handleDeletePayment = async (salaryPaymentId: number) => {
    if (!window.confirm('Delete this teacher salary payment record?')) {
      return;
    }

    await teacherSalaryAPI.deletePayment(salaryPaymentId);
    await loadSalaryData();
  };

  const selectedMonthLabel =
    MONTH_OPTIONS.find((option) => option.value === selectedMonth)?.label || 'Current Month';

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Teacher Salaries</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Configure how much each assigned class pays a teacher every month, then record salary
            payouts and watch outstanding balances for {selectedMonthLabel} {selectedYear}.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="salary-month" className="text-xs text-muted-foreground">Month</Label>
            <select
              id="salary-month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(Number(event.target.value))}
              className="mt-1 flex h-10 w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="salary-year" className="text-xs text-muted-foreground">Year</Label>
            <select
              id="salary-year"
              value={selectedYear}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
              className="mt-1 flex h-10 w-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <Button
            variant="outline"
            onClick={() => void loadSalaryData()}
            className="h-10"
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="rounded-2xl bg-indigo-500/10 p-3 text-indigo-500">
                  <Wallet className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Expected Salary</p>
                  <p className="text-2xl font-bold">{formatMoney(overview?.summary.total_expected_salary)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-500">
                  <CircleDollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid This Month</p>
                  <p className="text-2xl font-bold">{formatMoney(overview?.summary.total_paid_salary)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-500">
                  <BadgeDollarSign className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding Salary</p>
                  <p className="text-2xl font-bold">{formatMoney(overview?.summary.total_outstanding_salary)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="rounded-2xl bg-blue-500/10 p-3 text-blue-500">
                  <HandCoins className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Teachers With Balance Due</p>
                  <p className="text-2xl font-bold">{overview?.summary.teachers_with_balance_due || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle>Salary Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {overview?.teachers?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead>Assigned Classes</TableHead>
                      <TableHead>Configured Rates</TableHead>
                      <TableHead>Expected Salary</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.teachers.map((teacherRow) => (
                      <TableRow key={teacherRow.teacher_id}>
                        <TableCell>
                          <div className="font-medium">{teacherRow.teacher_name}</div>
                          <div className="text-xs text-muted-foreground">{teacherRow.employee_id}</div>
                        </TableCell>
                        <TableCell>{teacherRow.assigned_classes_count}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{teacherRow.configured_rates_count}</div>
                            {teacherRow.class_breakdown.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {teacherRow.class_breakdown.map((classItem) => (
                                  <Badge key={classItem.rate_id} variant="outline">
                                    {classItem.class_name}: {formatMoney(classItem.monthly_salary_amount)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatMoney(teacherRow.expected_salary)}</TableCell>
                        <TableCell>{formatMoney(teacherRow.total_paid)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              teacherRow.outstanding_balance > 0
                                ? 'border-amber-300 bg-amber-50 text-amber-700'
                                : 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            }
                          >
                            {formatMoney(teacherRow.outstanding_balance)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  No teacher salary overview data yet.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Class Salary Rates</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Set the monthly salary a teacher earns from each class assigned to them.
                  </p>
                </div>
                <Button onClick={() => openRateModal()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Salary Rate
                </Button>
              </CardHeader>
              <CardContent>
                {rates.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Class</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Monthly Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rates.map((rate) => (
                        <TableRow key={rate.rate_id}>
                          <TableCell>
                            <div className="font-medium">{rate.class_name}</div>
                            <div className="text-xs text-muted-foreground">{rate.class_code}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{rate.teacher_name}</div>
                            <div className="text-xs text-muted-foreground">{rate.employee_id}</div>
                          </TableCell>
                          <TableCell>{formatMoney(rate.monthly_salary_amount)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                rate.assignment_active
                                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                  : 'border-rose-300 bg-rose-50 text-rose-700'
                              }
                            >
                              {rate.assignment_active ? 'Assignment Active' : 'Needs Review'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" onClick={() => openRateModal(rate)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => void handleDeleteRate(rate.rate_id)}>
                                <Trash2 className="h-4 w-4 text-rose-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-10 text-center text-muted-foreground">
                    No salary rates configured yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/90 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle>Salary Payments</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Track the salary payouts recorded for this month.
                  </p>
                </div>
                <Button onClick={() => openPaymentModal()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              </CardHeader>
              <CardContent>
                {payments.length ? (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div
                        key={payment.salary_payment_id}
                        className="rounded-2xl border border-border/70 bg-background/60 p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <p className="font-medium">{payment.teacher_name}</p>
                            <p className="text-xs text-muted-foreground">{payment.employee_id}</p>
                            <p className="text-sm text-muted-foreground">
                              {MONTH_OPTIONS.find((option) => option.value === Number(payment.salary_month))?.label}{' '}
                              {payment.salary_year}
                            </p>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Badge variant="outline">{formatMoney(payment.amount_paid)}</Badge>
                              <Badge variant="outline">{payment.payment_method || 'Cash'}</Badge>
                              <Badge variant="outline">{payment.payment_date?.split('T')[0]}</Badge>
                            </div>
                            {payment.notes && (
                              <p className="text-sm text-muted-foreground">{payment.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openPaymentModal(payment)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void handleDeletePayment(payment.salary_payment_id)}
                            >
                              <Trash2 className="h-4 w-4 text-rose-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center text-muted-foreground">
                    No salary payments recorded yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Dialog open={isRateModalOpen} onOpenChange={(open) => !open && setIsRateModalOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRateId ? 'Edit Salary Rate' : 'Add Salary Rate'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRateSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="rate-teacher">Teacher</Label>
                <select
                  id="rate-teacher"
                  value={rateForm.teacher_id}
                  onChange={(event) =>
                    setRateForm((prev) => ({
                      ...prev,
                      teacher_id: event.target.value,
                      class_id: '',
                    }))
                  }
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.teacher_id} value={teacher.teacher_id}>
                      {teacher.first_name} {teacher.last_name} ({teacher.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="rate-class">Assigned Class</Label>
                <select
                  id="rate-class"
                  value={rateForm.class_id}
                  onChange={(event) =>
                    setRateForm((prev) => ({ ...prev, class_id: event.target.value }))
                  }
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select class</option>
                  {assignedClassesForSelectedTeacher.map((classItem) => (
                    <option key={classItem.class_id} value={classItem.class_id}>
                      {classItem.class_name} ({classItem.class_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="monthly-salary-amount">Monthly Salary Amount</Label>
                <Input
                  id="monthly-salary-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rateForm.monthly_salary_amount}
                  onChange={(event) =>
                    setRateForm((prev) => ({ ...prev, monthly_salary_amount: event.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="rate-effective-from">Effective From</Label>
                <Input
                  id="rate-effective-from"
                  type="date"
                  value={rateForm.effective_from}
                  onChange={(event) =>
                    setRateForm((prev) => ({ ...prev, effective_from: event.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="rate-notes">Notes</Label>
              <Textarea
                id="rate-notes"
                value={rateForm.notes}
                onChange={(event) => setRateForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Optional notes about this class salary rate"
              />
            </div>

            {!assignedClassesForSelectedTeacher.length && rateForm.teacher_id && (
              <Alert>
                <BookOpen className="h-4 w-4" />
                <AlertDescription>
                  This teacher does not have any assigned classes yet. Assign the teacher to a class first.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsRateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingRateId ? 'Save Changes' : 'Save Rate'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPaymentModalOpen} onOpenChange={(open) => !open && setIsPaymentModalOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPaymentId ? 'Edit Salary Payment' : 'Record Salary Payment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="payment-teacher">Teacher</Label>
                <select
                  id="payment-teacher"
                  value={paymentForm.teacher_id}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, teacher_id: event.target.value }))
                  }
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.teacher_id} value={teacher.teacher_id}>
                      {teacher.first_name} {teacher.last_name} ({teacher.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="payment-amount">Amount Paid</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentForm.amount_paid}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, amount_paid: event.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="payment-month">Salary Month</Label>
                <select
                  id="payment-month"
                  value={paymentForm.salary_month}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, salary_month: event.target.value }))
                  }
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  {MONTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="payment-year">Salary Year</Label>
                <select
                  id="payment-year"
                  value={paymentForm.salary_year}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, salary_year: event.target.value }))
                  }
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="payment-date">Payment Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, payment_date: event.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="payment-method">Payment Method</Label>
                <select
                  id="payment-method"
                  value={paymentForm.payment_method}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, payment_method: event.target.value }))
                  }
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {PAYMENT_METHOD_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="payment-notes">Notes</Label>
              <Textarea
                id="payment-notes"
                value={paymentForm.notes}
                onChange={(event) =>
                  setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))
                }
                placeholder="Optional notes about this salary payment"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingPaymentId ? 'Save Changes' : 'Record Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherSalariesPage;
