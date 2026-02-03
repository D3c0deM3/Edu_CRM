import payment_db from '../../config/dbcon';

export const getAllPayments = async (req: any, res: any) => {
  try {
    const result = await payment_db.query('SELECT * FROM payments ORDER BY payment_id DESC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message || error.toString() });
  }
};

export const getPaymentById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await payment_db.query('SELECT * FROM payments WHERE payment_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch payment', details: error.message || error.toString() });
  }
};

export const createPayment = async (req: any, res: any) => {
  try {
    const { student_id, center_id, payment_date, amount, currency, payment_method, transaction_reference, receipt_number, payment_status, payment_type, notes } = req.body;
    const result = await payment_db.query(
      'INSERT INTO payments (student_id, center_id, payment_date, amount, currency, payment_method, transaction_reference, receipt_number, payment_status, payment_type, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [student_id, center_id, payment_date, amount, currency || 'USD', payment_method || 'Cash', transaction_reference, receipt_number, payment_status || 'Completed', payment_type, notes]
    );
    const created = await payment_db.query('SELECT * FROM payments WHERE payment_id = ?', [result.insertId]);
    res.status(201).json(created.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create payment', details: error.message || error.toString() });
  }
};

export const updatePayment = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { amount, payment_status, notes } = req.body;
    const existing = await payment_db.query('SELECT payment_id FROM payments WHERE payment_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    await payment_db.query(
      'UPDATE payments SET amount = COALESCE(?, amount), payment_status = COALESCE(?, payment_status), notes = COALESCE(?, notes), updated_at = CURRENT_TIMESTAMP WHERE payment_id = ?',
      [amount, payment_status, notes, id]
    );
    const updated = await payment_db.query('SELECT * FROM payments WHERE payment_id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update payment', details: error.message || error.toString() });
  }
};

export const getPaymentsByStudent = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    const result = await payment_db.query('SELECT * FROM payments WHERE student_id = ? ORDER BY payment_date DESC', [studentId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message || error.toString() });
  }
};

export const deletePayment = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await payment_db.query('SELECT * FROM payments WHERE payment_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    await payment_db.query('DELETE FROM payments WHERE payment_id = ?', [id]);
    res.json({ message: 'Payment deleted successfully', payment: existing.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete payment', details: error.message || error.toString() });
  }
};
