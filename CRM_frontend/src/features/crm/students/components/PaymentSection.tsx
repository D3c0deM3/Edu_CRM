import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { paymentAPI } from '../../../../shared/api/api';
import { showToast } from '../../../../utils/toast';

interface Payment {
  payment_id?: number;
  id?: number;
  student_id?: number;
  center_id?: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_type: string;
  payment_status: string;
  receipt_number: string;
  currency?: string;
  transaction_reference?: string;
  notes?: string;
}

interface Student {
  student_id?: number;
  id?: number;
  center_id?: number;
}

interface Class {
  class_id?: number;
  id?: number;
  payment_amount?: number;
  class_name?: string;
}

interface PaymentSectionProps {
  payments: Payment[];
  student?: Student;
  classData?: Class | null;
  onRefresh: () => void;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export const PaymentSection = ({ payments, student, classData, onRefresh }: PaymentSectionProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Payment>>({
    payment_status: 'Pending',
    payment_method: 'Cash',
    currency: 'USD',
  });
  const [loading, setLoading] = useState(false);

  const handleOpenModal = (payment?: Payment) => {
    if (payment) {
      setEditingId(payment.payment_id || payment.id || null);
      setFormData(payment);
    } else {
      setEditingId(null);
      setFormData({
        payment_status: 'Pending',
        payment_method: 'Cash',
        currency: 'USD',
        amount: classData?.payment_amount || 0,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      payment_status: 'Pending',
      payment_method: 'Cash',
      currency: 'USD',
      amount: classData?.payment_amount || 0,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const paymentData = {
        ...formData,
        student_id: student?.student_id || student?.id,
        center_id: student?.center_id,
      };

      if (editingId) {
        await paymentAPI.update(editingId, paymentData);
        showToast.success('Payment updated successfully');
      } else {
        await paymentAPI.create(paymentData);
        showToast.success('Payment created successfully');
      }
      onRefresh();
      handleCloseModal();
    } catch (error: unknown) {
      const err = error as { message?: string };
      showToast.error(err.message || 'Failed to save payment');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure?')) {
      try {
        await paymentAPI.delete(id);
        showToast.success('Payment deleted successfully');
        onRefresh();
      } catch (error: unknown) {
        const err = error as { message?: string };
        showToast.error(err.message || 'Failed to delete payment');
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Payment History</CardTitle>
        <Button size="sm" onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" /> Add Payment
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No payment records
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment, index) => (
                  <TableRow key={payment.payment_id || payment.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>${(Number(payment.amount) || 0).toFixed(2)}</TableCell>
                    <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                    <TableCell>{payment.payment_method}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs font-semibold border ${getStatusBadgeVariant(payment.payment_status)}`}>
                        {payment.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
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
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receipt">Receipt Number *</Label>
              <Input
                id="receipt"
                type="text"
                required
                value={formData.receipt_number || ''}
                onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                required
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Payment Date *</Label>
              <Input
                id="date"
                type="date"
                required
                value={formData.payment_date || ''}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Payment Method *</Label>
              <Select value={formData.payment_method || 'Cash'} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                <SelectTrigger id="method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Check">Check</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Payment Type *</Label>
              <Select value={formData.payment_type || ''} onValueChange={(value) => setFormData({ ...formData, payment_type: value })}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tuition">Tuition</SelectItem>
                  <SelectItem value="Fee">Fee</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.payment_status || 'Pending'} onValueChange={(value) => setFormData({ ...formData, payment_status: value })}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                type="text"
                value={formData.currency || 'USD'}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Transaction Reference</Label>
              <Input
                id="reference"
                type="text"
                value={formData.transaction_reference || ''}
                onChange={(e) => setFormData({ ...formData, transaction_reference: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
