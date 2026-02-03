import { GradesSection } from '../components/GradesSection';

interface Grade {
  grade_id?: number;
  id?: number;
  percentage: number;
  grade_letter: string;
  term: string;
  subject_name?: string;
}

interface GradesTabProps {
  grades: Grade[];
  onRefresh: () => void;
}

export const GradesTab = ({ grades, onRefresh }: GradesTabProps) => {
  return <GradesSection grades={grades} onRefresh={onRefresh} />;
};
