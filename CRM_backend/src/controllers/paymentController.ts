const payment_db = require('../../config/dbcon');

exports.getAllPayments = async (req: any, res: any) => {
  try {
    const result = await payment_db.query('SELECT * FROM payments ORDER BY payment_id DESC');
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message || error.toString() });
  }
};

exports.getPaymentById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await payment_db.query('SELECT * FROM payments WHERE payment_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch payment', details: error.message || error.toString() });
  }
};

exports.createPayment = async (req: any, res: any) => {
  try {
    const { student_id, center_id, payment_date, amount, currency, payment_method, transaction_reference, receipt_number, payment_status, payment_type, notes } = req.body;
    const result = await payment_db.query(
      'INSERT INTO payments (student_id, center_id, payment_date, amount, currency, payment_method, transaction_reference, receipt_number, payment_status, payment_type, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [student_id, center_id, payment_date, amount, currency || 'USD', payment_method || 'Cash', transaction_reference, receipt_number, payment_status || 'Completed', payment_type, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create payment', details: error.message || error.toString() });
  }
};

exports.updatePayment = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { amount, payment_status, notes } = req.body;
    const result = await payment_db.query(
      'UPDATE payments SET amount = COALESCE($1, amount), payment_status = COALESCE($2, payment_status), notes = COALESCE($3, notes), updated_at = CURRENT_TIMESTAMP WHERE payment_id = $4 RETURNING *',
      [amount, payment_status, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update payment', details: error.message || error.toString() });
  }
};

exports.getPaymentsByStudent = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    const result = await payment_db.query('SELECT * FROM payments WHERE student_id = $1 ORDER BY payment_date DESC', [studentId]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message || error.toString() });
  }
};

exports.deletePayment = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await payment_db.query('DELETE FROM payments WHERE payment_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json({ message: 'Payment deleted successfully', payment: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete payment', details: error.message || error.toString() });
  }
};
