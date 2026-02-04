import student_db from '../../config/dbcon';
import { hashPassword, comparePasswords, validatePasswordStrength } from '../../config/password';

export const getAllStudents = async (req: any, res: any) => {
  try {
    const result = await student_db.query('SELECT * FROM students ORDER BY student_id');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch students', details: error.message || error.toString() });
  }
};

export const getStudentById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await student_db.query('SELECT * FROM students WHERE student_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch student', details: error.message || error.toString() });
  }
};

export const createStudent = async (req: any, res: any) => {
  try {
    const { center_id, enrollment_number, first_name, last_name, email, phone, date_of_birth, parent_name, parent_phone, gender, status, teacher_id, class_id } = req.body;
    const result = await student_db.query(
      'INSERT INTO students (center_id, enrollment_number, first_name, last_name, email, phone, date_of_birth, parent_name, parent_phone, gender, status, teacher_id, class_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        center_id || null,
        enrollment_number || null,
        first_name || null,
        last_name || null,
        email || null,
        phone || null,
        date_of_birth || null,
        parent_name || null,
        parent_phone || null,
        gender || null,
        status || 'Active',
        teacher_id || null,
        class_id || null
      ]
    );
    const created = await student_db.query('SELECT * FROM students WHERE student_id = ?', [result.insertId]);
    res.status(201).json(created.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create student', details: error.message || error.toString() });
  }
};

export const updateStudent = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, status, class_id } = req.body;
    const existing = await student_db.query('SELECT student_id FROM students WHERE student_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    await student_db.query(
      'UPDATE students SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), email = COALESCE(?, email), phone = COALESCE(?, phone), status = COALESCE(?, status), class_id = COALESCE(?, class_id), updated_at = CURRENT_TIMESTAMP WHERE student_id = ?',
      [first_name, last_name, email, phone, status, class_id, id]
    );
    const updated = await student_db.query('SELECT * FROM students WHERE student_id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update student', details: error.message || error.toString() });
  }
};

export const deleteStudent = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await student_db.query('SELECT * FROM students WHERE student_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    await student_db.query('DELETE FROM students WHERE student_id = ?', [id]);
    res.json({ message: 'Student deleted successfully', student: existing.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete student', details: error.message || error.toString() });
  }
};

export const studentLogin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await student_db.query('SELECT student_id, first_name, last_name, email, password_hash, status FROM students WHERE username = ?', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const student = result.rows[0];

    if (student.status !== 'Active') {
      return res.status(403).json({ error: 'Student account is not active' });
    }

    const isPasswordValid = await comparePasswords(password, student.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({
      message: 'Login successful',
      student: {
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email
      }
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message || error.toString() });
  }
};

export const setStudentPassword = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: 'Password does not meet strength requirements', details: passwordValidation.errors });
    }

    const existing = await student_db.query('SELECT student_id FROM students WHERE student_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const hashedPassword = await hashPassword(password);
    await student_db.query(
      'UPDATE students SET username = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?',
      [username, hashedPassword, id]
    );
    const updated = await student_db.query('SELECT student_id, username, email FROM students WHERE student_id = ?', [id]);

    res.json({ message: 'Student password set successfully', student: updated.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to set password', details: error.message || error.toString() });
  }
};

export const changeStudentPassword = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old and new password required' });
    }

    const result = await student_db.query('SELECT password_hash FROM students WHERE student_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const isCurrentPasswordValid = await comparePasswords(old_password, result.rows[0].password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const passwordValidation = validatePasswordStrength(new_password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: 'New password does not meet strength requirements', details: passwordValidation.errors });
    }

    const new_hash = await hashPassword(new_password);
    await student_db.query('UPDATE students SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?', [new_hash, id]);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message || error.toString() });
  }
};
