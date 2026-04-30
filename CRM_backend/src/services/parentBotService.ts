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

type ParentLanguage = 'uz' | 'ru';
type PendingStep = 'await_phone' | 'await_password';

interface PendingLoginState {
  step: PendingStep;
  parentPhone?: string;
  language?: ParentLanguage;
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
  parent_telegram_language?: ParentLanguage | string | null;
  payment_amount?: string | number | null;
  payment_frequency?: string | null;
}

interface ParentSession {
  chatId: number;
  parentPhone: string;
  studentIds: number[];
  activeStudentId: number;
  centerId: number;
  language: ParentLanguage;
}

interface PaymentCycle {
  dueDate: string;
  debtAmount: number;
  amountPaid: number;
  balance: number;
}

const pendingLogins = new Map<number, PendingLoginState>();
const parentSessions = new Map<number, ParentSession>();
const parentLanguagePreferences = new Map<number, ParentLanguage>();

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const formatMoney = (value: number): string =>
  `${roundMoney(value).toLocaleString('uz-UZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} UZS`;

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const dateOnlyToUtcDate = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

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

const getPaymentPeriodDays = (frequency: unknown): number => {
  const normalized = String(frequency || '').toLowerCase();

  if (normalized.includes('quarter')) {
    return 90;
  }

  if (normalized.includes('annual') || normalized.includes('year')) {
    return 365;
  }

  return 30;
};

const calculateNextPaymentDueDate = (
  registrationDate: string | Date,
  latestPaymentDate: string | Date | null,
  paymentFrequency: unknown
): string => {
  const periodDays = getPaymentPeriodDays(paymentFrequency);
  const baseDate = latestPaymentDate
    ? toUtcDate(latestPaymentDate)
    : toUtcDate(registrationDate);

  return formatDate(addDays(baseDate, periodDays));
};

const hashParentPassword = (password: string) =>
  crypto.createHash('sha256').update(password).digest('hex');

const normalizePhone = (value: string): string => value.replace(/[^\d]/g, '');

const normalizeLanguage = (value: unknown): ParentLanguage =>
  value === 'ru' ? 'ru' : 'uz';

