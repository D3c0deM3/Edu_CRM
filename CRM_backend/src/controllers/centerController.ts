import dc_db from '../../config/dbcon';

export const getAllCenters = async (req: any, res: any) => {
  try {
    const result = await dc_db.query('SELECT * FROM edu_centers ORDER BY center_id');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch centers', details: error.message || error.toString() });
  }
};

export const getCenterById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await dc_db.query('SELECT * FROM edu_centers WHERE center_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Center not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch center', details: error.message || error.toString() });
  }
};

export const createCenter = async (req: any, res: any) => {
  try {
    const { center_name, center_code, email, phone, address, city, principal_name } = req.body;
    const result = await dc_db.query(
      'INSERT INTO edu_centers (center_name, center_code, email, phone, address, city, principal_name) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [center_name, center_code, email, phone, address, city, principal_name]
    );
    const created = await dc_db.query('SELECT * FROM edu_centers WHERE center_id = ?', [result.insertId]);
    res.status(201).json(created.rows[0]);
  } catch (error: any) {
    console.error('Database error in createCenter:', error.message);
    res.status(500).json({ error: 'Failed to create center', details: error.message || error.toString() });
  }
};

export const updateCenter = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { center_name, email, phone, address, city, principal_name } = req.body;
    const existing = await dc_db.query('SELECT center_id FROM edu_centers WHERE center_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Center not found' });
    }
    await dc_db.query(
      'UPDATE edu_centers SET center_name = COALESCE(?, center_name), email = COALESCE(?, email), phone = COALESCE(?, phone), address = COALESCE(?, address), city = COALESCE(?, city), principal_name = COALESCE(?, principal_name), updated_at = CURRENT_TIMESTAMP WHERE center_id = ?',
      [center_name, email, phone, address, city, principal_name, id]
    );
    const updated = await dc_db.query('SELECT * FROM edu_centers WHERE center_id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update center', details: error.message || error.toString() });
  }
};

export const deleteCenter = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await dc_db.query('SELECT * FROM edu_centers WHERE center_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Center not found' });
    }
    await dc_db.query('DELETE FROM edu_centers WHERE center_id = ?', [id]);
    res.json({ message: 'Center deleted successfully', center: existing.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete center', details: error.message || error.toString() });
  }
};
