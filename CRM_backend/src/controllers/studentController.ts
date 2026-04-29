const student_db = require('../../config/dbcon');
const cryptoModule1 = require('crypto');
const { generateToken } = require('../middleware/auth');
const {
  ensureParentBotSchema,
  prepareStudentParentFields,
  sanitizeStudentForResponse,
} = require('../services/parentBotService');
const {
  assertCenterCanAddStudent,
  assertCenterHasActiveSubscription,
} = require('../services/crmSubscriptionService');

// Hash password function
const hashPassword1 = (password: string) => {
  return cryptoModule1.createHash('sha256').update(password).digest('hex');
};

const generateEnrollmentNumber = async () => {
  const result = await student_db.query(`
    SELECT COALESCE(
      MAX(NULLIF(regexp_replace(enrollment_number, '[^0-9]', '', 'g'), '')::int),
      0
    ) + 1 AS next_number
    FROM students
  `);

  return String(result.rows[0]?.next_number || 1);
};

exports.getAllStudents = async (req: any, res: any) => {
  try {
    await ensureParentBotSchema();
    const center_id = req.user?.center_id;
    if (!center_id) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }
    const filters = ['s.center_id = $1'];
    const values: any[] = [center_id];

    if (req.user?.userType === 'teacher') {
      values.push(req.user.id);
      filters.push(`(s.teacher_id = $${values.length} OR c.teacher_id = $${values.length})`);
    }

    const result = await student_db.query(`
      SELECT s.*, c.class_name 
      FROM students s 
      LEFT JOIN classes c ON s.class_id = c.class_id 
      WHERE ${filters.join(' AND ')}
      ORDER BY s.student_id
    `, values);
    res.json(result.rows.map(sanitizeStudentForResponse));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch students', details: error.message || error.toString() });
  }
};

exports.getStudentById = async (req: any, res: any) => {
  try {
    await ensureParentBotSchema();
    const { id } = req.params;
    const center_id = req.user?.center_id;
    if (!center_id) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    const filters = ['s.student_id = $1', 's.center_id = $2'];
    const values: any[] = [id, center_id];

    if (req.user?.userType === 'teacher') {
      values.push(req.user.id);
      filters.push(`(s.teacher_id = $${values.length} OR c.teacher_id = $${values.length})`);
    }

    const result = await student_db.query(`
      SELECT s.*, c.class_name 
      FROM students s 
      LEFT JOIN classes c ON s.class_id = c.class_id 
      WHERE ${filters.join(' AND ')}
    `, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(sanitizeStudentForResponse(result.rows[0]));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch student', details: error.message || error.toString() });
  }
};

exports.createStudent = async (req: any, res: any) => {
  try {
    await ensureParentBotSchema();
    const {
      center_id,
      first_name,
      last_name,
      username,
      password,
      email,
      phone,
      date_of_birth,
      parent_name,
      parent_phone,
      gender,
      status,
      teacher_id,
      class_id,
    } = req.body;
    const resolvedCenterId = req.user?.center_id || center_id;

    if (!resolvedCenterId) {
      return res.status(400).json({ error: 'center_id is required' });
    }

    await assertCenterCanAddStudent(resolvedCenterId);

    const password_hash = password ? hashPassword1(password) : null;
    const { parentPasswordHash, normalizedParentPhone } = await prepareStudentParentFields(req.body);
    const enrollment_number = await generateEnrollmentNumber();
    const result = await student_db.query(
      'INSERT INTO students (center_id, enrollment_number, first_name, last_name, username, password_hash, email, phone, date_of_birth, parent_name, parent_phone, parent_password_hash, gender, status, teacher_id, class_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *',
      [
        resolvedCenterId,
        enrollment_number,
        first_name,
        last_name,
        username,
        password_hash,
        email,
        phone,
        date_of_birth,
        parent_name,
        normalizedParentPhone,
        parentPasswordHash,
        gender,
        status || 'Active',
        teacher_id,
        class_id,
      ]
    );
    res.status(201).json(sanitizeStudentForResponse(result.rows[0]));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Failed to create student',
      code: error.code,
      details: error.statusCode ? undefined : error.message || error.toString(),
    });
  }
};

