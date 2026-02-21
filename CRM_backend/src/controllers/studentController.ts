const student_db = require('../../config/dbcon');
const cryptoModule1 = require('crypto');
const { generateToken } = require('../middleware/auth');

// Hash password function
const hashPassword1 = (password: string) => {
  return cryptoModule1.createHash('sha256').update(password).digest('hex');
};

exports.getAllStudents = async (req: any, res: any) => {
  try {
    const result = await student_db.query(`
      SELECT s.*, c.class_name 
      FROM students s 
      LEFT JOIN classes c ON s.class_id = c.class_id 
      ORDER BY s.student_id
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch students', details: error.message || error.toString() });
  }
};

exports.getStudentById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await student_db.query(`
      SELECT s.*, c.class_name 
      FROM students s 
      LEFT JOIN classes c ON s.class_id = c.class_id 
      WHERE s.student_id = $1
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch student', details: error.message || error.toString() });
  }
};

exports.createStudent = async (req: any, res: any) => {
  try {
    const { center_id, enrollment_number, first_name, last_name, username, password, email, phone, date_of_birth, parent_name, parent_phone, gender, status, teacher_id, class_id } = req.body;
    const password_hash = password ? hashPassword1(password) : null;
    const result = await student_db.query(
      'INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, password_hash, email, phone, date_of_birth, parent_name, parent_phone, gender, status, teacher_id, class_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *',
      [center_id, enrollment_number, first_name, last_name, username, password_hash, email, phone, date_of_birth, parent_name, parent_phone, gender, status || 'Active', teacher_id, class_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create student', details: error.message || error.toString() });
  }
};

exports.updateStudent = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, status, class_id } = req.body;
    const result = await student_db.query(
      'UPDATE students SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), email = COALESCE($3, email), phone = COALESCE($4, phone), status = COALESCE($5, status), class_id = COALESCE($6, class_id), updated_at = CURRENT_TIMESTAMP WHERE student_id = $7 RETURNING *',
      [first_name, last_name, email, phone, status, class_id, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update student', details: error.message || error.toString() });
  }
};

exports.deleteStudent = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await student_db.query('DELETE FROM students WHERE student_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully', student: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete student', details: error.message || error.toString() });
  }
};

exports.studentLogin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await student_db.query('SELECT student_id, first_name, last_name, email, password_hash, status, class_id FROM students WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const student = result.rows[0];

    if (student.status !== 'Active') {
      return res.status(403).json({ error: 'Student account is not active' });
    }

    const password_hash = hashPassword1(password);
    if (password_hash !== student.password_hash) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = generateToken({
      id: student.student_id,
      email: student.email,
      userType: 'student',
      class_id: student.class_id,
    });

    res.json({
      message: 'Login successful',
      token,
      student: {
        student_id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.email,
        class_id: student.class_id
      }
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message || error.toString() });
  }
};

exports.setStudentPassword = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Store password as plain text without encryption
    const result = await student_db.query(
      'UPDATE students SET username = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE student_id = $3 RETURNING student_id, username, email',
      [username, password, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json({ message: 'Student password set successfully', student: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to set password', details: error.message || error.toString() });
  }
};

exports.changeStudentPassword = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ error: 'Old and new password required' });
    }

    const result = await student_db.query('SELECT password_hash FROM students WHERE student_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const old_hash = hashPassword1(old_password);
    if (old_hash !== result.rows[0].password_hash) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const new_hash = hashPassword1(new_password);
    await student_db.query('UPDATE students SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE student_id = $2', [new_hash, id]);
    
    res.json({ message: 'Password changed successfully' });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to change password', details: error.message || error.toString() });
  }
};

export {};