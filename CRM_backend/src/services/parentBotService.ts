const botDb = require('../../config/dbcon');
const crypto = require('crypto');

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const TELEGRAM_API_BASE = TELEGRAM_BOT_TOKEN
  ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
  : '';
const DEFAULT_PARENT_PAYMENT_WARNING_DAYS = 3;
const BOT_POLL_INTERVAL_MS = 3000;
const PAYMENT_REMINDER_SWEEP_MS = 60 * 60 * 1000;
const MONEY_EPSILON = 0.009;

let schemaReady: Promise<void> | null = null;
let updateOffset = 0;
let botStarted = false;
let pollingTimeout: NodeJS.Timeout | null = null;
let paymentReminderInterval: NodeJS.Timeout | null = null;

type PendingStep = 'await_phone' | 'await_password';

interface PendingLoginState {
  step: PendingStep;
  parentPhone?: string;
}

interface ParentChildRecord {
  student_id: number;
  center_id: number;
  first_name: string;
  last_name: string;
  enrollment_number: string;
  class_id: number | null;
  class_name?: string | null;
  class_code?: string | null;
  created_at: string | Date;
  parent_name?: string | null;
  parent_phone?: string | null;
  parent_telegram_chat_id?: string | number | null;
  payment_amount?: string | number | null;
  payment_frequency?: string | null;
}

interface ParentSession {
  chatId: number;
  parentPhone: string;
  studentIds: number[];
  activeStudentId: number;
  centerId: number;
}

interface PaymentCycle {
  dueDate: string;
  debtAmount: number;
  amountPaid: number;
  balance: number;
}

const pendingLogins = new Map<number, PendingLoginState>();
const parentSessions = new Map<number, ParentSession>();

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const toUtcDate = (value: string | Date): Date => {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const addDays = (date: Date, days: number): Date => {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
};

const addMonthsClamped = (date: Date, monthsToAdd: number): Date => {
  const totalMonths = date.getUTCMonth() + monthsToAdd;
  const year = date.getUTCFullYear() + Math.floor(totalMonths / 12);
  const month = ((totalMonths % 12) + 12) % 12;
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), lastDayOfMonth);

  return new Date(Date.UTC(year, month, day));
};

const hashParentPassword = (password: string) =>
  crypto.createHash('sha256').update(password).digest('hex');

const normalizePhone = (value: string): string => value.replace(/[^\d]/g, '');

const formatTashkentDateTime = (value: string | Date): string =>
  new Date(value).toLocaleString('en-GB', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const buildReplyKeyboard = (rows: Array<Array<string | { text: string; request_contact?: boolean }>>) => ({
  keyboard: rows.map((row) =>
    row.map((item) => (typeof item === 'string' ? { text: item } : item))
  ),
  resize_keyboard: true,
  one_time_keyboard: false,
});

const AUTH_KEYBOARD = buildReplyKeyboard([
  [{ text: 'Share Phone Number', request_contact: true }],
  ['Type Phone Number'],
]);

const MAIN_MENU_KEYBOARD = buildReplyKeyboard([
  ['Child Summary', 'My Children'],
  ['Attendance', 'Grades'],
  ['Payments', 'Help'],
  ['Logout'],
]);

const buildChildrenInlineKeyboard = (children: ParentChildRecord[], activeStudentId?: number) => ({
  inline_keyboard: children.map((child) => [
    {
      text:
        Number(child.student_id) === Number(activeStudentId)
          ? `${child.first_name} ${child.last_name} (Active)`
          : `${child.first_name} ${child.last_name}`,
      callback_data: `child:${child.student_id}`,
    },
  ]),
});

const sendTelegramRequest = async (method: string, payload: Record<string, any>) => {
  if (!TELEGRAM_API_BASE) {
    return null;
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram API ${method} failed: ${response.status} ${errorText}`);
  }

  return response.json();
};

const sendTelegramMessage = async (
  chatId: number | string,
  text: string,
  extra: Record<string, any> = {}
) =>
  sendTelegramRequest('sendMessage', {
    chat_id: chatId,
    text,
    ...extra,
  });

const answerCallbackQuery = async (callbackQueryId: string, text?: string) =>
  sendTelegramRequest('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    text,
  });

const ensureParentBotSchema = async (): Promise<void> => {
  if (!schemaReady) {
    schemaReady = (async () => {
      await botDb.query(`
        ALTER TABLE students
        ADD COLUMN IF NOT EXISTS parent_password_hash VARCHAR(255)
      `);
      await botDb.query(`
        ALTER TABLE students
        ADD COLUMN IF NOT EXISTS parent_telegram_chat_id BIGINT
      `);
      await botDb.query(`
        ALTER TABLE students
        ADD COLUMN IF NOT EXISTS parent_telegram_verified_at TIMESTAMP
      `);
      await botDb.query(`
        ALTER TABLE students
        ADD COLUMN IF NOT EXISTS parent_telegram_last_login_at TIMESTAMP
      `);
      await botDb.query(`
        ALTER TABLE edu_centers
        ADD COLUMN IF NOT EXISTS parent_payment_warning_days INT DEFAULT ${DEFAULT_PARENT_PAYMENT_WARNING_DAYS}
      `);
      await botDb.query(`
        CREATE TABLE IF NOT EXISTS parent_notification_logs (
          notification_id SERIAL PRIMARY KEY,
          center_id INT NOT NULL REFERENCES edu_centers(center_id) ON DELETE CASCADE,
          student_id INT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
          parent_phone VARCHAR(20),
          event_type VARCHAR(50) NOT NULL,
          event_key VARCHAR(255) NOT NULL UNIQUE,
          payload JSONB,
          sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await botDb.query(`
        CREATE INDEX IF NOT EXISTS idx_parent_notification_logs_student
        ON parent_notification_logs(student_id, event_type, sent_at DESC)
      `);
    })().catch((error: any) => {
      schemaReady = null;
      throw error;
    });
  }

  await schemaReady;
};

