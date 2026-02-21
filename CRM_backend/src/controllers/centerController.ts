const dc_db = require('../../config/dbcon');

exports.getAllCenters = async (req: any, res: any) => {
  try {
    const result = await dc_db.query('SELECT * FROM edu_centers ORDER BY center_id');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch centers', details: error.message || error.toString() });
  }
};

exports.getCenterById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await dc_db.query('SELECT * FROM edu_centers WHERE center_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Center not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch center', details: error.message || error.toString() });
  }
};

exports.createCenter = async (req: any, res: any) => {
  try {
    const { center_name, center_code, email, phone, address, city, principal_name } = req.body;
    const result = await dc_db.query(
      'INSERT INTO edu_centers (center_name, center_code, email, phone, address, city, principal_name) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [center_name, center_code, email, phone, address, city, principal_name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error in createCenter:', error.message);
    res.status(500).json({ error: 'Failed to create center', details: error.message || error.toString() });
  }
};

exports.updateCenter = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { center_name, email, phone, address, city, principal_name } = req.body;
    const result = await dc_db.query(
      'UPDATE edu_centers SET center_name = COALESCE($1, center_name), email = COALESCE($2, email), phone = COALESCE($3, phone), address = COALESCE($4, address), city = COALESCE($5, city), principal_name = COALESCE($6, principal_name), updated_at = CURRENT_TIMESTAMP WHERE center_id = $7 RETURNING *',
      [center_name, email, phone, address, city, principal_name, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Center not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update center', details: error.message || error.toString() });
  }
};

exports.deleteCenter = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await dc_db.query('DELETE FROM edu_centers WHERE center_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Center not found' });
    }
    res.json({ message: 'Center deleted successfully', center: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete center', details: error.message || error.toString() });
  }
};
