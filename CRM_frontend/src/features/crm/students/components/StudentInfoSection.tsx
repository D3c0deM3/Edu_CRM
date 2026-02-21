import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Student {
  student_id?: number;
  id?: number;
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
  class_id?: number;
  center_id?: number;
}

interface StudentInfoSectionProps {
  student: Student;
}

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

export const StudentInfoSection = ({ student }: StudentInfoSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Enrollment Number</p>
            <p className="text-sm font-semibold">{student.enrollment_number}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Email</p>
            <p className="text-sm font-semibold">{student.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Phone</p>
            <p className="text-sm font-semibold">{student.phone}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Date of Birth</p>
            <p className="text-sm font-semibold">{new Date(student.date_of_birth).toLocaleDateString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Gender</p>
            <p className="text-sm font-semibold">{student.gender}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Status</p>
            <Badge
              variant="outline"
              className={cn('text-xs font-semibold border', getStatusVariant(student.status))}
            >
              {student.status}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Parent Name</p>
            <p className="text-sm font-semibold">{student.parent_name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Parent Phone</p>
            <p className="text-sm font-semibold">{student.parent_phone}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
