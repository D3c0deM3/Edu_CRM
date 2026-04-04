const salaryDb = require('../../config/dbcon');

let teacherSalaryTablesReady: Promise<void> | null = null;

const roundMoney = (value: number): number =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeOptionalText = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const ensureTeacherSalaryTables = async (): Promise<void> => {
  if (!teacherSalaryTablesReady) {
    teacherSalaryTablesReady = (async () => {
      await salaryDb.query(`
        CREATE TABLE IF NOT EXISTS teacher_salary_rates (
          rate_id SERIAL PRIMARY KEY,
          center_id INT NOT NULL REFERENCES edu_centers(center_id) ON DELETE CASCADE,
          teacher_id INT NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
          class_id INT NOT NULL REFERENCES classes(class_id) ON DELETE CASCADE,
          monthly_salary_amount DECIMAL(12,2) NOT NULL CHECK (monthly_salary_amount >= 0),
          effective_from DATE DEFAULT CURRENT_DATE,
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (class_id)
        )
      `);

      await salaryDb.query(`
        CREATE TABLE IF NOT EXISTS teacher_salary_payments (
          salary_payment_id SERIAL PRIMARY KEY,
          center_id INT NOT NULL REFERENCES edu_centers(center_id) ON DELETE CASCADE,
          teacher_id INT NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
          salary_year INT NOT NULL CHECK (salary_year >= 2000),
          salary_month INT NOT NULL CHECK (salary_month BETWEEN 1 AND 12),
          amount_paid DECIMAL(12,2) NOT NULL CHECK (amount_paid >= 0),
          payment_date DATE NOT NULL,
          payment_method VARCHAR(50) DEFAULT 'Cash',
          notes TEXT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await salaryDb.query(`
        CREATE INDEX IF NOT EXISTS idx_teacher_salary_rates_center_teacher
        ON teacher_salary_rates(center_id, teacher_id)
      `);

      await salaryDb.query(`
        CREATE INDEX IF NOT EXISTS idx_teacher_salary_payments_center_period
        ON teacher_salary_payments(center_id, salary_year, salary_month, teacher_id)
      `);
    })().catch((error: any) => {
      teacherSalaryTablesReady = null;
      throw error;
    });
  }

  await teacherSalaryTablesReady;
};

const getCenterId = (req: any): number | null => {
  const centerId = Number(req.user?.center_id);
  return Number.isFinite(centerId) && centerId > 0 ? centerId : null;
};

const parseMonth = (value: unknown, fallback: number): number => {
  const month = Number(value);
  return Number.isInteger(month) && month >= 1 && month <= 12 ? month : fallback;
};

const parseYear = (value: unknown, fallback: number): number => {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2000 && year <= 3000 ? year : fallback;
};

const getTeacherById = async (centerId: number, teacherId: number) => {
  const result = await salaryDb.query(
    `
      SELECT teacher_id, center_id, first_name, last_name, status
      FROM teachers
      WHERE center_id = $1 AND teacher_id = $2
    `,
    [centerId, teacherId]
  );

  return result.rows[0] || null;
};

const getClassById = async (centerId: number, classId: number) => {
  const result = await salaryDb.query(
    `
      SELECT class_id, center_id, class_name, class_code, teacher_id
      FROM classes
      WHERE center_id = $1 AND class_id = $2
    `,
    [centerId, classId]
  );

  return result.rows[0] || null;
};

const validateRatePayload = async (
  centerId: number,
  teacherId: number,
  classId: number,
  monthlySalaryAmount: number
) => {
  if (!teacherId || !classId) {
    return 'teacher_id and class_id are required';
  }

  if (monthlySalaryAmount <= 0) {
    return 'monthly_salary_amount must be greater than 0';
  }

  const [teacher, classRecord] = await Promise.all([
    getTeacherById(centerId, teacherId),
    getClassById(centerId, classId),
  ]);

  if (!teacher) {
    return 'Teacher not found for this center';
  }

  if (!classRecord) {
    return 'Class not found for this center';
  }

  if (!classRecord.teacher_id) {
    return 'Assign a teacher to this class before setting salary';
  }

  if (Number(classRecord.teacher_id) !== Number(teacherId)) {
    return 'This salary can only be configured for the teacher currently assigned to the class';
  }

  return null;
};

exports.getSalaryOverview = async (req: any, res: any) => {
  try {
    await ensureTeacherSalaryTables();

    const centerId = getCenterId(req);
    if (!centerId) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    const now = new Date();
    const month = parseMonth(req.query.month, now.getMonth() + 1);
    const year = parseYear(req.query.year, now.getFullYear());

    const [teachersResult, classesResult, ratesResult, paymentsResult] = await Promise.all([
      salaryDb.query(
        `
          SELECT teacher_id, employee_id, first_name, last_name, status
          FROM teachers
          WHERE center_id = $1
          ORDER BY first_name ASC, last_name ASC
        `,
        [centerId]
      ),
      salaryDb.query(
        `
          SELECT class_id, class_name, class_code, teacher_id
          FROM classes
          WHERE center_id = $1
          ORDER BY class_name ASC
        `,
        [centerId]
      ),
      salaryDb.query(
        `
          SELECT
            r.rate_id,
            r.teacher_id,
            r.class_id,
            r.monthly_salary_amount,
            r.effective_from,
            r.notes,
            c.class_name,
            c.class_code,
            c.teacher_id AS assigned_teacher_id
          FROM teacher_salary_rates r
          JOIN classes c ON c.class_id = r.class_id
          WHERE r.center_id = $1
          ORDER BY c.class_name ASC
        `,
        [centerId]
      ),
      salaryDb.query(
        `
          SELECT
            salary_payment_id,
            teacher_id,
            salary_year,
            salary_month,
            amount_paid,
            payment_date,
            payment_method,
            notes
          FROM teacher_salary_payments
          WHERE center_id = $1
            AND salary_year = $2
            AND salary_month = $3
          ORDER BY payment_date DESC, salary_payment_id DESC
        `,
        [centerId, year, month]
      ),
    ]);

    const teachers = teachersResult.rows;
    const classes = classesResult.rows;
    const rates = ratesResult.rows;
    const payments = paymentsResult.rows;

    const paymentsByTeacher = new Map<number, any[]>();
    payments.forEach((payment: any) => {
      const current = paymentsByTeacher.get(payment.teacher_id) || [];
      current.push(payment);
      paymentsByTeacher.set(payment.teacher_id, current);
    });

    const ratesByTeacher = new Map<number, any[]>();
    rates.forEach((rate: any) => {
      const current = ratesByTeacher.get(rate.teacher_id) || [];
      current.push(rate);
      ratesByTeacher.set(rate.teacher_id, current);
    });

    const summary = {
      total_expected_salary: 0,
      total_paid_salary: 0,
      total_outstanding_salary: 0,
      teachers_with_balance_due: 0,
    };

    const teacherSummaries = teachers.map((teacher: any) => {
      const assignedClasses = classes.filter(
        (classItem: any) => Number(classItem.teacher_id) === Number(teacher.teacher_id)
      );
      const configuredRates = (ratesByTeacher.get(teacher.teacher_id) || []).filter(
        (rate: any) => Number(rate.assigned_teacher_id) === Number(rate.teacher_id)
      );
      const expectedSalary = roundMoney(
        configuredRates.reduce(
          (sum: number, rate: any) => sum + toNumber(rate.monthly_salary_amount),
          0
        )
      );
      const teacherPayments = paymentsByTeacher.get(teacher.teacher_id) || [];
      const totalPaid = roundMoney(
        teacherPayments.reduce((sum: number, payment: any) => sum + toNumber(payment.amount_paid), 0)
      );
      const outstandingBalance = roundMoney(Math.max(expectedSalary - totalPaid, 0));

      summary.total_expected_salary += expectedSalary;
      summary.total_paid_salary += totalPaid;
      summary.total_outstanding_salary += outstandingBalance;
      if (outstandingBalance > 0.009) {
        summary.teachers_with_balance_due += 1;
      }

      return {
        teacher_id: teacher.teacher_id,
        teacher_name: `${teacher.first_name} ${teacher.last_name}`,
        employee_id: teacher.employee_id,
        status: teacher.status,
        assigned_classes_count: assignedClasses.length,
        configured_rates_count: configuredRates.length,
        expected_salary: expectedSalary,
        total_paid: totalPaid,
        outstanding_balance: outstandingBalance,
        class_breakdown: configuredRates.map((rate: any) => ({
          rate_id: rate.rate_id,
          class_id: rate.class_id,
          class_name: rate.class_name,
          class_code: rate.class_code,
          monthly_salary_amount: roundMoney(toNumber(rate.monthly_salary_amount)),
          effective_from: rate.effective_from,
        })),
      };
    });

    res.json({
      period: {
        month,
        year,
      },
      summary: {
        total_expected_salary: roundMoney(summary.total_expected_salary),
        total_paid_salary: roundMoney(summary.total_paid_salary),
        total_outstanding_salary: roundMoney(summary.total_outstanding_salary),
        teachers_with_balance_due: summary.teachers_with_balance_due,
      },
      teachers: teacherSummaries.sort(
        (left: any, right: any) => right.outstanding_balance - left.outstanding_balance
      ),
    });
  } catch (error: any) {
    console.error('Teacher salary overview error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher salary overview', details: error.message || error.toString() });
  }
};

exports.getSalaryRates = async (req: any, res: any) => {
  try {
    await ensureTeacherSalaryTables();

    const centerId = getCenterId(req);
    if (!centerId) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    const result = await salaryDb.query(
      `
        SELECT
          r.rate_id,
          r.center_id,
          r.teacher_id,
          r.class_id,
          r.monthly_salary_amount,
          r.effective_from,
          r.notes,
          r.created_at,
          r.updated_at,
          CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,
          t.employee_id,
          c.class_name,
          c.class_code,
          c.teacher_id AS assigned_teacher_id,
          CASE WHEN c.teacher_id = r.teacher_id THEN true ELSE false END AS assignment_active
        FROM teacher_salary_rates r
        JOIN teachers t ON t.teacher_id = r.teacher_id
        JOIN classes c ON c.class_id = r.class_id
        WHERE r.center_id = $1
        ORDER BY c.class_name ASC, teacher_name ASC
      `,
      [centerId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Teacher salary rates error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher salary rates', details: error.message || error.toString() });
  }
};

exports.createSalaryRate = async (req: any, res: any) => {
  try {
    await ensureTeacherSalaryTables();

    const centerId = getCenterId(req);
    if (!centerId) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    const teacherId = Number(req.body.teacher_id);
    const classId = Number(req.body.class_id);
    const monthlySalaryAmount = roundMoney(toNumber(req.body.monthly_salary_amount));
    const validationError = await validateRatePayload(centerId, teacherId, classId, monthlySalaryAmount);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const existingRate = await salaryDb.query(
      'SELECT rate_id FROM teacher_salary_rates WHERE class_id = $1',
      [classId]
    );
    if (existingRate.rows.length > 0) {
      return res.status(400).json({ error: 'A salary rate already exists for this class. Edit it instead.' });
    }

    const result = await salaryDb.query(
      `
        INSERT INTO teacher_salary_rates (
          center_id,
          teacher_id,
          class_id,
          monthly_salary_amount,
          effective_from,
          notes
        )
        VALUES ($1, $2, $3, $4, COALESCE($5, CURRENT_DATE), $6)
        RETURNING *
      `,
      [
        centerId,
        teacherId,
        classId,
        monthlySalaryAmount,
        normalizeOptionalText(req.body.effective_from),
        normalizeOptionalText(req.body.notes),
      ]
    );

    res.status(201).json({
      message: 'Teacher salary rate saved successfully',
      rate: result.rows[0],
    });
  } catch (error: any) {
    console.error('Create teacher salary rate error:', error);
    res.status(500).json({ error: 'Failed to create teacher salary rate', details: error.message || error.toString() });
  }
};

exports.updateSalaryRate = async (req: any, res: any) => {
  try {
    await ensureTeacherSalaryTables();

    const centerId = getCenterId(req);
    if (!centerId) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    const rateId = Number(req.params.id);
    if (!Number.isInteger(rateId)) {
      return res.status(400).json({ error: 'Rate id must be a number' });
    }

    const existingResult = await salaryDb.query(
      'SELECT * FROM teacher_salary_rates WHERE center_id = $1 AND rate_id = $2',
      [centerId, rateId]
    );
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher salary rate not found' });
    }

    const existingRate = existingResult.rows[0];
    const teacherId = Number(req.body.teacher_id ?? existingRate.teacher_id);
    const classId = Number(req.body.class_id ?? existingRate.class_id);
    const monthlySalaryAmount = roundMoney(
      toNumber(req.body.monthly_salary_amount ?? existingRate.monthly_salary_amount)
    );
    const validationError = await validateRatePayload(centerId, teacherId, classId, monthlySalaryAmount);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const duplicateRate = await salaryDb.query(
      'SELECT rate_id FROM teacher_salary_rates WHERE class_id = $1 AND rate_id <> $2',
      [classId, rateId]
    );
    if (duplicateRate.rows.length > 0) {
      return res.status(400).json({ error: 'Another salary rate already exists for this class.' });
    }

    const result = await salaryDb.query(
      `
        UPDATE teacher_salary_rates
        SET teacher_id = $1,
            class_id = $2,
            monthly_salary_amount = $3,
            effective_from = COALESCE($4, effective_from),
            notes = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE center_id = $6 AND rate_id = $7
        RETURNING *
      `,
      [
        teacherId,
        classId,
        monthlySalaryAmount,
        normalizeOptionalText(req.body.effective_from),
        normalizeOptionalText(req.body.notes),
        centerId,
        rateId,
      ]
    );

    res.json({
      message: 'Teacher salary rate updated successfully',
      rate: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update teacher salary rate error:', error);
    res.status(500).json({ error: 'Failed to update teacher salary rate', details: error.message || error.toString() });
  }
};

exports.deleteSalaryRate = async (req: any, res: any) => {
  try {
    await ensureTeacherSalaryTables();

    const centerId = getCenterId(req);
    if (!centerId) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    const rateId = Number(req.params.id);
    if (!Number.isInteger(rateId)) {
      return res.status(400).json({ error: 'Rate id must be a number' });
    }

    const result = await salaryDb.query(
      'DELETE FROM teacher_salary_rates WHERE center_id = $1 AND rate_id = $2 RETURNING *',
      [centerId, rateId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher salary rate not found' });
    }

    res.json({ message: 'Teacher salary rate deleted successfully', rate: result.rows[0] });
  } catch (error: any) {
    console.error('Delete teacher salary rate error:', error);
    res.status(500).json({ error: 'Failed to delete teacher salary rate', details: error.message || error.toString() });
  }
};

exports.getSalaryPayments = async (req: any, res: any) => {
  try {
    await ensureTeacherSalaryTables();

    const centerId = getCenterId(req);
    if (!centerId) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    const filters: string[] = ['p.center_id = $1'];
    const values: any[] = [centerId];

    if (req.query.teacher_id) {
      values.push(Number(req.query.teacher_id));
      filters.push(`p.teacher_id = $${values.length}`);
    }

    if (req.query.year) {
      values.push(parseYear(req.query.year, new Date().getFullYear()));
      filters.push(`p.salary_year = $${values.length}`);
    }

    if (req.query.month) {
      values.push(parseMonth(req.query.month, new Date().getMonth() + 1));
      filters.push(`p.salary_month = $${values.length}`);
    }

    const result = await salaryDb.query(
      `
        SELECT
          p.salary_payment_id,
          p.center_id,
          p.teacher_id,
          p.salary_year,
          p.salary_month,
          p.amount_paid,
          p.payment_date,
          p.payment_method,
          p.notes,
          p.created_at,
          p.updated_at,
          CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,
          t.employee_id
        FROM teacher_salary_payments p
        JOIN teachers t ON t.teacher_id = p.teacher_id
        WHERE ${filters.join(' AND ')}
        ORDER BY p.payment_date DESC, p.salary_payment_id DESC
      `,
      values
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Teacher salary payments error:', error);
    res.status(500).json({ error: 'Failed to fetch teacher salary payments', details: error.message || error.toString() });
  }
};

exports.createSalaryPayment = async (req: any, res: any) => {
  try {
    await ensureTeacherSalaryTables();

    const centerId = getCenterId(req);
    if (!centerId) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    const teacherId = Number(req.body.teacher_id);
    const salaryYear = parseYear(req.body.salary_year, new Date().getFullYear());
    const salaryMonth = parseMonth(req.body.salary_month, new Date().getMonth() + 1);
    const amountPaid = roundMoney(toNumber(req.body.amount_paid));

    if (!teacherId) {
      return res.status(400).json({ error: 'teacher_id is required' });
    }

    if (amountPaid <= 0) {
      return res.status(400).json({ error: 'amount_paid must be greater than 0' });
    }

    const teacher = await getTeacherById(centerId, teacherId);
    if (!teacher) {
      return res.status(400).json({ error: 'Teacher not found for this center' });
    }

    const result = await salaryDb.query(
      `
        INSERT INTO teacher_salary_payments (
          center_id,
          teacher_id,
          salary_year,
          salary_month,
          amount_paid,
          payment_date,
          payment_method,
          notes
        )
        VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7, $8)
        RETURNING *
      `,
      [
        centerId,
        teacherId,
        salaryYear,
        salaryMonth,
        amountPaid,
        normalizeOptionalText(req.body.payment_date),
        normalizeOptionalText(req.body.payment_method) || 'Cash',
        normalizeOptionalText(req.body.notes),
      ]
    );

    res.status(201).json({
      message: 'Teacher salary payment recorded successfully',
      payment: result.rows[0],
    });
  } catch (error: any) {
    console.error('Create teacher salary payment error:', error);
    res.status(500).json({ error: 'Failed to create teacher salary payment', details: error.message || error.toString() });
  }
};

exports.updateSalaryPayment = async (req: any, res: any) => {
  try {
    await ensureTeacherSalaryTables();

    const centerId = getCenterId(req);
    if (!centerId) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    const salaryPaymentId = Number(req.params.id);
    if (!Number.isInteger(salaryPaymentId)) {
      return res.status(400).json({ error: 'Salary payment id must be a number' });
    }

    const existingResult = await salaryDb.query(
      'SELECT * FROM teacher_salary_payments WHERE center_id = $1 AND salary_payment_id = $2',
      [centerId, salaryPaymentId]
    );
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher salary payment not found' });
    }

    const existingPayment = existingResult.rows[0];
    const teacherId = Number(req.body.teacher_id ?? existingPayment.teacher_id);
    const salaryYear = parseYear(req.body.salary_year ?? existingPayment.salary_year, existingPayment.salary_year);
    const salaryMonth = parseMonth(req.body.salary_month ?? existingPayment.salary_month, existingPayment.salary_month);
    const amountPaid = roundMoney(toNumber(req.body.amount_paid ?? existingPayment.amount_paid));

    if (amountPaid <= 0) {
      return res.status(400).json({ error: 'amount_paid must be greater than 0' });
    }

    const teacher = await getTeacherById(centerId, teacherId);
    if (!teacher) {
      return res.status(400).json({ error: 'Teacher not found for this center' });
    }

    const result = await salaryDb.query(
      `
        UPDATE teacher_salary_payments
        SET teacher_id = $1,
            salary_year = $2,
            salary_month = $3,
            amount_paid = $4,
            payment_date = COALESCE($5, payment_date),
            payment_method = COALESCE($6, payment_method),
            notes = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE center_id = $8 AND salary_payment_id = $9
        RETURNING *
      `,
      [
        teacherId,
        salaryYear,
        salaryMonth,
        amountPaid,
        normalizeOptionalText(req.body.payment_date),
        normalizeOptionalText(req.body.payment_method),
        normalizeOptionalText(req.body.notes),
        centerId,
        salaryPaymentId,
      ]
    );

    res.json({
      message: 'Teacher salary payment updated successfully',
      payment: result.rows[0],
    });
  } catch (error: any) {
    console.error('Update teacher salary payment error:', error);
    res.status(500).json({ error: 'Failed to update teacher salary payment', details: error.message || error.toString() });
  }
};

exports.deleteSalaryPayment = async (req: any, res: any) => {
  try {
    await ensureTeacherSalaryTables();

    const centerId = getCenterId(req);
    if (!centerId) {
      return res.status(401).json({ error: 'Session invalid. Please log in again.' });
    }

    const salaryPaymentId = Number(req.params.id);
    if (!Number.isInteger(salaryPaymentId)) {
      return res.status(400).json({ error: 'Salary payment id must be a number' });
    }

    const result = await salaryDb.query(
      'DELETE FROM teacher_salary_payments WHERE center_id = $1 AND salary_payment_id = $2 RETURNING *',
      [centerId, salaryPaymentId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Teacher salary payment not found' });
    }

    res.json({ message: 'Teacher salary payment deleted successfully', payment: result.rows[0] });
  } catch (error: any) {
    console.error('Delete teacher salary payment error:', error);
    res.status(500).json({ error: 'Failed to delete teacher salary payment', details: error.message || error.toString() });
  }
};

export {};
