const db = require('../../config/dbcon');

exports.getAllAttendance = async (req: any, res: any) => {
  try {
    const center_id = req.user?.center_id;
    if (!center_id) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }
    const result = await db.query(`
      SELECT a.*
      FROM attendance a
      JOIN classes c ON a.class_id = c.class_id
      WHERE c.center_id = $1
      ORDER BY a.attendance_id DESC
    `, [center_id]);
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

exports.getAttendanceById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM attendance WHERE attendance_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance', details: error.message || error.toString() });
  }
};

exports.createAttendance = async (req: any, res: any) => {
  try {
    const { student_id, teacher_id, class_id, attendance_date, status, remarks } = req.body;
    const result = await db.query(
      'INSERT INTO attendance (student_id, teacher_id, class_id, attendance_date, status, remarks) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [student_id, teacher_id, class_id, attendance_date, status || 'Present', remarks]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create attendance', details: error.message || error.toString() });
  }
};

exports.updateAttendance = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const result = await db.query(
      'UPDATE attendance SET status = COALESCE($1, status), remarks = COALESCE($2, remarks) WHERE attendance_id = $3 RETURNING *',
      [status, remarks, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update attendance', details: error.message || error.toString() });
  }
};

exports.getAttendanceByStudent = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    const result = await db.query('SELECT * FROM attendance WHERE student_id = $1 ORDER BY attendance_date DESC', [studentId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

exports.getAttendanceByClass = async (req: any, res: any) => {
  try {
    const { classId } = req.params;
    const result = await db.query('SELECT * FROM attendance WHERE class_id = $1 ORDER BY attendance_date DESC', [classId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
};

exports.deleteAttendance = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM attendance WHERE attendance_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Attendance record not found' });
    }
    res.json({ message: 'Attendance record deleted successfully', attendance: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete attendance', details: error.message || error.toString() });
  }
};

exports.createBulkAttendance = async (req: any, res: any) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records must be a non-empty array' });
    }

    const results: any[] = [];
    for (const record of records) {
      const { student_id, teacher_id, class_id, attendance_date, status, remarks } = record;
      const result = await db.query(
        'INSERT INTO attendance (student_id, teacher_id, class_id, attendance_date, status, remarks) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [student_id, teacher_id, class_id, attendance_date, status || 'Present', remarks]
      );
      results.push(result.rows[0]);
    }

    res.status(201).json({ message: `${results.length} attendance records created successfully`, attendance: results });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create bulk attendance', details: error.message || error.toString() });
  }
};
