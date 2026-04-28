const class_db = require('../../config/dbcon');

let classSchemaReady: Promise<void> | null = null;

const ensureClassSchema = async () => {
  if (!classSchemaReady) {
    classSchemaReady = (async () => {
      await class_db.query(`
        ALTER TABLE classes
        ALTER COLUMN level TYPE VARCHAR(100) USING level::text
      `);
      await class_db.query(`
        ALTER TABLE classes
        ALTER COLUMN section TYPE TEXT
      `);
    })().catch((error: any) => {
      classSchemaReady = null;
      throw error;
    });
  }

  return classSchemaReady;
};

exports.getAllClasses = async (req: any, res: any) => {
  try {
    await ensureClassSchema();
    const center_id = req.user?.center_id;
    if (!center_id) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }
    const values: any[] = [center_id];
    const filters = ['c.center_id = $1'];

    if (req.user?.userType === 'teacher') {
      values.push(req.user.id);
      filters.push(`c.teacher_id = $${values.length}`);
    }

    const result = await class_db.query(
      `
        SELECT
          c.*,
          t.first_name AS teacher_first_name,
          t.last_name AS teacher_last_name,
          CASE
            WHEN t.teacher_id IS NULL THEN NULL
            ELSE CONCAT(t.first_name, ' ', t.last_name)
          END AS teacher_name
        FROM classes c
        LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
        WHERE ${filters.join(' AND ')}
        ORDER BY c.class_id
      `,
      values
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch classes', details: error.message || error.toString() });
  }
};

exports.getClassById = async (req: any, res: any) => {
  try {
    await ensureClassSchema();
    const { id } = req.params;
    const result = await class_db.query(
      `
        SELECT
          c.*,
          t.first_name AS teacher_first_name,
          t.last_name AS teacher_last_name,
          CASE
            WHEN t.teacher_id IS NULL THEN NULL
            ELSE CONCAT(t.first_name, ' ', t.last_name)
          END AS teacher_name
        FROM classes c
        LEFT JOIN teachers t ON t.teacher_id = c.teacher_id
        WHERE c.class_id = $1
      `,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    if (req.user?.userType === 'teacher' && Number(result.rows[0].teacher_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'You can only view your own classes.' });
    }
    if (req.user?.userType === 'superuser' && Number(result.rows[0].center_id) !== Number(req.user.center_id)) {
      return res.status(403).json({ error: 'You can only view classes in your own center.' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch class', details: error.message || error.toString() });
  }
};

exports.createClass = async (req: any, res: any) => {
  try {
    await ensureClassSchema();
    const { center_id, class_name, class_code, level, section, capacity, teacher_id, room_number, payment_amount, payment_frequency } = req.body;
    const resolvedCenterId = req.user?.center_id || center_id;
    
    // Validate that teacher_id exists if provided
    let validatedTeacherId = req.user?.userType === 'teacher' ? Number(req.user.id) : teacher_id || null;
    if (validatedTeacherId) {
      const teacherCheck = await class_db.query(
        'SELECT teacher_id FROM teachers WHERE teacher_id = $1 AND center_id = $2',
        [validatedTeacherId, resolvedCenterId]
      );
      if (teacherCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Teacher not found. Please provide a valid teacher_id' });
      }
    }
    
    const result = await class_db.query(
      'INSERT INTO classes (center_id, class_name, class_code, level, section, capacity, teacher_id, room_number, payment_amount, payment_frequency) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [resolvedCenterId, class_name, class_code, level, section, capacity, validatedTeacherId, room_number, payment_amount, payment_frequency || 'Monthly']
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create class', details: error.message || error.toString() });
  }
};

exports.updateClass = async (req: any, res: any) => {
  try {
    await ensureClassSchema();
    const { id } = req.params;
    const { class_name, level, section, capacity, teacher_id, room_number, payment_amount, payment_frequency } = req.body;
    const existing = await class_db.query('SELECT class_id, center_id, teacher_id FROM classes WHERE class_id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Class not found' });
    }
    if (req.user?.userType === 'teacher' && Number(existing.rows[0].teacher_id) !== Number(req.user.id)) {
      return res.status(403).json({ error: 'You can only update your own classes.' });
    }
    if (req.user?.userType === 'superuser' && Number(existing.rows[0].center_id) !== Number(req.user.center_id)) {
      return res.status(403).json({ error: 'You can only update classes in your own center.' });
    }

    const nextTeacherId = req.user?.userType === 'teacher' ? existing.rows[0].teacher_id : teacher_id;
    const result = await class_db.query(
      'UPDATE classes SET class_name = COALESCE($1, class_name), level = COALESCE($2, level), section = COALESCE($3, section), capacity = COALESCE($4, capacity), teacher_id = COALESCE($5, teacher_id), room_number = COALESCE($6, room_number), payment_amount = COALESCE($7, payment_amount), payment_frequency = COALESCE($8, payment_frequency), updated_at = CURRENT_TIMESTAMP WHERE class_id = $9 RETURNING *',
      [class_name, level, section, capacity, nextTeacherId, room_number, payment_amount, payment_frequency, id]
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
