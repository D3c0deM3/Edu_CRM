import subject_DB from '../../config/dbcon';

export const getAllSubjects = async (req: any, res: any) => {
  try {
    const result = await subject_DB.query('SELECT * FROM subjects ORDER BY subject_id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

export const getSubjectById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await subject_DB.query('SELECT * FROM subjects WHERE subject_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch subject', details: error.message || error.toString() });
  }
};

export const getSubjectsByClass = async (req: any, res: any) => {
  try {
    const { classId } = req.params;
    const result = await subject_DB.query('SELECT * FROM subjects WHERE class_id = ? ORDER BY subject_name', [classId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

export const createSubject = async (req: any, res: any) => {
  try {
    const { class_id, subject_name, subject_code, teacher_id, total_marks, passing_marks } = req.body;
    const result = await subject_DB.query(
      'INSERT INTO subjects (class_id, subject_name, subject_code, teacher_id, total_marks, passing_marks) VALUES (?, ?, ?, ?, ?, ?)',
      [class_id, subject_name, subject_code, teacher_id, total_marks || 100, passing_marks || 40]
    );
    const created = await subject_DB.query('SELECT * FROM subjects WHERE subject_id = ?', [result.insertId]);
    res.status(201).json(created.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create subject', details: error.message || error.toString() });
  }
};

export const updateSubject = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { subject_name, subject_code, teacher_id, total_marks, passing_marks } = req.body;
    const existing = await subject_DB.query('SELECT subject_id FROM subjects WHERE subject_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    await subject_DB.query(
      'UPDATE subjects SET subject_name = COALESCE(?, subject_name), subject_code = COALESCE(?, subject_code), teacher_id = COALESCE(?, teacher_id), total_marks = COALESCE(?, total_marks), passing_marks = COALESCE(?, passing_marks) WHERE subject_id = ?',
      [subject_name, subject_code, teacher_id, total_marks, passing_marks, id]
    );
    const updated = await subject_DB.query('SELECT * FROM subjects WHERE subject_id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update subject', details: error.message || error.toString() });
  }
};

export const deleteSubject = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await subject_DB.query('SELECT * FROM subjects WHERE subject_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    await subject_DB.query('DELETE FROM subjects WHERE subject_id = ?', [id]);
    res.json({ message: 'Subject deleted successfully', subject: existing.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete subject', details: error.message || error.toString() });
  }
};