const loadChildrenByPhoneAndPassword = async (
  parentPhone: string,
  parentPassword: string
): Promise<ParentChildRecord[]> => {
  await ensureParentBotSchema();
  const normalizedPhone = normalizePhone(parentPhone);
  const passwordHash = hashParentPassword(parentPassword);

  const result = await botDb.query(
    `
      SELECT
        s.student_id,
        s.center_id,
        s.first_name,
        s.last_name,
        s.enrollment_number,
        s.class_id,
        s.created_at,
        s.parent_name,
        s.parent_phone,
        s.parent_telegram_chat_id,
        c.class_name,
        c.class_code,
        c.payment_amount,
        c.payment_frequency
      FROM students s
      LEFT JOIN classes c ON c.class_id = s.class_id
      WHERE regexp_replace(COALESCE(s.parent_phone, ''), '[^0-9]', '', 'g') = $1
        AND s.parent_password_hash = $2
      ORDER BY s.first_name ASC, s.last_name ASC, s.student_id ASC
    `,
    [normalizedPhone, passwordHash]
  );

  return result.rows;
};

const loadChildrenByChatId = async (chatId: number): Promise<ParentChildRecord[]> => {
  await ensureParentBotSchema();
  const result = await botDb.query(
    `
      SELECT
        s.student_id,
        s.center_id,
        s.first_name,
        s.last_name,
        s.enrollment_number,
        s.class_id,
        s.created_at,
        s.parent_name,
        s.parent_phone,
        s.parent_telegram_chat_id,
        c.class_name,
        c.class_code,
        c.payment_amount,
        c.payment_frequency
      FROM students s
      LEFT JOIN classes c ON c.class_id = s.class_id
      WHERE s.parent_telegram_chat_id = $1
      ORDER BY s.first_name ASC, s.last_name ASC, s.student_id ASC
    `,
    [chatId]
  );

  return result.rows;
};

const createSession = (chatId: number, children: ParentChildRecord[]): ParentSession | null => {
  if (children.length === 0) {
    return null;
  }

  const session: ParentSession = {
    chatId,
    parentPhone: children[0].parent_phone || '',
    centerId: children[0].center_id,
    studentIds: children.map((child) => child.student_id),
    activeStudentId: children[0].student_id,
  };

  parentSessions.set(chatId, session);
  return session;
};

const ensureSessionForChat = async (chatId: number): Promise<ParentSession | null> => {
  const existingSession = parentSessions.get(chatId);
  if (existingSession) {
    return existingSession;
  }

  const children = await loadChildrenByChatId(chatId);
  return createSession(chatId, children);
};

const linkParentChat = async (chatId: number, children: ParentChildRecord[]) => {
  if (children.length === 0) {
    return;
  }

  await botDb.query(
    `
      UPDATE students
      SET
        parent_telegram_chat_id = $1,
        parent_telegram_verified_at = CURRENT_TIMESTAMP,
        parent_telegram_last_login_at = CURRENT_TIMESTAMP
      WHERE student_id = ANY($2::int[])
    `,
    [chatId, children.map((child) => child.student_id)]
  );
};