const BOT_TEXT = {
  uz: {
    buttons: {
      sharePhone: 'Telefon raqamini yuborish',
      typePhone: "Telefon raqamini yozish",
      summary: "Farzand ma'lumoti",
      children: 'Farzandlarim',
      attendance: 'Davomat',
      grades: 'Baholar',
      payments: "To'lovlar",
      help: 'Yordam',
      language: "Tilni o'zgartirish",
      logout: 'Chiqish',
    },
    languageNames: {
      uz: "O'zbekcha",
      ru: 'Русский',
    },
    activeSuffix: '(Tanlangan)',
    chooseLanguage: 'Bot tilini tanlang:',
    languageChanged: "Bot tili o'zgartirildi.",
    loginPrompt:
      "Ota-ona botiga xush kelibsiz.\n\nFarzandingiz uchun saqlangan ota-ona telefon raqamini yuboring yoki yozing, keyin ota-ona parolini kiriting.",
    typePhonePrompt: "Talaba uchun saqlangan ota-ona telefon raqamini yozing.",
    phoneReceived: 'Telefon raqami olindi. Endi ota-ona parolini kiriting.',
    passwordPrompt: 'Endi ota-ona parolini kiriting.',
    loginFailed:
      "Kirish amalga oshmadi. Telefon raqami va parolni tekshirib, qayta urinib ko'ring.",
    loginSuccess: "Ota-ona muvaffaqiyatli kirdi.\n\nUlangan farzandlar: {children}",
    noLinkedChildren: 'Bu Telegram akkauntiga ulangan farzandlar topilmadi.',
    selectChild: 'Farzandni tanlang:',
    noClassAssigned: 'Sinf biriktirilmagan',
    summaryUnavailable: "Farzand ma'lumoti hozircha mavjud emas.",
    attendanceUnavailable: "Davomat yozuvlari hali qo'shilmagan.",
    gradesUnavailable: "Baholar hali kiritilmagan.",
    paymentUnavailable: "To'lov ma'lumoti hozircha mavjud emas.",
    recentAttendance: 'So‘nggi davomat:',
    recentGrades: 'So‘nggi baholar:',
    paymentSummary: '{name} uchun to‘lov ma’lumoti',
    enrollment: 'Ro‘yxat raqami',
    class: 'Sinf',
    attendanceSummary: 'Davomat',
    present: 'Keldi',
    absent: 'Kelmadi',
    late: 'Kechikdi',
    averageGrade: "O'rtacha baho",
    gradeItems: '{count} ta baho',
    totalPaid: "Jami to'langan",
    currentDebt: 'Joriy qarzdorlik',
    nextDueDate: 'Keyingi to‘lov sanasi',
    noNextDueDate: "Keyingi to'lov topilmadi",
    noUnpaidCycle: "To'lanmagan oylik davr topilmadi",
    completedPayments: "So'nggi to'langan to'lovlar:",
    helpText:
      "Pastdagi tugmalar orqali farzandingiz ma'lumoti, davomat, baholar va to'lovlarni ko'ring yoki farzand almashtiring.",
    unknownCommand:
      "Davom etish uchun pastdagi menyudan birini tanlang yoki farzandni almashtirish uchun 'Farzandlarim' tugmasini bosing.",
    loginFirst: 'Avval tizimga kiring.',
    childNotLinked: 'Bu farzand ushbu akkauntga ulangan emas.',
    activeChildUpdated: 'Tanlangan farzand yangilandi.',
    activeChildSet: 'Tanlangan farzand: {name}.\n\n{summary}',
    attendanceUpdate: '{name} uchun davomat yangilandi',
    status: 'Holat',
    attendanceDate: 'Dars sanasi',
    markedAt: 'Belgilangan vaqt',
    teacher: "O'qituvchi",
    room: 'Xona',
    notes: 'Izoh',
    newGrade: '{name} uchun yangi baho qo‘yildi',
    gradeUpdated: '{name} uchun baho yangilandi',
    subject: 'Fan',
    score: 'Natija',
    grade: 'Baho',
    term: 'Chorak',
    publishedAt: 'Kiritilgan vaqt',
    paymentReminder: '{name} uchun oylik to‘lov eslatmasi',
    dueDate: 'To‘lov sanasi',
    amountDue: 'To‘lanishi kerak',
    reminderInfo:
      "Bu eslatma to‘lov sanasidan {days} kun oldin yuborildi.",
  },
  ru: {
    buttons: {
      sharePhone: 'Отправить номер телефона',
      typePhone: 'Ввести номер телефона',
      summary: 'Сводка по ребенку',
      children: 'Мои дети',
      attendance: 'Посещаемость',
      grades: 'Оценки',
      payments: 'Платежи',
      help: 'Помощь',
      language: 'Сменить язык',
      logout: 'Выйти',
    },
    languageNames: {
      uz: "O'zbekcha",
      ru: 'Русский',
    },
    activeSuffix: '(Активный)',
    chooseLanguage: 'Выберите язык бота:',
    languageChanged: 'Язык бота изменен.',
    loginPrompt:
      "Добро пожаловать в бот для родителей.\n\nОтправьте или введите номер телефона родителя, сохраненный для вашего ребенка, затем введите пароль родителя.",
    typePhonePrompt: 'Введите номер телефона родителя, сохраненный для ученика.',
    phoneReceived: 'Номер телефона получен. Теперь введите пароль родителя.',
    passwordPrompt: 'Теперь введите пароль родителя.',
    loginFailed:
      'Не удалось войти. Проверьте номер телефона и пароль и попробуйте снова.',
    loginSuccess: 'Вход для родителя выполнен.\n\nСвязанные дети: {children}',
    noLinkedChildren: 'Для этого Telegram-чата не найдено связанных детей.',
    selectChild: 'Выберите ребенка:',
    noClassAssigned: 'Класс не назначен',
    summaryUnavailable: 'Сводка по ребенку сейчас недоступна.',
    attendanceUnavailable: 'Записей посещаемости пока нет.',
    gradesUnavailable: 'Оценки пока не опубликованы.',
    paymentUnavailable: 'Информация по платежам сейчас недоступна.',
    recentAttendance: 'Последняя посещаемость:',
    recentGrades: 'Последние оценки:',
    paymentSummary: 'Информация по платежам для {name}',
    enrollment: 'Номер зачисления',
    class: 'Класс',
    attendanceSummary: 'Посещаемость',
    present: 'Присутствовал',
    absent: 'Отсутствовал',
    late: 'Опоздал',
    averageGrade: 'Средняя оценка',
    gradeItems: '{count} оценок',
    totalPaid: 'Всего оплачено',
    currentDebt: 'Текущий долг',
    nextDueDate: 'Следующая дата оплаты',
    noNextDueDate: 'Следующей оплаты нет',
    noUnpaidCycle: 'Не найден неоплаченный ежемесячный период',
    completedPayments: 'Последние оплаченные платежи:',
    helpText:
      'Используйте кнопки ниже, чтобы смотреть сводку по ребенку, посещаемость, оценки, платежи или переключаться между детьми.',
    unknownCommand:
      "Выберите одну из кнопок меню ниже или нажмите 'Мои дети', чтобы переключаться между детьми.",
    loginFirst: 'Сначала войдите в систему.',
    childNotLinked: 'Этот ребенок не связан с данным аккаунтом.',
    activeChildUpdated: 'Активный ребенок обновлен.',
    activeChildSet: 'Активный ребенок: {name}.\n\n{summary}',
    attendanceUpdate: 'Обновление посещаемости для {name}',
    status: 'Статус',
    attendanceDate: 'Дата занятия',
    markedAt: 'Отмечено в',
    teacher: 'Учитель',
    room: 'Кабинет',
    notes: 'Примечание',
    newGrade: 'Добавлена новая оценка для {name}',
    gradeUpdated: 'Оценка обновлена для {name}',
    subject: 'Предмет',
    score: 'Результат',
    grade: 'Оценка',
    term: 'Четверть',
    publishedAt: 'Опубликовано в',
    paymentReminder: 'Напоминание об оплате для {name}',
    dueDate: 'Дата оплаты',
    amountDue: 'К оплате',
    reminderInfo:
      'Это напоминание отправлено за {days} дн. до даты оплаты.',
  },
} as const;

