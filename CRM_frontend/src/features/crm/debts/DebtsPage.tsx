import { useState, useEffect } from 'react';
import { Pencil, Trash2, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCRUD } from '../hooks/useCRUD';
import { debtAPI } from '../../../shared/api/api';
import { SelectField } from '../students/components/SelectField';
import { fetchStudents, fetchCenters } from '../../../utils/dropdownOptions';
import DebtAnalyzer from './DebtAnalyzer';

interface Debt {
  debt_id?: number;
  id?: number;
  student_id: number;
  center_id: number;
  debt_amount: number;
  debt_date: string;
  due_date: string;
  amount_paid: number;
  remarks?: string;
}

const DebtsPage = () => {
  const [state, actions] = useCRUD<Debt>(debtAPI, 'Debt');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Debt>>({
    center_id: 1,
    amount_paid: 0,
  });
  const [studentOptions, setStudentOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [centerOptions, setCenterOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadDropdownOptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const [students, centers] = await Promise.all([
        fetchStudents(),
        fetchCenters(),
      ]);
      setStudentOptions(students);
      setCenterOptions(centers);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleOpenModal = (debt?: Debt) => {
    if (debt) {
      setEditingId(debt.debt_id || debt.id || null);
      setFormData(debt);
    } else {
      setEditingId(null);
      setFormData({ center_id: 1, amount_paid: 0 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ center_id: 1, amount_paid: 0 });
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
    if (window.confirm('Are you sure you want to delete this debt record?')) {
      await actions.delete(id);
    }
  };

  const getStudentName = (studentId: number) => {
    const student = studentOptions.find(s => s.id === studentId);
    return student ? student.label : `Student ${studentId}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Debts Management</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" /> Add Debt
        </Button>
      </div>

      {/* Payment Analyzer Section */}
      <DebtAnalyzer />

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Debts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Debt Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Debt Amount</TableHead>
                  <TableHead>Paid Amount</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : state.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No debt records found
                    </TableCell>
                  </TableRow>
                ) : (
                  state.items.map((debt) => {
                    const debtAmount = typeof debt.debt_amount === 'string' ? parseFloat(debt.debt_amount) : debt.debt_amount;
                    const amountPaid = typeof debt.amount_paid === 'string' ? parseFloat(debt.amount_paid) : debt.amount_paid;
                    const remaining = debtAmount - amountPaid;
                    return (
                      <TableRow key={debt.debt_id || debt.id}>
                        <TableCell className="font-medium">{getStudentName(debt.student_id)}</TableCell>
                        <TableCell>${debtAmount.toFixed(2)}</TableCell>
                        <TableCell>${amountPaid.toFixed(2)}</TableCell>
                        <TableCell
                          className={cn(remaining > 0 ? 'text-red-600 font-semibold' : 'text-green-600')}
                        >
                          ${remaining.toFixed(2)}
                        </TableCell>
                        <TableCell>{new Date(debt.due_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenModal(debt)}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(debt.debt_id || debt.id || 0)}
                              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Debt Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Debt' : 'Add New Debt'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SelectField
                label="Student"
                name="student_id"
                value={formData.student_id || ''}
                onChange={(e) =>
                  setFormData({ ...formData, student_id: Number(e.target.value) })
                }
                options={studentOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a student"
              />
              <SelectField
                label="Center"
                name="center_id"
                value={formData.center_id || ''}
                onChange={(e) =>
                  setFormData({ ...formData, center_id: Number(e.target.value) })
                }
                options={centerOptions}
                isLoading={isLoadingOptions}
                required
                placeholder="Select a center"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Debt Amount *</Label>
                <Input
                  type="number"
                  required
                  step="0.01"
                  value={formData.debt_amount || ''}
                  onChange={(e) => setFormData({ ...formData, debt_amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount Paid *</Label>
                <Input
                  type="number"
                  required
                  step="0.01"
                  value={formData.amount_paid || 0}
                  onChange={(e) => setFormData({ ...formData, amount_paid: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Debt Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.debt_date || ''}
                  onChange={(e) => setFormData({ ...formData, debt_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  required
                  value={formData.due_date || ''}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={state.loading}>
                {state.loading ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DebtsPage;
