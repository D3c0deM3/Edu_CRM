const assignment_db = require('../../config/dbcon');

exports.getAllAssignments = async (req: any, res: any) => {
  try {
    const result = await assignment_db.query('SELECT * FROM assignments ORDER BY assignment_id DESC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch assignments', details: error.message || error.toString() });
  }
};

exports.getAssignmentById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await assignment_db.query('SELECT * FROM assignments WHERE assignment_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch assignment', details: error.message || error.toString() });
  }
};

exports.createAssignment = async (req: any, res: any) => {
  try {
    const { class_id, assignment_title, description, due_date, submission_date, status } = req.body;
    const result = await assignment_db.query(
      'INSERT INTO assignments (class_id, assignment_title, description, due_date, submission_date, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [class_id, assignment_title, description, due_date, submission_date, status || 'Pending']
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create assignment', details: error.message || error.toString() });
  }
};

exports.updateAssignment = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { assignment_title, description, due_date, status, grade } = req.body;
    const result = await assignment_db.query(
      'UPDATE assignments SET assignment_title = COALESCE($1, assignment_title), description = COALESCE($2, description), due_date = COALESCE($3, due_date), status = COALESCE($4, status), grade = COALESCE($5, grade), updated_at = CURRENT_TIMESTAMP WHERE assignment_id = $6 RETURNING *',
      [assignment_title, description, due_date, status, grade, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update assignment', details: error.message || error.toString() });
  }
};

exports.deleteAssignment = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await assignment_db.query('DELETE FROM assignments WHERE assignment_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json({ message: 'Assignment deleted successfully', assignment: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete assignment', details: error.message || error.toString() });
  }
};
