import grade_db from '../../config/dbcon';

export const getAllGrades = async (req: any, res: any) => {
  try {
    const result = await grade_db.query('SELECT * FROM grades ORDER BY grade_id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
};

export const getGradeById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await grade_db.query('SELECT * FROM grades WHERE grade_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch grade', details: error.message || error.toString() });
  }
};

export const createGrade = async (req: any, res: any) => {
  try {
    const { student_id, teacher_id, subject, class_id, marks_obtained, total_marks, percentage, grade_letter, academic_year, term } = req.body;
    const result = await grade_db.query(
      'INSERT INTO grades (student_id, teacher_id, subject, class_id, marks_obtained, total_marks, percentage, grade_letter, academic_year, term) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [student_id, teacher_id, subject, class_id, marks_obtained, total_marks || 100, percentage, grade_letter, academic_year, term]
    );
    const created = await grade_db.query('SELECT * FROM grades WHERE grade_id = ?', [result.insertId]);
    res.status(201).json(created.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create grade', details: error.message || error.toString() });
  }
};

export const updateGrade = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { marks_obtained, percentage, grade_letter } = req.body;
    const existing = await grade_db.query('SELECT grade_id FROM grades WHERE grade_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }
    await grade_db.query(
      'UPDATE grades SET marks_obtained = COALESCE(?, marks_obtained), percentage = COALESCE(?, percentage), grade_letter = COALESCE(?, grade_letter), updated_at = CURRENT_TIMESTAMP WHERE grade_id = ?',
      [marks_obtained, percentage, grade_letter, id]
    );
    const updated = await grade_db.query('SELECT * FROM grades WHERE grade_id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update grade', details: error.message || error.toString() });
  }
};

export const getGradesByStudent = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    const result = await grade_db.query('SELECT * FROM grades WHERE student_id = ? ORDER BY academic_year DESC, term', [studentId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
};

export const deleteGrade = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await grade_db.query('SELECT * FROM grades WHERE grade_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }
    await grade_db.query('DELETE FROM grades WHERE grade_id = ?', [id]);
    res.json({ message: 'Grade deleted successfully', grade: existing.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete grade', details: error.message || error.toString() });
  }
};