exports.updateStudent = async (req: any, res: any) => {
  try {
    await ensureParentBotSchema();
    const { id } = req.params;
    const {
      first_name,
      last_name,
      username,
      password,
      email,
      phone,
      date_of_birth,
      status,
      class_id,
      parent_name,
      parent_phone,
    } = req.body;

    const existing = await student_db.query(
      `
        SELECT s.student_id, s.center_id, s.teacher_id, c.teacher_id AS class_teacher_id
        FROM students s
        LEFT JOIN classes c ON c.class_id = s.class_id
        WHERE s.student_id = $1
      `,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (Number(existing.rows[0].center_id) !== Number(req.user?.center_id)) {
      return res.status(403).json({ error: 'You can only update students in your own center.' });
    }

    if (
      req.user?.userType === 'teacher' &&
      Number(existing.rows[0].teacher_id) !== Number(req.user.id) &&
      Number(existing.rows[0].class_teacher_id) !== Number(req.user.id)
    ) {
      return res.status(403).json({ error: 'You can only update your own students.' });
    }

    if (req.user?.userType === 'teacher' && class_id) {
      const targetClass = await student_db.query(
        'SELECT teacher_id FROM classes WHERE class_id = $1 AND center_id = $2',
        [class_id, req.user.center_id]
      );

      if (
        targetClass.rows.length === 0 ||
        Number(targetClass.rows[0].teacher_id) !== Number(req.user.id)
      ) {
        return res.status(403).json({ error: 'You can only move students into your own classes.' });
      }
    }

    if (username) {
      const usernameCheck = await student_db.query(
        'SELECT student_id FROM students WHERE username = $1 AND student_id <> $2',
        [username, id]
      );
      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    const password_hash = typeof password === 'string' && password.trim()
      ? hashPassword1(password.trim())
      : null;
    const { parentPasswordHash, normalizedParentPhone } = await prepareStudentParentFields(req.body);
    const result = await student_db.query(
      'UPDATE students SET first_name = COALESCE($1, first_name), last_name = COALESCE($2, last_name), username = COALESCE($3, username), password_hash = COALESCE($4, password_hash), email = COALESCE($5, email), phone = COALESCE($6, phone), date_of_birth = COALESCE($7, date_of_birth), status = COALESCE($8, status), class_id = COALESCE($9, class_id), parent_name = COALESCE($10, parent_name), parent_phone = COALESCE($11, parent_phone), parent_password_hash = COALESCE($12, parent_password_hash), updated_at = CURRENT_TIMESTAMP WHERE student_id = $13 RETURNING *',
      [
        first_name,
        last_name,
        username || null,
        password_hash,
        email,
        phone,
        date_of_birth || null,
        status,
        class_id,
        parent_name,
        normalizedParentPhone,
        parentPasswordHash,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(sanitizeStudentForResponse(result.rows[0]));
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update student', details: error.message || error.toString() });
  }
};

exports.deleteStudent = async (req: any, res: any) => {
  const client = await student_db.connect();

  try {
    const { id } = req.params;
    const existing = await client.query(
      'SELECT student_id, center_id FROM students WHERE student_id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    if (Number(existing.rows[0].center_id) !== Number(req.user?.center_id)) {
      return res.status(403).json({ error: 'You can only delete students in your own center.' });
    }

    await client.query('BEGIN');

    const dependentTables = [
      'assignment_submissions',
      'test_results_summary',
      'test_submissions',
      'attendance_qr_checkins',
      'parent_notification_logs',
      'attendance',
      'grades',
      'payments',
      'debts',
    ];

    for (const tableName of dependentTables) {
      const tableExists = await client.query('SELECT to_regclass($1) AS table_name', [`public.${tableName}`]);
      if (tableExists.rows[0]?.table_name) {
        await client.query(`DELETE FROM ${tableName} WHERE student_id = $1`, [id]);
      }
    }

    const result = await client.query('DELETE FROM students WHERE student_id = $1 RETURNING *', [id]);
    await client.query('COMMIT');

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json({ message: 'Student deleted successfully', student: result.rows[0] });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete student', details: error.message || error.toString() });
  } finally {
    client.release();
  }
};

exports.studentLogin = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await student_db.query('SELECT student_id, center_id, first_name, last_name, email, password_hash, status, class_id FROM students WHERE username = $1', [username]);
    
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

    await assertCenterHasActiveSubscription(student.center_id);

    // Generate JWT token
    const token = generateToken({
      id: student.student_id,
      email: student.email,
      userType: 'student',
      center_id: student.center_id,
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
        center_id: student.center_id,
        class_id: student.class_id
      }
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Failed to login',
      code: error.code,
      details: error.statusCode ? undefined : error.message || error.toString(),
    });
  }
};

exports.setStudentPassword = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Hash password before storing
    const password_hash = hashPassword1(password);
    const result = await student_db.query(
      'UPDATE students SET username = $1, password_hash = $2, updated_at = CURRENT_TIMESTAMP WHERE student_id = $3 RETURNING student_id, username, email',
      [username, password_hash, id]
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