const BUTTON_FALLBACKS: Record<string, string[]> = {
  typePhone: ['Type Phone Number', 'Login to Parent Bot'],
  summary: ['Child Summary'],
  children: ['My Children'],
  attendance: ['Attendance'],
  grades: ['Grades'],
  payments: ['Payments'],
  help: ['Help'],
  language: ['Change Language'],
  logout: ['Logout'],
};

const interpolate = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    template
  );

const getTextSet = (language: ParentLanguage) => BOT_TEXT[language];

const getButtonText = (language: ParentLanguage, key: keyof typeof BOT_TEXT.uz.buttons) =>
  BOT_TEXT[language].buttons[key];

const matchesButton = (text: string, key: keyof typeof BOT_TEXT.uz.buttons): boolean => {
  if (!text) {
    return false;
  }

  const candidates = new Set<string>([
    BOT_TEXT.uz.buttons[key],
    BOT_TEXT.ru.buttons[key],
    ...(BUTTON_FALLBACKS[key] || []),
  ]);

  return candidates.has(text);
};

const getChatLanguage = (chatId: number, session?: ParentSession | null): ParentLanguage => {
  if (session?.language) {
    return session.language;
  }

  if (parentSessions.has(chatId)) {
    return parentSessions.get(chatId)?.language || 'uz';
  }

  if (pendingLogins.has(chatId)) {
    return normalizeLanguage(pendingLogins.get(chatId)?.language);
  }

  return normalizeLanguage(parentLanguagePreferences.get(chatId));
};

const setLocalLanguagePreference = (chatId: number, language: ParentLanguage) => {
  parentLanguagePreferences.set(chatId, language);

  const pendingState = pendingLogins.get(chatId);
  if (pendingState) {
    pendingLogins.set(chatId, { ...pendingState, language });
  }

  const session = parentSessions.get(chatId);
  if (session) {
    session.language = language;
  }
};

