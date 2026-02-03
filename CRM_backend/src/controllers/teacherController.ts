import pool from '../../config/dbcon';
import cryptoModule from 'crypto';

// Hash password function
const hashPassword = (password: string) => {
  return cryptoModule.createHash('sha256').update(password).digest('hex');
};

export const getAllTeachers = async (req: any, res: any) => {
  try {
    const result = await pool.query('SELECT * FROM teachers ORDER BY teacher_id');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch teachers', details: error.message || error.toString() });
  }
};

export const getTeacherById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM teachers WHERE teacher_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher', details: error.message || error.toString() });
  }
};

export const createTeacher = async (req: any, res: any) => {
  try {
    const { center_id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, qualification, specialization, status, roles } = req.body;
    const result = await pool.query(
      'INSERT INTO teachers (center_id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, qualification, specialization, status, roles) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [center_id, employee_id, first_name, last_name, email, phone, date_of_birth, gender, qualification, specialization, status || 'Active', JSON.stringify(roles || [])]
    );
    const created = await pool.query('SELECT * FROM teachers WHERE teacher_id = ?', [result.insertId]);
    res.status(201).json(created.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create teacher', details: error.message || error.toString() });
  }
};

export const updateTeacher = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, status, roles } = req.body;
    const existing = await pool.query('SELECT teacher_id FROM teachers WHERE teacher_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    await pool.query(
      'UPDATE teachers SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), email = COALESCE(?, email), phone = COALESCE(?, phone), status = COALESCE(?, status), roles = COALESCE(?, roles), updated_at = CURRENT_TIMESTAMP WHERE teacher_id = ?',
      [first_name, last_name, email, phone, status, roles ? JSON.stringify(roles) : null, id]
    );
    const updated = await pool.query('SELECT * FROM teachers WHERE teacher_id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update teacher', details: error.message || error.toString() });
  }
};

export const deleteTeacher = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT * FROM teachers WHERE employee_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    await pool.query('DELETE FROM teachers WHERE employee_id = ?', [id]);
    res.json({ message: 'Teacher deleted successfully', teacher: existing.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete teacher', details: error.message || error.toString() });
  }
};

export const teacherLogin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await pool.query('SELECT teacher_id, first_name, last_name, email, password_hash, status FROM teachers WHERE username = ?', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const teacher = result.rows[0];

    if (teacher.status !== 'Active') {
      return res.status(403).json({ error: 'Teacher account is not active' });
    }

    const password_hash = hashPassword(password);
    if (password_hash !== teacher.password_hash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({
      message: 'Login successful',
      teacher: {
        teacher_id: teacher.teacher_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email
      }
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message || error.toString() });
  }
};

export const setTeacherPassword = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const password_hash = hashPassword(password);
    const existing = await pool.query('SELECT teacher_id FROM teachers WHERE teacher_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    await pool.query(
      'UPDATE teachers SET username = ?, password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = ?',
      [username, password_hash, id]
    );
    const updated = await pool.query('SELECT teacher_id, username, email FROM teachers WHERE teacher_id = ?', [id]);

    res.json({ message: 'Teacher password set successfully', teacher: updated.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to set password', details: error.message || error.toString() });
  }
};

export const changeTeacherPassword = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old and new password required' });
    }

    const result = await pool.query('SELECT password_hash FROM teachers WHERE teacher_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const old_hash = hashPassword(old_password);
    if (old_hash !== result.rows[0].password_hash) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const new_hash = hashPassword(new_password);
    await pool.query('UPDATE teachers SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE teacher_id = ?', [new_hash, id]);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message || error.toString() });
  }
};
