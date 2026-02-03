import debt_db from '../../config/dbcon';

export const getAllDebts = async (req: any, res: any) => {
  try {
    const result = await debt_db.query('SELECT * FROM debts ORDER BY debt_id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
};

export const getDebtById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await debt_db.query('SELECT * FROM debts WHERE debt_id = ?', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch debt', details: error.message || error.toString() });
  }
};

export const createDebt = async (req: any, res: any) => {
  try {
    const { student_id, center_id, debt_amount, debt_date, due_date, amount_paid, remarks } = req.body;
    const balance = debt_amount - (amount_paid || 0);
    const result = await debt_db.query(
      'INSERT INTO debts (student_id, center_id, debt_amount, debt_date, due_date, amount_paid, balance, remarks) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [student_id, center_id, debt_amount, debt_date, due_date, amount_paid || 0, balance, remarks]
    );
    const created = await debt_db.query('SELECT * FROM debts WHERE debt_id = ?', [result.insertId]);
    res.status(201).json(created.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create debt', details: error.message || error.toString() });
  }
};

export const updateDebt = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { amount_paid, remarks } = req.body;
    
    // Get current debt info
    const currentDebt = await debt_db.query('SELECT debt_amount, amount_paid FROM debts WHERE debt_id = ?', [id]);
    if (currentDebt.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    
    const newAmountPaid = amount_paid || currentDebt.rows[0].amount_paid;
    const balance = currentDebt.rows[0].debt_amount - newAmountPaid;
    
    await debt_db.query(
      'UPDATE debts SET amount_paid = ?, balance = ?, remarks = COALESCE(?, remarks), updated_at = CURRENT_TIMESTAMP WHERE debt_id = ?',
      [newAmountPaid, balance, remarks, id]
    );
    const updated = await debt_db.query('SELECT * FROM debts WHERE debt_id = ?', [id]);
    res.json(updated.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update debt', details: error.message || error.toString() });
  }
};

export const getDebtsByStudent = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    const result = await debt_db.query('SELECT * FROM debts WHERE student_id = ? ORDER BY debt_date DESC', [studentId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
};

export const deleteDebt = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const existing = await debt_db.query('SELECT * FROM debts WHERE debt_id = ?', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    await debt_db.query('DELETE FROM debts WHERE debt_id = ?', [id]);
    res.json({ message: 'Debt deleted successfully', debt: existing.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete debt', details: error.message || error.toString() });
  }
};