const toDisplayDate = (value: string | Date): Date | null => {
  if (typeof value === 'string' && DATE_ONLY_PATTERN.test(value)) {
    return dateOnlyToUtcDate(value);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTashkentDateTime = (
  value: string | Date,
  language: ParentLanguage = 'uz'
): string => {
  const date = toDisplayDate(value);
  if (!date) {
    return '-';
  }

  return date.toLocaleString(language === 'ru' ? 'ru-RU' : 'uz-UZ', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const formatTashkentDate = (
  value: string | Date,
  language: ParentLanguage = 'uz'
): string => {
  const date = toDisplayDate(value);
  if (!date) {
    return '-';
  }

  return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'uz-UZ', {
    timeZone: 'Asia/Tashkent',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const buildReplyKeyboard = (rows: Array<Array<string | { text: string; request_contact?: boolean }>>) => ({
  keyboard: rows.map((row) =>
    row.map((item) => (typeof item === 'string' ? { text: item } : item))
  ),
  resize_keyboard: true,
  one_time_keyboard: false,
});

const getAuthKeyboard = (language: ParentLanguage) =>
  buildReplyKeyboard([
    [{ text: getButtonText(language, 'sharePhone'), request_contact: true }],
    [getButtonText(language, 'typePhone')],
    [getButtonText(language, 'language')],
  ]);

const getMainMenuKeyboard = (language: ParentLanguage) =>
  buildReplyKeyboard([
    [getButtonText(language, 'summary'), getButtonText(language, 'children')],
    [getButtonText(language, 'attendance'), getButtonText(language, 'grades')],
    [getButtonText(language, 'payments'), getButtonText(language, 'help')],
    [getButtonText(language, 'language'), getButtonText(language, 'logout')],
  ]);

const buildChildrenInlineKeyboard = (
  children: ParentChildRecord[],
  language: ParentLanguage,
  activeStudentId?: number
) => ({
  inline_keyboard: children.map((child) => [
    {
      text:
        Number(child.student_id) === Number(activeStudentId)
          ? `${child.first_name} ${child.last_name} ${getTextSet(language).activeSuffix}`
          : `${child.first_name} ${child.last_name}`,
      callback_data: `child:${child.student_id}`,
    },
  ]),
});

const buildLanguageInlineKeyboard = (language: ParentLanguage) => ({
  inline_keyboard: [[
    {
      text:
        language === 'uz'
          ? `• ${BOT_TEXT.uz.languageNames.uz}`
          : BOT_TEXT.uz.languageNames.uz,
      callback_data: 'lang:uz',
    },
    {
      text:
        language === 'ru'
          ? `• ${BOT_TEXT.ru.languageNames.ru}`
          : BOT_TEXT.ru.languageNames.ru,
      callback_data: 'lang:ru',
    },
  ]],
});

const translateAttendanceStatus = (status: string, language: ParentLanguage): string => {
  const text = getTextSet(language);
  switch ((status || '').toLowerCase()) {
    case 'present':
      return text.present;
    case 'absent':
      return text.absent;
    case 'late':
      return text.late;
    default:
      return status;
  }
};

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
        ALTER TABLE students
        ADD COLUMN IF NOT EXISTS parent_telegram_language VARCHAR(5) DEFAULT 'uz'
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
        s.parent_telegram_language,
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
        s.parent_telegram_language,
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

  const preferredLanguage = normalizeLanguage(
    children[0].parent_telegram_language || parentLanguagePreferences.get(chatId)
  );
  const session: ParentSession = {
    chatId,
    parentPhone: children[0].parent_phone || '',
    centerId: children[0].center_id,
    studentIds: children.map((child) => child.student_id),
    activeStudentId: children[0].student_id,
    language: preferredLanguage,
  };

  parentLanguagePreferences.set(chatId, preferredLanguage);
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

const linkParentChat = async (
  chatId: number,
  children: ParentChildRecord[],
  language: ParentLanguage
) => {
  if (children.length === 0) {
    return;
  }

  await botDb.query(
    `
      UPDATE students
      SET
        parent_telegram_chat_id = $1,
        parent_telegram_verified_at = CURRENT_TIMESTAMP,
        parent_telegram_last_login_at = CURRENT_TIMESTAMP,
        parent_telegram_language = $3
      WHERE student_id = ANY($2::int[])
    `,
    [chatId, children.map((child) => child.student_id), language]
  );

  parentLanguagePreferences.set(chatId, language);
};

const updateParentLanguageForChat = async (chatId: number, language: ParentLanguage) => {
  await ensureParentBotSchema();
  await botDb.query(
    `
      UPDATE students
      SET parent_telegram_language = $2
      WHERE parent_telegram_chat_id = $1
    `,
    [chatId, language]
  );
  setLocalLanguagePreference(chatId, language);
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
        s.parent_telegram_language,
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

  const latestPayment = paymentsResult.rows[paymentsResult.rows.length - 1];
  if (latestPayment && monthlyFee > 0) {
    nextDueDate = calculateNextPaymentDueDate(
      student.created_at,
      latestPayment.payment_date,
      student.payment_frequency
    );
    nextDueBalance = monthlyFee;
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

const getChildSummaryText = async (
  studentId: number,
  language: ParentLanguage
): Promise<string> => {
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
    return getTextSet(language).summaryUnavailable;
  }

  const text = getTextSet(language);
  const paymentSnapshot = await getStudentPaymentSnapshot(studentId);
  const attendance = attendanceResult.rows[0] || {};
  const grades = gradeResult.rows[0] || {};
  const studentName = `${student.first_name} ${student.last_name}`;

  return [
    studentName,
    `${text.enrollment}: ${student.enrollment_number}`,
    `${text.class}: ${student.class_name || text.noClassAssigned}`,
    '',
    `${text.attendanceSummary}: ${text.present} ${attendance.present_count || 0}, ${text.absent} ${attendance.absent_count || 0}, ${text.late} ${attendance.late_count || 0}`,
    `${text.averageGrade}: ${roundMoney(toNumber(grades.average_percentage))}% (${interpolate(text.gradeItems, { count: grades.grade_count || 0 })})`,
    `${text.totalPaid}: ${formatMoney(paymentSnapshot?.totalPaid || 0)}`,
    `${text.currentDebt}: ${formatMoney(paymentSnapshot?.currentDebt || 0)}`,
    paymentSnapshot?.nextDueDate
      ? `${text.nextDueDate}: ${formatTashkentDate(paymentSnapshot.nextDueDate, language)} (${formatMoney(paymentSnapshot.nextDueBalance)})`
      : `${text.nextDueDate}: ${text.noUnpaidCycle}`,
  ].join('\n');
};

const getAttendanceText = async (
  studentId: number,
  language: ParentLanguage
): Promise<string> => {
  const qrCheckinsTable = await botDb.query(
    "SELECT to_regclass('public.attendance_qr_checkins') AS table_name"
  );
  const hasQrCheckinsTable = Boolean(qrCheckinsTable.rows[0]?.table_name);
  const result = await botDb.query(
    hasQrCheckinsTable
      ? `
          SELECT
            a.attendance_date,
            a.status,
            a.remarks,
            COALESCE(qc.checked_in_at, a.created_at) AS marked_at
          FROM attendance a
          LEFT JOIN attendance_qr_checkins qc ON qc.attendance_id = a.attendance_id
          WHERE a.student_id = $1
          ORDER BY a.attendance_date DESC, marked_at DESC, a.attendance_id DESC
          LIMIT 8
        `
      : `
          SELECT
            a.attendance_date,
            a.status,
            a.remarks,
            a.created_at AS marked_at
          FROM attendance a
          WHERE a.student_id = $1
          ORDER BY a.attendance_date DESC, marked_at DESC, a.attendance_id DESC
          LIMIT 8
        `,
    [studentId]
  );

  if (result.rows.length === 0) {
    return getTextSet(language).attendanceUnavailable;
  }

  const text = getTextSet(language);
  const lines: string[] = [text.recentAttendance];
  result.rows.forEach((record: any) => {
    const date = formatTashkentDate(record.attendance_date, language);
    const markedAt = record.marked_at
      ? ` - ${text.markedAt}: ${formatTashkentDateTime(record.marked_at, language)}`
      : '';
    lines.push(
      `${date}: ${translateAttendanceStatus(record.status, language)}${markedAt}${record.remarks ? ` (${record.remarks})` : ''}`
    );
  });

  return lines.join('\n');
};

const getGradesText = async (
  studentId: number,
  language: ParentLanguage
): Promise<string> => {
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
    return getTextSet(language).gradesUnavailable;
  }

  const text = getTextSet(language);
  const lines: string[] = [text.recentGrades];
  result.rows.forEach((grade: any) => {
    lines.push(
      `${grade.subject || text.subject}: ${grade.marks_obtained}/${grade.total_marks} (${roundMoney(
        toNumber(grade.percentage)
      )}%) ${grade.grade_letter ? `${text.grade} ${grade.grade_letter}` : ''}`
    );
  });

  return lines.join('\n');
};

const getPaymentsText = async (
  studentId: number,
  language: ParentLanguage
): Promise<string> => {
  const paymentSnapshot = await getStudentPaymentSnapshot(studentId);
  if (!paymentSnapshot) {
    return getTextSet(language).paymentUnavailable;
  }

  const text = getTextSet(language);
  const recentPayments = paymentSnapshot.payments.slice(-5).reverse();
  const lines = [
    interpolate(text.paymentSummary, {
      name: `${paymentSnapshot.student.first_name} ${paymentSnapshot.student.last_name}`,
    }),
    `${text.totalPaid}: ${formatMoney(paymentSnapshot.totalPaid)}`,
    `${text.currentDebt}: ${formatMoney(paymentSnapshot.currentDebt)}`,
    paymentSnapshot.nextDueDate
      ? `${text.nextDueDate}: ${formatTashkentDate(paymentSnapshot.nextDueDate, language)} (${formatMoney(paymentSnapshot.nextDueBalance)})`
      : `${text.nextDueDate}: ${text.noNextDueDate}`,
  ];

  if (recentPayments.length > 0) {
    lines.push('', text.completedPayments);
    recentPayments.forEach((payment: any) => {
      lines.push(`${formatTashkentDate(payment.payment_date, language)}: ${formatMoney(toNumber(payment.amount))}`);
    });
  }

  return lines.join('\n');
};

const withMainMenu = async (
  chatId: number,
  text: string,
  language: ParentLanguage,
  extra: Record<string, any> = {}
) =>
  sendTelegramMessage(chatId, text, {
    reply_markup: getMainMenuKeyboard(language),
    ...extra,
  });

const sendLoginPrompt = async (chatId: number, language: ParentLanguage) =>
  sendTelegramMessage(
    chatId,
    getTextSet(language).loginPrompt,
    { reply_markup: getAuthKeyboard(language) }
  );

const sendLanguageSelector = async (chatId: number, language: ParentLanguage) =>
  sendTelegramMessage(chatId, getTextSet(language).chooseLanguage, {
    reply_markup: buildLanguageInlineKeyboard(language),
  });

const sendChildrenList = async (chatId: number, session: ParentSession) => {
  const children = await loadParentChildrenForSession(session);
  if (children.length === 0) {
    return withMainMenu(chatId, getTextSet(session.language).noLinkedChildren, session.language);
  }

  const text = getTextSet(session.language);
  const lines: string[] = [text.selectChild];
  children.forEach((child) => {
    lines.push(
      `${child.first_name} ${child.last_name} - ${child.class_name || text.noClassAssigned}`
    );
  });

  return sendTelegramMessage(chatId, lines.join('\n'), {
    reply_markup: buildChildrenInlineKeyboard(children, session.language, session.activeStudentId),
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
  language: ParentLanguage,
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
    reply_markup: getMainMenuKeyboard(language),
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
          s.parent_telegram_language,
          c.class_name,
          c.class_code,
          c.room_number,
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

    const language = normalizeLanguage(record.parent_telegram_language);
    const text = getTextSet(language);
    const exactTime = formatTashkentDateTime(options.exactTimestamp || new Date(), language);
    const teacherName =
      record.teacher_first_name && record.teacher_last_name
        ? `${record.teacher_first_name} ${record.teacher_last_name}`
        : text.teacher;
    const classLabel = record.class_name
      ? `${record.class_name}${record.class_code ? ` (${record.class_code})` : ''}`
      : text.noClassAssigned;
    const message = [
      interpolate(text.attendanceUpdate, {
        name: `${record.student_first_name} ${record.student_last_name}`,
      }),
      `${text.status}: ${translateAttendanceStatus(record.status, language)}`,
      `${text.class}: ${classLabel}`,
      `${text.attendanceDate}: ${formatTashkentDate(record.attendance_date, language)}`,
      `${text.markedAt}: ${exactTime}`,
      `${text.teacher}: ${teacherName}`,
      record.room_number ? `${text.room}: ${record.room_number}` : '',
      record.remarks ? `${text.notes}: ${record.remarks}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    await sendParentNotification(
      record.student_id,
      'attendance',
      options.eventKey || `attendance:${record.attendance_id}:${record.status}:${record.attendance_date}:${record.remarks || ''}`,
      message,
      language,
      {
        attendance_id: record.attendance_id,
        status: record.status,
        attendance_date: record.attendance_date,
        class_name: record.class_name,
        class_code: record.class_code,
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
          s.parent_telegram_language,
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

    const language = normalizeLanguage(record.parent_telegram_language);
    const text = getTextSet(language);
    const teacherName =
      record.teacher_first_name && record.teacher_last_name
        ? `${record.teacher_first_name} ${record.teacher_last_name}`
        : text.teacher;
    const message = [
      interpolate(options.mode === 'update' ? text.gradeUpdated : text.newGrade, {
        name: `${record.student_first_name} ${record.student_last_name}`,
      }),
      `${text.subject}: ${record.subject || text.subject}`,
      `${text.score}: ${record.marks_obtained}/${record.total_marks} (${roundMoney(toNumber(record.percentage))}%)`,
      record.grade_letter ? `${text.grade}: ${record.grade_letter}` : '',
      record.term ? `${text.term}: ${record.term}` : '',
      `${text.publishedAt}: ${formatTashkentDateTime(record.updated_at || record.created_at, language)}`,
      `${text.teacher}: ${teacherName}`,
    ]
      .filter(Boolean)
      .join('\n');

    await sendParentNotification(
      record.student_id,
      'grade',
      options.eventKey ||
        `grade:${record.grade_id}:${options.mode || 'create'}:${record.updated_at || record.created_at}`,
      message,
      language,
      {
        grade_id: record.grade_id,
        mode: options.mode || 'create',
      }
    );
  } catch (error) {
    console.error('Parent grade notification error:', error);
  }
};

export const runParentPaymentReminderSweep = async (options: { centerId?: number; studentIds?: number[] } = {}) => {
  if (!TELEGRAM_BOT_TOKEN) {
    return;
  }

  try {
    await ensureParentBotSchema();

    const today = toUtcDate(new Date());
    const values: any[] = [];
    const filters = [
      "s.status = 'Active'",
      's.parent_telegram_chat_id IS NOT NULL',
      's.parent_password_hash IS NOT NULL',
      'c.payment_frequency IS NOT NULL',
      'COALESCE(c.payment_amount, 0) > 0',
    ];

    if (options.centerId) {
      values.push(options.centerId);
      filters.push(`s.center_id = $${values.length}`);
    }

    if (options.studentIds?.length) {
      values.push(options.studentIds);
      filters.push(`s.student_id = ANY($${values.length}::int[])`);
    }

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
          s.parent_telegram_language,
          c.class_name,
          c.class_code,
          c.payment_amount,
          c.payment_frequency,
          ec.parent_payment_warning_days
        FROM students s
        JOIN edu_centers ec ON ec.center_id = s.center_id
        LEFT JOIN classes c ON c.class_id = s.class_id
        WHERE ${filters.join(' AND ')}
      `,
      values
    );

    for (const student of studentsResult.rows) {
      const paymentsResult = await botDb.query(
        `
          SELECT payment_id, amount, payment_date
          FROM payments
          WHERE student_id = $1
            AND payment_status = 'Completed'
          ORDER BY payment_date ASC, payment_id ASC
        `,
        [student.student_id]
      );

      const warningDays = Number.isFinite(Number(student.parent_payment_warning_days))
        ? Math.max(0, Number(student.parent_payment_warning_days))
        : DEFAULT_PARENT_PAYMENT_WARNING_DAYS;
      const amountDue = roundMoney(toNumber(student.payment_amount));
      const latestPayment = paymentsResult.rows[paymentsResult.rows.length - 1];
      const dueDateValue = calculateNextPaymentDueDate(
        student.created_at,
        latestPayment?.payment_date || null,
        student.payment_frequency
      );
      const dueDate = toUtcDate(dueDateValue);
      const reminderDate = addDays(dueDate, -warningDays);

      if (amountDue <= MONEY_EPSILON || reminderDate > today || today > dueDate) {
        continue;
      }

      const language = normalizeLanguage(student.parent_telegram_language);
      const text = getTextSet(language);
      await sendParentNotification(
        student.student_id,
        'payment_reminder',
        `payment-reminder:${student.student_id}:${dueDateValue}`,
        [
          interpolate(text.paymentReminder, {
            name: `${student.first_name} ${student.last_name}`,
          }),
          `${text.class}: ${student.class_name || text.noClassAssigned}`,
          `${text.dueDate}: ${formatTashkentDate(dueDateValue, language)}`,
          `${text.amountDue}: ${formatMoney(amountDue)}`,
          interpolate(text.reminderInfo, { days: warningDays }),
        ].join('\n'),
        language,
        {
          due_date: dueDateValue,
          balance: amountDue,
          latest_payment_id: latestPayment?.payment_id || null,
          latest_payment_date: latestPayment?.payment_date || null,
          payment_frequency: student.payment_frequency,
        }
      );
    }
  } catch (error) {
    console.error('Parent payment reminder sweep error:', error);
  }
};

const handleAuthenticatedMessage = async (chatId: number, text: string, session: ParentSession) => {
  if (matchesButton(text, 'children')) {
      await sendChildrenList(chatId, session);
      return;
  }

  if (matchesButton(text, 'summary')) {
      await withMainMenu(
        chatId,
        await getChildSummaryText(session.activeStudentId, session.language),
        session.language
      );
      return;
  }

  if (matchesButton(text, 'attendance')) {
      await withMainMenu(
        chatId,
        await getAttendanceText(session.activeStudentId, session.language),
        session.language
      );
      return;
  }

  if (matchesButton(text, 'grades')) {
      await withMainMenu(
        chatId,
        await getGradesText(session.activeStudentId, session.language),
        session.language
      );
      return;
  }

  if (matchesButton(text, 'payments')) {
      await withMainMenu(
        chatId,
        await getPaymentsText(session.activeStudentId, session.language),
        session.language
      );
      return;
  }

  if (matchesButton(text, 'help')) {
      await withMainMenu(chatId, getTextSet(session.language).helpText, session.language);
      return;
  }

  if (matchesButton(text, 'language')) {
      await sendLanguageSelector(chatId, session.language);
      return;
  }

  if (matchesButton(text, 'logout')) {
      parentSessions.delete(chatId);
      pendingLogins.delete(chatId);
      await sendLoginPrompt(chatId, getChatLanguage(chatId));
      return;
  }

  await withMainMenu(chatId, getTextSet(session.language).unknownCommand, session.language);
};

const handleLoginMessage = async (message: any) => {
  const chatId = message.chat.id;
  const text = typeof message.text === 'string' ? message.text.trim() : '';
  const pendingState = pendingLogins.get(chatId);
  const language = getChatLanguage(chatId);
  const textSet = getTextSet(language);

  if (message.contact?.phone_number) {
    const parentPhone = message.contact.phone_number;
    pendingLogins.set(chatId, { step: 'await_password', parentPhone, language });
    await sendTelegramMessage(chatId, textSet.phoneReceived, {
      reply_markup: getAuthKeyboard(language),
    });
    return;
  }

  if (matchesButton(text, 'language')) {
    await sendLanguageSelector(chatId, language);
    return;
  }

  if (text === '/start' || matchesButton(text, 'typePhone')) {
    pendingLogins.set(chatId, { step: 'await_phone', language });
    await sendTelegramMessage(chatId, textSet.typePhonePrompt, {
      reply_markup: getAuthKeyboard(language),
    });
    return;
  }

  if (!pendingState || pendingState.step === 'await_phone') {
    if (!text) {
      await sendLoginPrompt(chatId, language);
      return;
    }

    pendingLogins.set(chatId, { step: 'await_password', parentPhone: text, language });
    await sendTelegramMessage(chatId, textSet.passwordPrompt, {
      reply_markup: getAuthKeyboard(language),
    });
    return;
  }

  if (pendingState.step === 'await_password') {
    const children = await loadChildrenByPhoneAndPassword(pendingState.parentPhone || '', text);
    if (children.length === 0) {
      pendingLogins.set(chatId, { step: 'await_phone', language });
      await sendTelegramMessage(
        chatId,
        textSet.loginFailed,
        { reply_markup: getAuthKeyboard(language) }
      );
      return;
    }

    await linkParentChat(chatId, children, language);
    pendingLogins.delete(chatId);
    const session = createSession(chatId, children);
    if (!session) {
      await sendLoginPrompt(chatId, language);
      return;
    }

    await withMainMenu(
      chatId,
      interpolate(textSet.loginSuccess, {
        children: children.map((child) => `${child.first_name} ${child.last_name}`).join(', '),
      }),
      session.language
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

  if (data.startsWith('lang:')) {
    const language = normalizeLanguage(data.split(':')[1]);
    const session = await ensureSessionForChat(chatId);
    await updateParentLanguageForChat(chatId, language);
    await answerCallbackQuery(callbackQuery.id, getTextSet(language).languageChanged);

    if (session) {
      session.language = language;
      await withMainMenu(
        chatId,
        `${getTextSet(language).languageChanged}\n\n${await getChildSummaryText(session.activeStudentId, language)}`,
        language
      );
      return;
    }

    await sendTelegramMessage(
      chatId,
      `${getTextSet(language).languageChanged}\n\n${getTextSet(language).loginPrompt}`,
      { reply_markup: getAuthKeyboard(language) }
    );
    return;
  }

  const session = await ensureSessionForChat(chatId);
  if (!session) {
    const language = getChatLanguage(chatId);
    await answerCallbackQuery(callbackQuery.id, getTextSet(language).loginFirst);
    await sendLoginPrompt(chatId, language);
    return;
  }

  if (data.startsWith('child:')) {
    const studentId = Number(data.split(':')[1]);
    if (!session.studentIds.includes(studentId)) {
      await answerCallbackQuery(callbackQuery.id, getTextSet(session.language).childNotLinked);
      return;
    }

    session.activeStudentId = studentId;
    const child = await getChildById(studentId);
    await answerCallbackQuery(callbackQuery.id, getTextSet(session.language).activeChildUpdated);
    await withMainMenu(
      chatId,
      child
        ? interpolate(getTextSet(session.language).activeChildSet, {
            name: `${child.first_name} ${child.last_name}`,
            summary: await getChildSummaryText(studentId, session.language),
          })
        : getTextSet(session.language).activeChildUpdated,
      session.language
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
      await withMainMenu(
        chatId,
        await getChildSummaryText(restoredSession.activeStudentId, restoredSession.language),
        restoredSession.language
      );
    } else {
      const language = getChatLanguage(chatId);
      await sendLoginPrompt(chatId, language);
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
