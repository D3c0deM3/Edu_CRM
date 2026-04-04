import type { PoolClient } from 'pg';

const debtDb = require('../../config/dbcon');

const AUTO_DEBT_REMARK_PREFIX = 'AUTO_MONTHLY_DEBT';
const MONEY_EPSILON = 0.009;

interface StudentDebtContext {
  student_id: number;
  center_id: number;
  first_name: string;
  last_name: string;
  enrollment_number: string;
  created_at: string | Date;
  status: string;
  class_id: number | null;
  payment_amount: string | number | null;
  payment_frequency: string | null;
}

interface PaymentRecord {
  payment_id: number;
  student_id: number;
  amount: string | number;
  payment_date: string | Date;
}

interface DebtRecord {
  debt_id: number;
  student_id: number;
  debt_amount: string | number;
  debt_date: string | Date;
  due_date: string | Date | null;
  amount_paid: string | number;
  balance: string | number;
  remarks: string | null;
}

interface DueCycle {
  dueDate: string;
  year: number;
  month: number;
  label: string;
  debtAmount: number;
  amountPaid: number;
  balance: number;
}

interface AnalysisOptions {
  studentIds?: number[];
  startDate?: string;
  endDate?: string;
}

interface UnpaidMonth {
  year: number;
  month: number;
  label: string;
  due_date: string;
  balance: number;
}

interface StudentDebtAnalysisResult {
  student_id: number;
  student_name: string;
  enrollment_number: string;
  center_id: number;
  unpaid_months: UnpaidMonth[];
  unpaid_months_count: number;
  total_payments: number;
  existing_debts: DebtRecord[];
  total_debt_balance: number;
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const toUtcDate = (value: string | Date): Date => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const addMonthsClamped = (date: Date, monthsToAdd: number): Date => {
  const totalMonths = date.getUTCMonth() + monthsToAdd;
  const year = date.getUTCFullYear() + Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDayOfMonth);

  return new Date(Date.UTC(year, month, day));
};

const toMonthLabel = (date: Date): string =>
  `Due ${date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })}`;

const buildAutoDebtRemark = (dueDate: string, registrationDate: string): string =>
  `${AUTO_DEBT_REMARK_PREFIX}|due=${dueDate}|registered=${registrationDate}`;

const isEligibleForAutoDebt = (student: StudentDebtContext): boolean =>
  student.status === 'Active' &&
  Boolean(student.class_id) &&
  student.payment_frequency === 'Monthly' &&
  toNumber(student.payment_amount) > 0;

const buildDueCycles = (
  registrationDate: Date,
  today: Date,
  monthlyFee: number
): DueCycle[] => {
  const dueCycles: DueCycle[] = [];
  let cycleIndex = 1;

  while (true) {
    const dueDate = addMonthsClamped(registrationDate, cycleIndex);
    if (dueDate > today) {
      break;
    }

    dueCycles.push({
      dueDate: formatDate(dueDate),
      year: dueDate.getUTCFullYear(),
      month: dueDate.getUTCMonth() + 1,
      label: toMonthLabel(dueDate),
      debtAmount: monthlyFee,
      amountPaid: 0,
      balance: monthlyFee,
    });
    cycleIndex += 1;
  }

  return dueCycles;
};

const applyPaymentCredit = (
  cycles: Array<Pick<DueCycle, 'dueDate' | 'year' | 'month' | 'label' | 'debtAmount'> & Partial<DueCycle>>,
  completedPaymentAmount: number
): DueCycle[] => {
  let remainingCredit = roundMoney(completedPaymentAmount);

  return cycles.map((cycle) => {
    const debtAmount = roundMoney(cycle.debtAmount);
    const amountPaid = roundMoney(Math.min(debtAmount, Math.max(remainingCredit, 0)));
    remainingCredit = roundMoney(remainingCredit - amountPaid);

    return {
      dueDate: cycle.dueDate,
      year: cycle.year,
      month: cycle.month,
      label: cycle.label,
      debtAmount,
      amountPaid,
      balance: roundMoney(Math.max(debtAmount - amountPaid, 0)),
    };
  });
};

