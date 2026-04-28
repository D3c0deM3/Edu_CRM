const subject_DB = require('../../config/dbcon');

exports.getAllSubjects = async (req: any, res: any) => {
  try {
    const center_id = req.user?.center_id;
    if (!center_id) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }
    const values: any[] = [center_id];
    const filters = ['c.center_id = $1'];

    if (req.user?.userType === 'teacher') {
      values.push(req.user.id);
      filters.push(`s.teacher_id = $${values.length}`);
    }

    const result = await subject_DB.query(`
      SELECT s.*
      FROM subjects s
      JOIN classes c ON s.class_id = c.class_id
      WHERE ${filters.join(' AND ')}
      ORDER BY s.subject_id DESC
    `, values);
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

exports.getSubjectById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await subject_DB.query(
      `
        SELECT s.*, c.center_id
        FROM subjects s
        JOIN classes c ON c.class_id = s.class_id
        WHERE s.subject_id = $1
      `,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    if (req.user?.userType === 'teacher' && Number(result.rows[0].teacher_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'You can only view your own subjects.' });
    }
    if (req.user?.userType === 'superuser' && Number(result.rows[0].center_id) !== Number(req.user.center_id)) {
      return res.status(403).json({ error: 'You can only view subjects in your own center.' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch subject', details: error.message || error.toString() });
  }
};

exports.getSubjectsByClass = async (req: any, res: any) => {
  try {
    const { classId } = req.params;
    const values: any[] = [classId];
    const filters = ['s.class_id = $1'];

    if (req.user?.userType === 'teacher') {
      values.push(req.user.id);
      filters.push(`s.teacher_id = $${values.length}`);
    }

    if (req.user?.userType === 'superuser') {
      values.push(req.user.center_id);
      filters.push(`c.center_id = $${values.length}`);
    }

    const result = await subject_DB.query(
      `
        SELECT s.*
        FROM subjects s
        JOIN classes c ON c.class_id = s.class_id
        WHERE ${filters.join(' AND ')}
        ORDER BY s.subject_name
      `,
      values
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

exports.createSubject = async (req: any, res: any) => {
  try {
    const { class_id, subject_name, subject_code, teacher_id, total_marks, passing_marks } = req.body;
    const classAccess = await subject_DB.query(
      'SELECT class_id, center_id FROM classes WHERE class_id = $1',
      [class_id]
    );

    if (classAccess.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }

    if (Number(classAccess.rows[0].center_id) !== Number(req.user?.center_id)) {
      return res.status(403).json({ error: 'This class is outside your center.' });
    }

    const resolvedTeacherId = req.user?.userType === 'teacher' ? Number(req.user.id) : teacher_id;
    if (!resolvedTeacherId) {
      return res.status(400).json({ error: 'teacher_id is required' });
    }

    const result = await subject_DB.query(
      'INSERT INTO subjects (class_id, subject_name, subject_code, teacher_id, total_marks, passing_marks) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [class_id, subject_name, subject_code, resolvedTeacherId, total_marks || 100, passing_marks || 40]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create subject', details: error.message || error.toString() });
  }
};

exports.updateSubject = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { subject_name, subject_code, teacher_id, total_marks, passing_marks } = req.body;
    const existing = await subject_DB.query(
      `
        SELECT s.*, c.center_id
        FROM subjects s
        JOIN classes c ON c.class_id = s.class_id
        WHERE s.subject_id = $1
      `,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    if (req.user?.userType === 'teacher' && Number(existing.rows[0].teacher_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'You can only update your own subjects.' });
    }

    if (req.user?.userType === 'superuser' && Number(existing.rows[0].center_id) !== Number(req.user.center_id)) {
      return res.status(403).json({ error: 'You can only update subjects in your own center.' });
    }

    const resolvedTeacherId = req.user?.userType === 'teacher' ? existing.rows[0].teacher_id : teacher_id;
    const result = await subject_DB.query(
      'UPDATE subjects SET subject_name = COALESCE($1, subject_name), subject_code = COALESCE($2, subject_code), teacher_id = COALESCE($3, teacher_id), total_marks = COALESCE($4, total_marks), passing_marks = COALESCE($5, passing_marks) WHERE subject_id = $6 RETURNING *',
      [subject_name, subject_code, resolvedTeacherId, total_marks, passing_marks, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update subject', details: error.message || error.toString() });
  }
};

exports.deleteSubject = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await subject_DB.query(
      `
        SELECT s.*, c.center_id
        FROM subjects s
        JOIN classes c ON c.class_id = s.class_id
        WHERE s.subject_id = $1
      `,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    if (req.user?.userType === 'teacher' && Number(existing.rows[0].teacher_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'You can only delete your own subjects.' });
    }

    if (req.user?.userType === 'superuser' && Number(existing.rows[0].center_id) !== Number(req.user.center_id)) {
      return res.status(403).json({ error: 'You can only delete subjects in your own center.' });
    }

    const result = await subject_DB.query('DELETE FROM subjects WHERE subject_id = $1 RETURNING *', [id]);
    res.json({ message: 'Subject deleted successfully', subject: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete subject', details: error.message || error.toString() });
  }
};
