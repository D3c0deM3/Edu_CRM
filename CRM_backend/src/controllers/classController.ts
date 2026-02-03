import class_db from '../../config/dbcon';

export const getAllClasses = async (req: any, res: any) => {
  try {
    const result = await class_db.query('SELECT * FROM classes ORDER BY class_id');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch classes', details: error.message || error.toString() });
  }
};

export const getClassById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await class_db.query('SELECT * FROM classes WHERE class_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch class', details: error.message || error.toString() });
  }
};

export const createClass = async (req: any, res: any) => {
  try {
    const { center_id, class_name, class_code, level, section, capacity, teacher_id, room_number, payment_amount, payment_frequency } = req.body;
    
    // Validate that teacher_id exists if provided
    let validatedTeacherId = teacher_id || null;
    if (teacher_id) {
      const teacherCheck = await class_db.query('SELECT teacher_id FROM teachers WHERE teacher_id = ?', [teacher_id]);
      if (teacherCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Teacher not found. Please provide a valid teacher_id' });
      }
    }
    
    const result = await class_db.query(
      'INSERT INTO classes (center_id, class_name, class_code, level, section, capacity, teacher_id, room_number, payment_amount, payment_frequency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [center_id, class_name, class_code, level, section, capacity, validatedTeacherId, room_number, payment_amount, payment_frequency || 'Monthly']
    );
    const created = await class_db.query('SELECT * FROM classes WHERE class_id = ?', [result.insertId]);
    res.status(201).json(created.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create class', details: error.message || error.toString() });
  }
};

export const updateClass = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { class_name, level, section, capacity, teacher_id, room_number, payment_amount } = req.body;
    const existing = await class_db.query('SELECT class_id FROM classes WHERE class_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    await class_db.query(
      'UPDATE classes SET class_name = COALESCE(?, class_name), level = COALESCE(?, level), section = COALESCE(?, section), capacity = COALESCE(?, capacity), teacher_id = COALESCE(?, teacher_id), room_number = COALESCE(?, room_number), payment_amount = COALESCE(?, payment_amount), updated_at = CURRENT_TIMESTAMP WHERE class_id = ?',
      [class_name, level, section, capacity, teacher_id, room_number, payment_amount, id]
    );
    const updated = await class_db.query('SELECT * FROM classes WHERE class_id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update class', details: error.message || error.toString() });
  }
};

export const deleteClass = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await class_db.query('SELECT * FROM classes WHERE class_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    await class_db.query('DELETE FROM classes WHERE class_id = ?', [id]);
    res.json({ message: 'Class deleted successfully', class: existing.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete class', details: error.message || error.toString() });
  }
};
