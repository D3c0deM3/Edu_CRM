import db from '../../config/dbcon';

export const getAllAttendance = async (req: any, res: any) => {
  try {
    const result = await db.query('SELECT * FROM attendance ORDER BY attendance_id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

export const getAttendanceById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM attendance WHERE attendance_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance', details: error.message || error.toString() });
  }
};

export const createAttendance = async (req: any, res: any) => {
  try {
    const { student_id, teacher_id, class_id, attendance_date, status, remarks } = req.body;
    const result = await db.query(
      'INSERT INTO attendance (student_id, teacher_id, class_id, attendance_date, status, remarks) VALUES (?, ?, ?, ?, ?, ?)',
      [student_id, teacher_id, class_id, attendance_date, status || 'Present', remarks]
    );
    const created = await db.query('SELECT * FROM attendance WHERE attendance_id = ?', [result.insertId]);
    res.status(201).json(created.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create attendance', details: error.message || error.toString() });
  }
};

export const updateAttendance = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const existing = await db.query('SELECT attendance_id FROM attendance WHERE attendance_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance not found' });
    }
    await db.query(
      'UPDATE attendance SET status = COALESCE(?, status), remarks = COALESCE(?, remarks) WHERE attendance_id = ?',
      [status, remarks, id]
    );
    const updated = await db.query('SELECT * FROM attendance WHERE attendance_id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update attendance', details: error.message || error.toString() });
  }
};

export const getAttendanceByStudent = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    const result = await db.query('SELECT * FROM attendance WHERE student_id = ? ORDER BY attendance_date DESC', [studentId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

export const getAttendanceByClass = async (req: any, res: any) => {
  try {
    const { classId } = req.params;
    const result = await db.query('SELECT * FROM attendance WHERE class_id = ? ORDER BY attendance_date DESC', [classId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

export const deleteAttendance = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await db.query('SELECT * FROM attendance WHERE attendance_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    await db.query('DELETE FROM attendance WHERE attendance_id = ?', [id]);
    res.json({ message: 'Attendance record deleted successfully', attendance: existing.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete attendance', details: error.message || error.toString() });
  }
};
