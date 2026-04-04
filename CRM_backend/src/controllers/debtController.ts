const debt_db = require('../../config/dbcon');
const {
  getMonthlyDebtAnalysis,
  getOutstandingDebtsForStudents,
  syncAutoDebtsForCenter,
} = require('../services/autoDebtService');

exports.getAllDebts = async (req: any, res: any) => {
  try {
    const center_id = req.user?.center_id;
    if (!center_id) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }
    await syncAutoDebtsForCenter(center_id);
    const result = await debt_db.query('SELECT * FROM debts WHERE center_id = $1 ORDER BY debt_id DESC', [center_id]);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
};

exports.getDebtById = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await debt_db.query('SELECT * FROM debts WHERE debt_id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch debt', details: error.message || error.toString() });
  }
};

exports.createDebt = async (req: any, res: any) => {
  try {
    const { student_id, center_id, debt_amount, debt_date, due_date, amount_paid, remarks } = req.body;
    const balance = debt_amount - (amount_paid || 0);
    const result = await debt_db.query(
      'INSERT INTO debts (student_id, center_id, debt_amount, debt_date, due_date, amount_paid, balance, remarks) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [student_id, center_id, debt_amount, debt_date, due_date, amount_paid || 0, balance, remarks]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to create debt', details: error.message || error.toString() });
  }
};

exports.updateDebt = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { amount_paid, remarks } = req.body;
    
    // Get current debt info
    const currentDebt = await debt_db.query('SELECT debt_amount, amount_paid FROM debts WHERE debt_id = $1', [id]);
    if (currentDebt.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    
    const newAmountPaid = amount_paid || currentDebt.rows[0].amount_paid;
    const balance = currentDebt.rows[0].debt_amount - newAmountPaid;
    
    const result = await debt_db.query(
      'UPDATE debts SET amount_paid = $1, balance = $2, remarks = COALESCE($3, remarks), updated_at = CURRENT_TIMESTAMP WHERE debt_id = $4 RETURNING *',
      [newAmountPaid, balance, remarks, id]
    );
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to update debt', details: error.message || error.toString() });
  }
};

exports.getDebtsByStudent = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    const center_id = req.user?.center_id;
    if (center_id) {
      await syncAutoDebtsForCenter(center_id, [Number(studentId)]);
    }
    const result = await debt_db.query(
      'SELECT * FROM debts WHERE student_id = $1 AND center_id = $2 ORDER BY debt_date DESC',
      [studentId, center_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to fetch debts' });
  }
};

exports.deleteDebt = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const result = await debt_db.query('DELETE FROM debts WHERE debt_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Debt not found' });
    }
    res.json({ message: 'Debt deleted successfully', debt: result.rows[0] });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to delete debt', details: error.message || error.toString() });
  }
};

// ============================================================================
// Debt Analysis - Analyze unpaid months for students
// ============================================================================

exports.analyzeUnpaidMonths = async (req: any, res: any) => {
  try {
    const center_id = req.user?.center_id;
    if (!center_id) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }
    const { start_date, end_date } = req.query;
    const analysis = await getMonthlyDebtAnalysis(center_id, {
      startDate: start_date,
      endDate: end_date,
    });
    res.json(analysis);
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to analyze unpaid months', details: error.message || error.toString() });
  }
};

// Generate debts for unpaid months
exports.generateDebtsFromAnalysis = async (req: any, res: any) => {
  try {
    const { student_ids } = req.body;
    const center_id = req.user?.center_id;
    if (!center_id) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }
    
    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ error: 'student_ids array is required' });
    }

    await syncAutoDebtsForCenter(center_id, student_ids);
    const debts = await getOutstandingDebtsForStudents(center_id, student_ids);

    res.status(201).json({
      message: `Synchronized automatic debt records for ${student_ids.length} student(s)`,
      debts,
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to generate debts', details: error.message || error.toString() });
  }
};

// Get payment summary by student
exports.getPaymentSummary = async (req: any, res: any) => {
  try {
    const { studentId } = req.params;
    const center_id = req.user?.center_id;
    if (center_id) {
      await syncAutoDebtsForCenter(center_id, [Number(studentId)]);
    }
    
    // Get all payments
    const paymentsResult = await debt_db.query(`
      SELECT 
        EXTRACT(YEAR FROM payment_date) as year,
        EXTRACT(MONTH FROM payment_date) as month,
        SUM(amount) as total_paid,
        COUNT(*) as payment_count
      FROM payments 
      WHERE student_id = $1 AND payment_status = 'Completed'
      GROUP BY EXTRACT(YEAR FROM payment_date), EXTRACT(MONTH FROM payment_date)
      ORDER BY year DESC, month DESC
    `, [studentId]);

    // Get all debts
    const debtsResult = await debt_db.query(`
      SELECT 
        SUM(debt_amount) as total_debt,
        SUM(amount_paid) as total_paid,
        SUM(balance) as total_balance
      FROM debts 
      WHERE student_id = $1
    `, [studentId]);

    res.json({
      monthly_payments: paymentsResult.rows,
      debt_summary: debtsResult.rows[0] || { total_debt: 0, total_paid: 0, total_balance: 0 }
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to get payment summary', details: error.message || error.toString() });
  }
};

export {};
