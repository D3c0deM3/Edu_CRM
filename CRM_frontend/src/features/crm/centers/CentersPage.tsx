import { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useCRUD } from '../hooks/useCRUD';
import { centerAPI } from '../../../shared/api/api';
import { CRUDTable } from '../../../shared/components/CRUDComponents';
import { showToast } from '../../../utils/toast';

interface Center {
  center_id?: number;
  id?: number;
  center_name: string;
  center_code: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  principal_name: string;
}

const CentersPage = () => {
  const [state, actions] = useCRUD<Center>(centerAPI, 'Center');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Center>>({});

  useEffect(() => {
    actions.fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenModal = (center?: Center) => {
    if (center) {
      setEditingId(center.center_id || center.id || null);
      setFormData(center);
    } else {
      setEditingId(null);
      setFormData({});
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await actions.update(editingId, formData);
        showToast.success('Center updated successfully!');
      } else {
        await actions.create(formData);
        showToast.success('Center created successfully!');
      }
      handleCloseModal();
    } catch {
      showToast.error('Error saving center');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this center?')) {
      try {
        await actions.delete(id);
        showToast.success('Center deleted successfully!');
      } catch {
        showToast.error('Error deleting center');
      }
    }
  };

  const columns = [
    { key: 'center_code', label: 'Code' },
    { key: 'center_name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'principal_name', label: 'Principal' },
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold">Centers Management</h1>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Center
        </Button>
      </div>

      {state.error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {state.loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <CRUDTable
          title=""
          data={state.items}
          columns={columns}
          onAdd={() => handleOpenModal()}
          onEdit={handleOpenModal}
          onDelete={handleDelete}
        />
      )}

      {/* Form Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Center' : 'Add New Center'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="center_name">Center Name *</Label>
              <Input
                id="center_name"
                required
                value={formData.center_name || ''}
                onChange={(e) => setFormData({ ...formData, center_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="center_code">Center Code *</Label>
              <Input
                id="center_code"
                required
                value={formData.center_code || ''}
                onChange={(e) => setFormData({ ...formData, center_code: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                required
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                required
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                required
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="principal_name">Principal Name *</Label>
              <Input
                id="principal_name"
                required
                value={formData.principal_name || ''}
                onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={state.loading}>
              {state.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CentersPage;
