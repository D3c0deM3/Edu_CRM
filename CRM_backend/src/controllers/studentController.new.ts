import { StudentService } from '../services/StudentService';
import { Pool } from 'pg';

// Initialize database connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const studentService = new StudentService(pool);

const cryptoModule1 = require('crypto');
const { generateToken } = require('../middleware/auth');

// Hash password function
const hashPassword1 = (password: string) => {
  return cryptoModule1.createHash('sha256').update(password).digest('hex');
};

// Using the new service-based approach
exports.getAllStudents = async (req: any, res: any) => {
  try {
    const { center_id, teacher_id, class_id, search } = req.query;
    
    let filters: any = {};
    if (center_id) filters.center_id = parseInt(center_id);
    if (teacher_id) filters.teacher_id = parseInt(teacher_id);
    if (class_id) filters.class_id = parseInt(class_id);

    let students;
    if (search) {
      students = await studentService.searchStudents(
        search, 
        center_id ? parseInt(center_id) : undefined
      );
    } else {
      students = await studentService.getAllStudents(filters);
    }

    // Join with class names for compatibility
    const studentsWithClasses = await Promise.all(
      students.map(async (student) => {
        if (student.class_id) {
          const classResult = await pool.query(
            'SELECT class_name FROM classes WHERE class_id = $1',
            [student.class_id]
          );
          return {
            ...student,
            class_name: classResult.rows[0]?.class_name || null
          };
        }
        return { ...student, class_name: null };
      })
    );

    res.json(studentsWithClasses);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch students', details: error.message || error.toString() });
  }
};

exports.getStudentById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const student = await studentService.getStudentById(parseInt(id));

    if (!student) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    // Include class name for compatibility
    let studentWithClass = { ...student, class_name: null };
    if (student.class_id) {
      const classResult = await pool.query(
        'SELECT class_name FROM classes WHERE class_id = $1',
        [student.class_id]
      );
      studentWithClass.class_name = classResult.rows[0]?.class_name || null;
    }

    res.json(studentWithClass);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch student', details: error.message || error.toString() });
  }
};

exports.createStudent = async (req: any, res: any) => {
  try {
    const studentData = req.body;
    
    // Validate required fields
    const requiredFields = ['center_id', 'enrollment_number', 'first_name', 'last_name', 'email', 'phone'];
    const missingFields = requiredFields.filter(field => !studentData[field]);
    
    if (missingFields.length > 0) {
      res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
      return;
    }

    const newStudent = await studentService.createStudent(studentData);
    
    res.status(201).json(newStudent);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create student', details: error.message || error.toString() });
  }
};

exports.updateStudent = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const studentData = req.body;
    
    const updatedStudent = await studentService.updateStudent(parseInt(id), studentData);
    
    if (!updatedStudent) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json(updatedStudent);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update student', details: error.message || error.toString() });
  }
};

exports.deleteStudent = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const deleted = await studentService.deleteStudent(parseInt(id));
    
    if (!deleted) {
      res.status(404).json({ error: 'Student not found' });
      return;
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete student', details: error.message || error.toString() });
  }
};

// Keep existing auth methods
exports.studentLogin = async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = hashPassword1(password);

    const result = await pool.query(
      'SELECT * FROM students WHERE email = $1 AND password = $2',
      [email, hashedPassword]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const student = result.rows[0];
    const token = generateToken(student, 'student');

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: student.student_id,
        email: student.email,
        first_name: student.first_name,
        last_name: student.last_name,
        userType: 'student'
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', details: error.message || error.toString() });
  }
};
