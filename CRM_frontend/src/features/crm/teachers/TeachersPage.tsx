import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, Mail, Phone, GraduationCap, User, X, Loader2 } from 'lucide-react';
import { useCRUD } from '../hooks/useCRUD';
import { teacherAPI } from '../../../shared/api/api';
import { fetchCenters, genderOptions, teacherStatusOptions } from '../../../utils/dropdownOptions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Teacher {
  teacher_id?: number;
  id?: number;
  center_id: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  gender: string;
  qualification: string;
  specialization: string;
  status: string;
  roles?: string[];
  username?: string;
  password?: string;
}

const TeachersPage = () => {
  const navigate = useNavigate();
  const [state, actions] = useCRUD<Teacher>(teacherAPI, 'Teacher');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Teacher>>({
    center_id: 1,
    gender: 'Male',
    status: 'Active',
    roles: ['teacher'],
  });
  const [centerOptions, setCenterOptions] = useState<any[]>([]);

  useEffect(() => {
    actions.fetchAll();
    loadDropdownOptions();
  }, []);

  const loadDropdownOptions = async () => {
    try {
      const centers = await fetchCenters();
      setCenterOptions(centers);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    }
  };

  const handleOpenModal = (teacher?: Teacher) => {
    if (teacher) {
      setEditingId(teacher.teacher_id || teacher.id || null);
      setFormData(teacher);
    } else {
      setEditingId(null);
      setFormData({
        center_id: 1,
        gender: 'Male',
        status: 'Active',
        roles: ['teacher'],
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({
      center_id: 1,
      gender: 'Male',
      status: 'Active',
      roles: ['teacher'],
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
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      await actions.delete(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'on leave':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Teachers Management</h1>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 px-6 py-3 rounded-lg font-semibold"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Teacher
        </Button>
      </div>

      {state.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* Teacher Cards Grid */}
      {state.loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      ) : state.items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <User className="w-16 h-16 mx-auto opacity-30 mb-4" />
          <h3 className="text-lg font-semibold">No teachers found</h3>
          <p className="text-sm">Click &quot;Add Teacher&quot; to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {state.items.map((teacher) => (
            <Card
              key={teacher.teacher_id || teacher.id}
              className="h-full flex flex-col rounded-2xl transition-all duration-300 border border-border/10 hover:-translate-y-2 hover:shadow-xl hover:shadow-indigo-500/15"
            >
              {/* Card Header with Avatar */}
              <div className="bg-gradient-to-br from-indigo-500 to-violet-500 p-6 flex flex-col items-center relative rounded-t-2xl">
                <div className="w-20 h-20 rounded-full bg-white/20 border-[3px] border-white/40 flex items-center justify-center text-white text-xl font-bold mb-2">
                  {getInitials(teacher.first_name, teacher.last_name)}
                </div>
                <h3 className="text-white font-semibold text-lg text-center">
                  {teacher.first_name} {teacher.last_name}
                </h3>
                <span className="text-white/80 text-xs font-medium">
                  {teacher.employee_id}
                </span>
                <span
                  className={cn(
                    'absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold border',
                    getStatusColor(teacher.status)
                  )}
                >
                  {teacher.status}
                </span>
              </div>

              {/* Card Content */}
              <CardContent className="flex-grow p-5">
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold">{teacher.specialization}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate">
                    {teacher.email}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{teacher.phone}</span>
                </div>
                <div className="mt-4">
                  <Badge variant="outline" className="text-[0.7rem]">
                    {teacher.qualification}
                  </Badge>
                </div>
              </CardContent>

              {/* Card Actions */}
              <div className="flex justify-between items-center p-4 border-t border-border/10 bg-muted/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/teacher/${teacher.teacher_id || teacher.id}`)}
                  className="text-sm"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  View
                </Button>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-500 hover:text-blue-700"
                    onClick={() => handleOpenModal(teacher)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(teacher.teacher_id || teacher.id || 0)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-br from-indigo-500 to-violet-500 px-6 py-4">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-white font-semibold text-lg">
                {editingId ? 'Edit Teacher' : 'Add New Teacher'}
              </DialogTitle>
              <button
                onClick={handleCloseModal}
                className="text-white hover:text-white/80 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    required
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    required
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input
                    id="employee_id"
                    required
                    value={formData.employee_id || ''}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    required
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    required
                    value={formData.date_of_birth || ''}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="qualification">Qualification</Label>
                  <Input
                    id="qualification"
                    required
                    value={formData.qualification || ''}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Input
                    id="specialization"
                    required
                    value={formData.specialization || ''}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender || 'Male'}
                    onValueChange={(val) => setFormData({ ...formData, gender: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      {genderOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status || 'Active'}
                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherStatusOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="center">Center</Label>
                  <Select
                    value={String(formData.center_id || '')}
                    onValueChange={(val) => setFormData({ ...formData, center_id: Number(val) })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Center" />
                    </SelectTrigger>
                    <SelectContent>
                      {centerOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.id)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!editingId && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        required
                        value={formData.username || ''}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Used for login (min 3 characters)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        required
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">Min 6 characters</p>
                    </div>
                  </>
                )}
              </div>
            </div>
            <DialogFooter className="px-6 py-4">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="rounded-lg">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={state.loading}
                className="bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-lg px-8"
              >
                {state.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeachersPage;
