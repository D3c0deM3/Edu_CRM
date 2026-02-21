const debt_db = require('../../config/dbcon');

exports.getAllDebts = async (req: any, res: any) => {
  try {
    const result = await debt_db.query('SELECT * FROM debts ORDER BY debt_id DESC');
    res.json(result.rows);
  } catch (error) {
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
    const result = await debt_db.query('SELECT * FROM debts WHERE student_id = $1 ORDER BY debt_date DESC', [studentId]);
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
    const { center_id, start_date, end_date } = req.query;
    
    // Get all students
    let studentQuery = 'SELECT student_id, first_name, last_name, enrollment_number, center_id FROM students WHERE status = $1';
    const studentParams: any[] = ['Active'];
    
    if (center_id) {
      studentQuery += ' AND center_id = $2';
      studentParams.push(center_id);
    }
    
    const studentsResult = await debt_db.query(studentQuery, studentParams);
    const students = studentsResult.rows;

    // Determine date range for analysis (default: last 12 months)
    const endDate = end_date ? new Date(end_date) : new Date();
    const startDate = start_date ? new Date(start_date) : new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1);

    // Generate list of months to check
    const monthsToCheck: { year: number; month: number; label: string }[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      monthsToCheck.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1,
        label: current.toLocaleString('default', { month: 'long', year: 'numeric' })
      });
      current.setMonth(current.getMonth() + 1);
    }

    // Analyze each student
    interface AnalysisResult {
      student_id: number;
      student_name: string;
      enrollment_number: string;
      center_id: number;
      unpaid_months: { year: number; month: number; label: string }[];
      unpaid_months_count: number;
      total_payments: number;
      existing_debts: any[];
      total_debt_balance: number;
    }
    
    const analysisResults: AnalysisResult[] = [];

    for (const student of students) {
      // Get all payments for this student within the date range
      const paymentsResult = await debt_db.query(`
        SELECT payment_date, amount, payment_status, payment_type
        FROM payments 
        WHERE student_id = $1 
          AND payment_date >= $2 
          AND payment_date <= $3
          AND payment_status = 'Completed'
        ORDER BY payment_date ASC
      `, [student.student_id, startDate, endDate]);

      const payments = paymentsResult.rows;

      // Create a set of paid months
      const paidMonths = new Set<string>();
      payments.forEach((p: any) => {
        const date = new Date(p.payment_date);
        paidMonths.add(`${date.getFullYear()}-${date.getMonth() + 1}`);
      });

      // Find unpaid months
      const unpaidMonths = monthsToCheck.filter(m => 
        !paidMonths.has(`${m.year}-${m.month}`)
      );

      // Get existing debts for this student
      const debtsResult = await debt_db.query(`
        SELECT debt_id, debt_amount, debt_date, due_date, amount_paid, balance
        FROM debts 
        WHERE student_id = $1 AND balance > 0
        ORDER BY debt_date ASC
      `, [student.student_id]);

      const totalDebt = debtsResult.rows.reduce((sum: number, d: any) => sum + parseFloat(d.balance || 0), 0);

      if (unpaidMonths.length > 0 || totalDebt > 0) {
        analysisResults.push({
          student_id: student.student_id,
          student_name: `${student.first_name} ${student.last_name}`,
          enrollment_number: student.enrollment_number,
          center_id: student.center_id,
          unpaid_months: unpaidMonths,
          unpaid_months_count: unpaidMonths.length,
          total_payments: payments.length,
          existing_debts: debtsResult.rows,
          total_debt_balance: totalDebt
        });
      }
    }

    // Sort by unpaid months count (descending)
    analysisResults.sort((a, b) => b.unpaid_months_count - a.unpaid_months_count);

    res.json({
      analysis_period: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        months_analyzed: monthsToCheck.length
      },
      summary: {
        total_students_analyzed: students.length,
        students_with_unpaid_months: analysisResults.length,
        total_unpaid_instances: analysisResults.reduce((sum, r) => sum + r.unpaid_months_count, 0)
      },
      results: analysisResults
    });
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Failed to analyze unpaid months', details: error.message || error.toString() });
  }
};

// Generate debts for unpaid months
exports.generateDebtsFromAnalysis = async (req: any, res: any) => {
  try {
    const { student_ids, monthly_fee, center_id, remarks } = req.body;
    
    if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ error: 'student_ids array is required' });
    }

    if (!monthly_fee || monthly_fee <= 0) {
      return res.status(400).json({ error: 'valid monthly_fee is required' });
    }

    const createdDebts: any[] = [];
    const today = new Date();

    for (const studentId of student_ids) {
      // Get student's center if not provided
      let studentCenter = center_id;
      if (!studentCenter) {
        const studentResult = await debt_db.query('SELECT center_id FROM students WHERE student_id = $1', [studentId]);
        if (studentResult.rows.length > 0) {
          studentCenter = studentResult.rows[0].center_id;
        }
      }

      if (studentCenter) {
        const result = await debt_db.query(`
          INSERT INTO debts (student_id, center_id, debt_amount, debt_date, due_date, amount_paid, balance, remarks)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `, [
          studentId,
          studentCenter,
          monthly_fee,
          today,
          new Date(today.getFullYear(), today.getMonth() + 1, 15), // Due 15th of next month
          0,
          monthly_fee,
          remarks || 'Generated from unpaid months analysis'
        ]);
        createdDebts.push(result.rows[0]);
      }
    }

    res.status(201).json({
      message: `Created ${createdDebts.length} debt records`,
      debts: createdDebts
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