const groupByStudentId = <T extends { student_id: number }>(rows: T[]): Map<number, T[]> => {
  const grouped = new Map<number, T[]>();

  rows.forEach((row) => {
    const currentRows = grouped.get(row.student_id) || [];
    currentRows.push(row);
    grouped.set(row.student_id, currentRows);
  });

  return grouped;
};

const loadStudentContexts = async (
  client: PoolClient,
  centerId: number,
  studentIds?: number[]
): Promise<StudentDebtContext[]> => {
  const filter = studentIds && studentIds.length > 0 ? ' AND s.student_id = ANY($2::int[])' : '';
  const params = studentIds && studentIds.length > 0 ? [centerId, studentIds] : [centerId];

  const result = await client.query(
    `
      SELECT
        s.student_id,
        s.center_id,
        s.first_name,
        s.last_name,
        s.enrollment_number,
        s.created_at,
        s.status,
        s.class_id,
        c.payment_amount,
        c.payment_frequency
      FROM students s
      LEFT JOIN classes c ON c.class_id = s.class_id
      WHERE s.center_id = $1${filter}
      ORDER BY s.student_id ASC
    `,
    params
  );

  return result.rows;
};

const loadCompletedPayments = async (
  client: PoolClient,
  centerId: number,
  studentIds?: number[]
): Promise<PaymentRecord[]> => {
  const filter = studentIds && studentIds.length > 0 ? ' AND student_id = ANY($2::int[])' : '';
  const params = studentIds && studentIds.length > 0 ? [centerId, studentIds] : [centerId];

  const result = await client.query(
    `
      SELECT payment_id, student_id, amount, payment_date
      FROM payments
      WHERE center_id = $1
        AND payment_status = 'Completed'${filter}
      ORDER BY payment_date ASC, payment_id ASC
    `,
    params
  );

  return result.rows;
};

const loadAutoDebts = async (
  client: PoolClient,
  centerId: number,
  studentIds?: number[]
): Promise<DebtRecord[]> => {
  const filter = studentIds && studentIds.length > 0 ? ' AND student_id = ANY($3::int[])' : '';
  const params = studentIds && studentIds.length > 0
    ? [centerId, `${AUTO_DEBT_REMARK_PREFIX}%`, studentIds]
    : [centerId, `${AUTO_DEBT_REMARK_PREFIX}%`];

  const result = await client.query(
    `
      SELECT debt_id, student_id, debt_amount, debt_date, due_date, amount_paid, balance, remarks
      FROM debts
      WHERE center_id = $1
        AND remarks LIKE $2${filter}
      ORDER BY COALESCE(due_date, debt_date) ASC, debt_id ASC
    `,
    params
  );

  return result.rows;
};

const loadOutstandingDebts = async (
  client: PoolClient,
  centerId: number,
  studentIds?: number[]
): Promise<DebtRecord[]> => {
  const filter = studentIds && studentIds.length > 0 ? ' AND student_id = ANY($2::int[])' : '';
  const params = studentIds && studentIds.length > 0 ? [centerId, studentIds] : [centerId];

  const result = await client.query(
    `
      SELECT debt_id, student_id, debt_amount, debt_date, due_date, amount_paid, balance, remarks
      FROM debts
      WHERE center_id = $1
        AND balance > 0${filter}
      ORDER BY COALESCE(due_date, debt_date) ASC, debt_id ASC
    `,
    params
  );

  return result.rows;
};

const deleteDebtIds = async (client: PoolClient, debtIds: number[]): Promise<void> => {
  if (debtIds.length === 0) {
    return;
  }

  await client.query('DELETE FROM debts WHERE debt_id = ANY($1::int[])', [debtIds]);
};

