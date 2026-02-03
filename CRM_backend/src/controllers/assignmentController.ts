import assignment_db from '../../config/dbcon';

export const getAllAssignments = async (req: any, res: any) => {
  try {
    const result = await assignment_db.query('SELECT * FROM assignments ORDER BY assignment_id DESC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments', details: error.message || error.toString() });
  }
};

export const getAssignmentById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await assignment_db.query('SELECT * FROM assignments WHERE assignment_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch assignment', details: error.message || error.toString() });
  }
};

export const createAssignment = async (req: any, res: any) => {
  try {
    const { class_id, assignment_title, description, due_date, submission_date, status } = req.body;
    const result = await assignment_db.query(
      'INSERT INTO assignments (class_id, assignment_title, description, due_date, submission_date, status) VALUES (?, ?, ?, ?, ?, ?)',
      [class_id, assignment_title, description, due_date, submission_date, status || 'Pending']
    );
    const created = await assignment_db.query('SELECT * FROM assignments WHERE assignment_id = ?', [result.insertId]);
    res.status(201).json(created.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create assignment', details: error.message || error.toString() });
  }
};

export const updateAssignment = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { assignment_title, description, due_date, status, grade } = req.body;
    const existing = await assignment_db.query('SELECT assignment_id FROM assignments WHERE assignment_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    await assignment_db.query(
      'UPDATE assignments SET assignment_title = COALESCE(?, assignment_title), description = COALESCE(?, description), due_date = COALESCE(?, due_date), status = COALESCE(?, status), grade = COALESCE(?, grade), updated_at = CURRENT_TIMESTAMP WHERE assignment_id = ?',
      [assignment_title, description, due_date, status, grade, id]
    );
    const updated = await assignment_db.query('SELECT * FROM assignments WHERE assignment_id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update assignment', details: error.message || error.toString() });
  }
};

export const deleteAssignment = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await assignment_db.query('SELECT * FROM assignments WHERE assignment_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    await assignment_db.query('DELETE FROM assignments WHERE assignment_id = ?', [id]);
    res.json({ message: 'Assignment deleted successfully', assignment: existing.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete assignment', details: error.message || error.toString() });
  }
};
