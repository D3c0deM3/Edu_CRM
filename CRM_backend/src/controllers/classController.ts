const class_db = require('../../config/dbcon');

exports.getAllClasses = async (req: any, res: any) => {
  try {
    const result = await class_db.query('SELECT * FROM classes ORDER BY class_id');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch classes', details: error.message || error.toString() });
  }
};

exports.getClassById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await class_db.query('SELECT * FROM classes WHERE class_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch class', details: error.message || error.toString() });
  }
};

exports.createClass = async (req: any, res: any) => {
  try {
    const { center_id, class_name, class_code, level, section, capacity, teacher_id, room_number, payment_amount, payment_frequency } = req.body;
    
    // Validate that teacher_id exists if provided
    let validatedTeacherId = teacher_id || null;
    if (teacher_id) {
      const teacherCheck = await class_db.query('SELECT teacher_id FROM teachers WHERE teacher_id = $1', [teacher_id]);
      if (teacherCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Teacher not found. Please provide a valid teacher_id' });
      }
    }
    
    const result = await class_db.query(
      'INSERT INTO classes (center_id, class_name, class_code, level, section, capacity, teacher_id, room_number, payment_amount, payment_frequency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [center_id, class_name, class_code, level, section, capacity, validatedTeacherId, room_number, payment_amount, payment_frequency || 'Monthly']
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create class', details: error.message || error.toString() });
  }
};

exports.updateClass = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { class_name, level, section, capacity, teacher_id, room_number, payment_amount } = req.body;
    const result = await class_db.query(
      'UPDATE classes SET class_name = COALESCE($1, class_name), level = COALESCE($2, level), section = COALESCE($3, section), capacity = COALESCE($4, capacity), teacher_id = COALESCE($5, teacher_id), room_number = COALESCE($6, room_number), payment_amount = COALESCE($7, payment_amount), updated_at = CURRENT_TIMESTAMP WHERE class_id = $8 RETURNING *',
      [class_name, level, section, capacity, teacher_id, room_number, payment_amount, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update class', details: error.message || error.toString() });
  }
};

exports.deleteClass = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await class_db.query('DELETE FROM classes WHERE class_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json({ message: 'Class deleted successfully', class: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete class', details: error.message || error.toString() });
  }
};
