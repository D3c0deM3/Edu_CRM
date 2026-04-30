const dc_db = require('../../config/dbcon');
const { runParentPaymentReminderSweep } = require('../services/parentBotService');

let centerReminderColumnReady: Promise<void> | null = null;

const ensureCenterReminderColumn = async (): Promise<void> => {
  if (!centerReminderColumnReady) {
    centerReminderColumnReady = dc_db.query(`
      ALTER TABLE edu_centers
      ADD COLUMN IF NOT EXISTS teacher_class_warning_minutes INT DEFAULT 15
    `)
      .then(() =>
        dc_db.query(`
          ALTER TABLE edu_centers
          ADD COLUMN IF NOT EXISTS parent_payment_warning_days INT DEFAULT 3
        `)
      )
      .then(() => undefined)
      .catch((error: any) => {
        centerReminderColumnReady = null;
        throw error;
      });
  }

  await centerReminderColumnReady;
};

exports.getAllCenters = async (req: any, res: any) => {
  try {
    await ensureCenterReminderColumn();
    const result = await dc_db.query('SELECT * FROM edu_centers ORDER BY center_id');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch centers', details: error.message || error.toString() });
  }
};

exports.getCenterById = async (req: any, res: any) => {
  try {
    await ensureCenterReminderColumn();
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
    await ensureCenterReminderColumn();
    const {
      center_name,
      center_code,
      email,
      phone,
      address,
      city,
      principal_name,
      teacher_class_warning_minutes,
      parent_payment_warning_days,
    } = req.body;
    const result = await dc_db.query(
      'INSERT INTO edu_centers (center_name, center_code, email, phone, address, city, principal_name, teacher_class_warning_minutes, parent_payment_warning_days) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        center_name,
        center_code,
        email,
        phone,
        address,
        city,
        principal_name,
        Number.isFinite(Number(teacher_class_warning_minutes)) ? Number(teacher_class_warning_minutes) : 15,
        Number.isFinite(Number(parent_payment_warning_days)) ? Number(parent_payment_warning_days) : 3,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error in createCenter:', error.message);
    res.status(500).json({ error: 'Failed to create center', details: error.message || error.toString() });
  }
};

exports.updateCenter = async (req: any, res: any) => {
  try {
    await ensureCenterReminderColumn();
    const { id } = req.params;
    const {
      center_name,
      email,
      phone,
      address,
      city,
      principal_name,
      teacher_class_warning_minutes,
      parent_payment_warning_days,
    } = req.body;
    const result = await dc_db.query(
      'UPDATE edu_centers SET center_name = COALESCE($1, center_name), email = COALESCE($2, email), phone = COALESCE($3, phone), address = COALESCE($4, address), city = COALESCE($5, city), principal_name = COALESCE($6, principal_name), teacher_class_warning_minutes = COALESCE($7, teacher_class_warning_minutes), parent_payment_warning_days = COALESCE($8, parent_payment_warning_days), updated_at = CURRENT_TIMESTAMP WHERE center_id = $9 RETURNING *',
      [
        center_name,
        email,
        phone,
        address,
        city,
        principal_name,
        Number.isFinite(Number(teacher_class_warning_minutes)) ? Number(teacher_class_warning_minutes) : null,
        Number.isFinite(Number(parent_payment_warning_days)) ? Number(parent_payment_warning_days) : null,
        id,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Center not found' });
    }

    if (parent_payment_warning_days !== undefined) {
      await runParentPaymentReminderSweep({ centerId: Number(result.rows[0].center_id) });
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