const getChildById = async (studentId: number): Promise<ParentChildRecord | null> => {
  await ensureParentBotSchema();
  const result = await botDb.query(
    `
      SELECT
        s.student_id,
        s.center_id,
        s.first_name,
        s.last_name,
        s.enrollment_number,
        s.class_id,
        s.created_at,
        s.parent_name,
        s.parent_phone,
        s.parent_telegram_chat_id,
        c.class_name,
        c.class_code,
        c.payment_amount,
        c.payment_frequency
      FROM students s
      LEFT JOIN classes c ON c.class_id = s.class_id
      WHERE s.student_id = $1
    `,
    [studentId]
  );

  return result.rows[0] || null;
};

const loadParentChildrenForSession = async (session: ParentSession): Promise<ParentChildRecord[]> => {
  const children = await loadChildrenByChatId(session.chatId);
  if (children.length > 0) {
    session.studentIds = children.map((child) => child.student_id);
    if (!session.studentIds.includes(session.activeStudentId)) {
      session.activeStudentId = session.studentIds[0];
    }
  }
  return children;
};

const applyPaymentCredit = (cycles: PaymentCycle[], totalCredit: number): PaymentCycle[] => {
  let remaining = roundMoney(totalCredit);

  return cycles.map((cycle) => {
    const debtAmount = roundMoney(cycle.debtAmount);
    const amountPaid = roundMoney(Math.min(debtAmount, Math.max(remaining, 0)));
    remaining = roundMoney(remaining - amountPaid);

    return {
      ...cycle,
      debtAmount,
      amountPaid,
      balance: roundMoney(Math.max(debtAmount - amountPaid, 0)),
    };
  });
};

const buildDueCycles = (registrationDate: Date, throughDate: Date, monthlyFee: number): PaymentCycle[] => {
  const cycles: PaymentCycle[] = [];
  let cycleIndex = 1;

  while (true) {
    const dueDate = addMonthsClamped(registrationDate, cycleIndex);
    if (dueDate > throughDate) {
      break;
    }

    cycles.push({
      dueDate: formatDate(dueDate),
      debtAmount: monthlyFee,
      amountPaid: 0,
      balance: monthlyFee,
    });
    cycleIndex += 1;
  }

  return cycles;
};

const getStudentPaymentSnapshot = async (studentId: number) => {
  const [studentResult, paymentsResult, debtResult] = await Promise.all([
    botDb.query(
      `
        SELECT
          s.student_id,
          s.first_name,
          s.last_name,
          s.enrollment_number,
          s.created_at,
          s.class_id,
          c.class_name,
          c.class_code,
          c.payment_amount,
          c.payment_frequency
        FROM students s
        LEFT JOIN classes c ON c.class_id = s.class_id
        WHERE s.student_id = $1
      `,
      [studentId]
    ),
    botDb.query(
      `
        SELECT payment_id, amount, payment_date
        FROM payments
        WHERE student_id = $1
          AND payment_status = 'Completed'
        ORDER BY payment_date ASC, payment_id ASC
      `,
      [studentId]
    ),
    botDb.query(
      `
        SELECT COALESCE(SUM(balance), 0) AS total_balance
        FROM debts
        WHERE student_id = $1
      `,
      [studentId]
    ),
  ]);

  const student = studentResult.rows[0];
  if (!student) {
    return null;
  }

  const monthlyFee = roundMoney(toNumber(student.payment_amount));
  const totalPaid = roundMoney(
    paymentsResult.rows.reduce((sum: number, payment: any) => sum + toNumber(payment.amount), 0)
  );
  const currentDebt = roundMoney(toNumber(debtResult.rows[0]?.total_balance));

  let nextDueDate: string | null = null;
  let nextDueBalance = 0;

  if (student.payment_frequency === 'Monthly' && monthlyFee > 0) {
    const today = toUtcDate(new Date());
    const futureWindow = addMonthsClamped(today, 2);
    const cycles = applyPaymentCredit(
      buildDueCycles(toUtcDate(student.created_at), futureWindow, monthlyFee),
      totalPaid
    );
    const nextUnpaidCycle = cycles.find((cycle) => {
      const dueDate = toUtcDate(cycle.dueDate);
      return cycle.balance > MONEY_EPSILON && dueDate >= today;
    });

    nextDueDate = nextUnpaidCycle?.dueDate || null;
    nextDueBalance = nextUnpaidCycle?.balance || 0;
  }

  return {
    student,
    totalPaid,
    currentDebt,
    nextDueDate,
    nextDueBalance,
    payments: paymentsResult.rows,
  };
};

