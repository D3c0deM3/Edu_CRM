import { useState, useEffect, useMemo } from 'react';
import { Pencil, Trash2, X, Info, ArrowLeft, Folder, FolderOpen, Search, Filter, Plus, Users, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCRUD } from '../hooks/useCRUD';
import { studentAPI, classAPI } from '../../../shared/api/api';
import { fetchTeachers, fetchCenters, fetchClasses, genderOptions, statusOptions } from '../../../utils/dropdownOptions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Student {
  student_id?: number;
  id?: number;
  center_id: number;
  enrollment_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  parent_name: string;
  parent_phone: string;
  gender: string;
  status: string;
  teacher_id?: number;
  class_id?: number;
  username?: string;
  password?: string;
}

interface Class {
  class_id?: number;
  id?: number;
  class_name: string;
  class_code: string;
  level: number;
  capacity: number;
}

const StudentsPage = () => {
  const navigate = useNavigate();
  const [state, actions] = useCRUD<Student>(studentAPI, 'Student');
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({
    center_id: 1,
    gender: 'Male',
    status: 'Active',
  });
  const [teacherOptions, setTeacherOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [centerOptions, setCenterOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [classOptions, setClassOptions] = useState<Array<{ id?: number; label: string; value: string | number }>>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    actions.fetchAll();
    loadClasses();
    loadDropdownOptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await classAPI.getAll();
      const allClasses = response.data || response;
      setClasses(Array.isArray(allClasses) ? allClasses : []);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadDropdownOptions = async () => {
    setIsLoadingOptions(true);
    try {
      const [teachers, centers, classes] = await Promise.all([
        fetchTeachers(),
        fetchCenters(),
        fetchClasses(),
      ]);
      setTeacherOptions(teachers);
      setCenterOptions(centers);
      setClassOptions(classes);
    } catch (error) {
      console.error('Error loading dropdown options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingId(student.student_id || student.id || null);
      setFormData({ ...student, password: '' });
    } else {
      setEditingId(null);
      setFormData({
        center_id: 1,
        gender: 'Male',
        status: 'Active',
        username: '',
        password: '',
        class_id: selectedClass ? (selectedClass.class_id || selectedClass.id) : undefined,
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
      username: '',
      password: '',
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
    if (window.confirm('Are you sure you want to delete this student?')) {
      await actions.delete(id);
    }
  };

  const handleClassClick = (cls: Class) => {
    setSelectedClass(cls);
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
  };

  const filteredStudents = selectedClass
    ? state.items.filter(
        (student) =>
          student.class_id === (selectedClass.class_id || selectedClass.id)
      )
    : [];

  const getStudentCount = (classId: number) => {
    return state.items.filter((student) => student.class_id === classId).length;
  };

  const unassignedStudents = state.items.filter((student) => !student.class_id);

  const displayedStudents = useMemo(() => {
    const baseStudents = selectedClass?.class_id === -1 ? unassignedStudents : filteredStudents;
    let students = baseStudents;

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      students = students.filter((student) =>
        student.first_name?.toLowerCase().includes(search) ||
        student.last_name?.toLowerCase().includes(search) ||
        student.email?.toLowerCase().includes(search) ||
        student.phone?.includes(search) ||
        student.enrollment_number?.toLowerCase().includes(search) ||
        student.parent_name?.toLowerCase().includes(search) ||
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(search)
      );
    }

    if (filterGender) {
      students = students.filter((student) => student.gender === filterGender);
    }

    if (filterStatus) {
      students = students.filter((student) => student.status === filterStatus);
    }

    return students;
  }, [filteredStudents, unassignedStudents, selectedClass, searchTerm, filterGender, filterStatus]);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterGender('');
    setFilterStatus('');
  };

  const hasActiveFilters = searchTerm || filterGender || filterStatus;

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          {selectedClass && (
            <Button
              variant="outline"
              onClick={handleBackToClasses}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          )}
          <h1 className="text-3xl font-bold text-foreground">
            {selectedClass
              ? `${selectedClass.class_name} - Students`
              : 'Students by Class'}
          </h1>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-br from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 px-6 py-3 rounded-lg font-semibold"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Student
        </Button>
      </div>

      {state.error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {!selectedClass ? (
        <>
          {loadingClasses ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
          ) : classes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Folder className="w-16 h-16 mx-auto opacity-30 mb-4" />
              <h3 className="text-lg font-semibold">No classes found</h3>
              <p className="text-sm">Create classes first to organize students</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {classes.map((cls) => {
                const classId = cls.class_id || cls.id || 0;
                const studentCount = getStudentCount(classId);
                return (
                  <Card
                    key={classId}
                    onClick={() => handleClassClick(cls)}
                    className="cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/20 border-0 overflow-hidden"
                  >
                    <div className="bg-gradient-to-br from-indigo-500 to-violet-500 p-6 text-white">
                      <div className="flex items-center gap-3 mb-3">
                        <Folder className="h-10 w-10" />
                        <div>
                          <h3 className="text-lg font-semibold">{cls.class_name}</h3>
                          <span className="text-xs opacity-80">{cls.class_code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 p-2.5 bg-white/20 rounded-lg">
                        <Users className="h-4 w-4" />
                        <span className="font-medium text-sm">
                          {studentCount} {studentCount === 1 ? 'Student' : 'Students'}
                        </span>
                      </div>
                      <p className="text-xs opacity-80 mt-2">
                        Level {cls.level} &bull; Capacity: {cls.capacity}
                      </p>
                    </div>
                  </Card>
                );
              })}

              {unassignedStudents.length > 0 && (
                <Card
                  onClick={() =>
                    setSelectedClass({
                      class_id: -1,
                      id: -1,
                      class_name: 'Unassigned',
                      class_code: 'N/A',
                      level: 0,
                      capacity: 0,
                    })
                  }
                  className="cursor-pointer transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-rose-500/20 border-0 overflow-hidden"
                >
                  <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-6 text-white">
                    <div className="flex items-center gap-3 mb-3">
                      <FolderOpen className="h-10 w-10" />
                      <div>
                        <h3 className="text-lg font-semibold">Unassigned</h3>
                        <span className="text-xs opacity-80">No Class</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 p-2.5 bg-white/20 rounded-lg">
                      <Users className="h-4 w-4" />
                      <span className="font-medium text-sm">
                        {unassignedStudents.length}{' '}
                        {unassignedStudents.length === 1 ? 'Student' : 'Students'}
                      </span>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Search and Filter Bar */}
          <div className="flex flex-wrap gap-3 mb-5 items-center">
            <div className="relative flex-1 min-w-[250px] max-w-[400px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, enrollment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>

            <Button
              variant={showFilters ? 'default' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'bg-indigo-500 hover:bg-indigo-600')}
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Filters
              {hasActiveFilters && (
                <Badge className="ml-1.5 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
                  {(filterGender ? 1 : 0) + (filterStatus ? 1 : 0)}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="destructive" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}

            <span className="ml-auto text-sm text-muted-foreground">
              {displayedStudents.length} student{displayedStudents.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {showFilters && (
            <Card className="mb-5">
              <CardContent className="py-4">
                <div className="flex flex-wrap gap-4">
                  <div className="min-w-[150px]">
                    <Label className="text-xs font-semibold mb-1.5 block">Gender</Label>
                    <Select value={filterGender || 'all'} onValueChange={(val) => setFilterGender(val === 'all' ? '' : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Genders" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genders</SelectItem>
                        {genderOptions.map((opt) => (
                          <SelectItem key={opt.id} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="min-w-[150px]">
                    <Label className="text-xs font-semibold mb-1.5 block">Status</Label>
                    <Select value={filterStatus || 'all'} onValueChange={(val) => setFilterStatus(val === 'all' ? '' : val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        {statusOptions.map((opt) => (
                          <SelectItem key={opt.id} value={String(opt.value)}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enrollment #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : displayedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      {hasActiveFilters
                        ? 'No students match your search criteria'
                        : 'No students found in this class'}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedStudents.map((student) => (
                    <TableRow key={student.student_id || student.id}>
                      <TableCell className="font-mono text-sm">{student.enrollment_number}</TableCell>
                      <TableCell className="font-medium">
                        {student.first_name} {student.last_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{student.email}</TableCell>
                      <TableCell className="text-muted-foreground">{student.phone}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(student.date_of_birth).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{student.gender}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs font-semibold border',
                            getStatusVariant(student.status)
                          )}
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-cyan-600 hover:text-cyan-800"
                            onClick={() => navigate(`/student/${student.student_id || student.id}`)}
                            title="View Details"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-500 hover:text-blue-700"
                            onClick={() => handleOpenModal(student)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-700"
                            onClick={() => handleDelete(student.student_id || student.id || 0)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {/* Add/Edit Student Modal */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-2xl rounded-2xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-br from-indigo-500 to-violet-500 px-6 py-4">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-white font-semibold text-lg">
                {editingId ? 'Edit Student' : 'Add New Student'}
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
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    required
                    value={formData.first_name || ''}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    required
                    value={formData.last_name || ''}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="enrollment_number">Enrollment Number *</Label>
                  <Input
                    id="enrollment_number"
                    required
                    value={formData.enrollment_number || ''}
                    onChange={(e) => setFormData({ ...formData, enrollment_number: e.target.value })}
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
                  <Label htmlFor="username">Username {!editingId && '*'}</Label>
                  <Input
                    id="username"
                    required={!editingId}
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Login username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password {!editingId && '*'}</Label>
                  <Input
                    id="password"
                    type="password"
                    required={!editingId}
                    value={formData.password || ''}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingId ? 'Leave blank to keep current' : 'Login password'}
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
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    required
                    value={formData.date_of_birth || ''}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parent_name">Parent Name *</Label>
                  <Input
                    id="parent_name"
                    required
                    value={formData.parent_name || ''}
                    onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parent_phone">Parent Phone *</Label>
                  <Input
                    id="parent_phone"
                    type="tel"
                    required
                    value={formData.parent_phone || ''}
                    onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender *</Label>
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
                  <Label>Status *</Label>
                  <Select
                    value={formData.status || 'Active'}
                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((opt) => (
                        <SelectItem key={opt.id} value={String(opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Center *</Label>
                  <Select
                    value={String(formData.center_id || '')}
                    onValueChange={(val) => setFormData({ ...formData, center_id: Number(val) })}
                    disabled={isLoadingOptions}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select a center'} />
                    </SelectTrigger>
                    <SelectContent>
                      {centerOptions.map((opt) => (
                        <SelectItem key={opt.id || opt.value} value={String(opt.id || opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <Select
                    value={String(formData.teacher_id || 'none')}
                    onValueChange={(val) =>
                      setFormData({ ...formData, teacher_id: val === 'none' ? undefined : Number(val) })
                    }
                    disabled={isLoadingOptions}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select a teacher (optional)'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {teacherOptions.map((opt) => (
                        <SelectItem key={opt.id || opt.value} value={String(opt.id || opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Class</Label>
                  <Select
                    value={String(formData.class_id || 'none')}
                    onValueChange={(val) =>
                      setFormData({ ...formData, class_id: val === 'none' ? undefined : Number(val) })
                    }
                    disabled={isLoadingOptions}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingOptions ? 'Loading...' : 'Select a class (optional)'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {classOptions.map((opt) => (
                        <SelectItem key={opt.id || opt.value} value={String(opt.id || opt.value)}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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

export default StudentsPage;