export const syncAutoDebtsForCenter = async (
  centerId: number,
  studentIds?: number[]
): Promise<void> => {
  const client = await debtDb.connect();

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [centerId]);

    const [students, payments, autoDebts] = await Promise.all([
      loadStudentContexts(client, centerId, studentIds),
      loadCompletedPayments(client, centerId, studentIds),
      loadAutoDebts(client, centerId, studentIds),
    ]);

    const paymentsByStudent = groupByStudentId(payments);
    const autoDebtsByStudent = groupByStudentId(autoDebts);
    const today = toUtcDate(new Date());

    for (const student of students) {
      const completedPayments = paymentsByStudent.get(student.student_id) || [];
      const totalCompletedAmount = roundMoney(
        completedPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)
      );
      const existingAutoDebts = autoDebtsByStudent.get(student.student_id) || [];
      const registrationDate = formatDate(toUtcDate(student.created_at));
      const monthlyFee = roundMoney(toNumber(student.payment_amount));

      let plannedCycles: DueCycle[] = [];

      if (isEligibleForAutoDebt(student)) {
        plannedCycles = applyPaymentCredit(
          buildDueCycles(toUtcDate(student.created_at), today, monthlyFee),
          totalCompletedAmount
        );
      } else if (existingAutoDebts.length > 0) {
        plannedCycles = applyPaymentCredit(
          existingAutoDebts.map((debt) => {
            const baseDate = toUtcDate((debt.due_date || debt.debt_date) as string | Date);
            return {
              dueDate: formatDate(baseDate),
              year: baseDate.getUTCFullYear(),
              month: baseDate.getUTCMonth() + 1,
              label: toMonthLabel(baseDate),
              debtAmount: roundMoney(toNumber(debt.debt_amount)),
            };
          }),
          totalCompletedAmount
        );
      }

      const existingByDueDate = new Map<string, DebtRecord[]>();
      existingAutoDebts.forEach((debt) => {
        const dueDate = formatDate(toUtcDate((debt.due_date || debt.debt_date) as string | Date));
        const currentDebts = existingByDueDate.get(dueDate) || [];
        currentDebts.push(debt);
        existingByDueDate.set(dueDate, currentDebts);
      });

      const processedDueDates = new Set<string>();

      for (const cycle of plannedCycles) {
        const currentDebts = existingByDueDate.get(cycle.dueDate) || [];
        const [canonicalDebt, ...duplicateDebts] = currentDebts;

        if (duplicateDebts.length > 0) {
          await deleteDebtIds(
            client,
            duplicateDebts.map((debt) => debt.debt_id)
          );
        }

        if (cycle.balance > MONEY_EPSILON) {
          if (canonicalDebt) {
            await client.query(
              `
                UPDATE debts
                SET debt_amount = $1,
                    debt_date = $2,
                    due_date = $3,
                    amount_paid = $4,
                    balance = $5,
                    remarks = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE debt_id = $7
              `,
              [
                cycle.debtAmount,
                cycle.dueDate,
                cycle.dueDate,
                cycle.amountPaid,
                cycle.balance,
                buildAutoDebtRemark(cycle.dueDate, registrationDate),
                canonicalDebt.debt_id,
              ]
            );
          } else {
            await client.query(
              `
                INSERT INTO debts (
                  student_id,
                  center_id,
                  debt_amount,
                  debt_date,
                  due_date,
                  amount_paid,
                  balance,
                  remarks
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              `,
              [
                student.student_id,
                centerId,
                cycle.debtAmount,
                cycle.dueDate,
                cycle.dueDate,
                cycle.amountPaid,
                cycle.balance,
                buildAutoDebtRemark(cycle.dueDate, registrationDate),
              ]
            );
          }
        } else if (canonicalDebt) {
          await deleteDebtIds(client, [canonicalDebt.debt_id]);
        }

        processedDueDates.add(cycle.dueDate);
      }

      const obsoleteDebtIds: number[] = [];
      existingByDueDate.forEach((debtsForDueDate, dueDate) => {
        if (!processedDueDates.has(dueDate)) {
          debtsForDueDate.forEach((debt) => obsoleteDebtIds.push(debt.debt_id));
        }
      });

      await deleteDebtIds(client, obsoleteDebtIds);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getMonthlyDebtAnalysis = async (
  centerId: number,
  options: AnalysisOptions = {}
): Promise<{
  analysis_period: { start: string; end: string; months_analyzed: number };
  summary: {
    total_students_analyzed: number;
    students_with_unpaid_months: number;
    total_unpaid_instances: number;
  };
  results: StudentDebtAnalysisResult[];
}> => {
  await syncAutoDebtsForCenter(centerId, options.studentIds);

  const client = await debtDb.connect();

  try {
    const [students, payments, outstandingDebts] = await Promise.all([
      loadStudentContexts(client, centerId, options.studentIds),
      loadCompletedPayments(client, centerId, options.studentIds),
      loadOutstandingDebts(client, centerId, options.studentIds),
    ]);

    const paymentMap = groupByStudentId(payments);
    const outstandingDebtMap = groupByStudentId(outstandingDebts);

    const today = toUtcDate(new Date());
    const defaultStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 11, 1));
    const startDate = options.startDate ? toUtcDate(options.startDate) : defaultStart;
    const endDate = options.endDate ? toUtcDate(options.endDate) : today;
    const monthsAnalyzed =
      (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
      (endDate.getUTCMonth() - startDate.getUTCMonth()) +
      1;

    const results: StudentDebtAnalysisResult[] = [];

    students.forEach((student) => {
      const completedPayments = paymentMap.get(student.student_id) || [];
      const totalCompletedAmount = roundMoney(
        completedPayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0)
      );
      const outstandingForStudent = outstandingDebtMap.get(student.student_id) || [];
      const totalDebtBalance = roundMoney(
        outstandingForStudent.reduce((sum, debt) => sum + toNumber(debt.balance), 0)
      );

      let unpaidMonths: UnpaidMonth[] = [];

      if (isEligibleForAutoDebt(student)) {
        unpaidMonths = applyPaymentCredit(
          buildDueCycles(toUtcDate(student.created_at), endDate, roundMoney(toNumber(student.payment_amount))),
          totalCompletedAmount
        )
          .filter((cycle) => {
            const dueDate = toUtcDate(cycle.dueDate);
            return cycle.balance > MONEY_EPSILON && dueDate >= startDate && dueDate <= endDate;
          })
          .map((cycle) => ({
            year: cycle.year,
            month: cycle.month,
            label: cycle.label,
            due_date: cycle.dueDate,
            balance: cycle.balance,
          }));
      }

      if (unpaidMonths.length > 0 || totalDebtBalance > 0) {
        results.push({
          student_id: student.student_id,
          student_name: `${student.first_name} ${student.last_name}`,
          enrollment_number: student.enrollment_number,
          center_id: student.center_id,
          unpaid_months: unpaidMonths,
          unpaid_months_count: unpaidMonths.length,
          total_payments: completedPayments.length,
          existing_debts: outstandingForStudent,
          total_debt_balance: totalDebtBalance,
        });
      }
    });

    results.sort((left, right) => right.unpaid_months_count - left.unpaid_months_count);

    return {
      analysis_period: {
        start: formatDate(startDate),
        end: formatDate(endDate),
        months_analyzed: Math.max(monthsAnalyzed, 0),
      },
      summary: {
        total_students_analyzed: students.filter(isEligibleForAutoDebt).length,
        students_with_unpaid_months: results.length,
        total_unpaid_instances: results.reduce((sum, result) => sum + result.unpaid_months_count, 0),
      },
      results,
    };
  } finally {
    client.release();
  }
};

export const getOutstandingDebtsForStudents = async (
  centerId: number,
  studentIds: number[]
): Promise<DebtRecord[]> => {
  const client = await debtDb.connect();

  try {
    return await loadOutstandingDebts(client, centerId, studentIds);
  } finally {
    client.release();
  }
};

export { AUTO_DEBT_REMARK_PREFIX };