const getChildSummaryText = async (studentId: number): Promise<string> => {
  const [studentResult, attendanceResult, gradeResult] = await Promise.all([
    botDb.query(
      `
        SELECT
          s.student_id,
          s.first_name,
          s.last_name,
          s.enrollment_number,
          c.class_name,
          c.class_code
        FROM students s
        LEFT JOIN classes c ON c.class_id = s.class_id
        WHERE s.student_id = $1
      `,
      [studentId]
    ),
    botDb.query(
      `
        SELECT
          COUNT(*) FILTER (WHERE status = 'Present') AS present_count,
          COUNT(*) FILTER (WHERE status = 'Absent') AS absent_count,
          COUNT(*) FILTER (WHERE status = 'Late') AS late_count,
          MAX(attendance_date) AS last_attendance_date
        FROM attendance
        WHERE student_id = $1
      `,
      [studentId]
    ),
    botDb.query(
      `
        SELECT
          COUNT(*) AS grade_count,
          COALESCE(AVG(percentage), 0) AS average_percentage,
          MAX(created_at) AS last_grade_at
        FROM grades
        WHERE student_id = $1
      `,
      [studentId]
    ),
  ]);

  const student = studentResult.rows[0];
  if (!student) {
    return 'Child summary is currently unavailable.';
  }

  const paymentSnapshot = await getStudentPaymentSnapshot(studentId);
  const attendance = attendanceResult.rows[0] || {};
  const grades = gradeResult.rows[0] || {};

  return [
    `${student.first_name} ${student.last_name}`,
    `Enrollment: ${student.enrollment_number}`,
    `Class: ${student.class_name || 'Not assigned yet'}`,
    '',
    `Attendance: Present ${attendance.present_count || 0}, Absent ${attendance.absent_count || 0}, Late ${attendance.late_count || 0}`,
    `Average grade: ${roundMoney(toNumber(grades.average_percentage))}% across ${grades.grade_count || 0} grade item(s)`,
    `Total paid: $${(paymentSnapshot?.totalPaid || 0).toFixed(2)}`,
    `Current debt: $${(paymentSnapshot?.currentDebt || 0).toFixed(2)}`,
    paymentSnapshot?.nextDueDate
      ? `Next payment due: ${paymentSnapshot.nextDueDate} ($${paymentSnapshot.nextDueBalance.toFixed(2)})`
      : 'Next payment due: no unpaid monthly cycle found',
  ].join('\n');
};

const getAttendanceText = async (studentId: number): Promise<string> => {
  const result = await botDb.query(
    `
      SELECT attendance_date, status, remarks, created_at
      FROM attendance
      WHERE student_id = $1
      ORDER BY attendance_date DESC, attendance_id DESC
      LIMIT 8
    `,
    [studentId]
  );

  if (result.rows.length === 0) {
    return 'No attendance records have been added yet.';
  }

  const lines = ['Recent attendance:'];
  result.rows.forEach((record: any) => {
    lines.push(
      `${record.attendance_date}: ${record.status}${record.remarks ? ` (${record.remarks})` : ''}`
    );
  });

  return lines.join('\n');
};

const getGradesText = async (studentId: number): Promise<string> => {
  const result = await botDb.query(
    `
      SELECT subject, marks_obtained, total_marks, percentage, grade_letter, term, created_at
      FROM grades
      WHERE student_id = $1
      ORDER BY created_at DESC, grade_id DESC
      LIMIT 8
    `,
    [studentId]
  );

  if (result.rows.length === 0) {
    return 'No grades have been published yet.';
  }

  const lines = ['Recent grades:'];
  result.rows.forEach((grade: any) => {
    lines.push(
      `${grade.subject || 'Subject'}: ${grade.marks_obtained}/${grade.total_marks} (${roundMoney(
        toNumber(grade.percentage)
      )}%) ${grade.grade_letter ? `Grade ${grade.grade_letter}` : ''}`
    );
  });

  return lines.join('\n');
};

