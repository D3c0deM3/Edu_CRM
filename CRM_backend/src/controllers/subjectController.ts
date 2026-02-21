const subject_DB = require('../../config/dbcon');

exports.getAllSubjects = async (req: any, res: any) => {
  try {
    const result = await subject_DB.query('SELECT * FROM subjects ORDER BY subject_id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

exports.getSubjectById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await subject_DB.query('SELECT * FROM subjects WHERE subject_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
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
    const result = await subject_DB.query('SELECT * FROM subjects WHERE class_id = $1 ORDER BY subject_name', [classId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
};

exports.createSubject = async (req: any, res: any) => {
  try {
    const { class_id, subject_name, subject_code, teacher_id, total_marks, passing_marks } = req.body;
    const result = await subject_DB.query(
      'INSERT INTO subjects (class_id, subject_name, subject_code, teacher_id, total_marks, passing_marks) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [class_id, subject_name, subject_code, teacher_id, total_marks || 100, passing_marks || 40]
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
    const result = await subject_DB.query(
      'UPDATE subjects SET subject_name = COALESCE($1, subject_name), subject_code = COALESCE($2, subject_code), teacher_id = COALESCE($3, teacher_id), total_marks = COALESCE($4, total_marks), passing_marks = COALESCE($5, passing_marks) WHERE subject_id = $6 RETURNING *',
      [subject_name, subject_code, teacher_id, total_marks, passing_marks, id]
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
    const result = await subject_DB.query('DELETE FROM subjects WHERE subject_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    res.json({ message: 'Subject deleted successfully', subject: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete subject', details: error.message || error.toString() });
  }
};
