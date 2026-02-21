import { useState, useEffect } from 'react';
import { GraduationCap, Users, Clock, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { classAPI } from '../../../shared/api/api';

interface ClassInfo {
  class_id: number;
  class_name: string;
  description?: string;
  teacher_id?: number;
  status: string;
  student_count?: number;
  schedule?: string;
}

interface TeacherClassesTabProps {
  teacherId?: number;
  onRefresh?: () => void;
}

const TeacherClassesTab = ({ teacherId, onRefresh: _onRefresh }: TeacherClassesTabProps) => {
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, [teacherId]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await classAPI.getAll();
      // Filter classes by teacher if needed
      const allClasses = response.data || [];
      setClasses(allClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'destructive';
      case 'completed':
        return 'info';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-16 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/20">
        <GraduationCap className="h-14 w-14 text-muted-foreground/40 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-muted-foreground">
          No classes assigned yet
        </h3>
        <p className="text-sm text-muted-foreground">
          Classes will appear here once they are assigned to you
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {classes.map((classItem) => (
        <Card
          key={classItem.class_id}
          className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                <GraduationCap className="h-5 w-5" />
              </div>
              <Badge variant={getStatusVariant(classItem.status) as any}>
                {classItem.status || 'Active'}
              </Badge>
            </div>

            <h3 className="text-lg font-semibold mb-1">
              {classItem.class_name}
            </h3>

            {classItem.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {classItem.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-3 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">
                {classItem.student_count || 0} Students
              </span>
            </div>

            {classItem.schedule && (
              <div className="flex items-center gap-2 mt-1.5 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm">{classItem.schedule}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TeacherClassesTab;