const getPaymentsText = async (studentId: number): Promise<string> => {
  const paymentSnapshot = await getStudentPaymentSnapshot(studentId);
  if (!paymentSnapshot) {
    return 'Payment summary is currently unavailable.';
  }

  const recentPayments = paymentSnapshot.payments.slice(-5).reverse();
  const lines = [
    `Payment summary for ${paymentSnapshot.student.first_name} ${paymentSnapshot.student.last_name}`,
    `Total paid: $${paymentSnapshot.totalPaid.toFixed(2)}`,
    `Current debt: $${paymentSnapshot.currentDebt.toFixed(2)}`,
    paymentSnapshot.nextDueDate
      ? `Next due date: ${paymentSnapshot.nextDueDate} ($${paymentSnapshot.nextDueBalance.toFixed(2)})`
      : 'Next due date: none',
  ];

  if (recentPayments.length > 0) {
    lines.push('', 'Recent completed payments:');
    recentPayments.forEach((payment: any) => {
      lines.push(`${payment.payment_date}: $${roundMoney(toNumber(payment.amount)).toFixed(2)}`);
    });
  }

  return lines.join('\n');
};

const withMainMenu = async (chatId: number, text: string, extra: Record<string, any> = {}) =>
  sendTelegramMessage(chatId, text, {
    reply_markup: MAIN_MENU_KEYBOARD,
    ...extra,
  });

const sendLoginPrompt = async (chatId: number) =>
  sendTelegramMessage(
    chatId,
    'Welcome to the parent portal bot.\n\nPlease share or type the parent phone number saved for your child, then enter the parent password.',
    { reply_markup: AUTH_KEYBOARD }
  );

const sendChildrenList = async (chatId: number, session: ParentSession) => {
  const children = await loadParentChildrenForSession(session);
  if (children.length === 0) {
    return withMainMenu(chatId, 'No linked children were found for this Telegram chat.');
  }

  const lines = ['Select a child:'];
  children.forEach((child) => {
    lines.push(
      `${child.first_name} ${child.last_name} - ${child.class_name || 'No class assigned'}`
    );
  });

  return withMainMenu(chatId, lines.join('\n'), {
    reply_markup: buildChildrenInlineKeyboard(children, session.activeStudentId),
  });
};

