const grade_db = require('../../config/dbcon');

exports.getAllGrades = async (req: any, res: any) => {
  try {
    const result = await grade_db.query('SELECT * FROM grades ORDER BY grade_id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
};

exports.getGradeById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await grade_db.query('SELECT * FROM grades WHERE grade_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch grade', details: error.message || error.toString() });
  }
};

exports.createGrade = async (req: any, res: any) => {
  try {
    const { student_id, teacher_id, subject, class_id, marks_obtained, total_marks, percentage, grade_letter, academic_year, term } = req.body;
    const result = await grade_db.query(
      'INSERT INTO grades (student_id, teacher_id, subject, class_id, marks_obtained, total_marks, percentage, grade_letter, academic_year, term) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [student_id, teacher_id, subject, class_id, marks_obtained, total_marks || 100, percentage, grade_letter, academic_year, term]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create grade', details: error.message || error.toString() });
  }
};

exports.updateGrade = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { marks_obtained, percentage, grade_letter } = req.body;
    const result = await grade_db.query(
      'UPDATE grades SET marks_obtained = COALESCE($1, marks_obtained), percentage = COALESCE($2, percentage), grade_letter = COALESCE($3, grade_letter), updated_at = CURRENT_TIMESTAMP WHERE grade_id = $4 RETURNING *',
      [marks_obtained, percentage, grade_letter, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update grade', details: error.message || error.toString() });
  }
};

exports.getGradesByStudent = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    const result = await grade_db.query('SELECT * FROM grades WHERE student_id = $1 ORDER BY academic_year DESC, term', [studentId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch grades' });
  }
};

exports.deleteGrade = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await grade_db.query('DELETE FROM grades WHERE grade_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Grade not found' });
    }
    res.json({ message: 'Grade deleted successfully', grade: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete grade', details: error.message || error.toString() });
  }
};

exports.createBulkGrades = async (req: any, res: any) => {
  try {
    const { grades } = req.body;
    if (!Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ error: 'grades must be a non-empty array' });
    }

    const results: any[] = [];
    for (const grade of grades) {
      const { student_id, teacher_id, subject, class_id, marks_obtained, total_marks, percentage, grade_letter, academic_year, term } = grade;
      const result = await grade_db.query(
        'INSERT INTO grades (student_id, teacher_id, subject, class_id, marks_obtained, total_marks, percentage, grade_letter, academic_year, term) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
        [student_id, teacher_id, subject, class_id, marks_obtained, total_marks || 100, percentage, grade_letter, academic_year, term]
      );
      results.push(result.rows[0]);
    }

    res.status(201).json({ message: `${results.length} grades created successfully`, grades: results });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create bulk grades', details: error.message || error.toString() });
  }
};
