import { Pool } from 'pg';
import { BaseService } from './BaseService';

export interface Student {
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
}

export interface CreateStudentData extends Omit<Student, 'id'> {}

export class StudentService extends BaseService {
  constructor(pool: Pool) {
    super(pool);
  }

  async createStudent(studentData: CreateStudentData): Promise<Student> {
    return this.create('students', studentData);
  }

  async getStudentById(id: number): Promise<Student | null> {
    return this.findById('students', id);
  }

  async getAllStudents(filters: Partial<Student> = {}): Promise<Student[]> {
    return this.findAll('students', filters);
  }

  async getStudentsByCenter(centerId: number): Promise<Student[]> {
    return this.findAll('students', { center_id: centerId });
  }

  async getStudentsByTeacher(teacherId: number): Promise<Student[]> {
    return this.findAll('students', { teacher_id: teacherId });
  }

  async getStudentsByClass(classId: number): Promise<Student[]> {
    return this.findAll('students', { class_id: classId });
  }

  async updateStudent(id: number, studentData: Partial<Student>): Promise<Student | null> {
    return this.update('students', id, studentData);
  }

  async deleteStudent(id: number): Promise<boolean> {
    return this.delete('students', id);
  }

  async getStudentCount(filters: Partial<Student> = {}): Promise<number> {
    return this.count('students', filters);
  }

  async searchStudents(searchTerm: string, centerId?: number): Promise<Student[]> {
    let query = `
      SELECT * FROM students 
      WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR enrollment_number ILIKE $1)
    `;
    const values: any[] = [`%${searchTerm}%`];

    if (centerId) {
      query += ' AND center_id = $2';
      values.push(centerId);
    }

    query += ' ORDER BY first_name, last_name';

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async updateStudentStatus(id: number, status: string): Promise<Student | null> {
    return this.update('students', id, { status });
  }

  async assignStudentToClass(studentId: number, classId: number): Promise<Student | null> {
    return this.update('students', studentId, { class_id: classId });
  }

  async assignStudentToTeacher(studentId: number, teacherId: number): Promise<Student | null> {
    return this.update('students', studentId, { teacher_id: teacherId });
  }

  // Get student statistics
  async getStudentStatistics(studentId: number): Promise<any> {
    const query = `
      SELECT 
        s.id,
        s.first_name,
        s.last_name,
        COUNT(DISTINCT a.id) as attendance_count,
        COUNT(DISTINCT CASE WHEN a.status = 'Present' THEN a.id END) as present_count,
        COUNT(DISTINCT g.id) as grade_count,
        AVG(g.percentage) as average_grade,
        COUNT(DISTINCT p.id) as payment_count,
        COALESCE(SUM(p.amount), 0) as total_paid,
        COUNT(DISTINCT ass.id) as assignment_count
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id
      LEFT JOIN grades g ON s.id = g.student_id
      LEFT JOIN payments p ON s.id = p.student_id
      LEFT JOIN assignments ass ON s.class_id = ass.class_id
      WHERE s.id = $1
      GROUP BY s.id, s.first_name, s.last_name
    `;

    const result = await this.pool.query(query, [studentId]);
    return result.rows[0] || null;
  }
}