const logNotificationIfNeeded = async (
  centerId: number,
  studentId: number,
  parentPhone: string | null,
  eventType: string,
  eventKey: string,
  payload: Record<string, any>
): Promise<boolean> => {
  await ensureParentBotSchema();
  try {
    await botDb.query(
      `
        INSERT INTO parent_notification_logs (
          center_id,
          student_id,
          parent_phone,
          event_type,
          event_key,
          payload
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [centerId, studentId, parentPhone, eventType, eventKey, JSON.stringify(payload)]
    );
    return true;
  } catch (error: any) {
    if (error?.code === '23505') {
      return false;
    }
    throw error;
  }
};

const sendParentNotification = async (
  studentId: number,
  eventType: string,
  eventKey: string,
  message: string,
  payload: Record<string, any> = {}
) => {
  await ensureParentBotSchema();

  const result = await botDb.query(
    `
      SELECT student_id, center_id, parent_phone, parent_telegram_chat_id
      FROM students
      WHERE student_id = $1
        AND parent_telegram_chat_id IS NOT NULL
    `,
    [studentId]
  );

  const student = result.rows[0];
  if (!student?.parent_telegram_chat_id) {
    return;
  }

  const shouldSend = await logNotificationIfNeeded(
    student.center_id,
    student.student_id,
    student.parent_phone || null,
    eventType,
    eventKey,
    payload
  );

  if (!shouldSend) {
    return;
  }

  await sendTelegramMessage(student.parent_telegram_chat_id, message, {
    reply_markup: MAIN_MENU_KEYBOARD,
  });
};

export const notifyParentsAboutAttendance = async (
  attendance: any,
  options: { exactTimestamp?: string | Date; source?: 'manual' | 'qr' | 'update'; eventKey?: string } = {}
) => {
  try {
    await ensureParentBotSchema();

    const result = await botDb.query(
      `
        SELECT
          a.attendance_id,
          a.student_id,
          a.attendance_date,
          a.status,
          a.remarks,
          s.first_name AS student_first_name,
          s.last_name AS student_last_name,
          c.class_name,
          c.class_code,
          t.first_name AS teacher_first_name,
          t.last_name AS teacher_last_name
        FROM attendance a
        JOIN students s ON s.student_id = a.student_id
        LEFT JOIN classes c ON c.class_id = a.class_id
        LEFT JOIN teachers t ON t.teacher_id = a.teacher_id
        WHERE a.attendance_id = $1
      `,
      [attendance.attendance_id]
    );

    const record = result.rows[0];
    if (!record) {
      return;
    }

    const exactTime = formatTashkentDateTime(options.exactTimestamp || new Date());
    const teacherName =
      record.teacher_first_name && record.teacher_last_name
        ? `${record.teacher_first_name} ${record.teacher_last_name}`
        : 'Teacher';
    const message = [
      `Attendance update for ${record.student_first_name} ${record.student_last_name}`,
      `Status: ${record.status}`,
      `Class: ${record.class_name || 'N/A'}`,
      `Marked at: ${exactTime}`,
      `Teacher: ${teacherName}`,
      record.remarks ? `Notes: ${record.remarks}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await sendParentNotification(
      record.student_id,
      'attendance',
      options.eventKey || `attendance:${record.attendance_id}:${record.status}:${record.attendance_date}:${record.remarks || ''}`,
      message,
      {
        attendance_id: record.attendance_id,
        status: record.status,
        attendance_date: record.attendance_date,
        source: options.source || 'manual',
      }
    );
  } catch (error) {
    console.error('Parent attendance notification error:', error);
  }
};

export const notifyParentsAboutGrade = async (
  grade: any,
  options: { mode?: 'create' | 'update'; eventKey?: string } = {}
) => {
  try {
    await ensureParentBotSchema();

    const result = await botDb.query(
      `
        SELECT
          g.grade_id,
          g.student_id,
          g.subject,
          g.marks_obtained,
          g.total_marks,
          g.percentage,
          g.grade_letter,
          g.term,
          g.created_at,
          g.updated_at,
          s.first_name AS student_first_name,
          s.last_name AS student_last_name,
          t.first_name AS teacher_first_name,
          t.last_name AS teacher_last_name
        FROM grades g
        JOIN students s ON s.student_id = g.student_id
        LEFT JOIN teachers t ON t.teacher_id = g.teacher_id
        WHERE g.grade_id = $1
      `,
      [grade.grade_id]
    );

    const record = result.rows[0];
    if (!record) {
      return;
    }

    const teacherName =
      record.teacher_first_name && record.teacher_last_name
        ? `${record.teacher_first_name} ${record.teacher_last_name}`
        : 'Teacher';
    const message = [
      `${options.mode === 'update' ? 'Grade updated' : 'New grade posted'} for ${record.student_first_name} ${record.student_last_name}`,
      `Subject: ${record.subject || 'Subject'}`,
      `Score: ${record.marks_obtained}/${record.total_marks} (${roundMoney(toNumber(record.percentage))}%)`,
      record.grade_letter ? `Grade: ${record.grade_letter}` : '',
      record.term ? `Term: ${record.term}` : '',
      `Published at: ${formatTashkentDateTime(record.updated_at || record.created_at)}`,
      `Teacher: ${teacherName}`,
    ]
      .filter(Boolean)
      .join('\n');

    await sendParentNotification(
      record.student_id,
      'grade',
      options.eventKey ||
        `grade:${record.grade_id}:${options.mode || 'create'}:${record.updated_at || record.created_at}`,
      message,
      {
        grade_id: record.grade_id,
        mode: options.mode || 'create',
      }
    );
  } catch (error) {
    console.error('Parent grade notification error:', error);
  }
};

export const runParentPaymentReminderSweep = async () => {
  if (!TELEGRAM_BOT_TOKEN) {
    return;
  }

  try {
    await ensureParentBotSchema();

    const today = toUtcDate(new Date());
    const studentsResult = await botDb.query(
      `
        SELECT
          s.student_id,
          s.center_id,
          s.first_name,
          s.last_name,
          s.enrollment_number,
          s.created_at,
          s.parent_name,
          s.parent_phone,
          s.parent_telegram_chat_id,
          c.class_name,
          c.class_code,
          c.payment_amount,
          c.payment_frequency,
          ec.parent_payment_warning_days
        FROM students s
        JOIN edu_centers ec ON ec.center_id = s.center_id
        LEFT JOIN classes c ON c.class_id = s.class_id
        WHERE s.status = 'Active'
          AND s.parent_telegram_chat_id IS NOT NULL
          AND s.parent_password_hash IS NOT NULL
          AND c.payment_frequency = 'Monthly'
          AND COALESCE(c.payment_amount, 0) > 0
      `
    );

    for (const student of studentsResult.rows) {
      const paymentsResult = await botDb.query(
        `
          SELECT amount, payment_date
          FROM payments
          WHERE student_id = $1
            AND payment_status = 'Completed'
          ORDER BY payment_date ASC, payment_id ASC
        `,
        [student.student_id]
      );

      const warningDays = Number.isFinite(Number(student.parent_payment_warning_days))
        ? Number(student.parent_payment_warning_days)
        : DEFAULT_PARENT_PAYMENT_WARNING_DAYS;
      const monthlyFee = roundMoney(toNumber(student.payment_amount));
      const totalPaid = roundMoney(
        paymentsResult.rows.reduce((sum: number, payment: any) => sum + toNumber(payment.amount), 0)
      );
      const futureWindow = addMonthsClamped(today, 2);
      const cycles = applyPaymentCredit(
        buildDueCycles(toUtcDate(student.created_at), futureWindow, monthlyFee),
        totalPaid
      );

      const dueCycle = cycles.find((cycle) => {
        if (cycle.balance <= MONEY_EPSILON) {
          return false;
        }
        const reminderDate = addDays(toUtcDate(cycle.dueDate), -warningDays);
        return formatDate(reminderDate) === formatDate(today);
      });

      if (!dueCycle) {
        continue;
      }

      await sendParentNotification(
        student.student_id,
        'payment_reminder',
        `payment-reminder:${student.student_id}:${dueCycle.dueDate}`,
        [
          `Monthly payment reminder for ${student.first_name} ${student.last_name}`,
          `Class: ${student.class_name || 'N/A'}`,
          `Due date: ${dueCycle.dueDate}`,
          `Amount due: $${dueCycle.balance.toFixed(2)}`,
          `This reminder was sent ${warningDays} day${warningDays === 1 ? '' : 's'} before the payment date.`,
        ].join('\n'),
        {
          due_date: dueCycle.dueDate,
          balance: dueCycle.balance,
        }
      );
    }
  } catch (error) {
    console.error('Parent payment reminder sweep error:', error);
  }
};

const handleAuthenticatedMessage = async (chatId: number, text: string, session: ParentSession) => {
  switch (text) {
    case 'My Children':
      await sendChildrenList(chatId, session);
      return;
    case 'Child Summary':
      await withMainMenu(chatId, await getChildSummaryText(session.activeStudentId));
      return;
    case 'Attendance':
      await withMainMenu(chatId, await getAttendanceText(session.activeStudentId));
      return;
    case 'Grades':
      await withMainMenu(chatId, await getGradesText(session.activeStudentId));
      return;
    case 'Payments':
      await withMainMenu(chatId, await getPaymentsText(session.activeStudentId));
      return;
    case 'Help':
      await withMainMenu(
        chatId,
        'Use the keyboard buttons to view your child summary, recent attendance, grades, payments, or to switch between linked children.'
      );
      return;
    case 'Logout':
      parentSessions.delete(chatId);
      pendingLogins.delete(chatId);
      await sendLoginPrompt(chatId);
      return;
    default:
      await withMainMenu(
        chatId,
        'Choose one of the menu buttons below to continue, or press My Children to switch between linked children.'
      );
  }
};

const handleLoginMessage = async (message: any) => {
  const chatId = message.chat.id;
  const text = typeof message.text === 'string' ? message.text.trim() : '';
  const pendingState = pendingLogins.get(chatId);

  if (message.contact?.phone_number) {
    const parentPhone = message.contact.phone_number;
    pendingLogins.set(chatId, { step: 'await_password', parentPhone });
    await sendTelegramMessage(chatId, 'Phone number received. Now enter the parent password.', {
      reply_markup: AUTH_KEYBOARD,
    });
    return;
  }

  if (text === '/start' || text === 'Login to Parent Bot' || text === 'Type Phone Number') {
    pendingLogins.set(chatId, { step: 'await_phone' });
    await sendTelegramMessage(chatId, 'Please type the parent phone number saved for the student.', {
      reply_markup: AUTH_KEYBOARD,
    });
    return;
  }

  if (!pendingState || pendingState.step === 'await_phone') {
    if (!text) {
      await sendLoginPrompt(chatId);
      return;
    }

    pendingLogins.set(chatId, { step: 'await_password', parentPhone: text });
    await sendTelegramMessage(chatId, 'Now enter the parent password.', {
      reply_markup: AUTH_KEYBOARD,
    });
    return;
  }

  if (pendingState.step === 'await_password') {
    const children = await loadChildrenByPhoneAndPassword(pendingState.parentPhone || '', text);
    if (children.length === 0) {
      pendingLogins.set(chatId, { step: 'await_phone' });
      await sendTelegramMessage(
        chatId,
        'Parent login failed. Check the phone number and password, then try again.',
        { reply_markup: AUTH_KEYBOARD }
      );
      return;
    }

    await linkParentChat(chatId, children);
    pendingLogins.delete(chatId);
    const session = createSession(chatId, children);
    if (!session) {
      await sendLoginPrompt(chatId);
      return;
    }

    await withMainMenu(
      chatId,
      `Parent login successful.\n\nLinked children: ${children
        .map((child) => `${child.first_name} ${child.last_name}`)
        .join(', ')}`
    );
    await sendChildrenList(chatId, session);
  }
};

const handleCallbackQuery = async (callbackQuery: any) => {
  const chatId = callbackQuery.message?.chat?.id;
  const data = callbackQuery.data;
  if (!chatId || typeof data !== 'string') {
    return;
  }

  const session = await ensureSessionForChat(chatId);
  if (!session) {
    await answerCallbackQuery(callbackQuery.id, 'Please log in first.');
    await sendLoginPrompt(chatId);
    return;
  }

  if (data.startsWith('child:')) {
    const studentId = Number(data.split(':')[1]);
    if (!session.studentIds.includes(studentId)) {
      await answerCallbackQuery(callbackQuery.id, 'That child is not linked to this account.');
      return;
    }

    session.activeStudentId = studentId;
    const child = await getChildById(studentId);
    await answerCallbackQuery(callbackQuery.id, 'Active child updated.');
    await withMainMenu(
      chatId,
      child
        ? `Active child set to ${child.first_name} ${child.last_name}.\n\n${await getChildSummaryText(studentId)}`
        : 'Active child updated.'
    );
  }
};

const handleTelegramUpdate = async (update: any) => {
  if (update.update_id) {
    updateOffset = Math.max(updateOffset, Number(update.update_id) + 1);
  }

  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  const message = update.message;
  if (!message?.chat?.id) {
    return;
  }

  const chatId = message.chat.id;
  const text = typeof message.text === 'string' ? message.text.trim() : '';

  if (text === '/start') {
    const restoredSession = await ensureSessionForChat(chatId);
    if (restoredSession) {
      await withMainMenu(chatId, await getChildSummaryText(restoredSession.activeStudentId));
    } else {
      await sendLoginPrompt(chatId);
    }
    return;
  }

  const session = await ensureSessionForChat(chatId);
  if (!session) {
    await handleLoginMessage(message);
    return;
  }

  await handleAuthenticatedMessage(chatId, text, session);
};

const pollTelegramUpdates = async () => {
  if (!TELEGRAM_API_BASE) {
    return;
  }

  try {
    const response: any = await sendTelegramRequest('getUpdates', {
      timeout: 20,
      offset: updateOffset,
      allowed_updates: ['message', 'callback_query'],
    });

    const updates = Array.isArray(response?.result) ? response.result : [];
    for (const update of updates) {
      await handleTelegramUpdate(update);
    }
  } catch (error) {
    console.error('Telegram polling error:', error);
  } finally {
    pollingTimeout = setTimeout(() => {
      void pollTelegramUpdates();
    }, BOT_POLL_INTERVAL_MS);
  }
};

export const startParentTelegramBot = async () => {
  if (botStarted) {
    return;
  }

  await ensureParentBotSchema();

  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('Parent Telegram bot not started: TELEGRAM_BOT_TOKEN is not configured.');
    return;
  }

  botStarted = true;
  await runParentPaymentReminderSweep();
  paymentReminderInterval = setInterval(() => {
    void runParentPaymentReminderSweep();
  }, PAYMENT_REMINDER_SWEEP_MS);
  void pollTelegramUpdates();
};

export const stopParentTelegramBot = () => {
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
    pollingTimeout = null;
  }

  if (paymentReminderInterval) {
    clearInterval(paymentReminderInterval);
    paymentReminderInterval = null;
  }

  botStarted = false;
};

export const prepareStudentParentFields = async (payload: any) => {
  await ensureParentBotSchema();

  const parentPassword =
    typeof payload.parent_password === 'string' ? payload.parent_password.trim() : '';

  return {
    parentPasswordHash: parentPassword ? hashParentPassword(parentPassword) : null,
    normalizedParentPhone:
      typeof payload.parent_phone === 'string' && payload.parent_phone.trim()
        ? payload.parent_phone.trim()
        : null,
  };
};

export const sanitizeStudentForResponse = (student: any) => {
  if (!student) {
    return student;
  }

  const {
    password_hash,
    parent_password_hash,
    parent_password,
    ...safeStudent
  } = student;

  return safeStudent;
};

export { ensureParentBotSchema, hashParentPassword };
